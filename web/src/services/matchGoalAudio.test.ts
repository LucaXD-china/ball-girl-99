import { describe, expect, it } from "vitest";
import { isGoalSoundEvent } from "./matchGoalAudio";

describe("match goal sound", () => {
  it("plays for open-play goals and scored penalties only", () => {
    expect(isGoalSoundEvent("goal")).toBe(true);
    expect(isGoalSoundEvent("penalty-goal")).toBe(true);
    expect(isGoalSoundEvent("save")).toBe(false);
    expect(isGoalSoundEvent("penalty-save")).toBe(false);
  });
});
