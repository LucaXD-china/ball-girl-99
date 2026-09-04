import { useEffect, useRef, useState } from "react";
import { resolveBgm } from "./assetResolver";

export type MusicScene = "theme" | "quest" | "battle" | "silent";
type PlayableMusicScene = Exclude<MusicScene, "silent">;

type BgmDescriptor = {
  url: string;
  defaultGainDb: number;
};

type MusicAudio = Pick<HTMLAudioElement, "loop" | "pause" | "paused" | "play" | "preload" | "src" | "volume">;
type MusicEventTarget = {
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
};

const assetIds = {
  theme: "bgm.login.default",
  quest: "bgm.hub.default",
  battle: "bgm.match.default",
} satisfies Record<PlayableMusicScene, string>;

const fadeDurationMs = 400;
const fadeSteps = 8;

function gainFromDb(db: number) {
  return Math.min(1, Math.max(0, 10 ** (db / 20)));
}

export class MusicDirectorController {
  private readonly audios = new Map<PlayableMusicScene, MusicAudio>();
  private desiredScene: MusicScene = "silent";
  private currentScene: PlayableMusicScene | null = null;
  private currentAudio: MusicAudio | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;
  private duckedAudio: MusicAudio | null = null;
  private duckFactor = 1;
  private transitionId = 0;
  private retryArmed = false;

  constructor(
    private readonly tracks: Partial<Record<PlayableMusicScene, BgmDescriptor>>,
    private readonly createAudio: (url: string) => MusicAudio = (url) => new Audio(url),
    private readonly eventTarget: MusicEventTarget | null = typeof document === "undefined" ? null : document,
    private readonly onPlaybackBlockedChange: (blocked: boolean) => void = () => undefined,
  ) {}

  setScene(scene: MusicScene) {
    if (scene === this.desiredScene) return;
    this.desiredScene = scene;
    const transitionId = ++this.transitionId;
    this.clearFade();
    this.clearDuck(false);
    if (scene === "silent") this.disarmRetry();

    const nextScene = scene === "silent" ? null : scene;
    if (nextScene && this.currentScene === nextScene && this.currentAudio) {
      void this.start(nextScene, transitionId);
      return;
    }

    if (this.currentAudio && !this.currentAudio.paused) {
      const previous = this.currentAudio;
      this.fade(previous, 0, transitionId, () => {
        previous.pause();
        if (this.currentAudio === previous) {
          this.currentAudio = null;
          this.currentScene = null;
        }
        if (nextScene) void this.start(nextScene, transitionId);
      });
      return;
    }

    this.currentAudio?.pause();
    this.currentAudio = null;
    this.currentScene = null;
    if (nextScene) void this.start(nextScene, transitionId);
  }

  destroy() {
    this.transitionId += 1;
    this.clearFade();
    this.clearDuck(false);
    this.disarmRetry();
    for (const audio of this.audios.values()) audio.pause();
    this.audios.clear();
    this.currentAudio = null;
    this.currentScene = null;
    this.desiredScene = "silent";
  }

  duck(durationMs: number, attenuationDb = -12) {
    const scene = this.currentScene;
    const audio = this.currentAudio;
    const descriptor = scene ? this.tracks[scene] : null;
    if (!scene || !audio || !descriptor || audio.paused) return;
    this.clearDuck(true);
    this.duckedAudio = audio;
    this.duckFactor = gainFromDb(attenuationDb);
    const normalVolume = gainFromDb(descriptor.defaultGainDb);
    audio.volume *= this.duckFactor;
    this.duckTimer = setTimeout(() => {
      if (this.currentAudio === audio && this.currentScene === scene) audio.volume = normalVolume;
      this.duckTimer = null;
      this.duckedAudio = null;
      this.duckFactor = 1;
    }, durationMs);
  }

  resume() {
    if (!this.retryArmed) return;
    this.disarmRetry();
    const scene = this.desiredScene;
    if (scene !== "silent") void this.start(scene, this.transitionId);
  }

  private audioFor(scene: PlayableMusicScene) {
    const existing = this.audios.get(scene);
    if (existing) return existing;
    const descriptor = this.tracks[scene];
    if (!descriptor) return null;
    const audio = this.createAudio(descriptor.url);
    audio.loop = true;
    audio.preload = "auto";
    this.audios.set(scene, audio);
    return audio;
  }

  private async start(scene: PlayableMusicScene, transitionId: number) {
    if (transitionId !== this.transitionId || this.desiredScene !== scene) return;
    const descriptor = this.tracks[scene];
    const audio = this.audioFor(scene);
    if (!descriptor || !audio) return;
    this.currentScene = scene;
    this.currentAudio = audio;
    audio.volume = 0;
    try {
      await audio.play();
      if (transitionId !== this.transitionId || this.desiredScene !== scene) {
        audio.pause();
        return;
      }
      this.disarmRetry();
      this.fade(audio, gainFromDb(descriptor.defaultGainDb), transitionId);
    } catch {
      if (transitionId === this.transitionId && this.desiredScene === scene) this.armRetry();
    }
  }

  private fade(audio: MusicAudio, target: number, transitionId: number, done?: () => void) {
    this.clearFade();
    const start = audio.volume;
    let step = 0;
    this.fadeTimer = setInterval(() => {
      if (transitionId !== this.transitionId) {
        this.clearFade();
        return;
      }
      step += 1;
      const volume = start + (target - start) * (step / fadeSteps);
      audio.volume = audio === this.duckedAudio ? volume * this.duckFactor : volume;
      if (step < fadeSteps) return;
      this.clearFade();
      done?.();
    }, fadeDurationMs / fadeSteps);
  }

  private clearFade() {
    if (this.fadeTimer === null) return;
    clearInterval(this.fadeTimer);
    this.fadeTimer = null;
  }

  private clearDuck(restore: boolean) {
    if (this.duckTimer !== null) clearTimeout(this.duckTimer);
    if (restore && this.duckedAudio && this.currentScene) {
      const descriptor = this.tracks[this.currentScene];
      if (descriptor) this.duckedAudio.volume = gainFromDb(descriptor.defaultGainDb);
    }
    this.duckTimer = null;
    this.duckedAudio = null;
    this.duckFactor = 1;
  }

  private readonly retryPlayback: EventListener = () => {
    this.resume();
  };

  private armRetry() {
    if (!this.eventTarget || this.retryArmed) return;
    this.retryArmed = true;
    this.onPlaybackBlockedChange(true);
    this.eventTarget.addEventListener("pointerdown", this.retryPlayback);
    this.eventTarget.addEventListener("keydown", this.retryPlayback);
  }

  private disarmRetry() {
    if (!this.eventTarget || !this.retryArmed) return;
    this.retryArmed = false;
    this.onPlaybackBlockedChange(false);
    this.eventTarget.removeEventListener("pointerdown", this.retryPlayback);
    this.eventTarget.removeEventListener("keydown", this.retryPlayback);
  }
}

function resolveTracks(): Partial<Record<PlayableMusicScene, BgmDescriptor>> {
  const entries = Object.entries(assetIds).flatMap(([scene, assetId]) => {
    const resolved = resolveBgm(assetId);
    return resolved.status === "ready"
      ? [[scene, { url: resolved.url, defaultGainDb: resolved.defaultGainDb }] as const]
      : [];
  });
  return Object.fromEntries(entries);
}

let activeMusicController: MusicDirectorController | null = null;

export function duckMusic(durationMs: number, attenuationDb = -12) {
  activeMusicController?.duck(durationMs, attenuationDb);
}

export function MusicDirector({ scene }: { scene: MusicScene }) {
  const controllerRef = useRef<MusicDirectorController | null>(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  useEffect(() => {
    const controller = new MusicDirectorController(resolveTracks(), undefined, undefined, setPlaybackBlocked);
    controllerRef.current = controller;
    activeMusicController = controller;
    controller.setScene(scene);
    return () => {
      controller.destroy();
      controllerRef.current = null;
      if (activeMusicController === controller) activeMusicController = null;
    };
  }, []);

  useEffect(() => controllerRef.current?.setScene(scene), [scene]);
  if (!playbackBlocked || scene !== "theme") return null;
  return (
    <button
      className="music-unlock-action"
      type="button"
      data-sfx="none"
      onClick={() => controllerRef.current?.resume()}
    >
      点击开启主题音乐
    </button>
  );
}
