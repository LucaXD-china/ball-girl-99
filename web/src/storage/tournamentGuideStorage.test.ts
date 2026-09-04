import { describe, expect, it } from "vitest";
import {
  CHIBI_SAYA_INTRODUCTION_GUIDE_ID,
  hasSeenTournamentGuide,
  OFFICE_SAYA_INTRODUCTION_GUIDE_ID,
  rememberTournamentGuide,
  seenTournamentGuideIds,
} from "./tournamentGuideStorage";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("tournament guide storage", () => {
  it("remembers completed guide steps without duplicates", () => {
    const storage = memoryStorage();
    rememberTournamentGuide(storage, "manager-1", "match-attack");
    rememberTournamentGuide(storage, "manager-1", "match-attack");
    expect(seenTournamentGuideIds(storage, "manager-1")).toEqual(["match-attack"]);
    expect(hasSeenTournamentGuide(storage, "manager-1", "match-attack")).toBe(true);
  });

  it("keeps progress isolated by manager and tolerates invalid data", () => {
    const storage = memoryStorage();
    storage.setItem("ball-girl:tournament-guide:v1:broken", "not-json");
    rememberTournamentGuide(storage, "manager-1", "registration-select");
    expect(hasSeenTournamentGuide(storage, "manager-2", "registration-select")).toBe(false);
    expect(seenTournamentGuideIds(storage, "broken")).toEqual([]);
  });

  it("tracks both Saya introductions once per manager without a migration", () => {
    const storage = memoryStorage();
    expect(hasSeenTournamentGuide(storage, "existing-manager", OFFICE_SAYA_INTRODUCTION_GUIDE_ID)).toBe(false);
    rememberTournamentGuide(storage, "existing-manager", OFFICE_SAYA_INTRODUCTION_GUIDE_ID);
    rememberTournamentGuide(storage, "existing-manager", CHIBI_SAYA_INTRODUCTION_GUIDE_ID);
    expect(seenTournamentGuideIds(storage, "existing-manager")).toEqual([
      OFFICE_SAYA_INTRODUCTION_GUIDE_ID,
      CHIBI_SAYA_INTRODUCTION_GUIDE_ID,
    ]);
    expect(hasSeenTournamentGuide(storage, "another-manager", OFFICE_SAYA_INTRODUCTION_GUIDE_ID)).toBe(false);
  });

  it("keeps the same guide step isolated for each captain route", () => {
    const storage = memoryStorage();
    rememberTournamentGuide(storage, "manager:naya", "match-attack");
    expect(hasSeenTournamentGuide(storage, "manager:naya", "match-attack")).toBe(true);
    expect(hasSeenTournamentGuide(storage, "manager", "match-attack")).toBe(false);
    expect(hasSeenTournamentGuide(storage, "manager:irena", "match-attack")).toBe(false);
  });
});
