import { describe, expect, it } from "vitest";
import { nextEndingBeatIndex } from "./TournamentEndingPage";

describe("tournament ending playback", () => {
  it("shows the final beat before completing the ending", () => {
    expect(nextEndingBeatIndex(9, 11)).toBe(10);
    expect(nextEndingBeatIndex(10, 11)).toBeNull();
  });
});
