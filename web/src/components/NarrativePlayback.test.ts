import { describe, expect, it } from "vitest";
import { narrativeAutoAdvanceDelay, narrativeDisplayLines } from "./NarrativePlayback";

describe("NarrativePlayback", () => {
  it("reveals the existing display-only sentence lines without changing their text", () => {
    const text = "第一句保持原文。第二句也保持原文。";
    expect(narrativeDisplayLines(text)).toEqual(["第一句保持原文。", "第二句也保持原文。"]);
    expect(narrativeDisplayLines(text).join("")).toBe(text);
  });

  it("keeps automatic reading time within the supported range", () => {
    expect(narrativeAutoAdvanceDelay("短句。")).toBe(2_500);
    expect(narrativeAutoAdvanceDelay("一".repeat(40))).toBe(4_400);
    expect(narrativeAutoAdvanceDelay("一".repeat(100))).toBe(6_500);
  });
});
