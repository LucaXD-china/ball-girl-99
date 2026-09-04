import { describe, expect, it, vi } from "vitest";
import { SoundEffectsController, sfxForInteraction, type SfxCue } from "./SoundEffects";

class FakeAudio {
  currentTime = 9;
  paused = true;
  preload: HTMLAudioElement["preload"] = "";
  src: string;
  volume = 1;
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });

  constructor(url: string) { this.src = url; }
}

class FakeEventTarget {
  listeners = new Set<EventListener>();
  addEventListener(type: string, listener: EventListener) { if (type === "click") this.listeners.add(listener); }
  removeEventListener(type: string, listener: EventListener) { if (type === "click") this.listeners.delete(listener); }
  click(target: EventTarget) {
    for (const listener of this.listeners) listener({ target } as unknown as Event);
  }
}

function interactive(cue?: SfxCue, disabled = false) {
  const target = {
    closest: vi.fn(() => target),
    matches: vi.fn((selector: string) => selector === ":disabled" && disabled),
    getAttribute: vi.fn((name: string) => name === "data-sfx" ? cue ?? null : null),
  };
  return target as unknown as EventTarget;
}

const tracks = {
  common: { url: "/common.m4a", defaultGainDb: 0 },
  confirm: { url: "/confirm.m4a", defaultGainDb: -6 },
  "team-select": { url: "/team.m4a", defaultGainDb: 0 },
} as const;

describe("SoundEffectsController", () => {
  it("preloads tracks and uses extra voices for rapid repeated clicks", () => {
    const audios: FakeAudio[] = [];
    const controller = new SoundEffectsController(tracks, (url) => {
      const audio = new FakeAudio(url);
      audios.push(audio);
      return audio;
    }, null);

    expect(audios).toHaveLength(3);
    expect(audios.every((audio) => audio.preload === "auto")).toBe(true);
    controller.play("common");
    controller.play("common");
    expect(audios.filter((audio) => audio.src === "/common.m4a")).toHaveLength(2);
    expect(audios.filter((audio) => audio.src === "/common.m4a").every((audio) => audio.currentTime === 0)).toBe(true);
    controller.destroy();
  });

  it("routes default, confirm, team selection, none, and disabled interactions once", () => {
    const events = new FakeEventTarget();
    const audios: FakeAudio[] = [];
    const controller = new SoundEffectsController(tracks, (url) => {
      const audio = new FakeAudio(url);
      audios.push(audio);
      return audio;
    }, events);

    events.click(interactive());
    events.click(interactive("confirm"));
    events.click(interactive("team-select"));
    events.click(interactive("none"));
    events.click(interactive(undefined, true));

    expect(audios.find((audio) => audio.src === "/common.m4a")?.play).toHaveBeenCalledTimes(1);
    expect(audios.find((audio) => audio.src === "/confirm.m4a")?.play).toHaveBeenCalledTimes(1);
    expect(audios.find((audio) => audio.src === "/team.m4a")?.play).toHaveBeenCalledTimes(1);
    controller.destroy();
    expect(events.listeners).toHaveLength(0);
  });

  it("falls back unknown declarations to common and ignores non-interactive targets", () => {
    const unknown = interactive();
    (unknown as unknown as { getAttribute: (name: string) => string | null }).getAttribute = () => "unknown";
    expect(sfxForInteraction(unknown)).toBe("common");
    expect(sfxForInteraction({} as EventTarget)).toBeNull();
  });
});
