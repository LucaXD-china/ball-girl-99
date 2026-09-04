import { describe, expect, it } from "vitest";
import { sayaCompanionIntroduction, sayaScheduleJourneyEndedIntroduction, sayaSpaceIntroductions } from "./SayaCompanion";

describe("Saya space introductions", () => {
  it("covers every non-office space", () => {
    expect(Object.keys(sayaSpaceIntroductions).sort()).toEqual(["locker", "match", "packs", "registration", "schedule", "stories", "training"]);
  });

  it("keeps every line concise", () => {
    for (const introduction of [...Object.values(sayaSpaceIntroductions), sayaScheduleJourneyEndedIntroduction]) {
      expect(introduction.title.length).toBeLessThanOrEqual(12);
      expect(introduction.message.length).toBeLessThanOrEqual(42);
    }
  });

  it("explains automatic duplicate-card star-ups in the pack shop", () => {
    expect(sayaSpaceIntroductions.packs.message).toContain("重复卡会自动");
    expect(sayaSpaceIntroductions.packs.message).toContain("不用额外操作");
  });
});

describe("Saya schedule journey-ended introduction", () => {
  it("keeps the schedule center copy during the campaign", () => {
    expect(sayaCompanionIntroduction("schedule", false)).toBe(sayaSpaceIntroductions.schedule);
  });

  it("switches to the ending prompt once the journey ends", () => {
    expect(sayaCompanionIntroduction("schedule", true)).toBe(sayaScheduleJourneyEndedIntroduction);
    expect(sayaScheduleJourneyEndedIntroduction.message).toContain("结局");
  });

  it("does not affect the other spaces at journey end", () => {
    expect(sayaCompanionIntroduction("locker", true)).toBe(sayaSpaceIntroductions.locker);
    expect(sayaCompanionIntroduction("stories", true)).toBe(sayaSpaceIntroductions.stories);
  });
});
