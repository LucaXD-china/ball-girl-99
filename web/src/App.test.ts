import { describe, expect, it } from "vitest";
import { shouldPresentDay1Story, tournamentMusicScene } from "./TournamentApp";
import { tournamentLockerCharacterIds, tournamentSectionLock } from "./data/tournamentRules";
import { createTournamentSave } from "./storage/tournamentSaveStorage";

describe("tournament home navigation", () => {
  it("maps login-adjacent tournament screens to the requested music scenes", () => {
    expect(tournamentMusicScene("office", false, false, false)).toBe("quest");
    expect(tournamentMusicScene("training", false, false, false)).toBe("quest");
    expect(tournamentMusicScene("stories", false, false, false)).toBe("quest");
    expect(tournamentMusicScene("match", false, false, false)).toBe("quest");
    expect(tournamentMusicScene("match", false, false, true)).toBe("battle");
    expect(tournamentMusicScene("match", true, false, true)).toBe("silent");
    expect(tournamentMusicScene("stories", false, true, false)).toBe("silent");
    expect(tournamentMusicScene("schedule", false, true, false)).toBe("silent");
  });

  it("plays the Day 1 story immediately after the Day 1 title card", () => {
    expect(shouldPresentDay1Story({ phase: "briefing", shownTimelineCardIds: [] }, false)).toBe(false);
    expect(shouldPresentDay1Story({ phase: "recruitment", shownTimelineCardIds: [] }, false)).toBe(false);
    expect(shouldPresentDay1Story({ phase: "recruitment", shownTimelineCardIds: ["DAY-1"] }, false)).toBe(true);
    expect(shouldPresentDay1Story({ phase: "recruitment", shownTimelineCardIds: ["DAY-1"] }, true)).toBe(false);
    expect(shouldPresentDay1Story({ phase: "registration", shownTimelineCardIds: ["DAY-1"] }, false)).toBe(false);
  });

  it("keeps the locker open before the cup briefing is accepted", () => {
    const campaign = createTournamentSave(7).campaign;
    expect(tournamentSectionLock(campaign, "locker")).toBeNull();
    expect(tournamentSectionLock(campaign, "training")).toContain("董事会");
    expect(tournamentSectionLock(campaign, "schedule")).toContain("董事会");
    expect(tournamentSectionLock(campaign, "match")).toContain("董事会");
    expect(tournamentSectionLock(campaign, "office")).toBeNull();
    expect(tournamentSectionLock(campaign, "stories")).toBeNull();
  });

  it("keeps the schedule bracket open while gating the match until match day", () => {
    const campaign = createTournamentSave(7).campaign;
    const preparation = {
      ...campaign,
      phase: "preparation" as const,
      day: 10,
      currentFixtureIndex: 0,
      fixtures: [{ id: "r16-1", stage: "round_of_16" as const, leg: 1 as const, day: 18, opponentBlueprintId: "lumiere_crown" }],
    };
    expect(tournamentSectionLock(preparation, "schedule")).toBeNull();
    expect(tournamentSectionLock(preparation, "match")).toContain("比赛日");
  });

  it("keeps the locker room available throughout every cup phase", () => {
    const campaign = createTournamentSave(7).campaign;
    for (const phase of ["briefing", "recruitment", "registration", "draw", "preparation", "finished"] as const) {
      expect(tournamentSectionLock({ ...campaign, phase }, "locker")).toBeNull();
    }
  });

  it("limits the tournament locker to registered players only after registration is locked", () => {
    const campaign = createTournamentSave(7).campaign;
    const registeredIds = Array.from({ length: 18 }, (_, index) => `player-${index}`);

    expect(tournamentLockerCharacterIds(campaign)).toBeUndefined();
    expect(tournamentLockerCharacterIds({ ...campaign, phase: "draw", registration: { selection: registeredIds, registeredIds, locked: true } })).toEqual(registeredIds);
  });
});
