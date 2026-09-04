import { describe, expect, it } from "vitest";
import { difficultyUnlockNoticeForEnding, tournamentCaptainRoutes, unlockedTournamentCaptainIds } from "./tournamentCaptain";

describe("tournament captain routes", () => {
  it("unlocks routes in the END-03 then END-04 progression", () => {
    expect(unlockedTournamentCaptainIds({})).toEqual(["saya"]);
    expect(unlockedTournamentCaptainIds({ "END-03": "now" })).toEqual(["saya", "naya"]);
    expect(unlockedTournamentCaptainIds({ "END-03": "then", "END-04": "now" })).toEqual(["saya", "naya", "irena"]);
  });

  it("announces the newly unlocked difficulty after END-03 and END-04", () => {
    expect(difficultyUnlockNoticeForEnding("END-03")).toBe("已解锁新难度：困难");
    expect(difficultyUnlockNoticeForEnding("END-04")).toBe("已解锁新难度：极难");
    expect(difficultyUnlockNoticeForEnding("END-05")).toBeNull();
  });

  it("keeps route caps, endings, and founder-story gates centralized", () => {
    expect(tournamentCaptainRoutes.saya).toMatchObject({ positionLabel: "后卫", difficultyLabel: "普通", recruitmentBudget: 60, recruitmentStarCap: 6, starterExclusions: [], championEndingId: "END-03", founderStoryIds: ["SAYA", "NAYA", "IRENA"], opponentRarityByStage: { round_of_16: { fiveStar: 3, sixStar: 3 }, final: { fiveStar: 3, sixStar: 1 } } });
    expect(tournamentCaptainRoutes.naya).toMatchObject({ positionLabel: "前锋", difficultyLabel: "困难", recruitmentBudget: 50, recruitmentStarCap: 5, starterExclusions: ["silver_luciana_vega"], championEndingId: "END-04", founderStoryIds: ["IRENA"], semiFinalFounderId: null, finalFounderId: "founder_scarlet_toros_6", opponentRarityByStage: { round_of_16: { fiveStar: 2, sixStar: 2 }, final: { fiveStar: 4, sixStar: 1 } } });
    expect(tournamentCaptainRoutes.irena).toMatchObject({ positionLabel: "中场", difficultyLabel: "极难", recruitmentBudget: 40, recruitmentStarCap: 4, starterExclusions: ["silver_luciana_vega", "fog_eleanor_hart"], championEndingId: "END-05", founderStoryIds: [], semiFinalFounderId: null, finalFounderId: null, opponentRarityByStage: { round_of_16: { fiveStar: 2, sixStar: 1 }, quarter_final: { fiveStar: 2, sixStar: 1 }, semi_final: { fiveStar: 0, sixStar: 1 }, final: { fiveStar: 1, sixStar: 0 } } });
  });
});
