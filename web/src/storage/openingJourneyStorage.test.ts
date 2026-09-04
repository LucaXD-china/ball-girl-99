import { describe, expect, it } from "vitest";
import {
  loadOpeningJourney,
  openingJourneyKey,
  updateOpeningJourney,
  validateClubName,
} from "./openingJourneyStorage";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("opening journey storage", () => {
  it("starts before the prologue and isolates progress by uid", () => {
    const storage = memoryStorage();
    expect(loadOpeningJourney("manager-a", storage).prologueCompleted).toBe(false);
    updateOpeningJourney("manager-a", { prologueBeat: 4, nicknameConfirmed: true }, storage);
    expect(loadOpeningJourney("manager-a", storage).prologueBeat).toBe(4);
    expect(loadOpeningJourney("manager-b", storage).prologueBeat).toBe(0);
    expect(loadOpeningJourney("manager-a", storage).day1StoryCompleted).toBe(false);
    expect(storage.getItem(openingJourneyKey("manager-a"))).toContain('"nicknameConfirmed":true');
  });

  it("migrates existing prologue-only progress and persists the Day 1 story", () => {
    const storage = memoryStorage();
    storage.setItem(openingJourneyKey("manager-a"), JSON.stringify({
      schemaVersion: 1,
      prologueBeat: 27,
      nicknameConfirmed: true,
      clubName: "晴空竞技",
      prologueCompleted: true,
      updatedAt: "2026-08-22T00:00:00.000Z",
    }));
    expect(loadOpeningJourney("manager-a", storage)).toMatchObject({ day1StoryBeat: 0, day1StoryCompleted: false });
    expect(updateOpeningJourney("manager-a", { day1StoryBeat: 8, day1StoryCompleted: true }, storage)).toMatchObject({ day1StoryBeat: 8, day1StoryCompleted: true });
  });

  it("persists the team name and completed opening", () => {
    const storage = memoryStorage();
    const state = updateOpeningJourney("manager-a", {
      clubName: validateClubName("晴空竞技"),
      prologueCompleted: true,
    }, storage);
    expect(state.clubName).toBe("晴空竞技");
    expect(loadOpeningJourney("manager-a", storage).prologueCompleted).toBe(true);
  });

  it("rejects invalid team names", () => {
    expect(() => validateClubName("A")).toThrow("球队名需为 2–20 个字符");
  });
});
