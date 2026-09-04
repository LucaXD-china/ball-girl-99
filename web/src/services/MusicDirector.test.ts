import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicDirectorController } from "./MusicDirector";

class FakeAudio {
  loop = false;
  paused = true;
  preload: HTMLAudioElement["preload"] = "";
  src: string;
  volume = 1;
  currentTime = 0;
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });

  constructor(url: string) {
    this.src = url;
  }
}

class FakeEventTarget {
  listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener(new Event(type));
  }
}

const tracks = {
  theme: { url: "/theme.m4a", defaultGainDb: -6 },
  quest: { url: "/quest.m4a", defaultGainDb: -6 },
  battle: { url: "/battle.m4a", defaultGainDb: -6 },
};

async function settlePlayback() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("MusicDirectorController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("loops, fades in, and does not restart the same scene", async () => {
    const audios = new Map<string, FakeAudio>();
    const controller = new MusicDirectorController(tracks, (url) => {
      const audio = new FakeAudio(url);
      audios.set(url, audio);
      return audio;
    }, null);

    controller.setScene("theme");
    await settlePlayback();
    vi.advanceTimersByTime(400);
    const theme = audios.get("/theme.m4a")!;
    expect(theme.loop).toBe(true);
    expect(theme.preload).toBe("auto");
    expect(theme.volume).toBeCloseTo(10 ** (-6 / 20));
    expect(theme.play).toHaveBeenCalledTimes(1);

    controller.setScene("theme");
    expect(theme.play).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  it("fades between tracks and resumes the same audio position after silence", async () => {
    const audios = new Map<string, FakeAudio>();
    const controller = new MusicDirectorController(tracks, (url) => {
      const audio = new FakeAudio(url);
      audios.set(url, audio);
      return audio;
    }, null);

    controller.setScene("quest");
    await settlePlayback();
    vi.advanceTimersByTime(400);
    const quest = audios.get("/quest.m4a")!;
    quest.currentTime = 42;

    controller.setScene("battle");
    vi.advanceTimersByTime(400);
    await settlePlayback();
    vi.advanceTimersByTime(400);
    expect(quest.pause).toHaveBeenCalledTimes(1);
    expect(audios.get("/battle.m4a")?.play).toHaveBeenCalledTimes(1);

    controller.setScene("silent");
    vi.advanceTimersByTime(400);
    controller.setScene("quest");
    await settlePlayback();
    vi.advanceTimersByTime(400);
    expect(quest.play).toHaveBeenCalledTimes(2);
    expect(quest.currentTime).toBe(42);
    controller.destroy();
  });

  it("retries blocked autoplay on the first user interaction", async () => {
    const events = new FakeEventTarget();
    const theme = new FakeAudio("/theme.m4a");
    theme.play.mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
    const onPlaybackBlockedChange = vi.fn();
    const controller = new MusicDirectorController(tracks, () => theme, events, onPlaybackBlockedChange);

    controller.setScene("theme");
    await settlePlayback();
    expect(onPlaybackBlockedChange).toHaveBeenLastCalledWith(true);
    expect(events.listeners.get("pointerdown")?.size).toBe(1);
    expect(events.listeners.get("keydown")?.size).toBe(1);

    events.dispatch("pointerdown");
    await settlePlayback();
    vi.advanceTimersByTime(400);
    expect(theme.play).toHaveBeenCalledTimes(2);
    expect(theme.paused).toBe(false);
    expect(onPlaybackBlockedChange).toHaveBeenLastCalledWith(false);
    expect(events.listeners.get("pointerdown")?.size).toBe(0);
    expect(events.listeners.get("keydown")?.size).toBe(0);

    controller.resume();
    await settlePlayback();
    expect(theme.play).toHaveBeenCalledTimes(2);
    controller.destroy();
  });

  it("temporarily ducks the current track for foreground sound effects", async () => {
    const theme = new FakeAudio("/theme.m4a");
    const controller = new MusicDirectorController(tracks, () => theme, null);

    controller.setScene("theme");
    await settlePlayback();
    const normalVolume = 10 ** (-6 / 20);

    controller.duck(1100);
    vi.advanceTimersByTime(400);
    expect(theme.volume).toBeCloseTo(normalVolume * 10 ** (-12 / 20));
    vi.advanceTimersByTime(699);
    expect(theme.volume).toBeLessThan(normalVolume);
    vi.advanceTimersByTime(1);
    expect(theme.volume).toBeCloseTo(normalVolume);
    controller.destroy();
  });
});
