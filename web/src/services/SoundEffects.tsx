import { useEffect } from "react";
import { resolveSfx } from "./assetResolver";
import { duckMusic } from "./MusicDirector";

export type SfxId =
  | "battle-whistle"
  | "lottery-slide"
  | "lottery-result"
  | "team-select"
  | "common"
  | "confirm";

export type SfxCue = Exclude<SfxId, "battle-whistle"> | "none";

type SfxDescriptor = { url: string; defaultGainDb: number };
type SfxAudio = Pick<HTMLAudioElement, "currentTime" | "pause" | "paused" | "play" | "preload" | "src" | "volume">;
type SfxEventTarget = {
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
};
type InteractiveTarget = {
  closest: (selector: string) => InteractiveTarget | null;
  getAttribute: (name: string) => string | null;
  matches: (selector: string) => boolean;
};

const assetIds = {
  "battle-whistle": "sfx.battle.whistle",
  "lottery-slide": "sfx.lottery.slide",
  "lottery-result": "sfx.lottery.result",
  "team-select": "sfx.ui.team-select",
  common: "sfx.ui.click-common",
  confirm: "sfx.ui.click-confirm",
} satisfies Record<SfxId, string>;

const interactiveSelector = 'button, a[href], [role="button"], input[type="button"], input[type="submit"], input[type="reset"]';
const cueIds = new Set<SfxCue>(["lottery-slide", "lottery-result", "team-select", "common", "confirm", "none"]);
const voiceLimit = 4;

function gainFromDb(db: number) {
  return Math.min(1, Math.max(0, 10 ** (db / 20)));
}

function asInteractiveTarget(target: EventTarget | null): InteractiveTarget | null {
  if (!target || typeof (target as Partial<InteractiveTarget>).closest !== "function") return null;
  return target as unknown as InteractiveTarget;
}

export function sfxForInteraction(target: EventTarget | null): SfxCue | null {
  const interactive = asInteractiveTarget(target)?.closest(interactiveSelector);
  if (!interactive || interactive.matches(":disabled") || interactive.getAttribute("aria-disabled") === "true") return null;
  const declared = interactive.getAttribute("data-sfx") ?? "common";
  return cueIds.has(declared as SfxCue) ? declared as SfxCue : "common";
}

export class SoundEffectsController {
  private readonly pools = new Map<SfxId, SfxAudio[]>();

  constructor(
    private readonly tracks: Partial<Record<SfxId, SfxDescriptor>>,
    private readonly createAudio: (url: string) => SfxAudio = (url) => new Audio(url),
    private readonly eventTarget: SfxEventTarget | null = typeof document === "undefined" ? null : document,
  ) {
    for (const id of Object.keys(tracks) as SfxId[]) this.createVoice(id);
    this.eventTarget?.addEventListener("click", this.handleClick);
  }

  play(id: SfxId) {
    const descriptor = this.tracks[id];
    if (!descriptor) return;
    const pool = this.pools.get(id) ?? [];
    const audio = pool.find((voice) => voice.paused)
      ?? (pool.length < voiceLimit ? this.createVoice(id) : pool[0]);
    if (!audio) return;
    if (id === "battle-whistle") duckMusic(2400);
    if (id === "lottery-slide") duckMusic(1600, -6);
    if (id === "lottery-result") duckMusic(1100, -6);
    audio.currentTime = 0;
    audio.volume = gainFromDb(descriptor.defaultGainDb);
    void audio.play().catch(() => undefined);
  }

  destroy() {
    this.eventTarget?.removeEventListener("click", this.handleClick);
    for (const pool of this.pools.values()) for (const audio of pool) audio.pause();
    this.pools.clear();
  }

  private createVoice(id: SfxId) {
    const descriptor = this.tracks[id];
    if (!descriptor) return null;
    const audio = this.createAudio(descriptor.url);
    audio.preload = "auto";
    audio.volume = gainFromDb(descriptor.defaultGainDb);
    const pool = this.pools.get(id) ?? [];
    pool.push(audio);
    this.pools.set(id, pool);
    return audio;
  }

  private readonly handleClick: EventListener = (event) => {
    const cue = sfxForInteraction(event.target);
    if (cue && cue !== "none") this.play(cue);
  };
}

function resolveTracks(): Partial<Record<SfxId, SfxDescriptor>> {
  const entries = Object.entries(assetIds).flatMap(([id, assetId]) => {
    const resolved = resolveSfx(assetId);
    return resolved.status === "ready"
      ? [[id, { url: resolved.url, defaultGainDb: resolved.defaultGainDb }] as const]
      : [];
  });
  return Object.fromEntries(entries);
}

let activeController: SoundEffectsController | null = null;

export function playSfx(id: SfxId) {
  activeController?.play(id);
}

export function SoundEffects() {
  useEffect(() => {
    const controller = new SoundEffectsController(resolveTracks());
    activeController = controller;
    return () => {
      controller.destroy();
      if (activeController === controller) activeController = null;
    };
  }, []);
  return null;
}
