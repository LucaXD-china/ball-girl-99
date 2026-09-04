import { describe, expect, it } from "vitest";
import { day1StoryBeats } from "../data/day1Story";
import { shouldOpenCaptainSelection } from "./Day1StoryPage";

describe("Day 1 captain selection", () => {
  it("opens after the final captain-choice sentence, not before it", () => {
    const beats = day1StoryBeats("小鹿", true);
    expect(shouldOpenCaptainSelection(beats.length - 2, beats.length, 3)).toBe(false);
    expect(shouldOpenCaptainSelection(beats.length - 1, beats.length, 3)).toBe(true);
    expect(shouldOpenCaptainSelection(beats.length - 1, beats.length, 1)).toBe(false);
  });
});
