import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MatchResult } from "../data/matchSimulator";
import { generateOpponent, generateTournament } from "../data/tournamentJourney";
import { TOURNAMENT_STARTER_CHARACTER_IDS, type TournamentSquadState } from "../data/tournamentSquad";
import { MatchPage, OPENING_WHISTLE_DELAY_MS, isBattleMusicPhase, matchEventPortraitMode, matchResultGuideTitle, matchResultOutcomeLabel, shouldPlayFinalWhistle, twoLegAggregateScore } from "./MatchPage";

describe("battle music phase", () => {
  it("plays only during live regulation or live decider playback", () => {
    expect(isBattleMusicPhase("setup")).toBe(false);
    expect(isBattleMusicPhase("live")).toBe(true);
    expect(isBattleMusicPhase("decision-preparation")).toBe(false);
    expect(isBattleMusicPhase("decision-live")).toBe(true);
    expect(isBattleMusicPhase("result")).toBe(false);
  });
});

describe("match whistle boundaries", () => {
  it("separates the opening whistle from the confirmation click", () => {
    expect(OPENING_WHISTLE_DELAY_MS).toBe(320);
  });

  it("does not end regulation before a required decider", () => {
    expect(shouldPlayFinalWhistle("live", true)).toBe(false);
  });

  it("ends a completed regulation or decider exactly at result transition", () => {
    expect(shouldPlayFinalWhistle("live", false)).toBe(true);
    expect(shouldPlayFinalWhistle("decision-live", false)).toBe(true);
  });
});

describe("live match event portrait", () => {
  it("shows the scoring player for goals without a skill", () => {
    expect(matchEventPortraitMode({ kind: "goal", playerId: "scorer" })).toBe("goal");
  });

  it("keeps the scoring player ahead of skill cut-ins for goals", () => {
    expect(matchEventPortraitMode({ kind: "goal", playerId: "scorer", skillId: "finisher" })).toBe("goal");
  });

  it("does not add portraits to ordinary events or events without a player", () => {
    expect(matchEventPortraitMode({ kind: "transition", playerId: "runner" })).toBeNull();
    expect(matchEventPortraitMode({ kind: "goal" })).toBeNull();
  });

  it("shows the taker for a scored penalty and the keeper for an unsuccessful one", () => {
    expect(matchEventPortraitMode({ kind: "penalty-goal", playerId: "taker" })).toBe("penalty-goal");
    expect(matchEventPortraitMode({ kind: "penalty-save", playerId: "keeper" })).toBe("penalty-stop");
    expect(matchEventPortraitMode({ kind: "penalty-miss", playerId: "keeper" })).toBe("penalty-stop");
  });
});

describe("match result guide copy", () => {
  it("celebrates a win in regular time or extra time", () => {
    expect(matchResultGuideTitle({ homeScore: 2, awayScore: 1 })).toBe("好耶，首战告捷！");
    expect(matchResultGuideTitle({ homeScore: 1, awayScore: 1 }, { extraTime: { player: 1, opponent: 0 } })).toBe("好耶，首战告捷！");
  });

  it("comforts after a loss and respects penalty results", () => {
    expect(matchResultGuideTitle({ homeScore: 0, awayScore: 1 })).toBe("别灰心！");
    expect(matchResultGuideTitle({ homeScore: 1, awayScore: 1 }, { penalties: { player: 3, opponent: 4 } })).toBe("别灰心！");
  });
});

describe("match result outcome label", () => {
  it("declares a final winner champion instead of advanced", () => {
    expect(matchResultOutcomeLabel("final", { advanced: true }, 2, 1)).toBe("冠军");
  });

  it("keeps advanced for winners before the final", () => {
    expect(matchResultOutcomeLabel("semi_final", { advanced: true }, 2, 1)).toBe("晋级");
  });

  it("marks a final loss as the end of the campaign", () => {
    expect(matchResultOutcomeLabel("final", { advanced: false }, 0, 1)).toBe("征程结束");
  });
});

describe("two-leg aggregate score", () => {
  it("returns undefined for a single-leg or final match", () => {
    expect(twoLegAggregateScore(undefined, 4, 4)).toBeUndefined();
  });

  it("adds the first leg to the current leg for the aggregate", () => {
    expect(twoLegAggregateScore({ home: 2, away: 1 }, 4, 4)).toEqual({ home: 6, away: 5 });
    expect(twoLegAggregateScore({ home: 2, away: 1 }, 2, 3)).toEqual({ home: 4, away: 4 });
  });
});

describe("match page", () => {
  it("offers a way to view the scout report from match setup", () => {
    const tournament = generateTournament(9917);
    const fixture = tournament.fixtures.find(({ stage }) => stage === "semi_final")!;
    const registeredIds = [...TOURNAMENT_STARTER_CHARACTER_IDS];
    const squad: TournamentSquadState = {
      collection: Object.fromEntries(registeredIds.map((id) => [id, 1])),
      characterProgress: {},
      skillInventory: {},
      skillLoadouts: {},
    };
    const opponent = generateOpponent(fixture, 9917, registeredIds, []);
    const match = {
      fixture,
      opponent,
      fixtureSeed: 42,
      currentDay: fixture.day,
      registeredIds,
      onStarted: () => ({ fixtureId: fixture.id, result: { homeScore: 0, awayScore: 0 } as MatchResult, advanced: true }),
      onDecisionStarted: () => ({ fixtureId: fixture.id, result: { homeScore: 0, awayScore: 0 } as MatchResult, advanced: true }),
      onContinue: () => undefined,
    };
    const markup = renderToStaticMarkup(createElement(MatchPage, { guideScope: "match-preview", managerNickname: "测试", clubName: "北港晴空", squad, onBackToOffice: () => undefined, onViewScoutReport: () => undefined, match }));
    expect(markup).toContain("scout-report-toggle");
    expect(markup).toContain("球探报告");
    expect(markup).toContain('data-saya-guide-target="match-attack" data-sfx="confirm"');
    expect(markup).not.toContain("sound-toggle");
    expect(markup).not.toContain("关闭比赛音效");
    expect(markup).not.toContain("undefined");
  });
});
