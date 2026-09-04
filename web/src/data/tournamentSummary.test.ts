import { describe, expect, it } from "vitest";
import { roster } from "./gameData";
import type { MatchResult } from "./matchSimulator";
import type { TournamentFixture } from "./tournamentJourney";
import { summarizeTournamentJourney } from "./tournamentSummary";

const weakSquad = [...roster.characters].sort((left, right) => left.stars - right.stars || left.attributes.overall - right.attributes.overall).slice(0, 18);
const strongSquad = [...roster.characters].sort((left, right) => right.stars - left.stars || right.attributes.overall - left.attributes.overall).slice(0, 18);

function fixture(id: string, stage: TournamentFixture["stage"]): TournamentFixture {
  return { id, stage, day: 99, leg: stage === "final" ? 1 : 2, opponentBlueprintId: "test-opponent" };
}

function result(homeScore: number, awayScore: number, rating: number): MatchResult {
  return {
    seed: homeScore * 10 + awayScore,
    homeName: "曼联",
    awayName: "测试对手",
    homeScore,
    awayScore,
    homePossession: 52,
    homeShots: 12,
    awayShots: 9,
    homeXg: 1.5,
    awayXg: 1.1,
    homeAttack: 88,
    homeDefense: 87,
    awayAttack: 86,
    awayDefense: 86,
    skillTriggers: 2,
    mvpId: "player-1",
    ratings: [{ characterId: "player-1", team: "home", rating, goals: homeScore, assists: 1, skillTriggers: 2, ordinaryEvents: 3 }],
    events: [],
  };
}

describe("tournament journey summary", () => {
  it("aggregates manager record and player performances", () => {
    const summary = summarizeTournamentJourney([
      { fixtureId: "r16-1", result: result(2, 1, 8.2) },
      { fixtureId: "r16-2", result: result(1, 1, 7.4), advanced: true },
    ], "eliminated", weakSquad, [fixture("r16-2", "round_of_16")], "END-01");
    expect(summary).toMatchObject({ matches: 2, wins: 1, draws: 1, losses: 0, goalsFor: 3, goalsAgainst: 2 });
    expect(summary.evaluation).toBe("差强人意");
    expect(summary.playerPerformances[0]).toMatchObject({ characterId: "player-1", appearances: 2, averageRating: 7.8, goals: 3, assists: 2 });
    expect(summary.tournamentMvp?.characterId).toBe("player-1");
  });

  it("rewards a complete championship journey without granting a fixed result bonus in matches", () => {
    const entries = Array.from({ length: 7 }, (_, index) => ({ fixtureId: `fixture-${index}`, result: result(2, index % 3 === 0 ? 1 : 0, 8.3), advanced: true }));
    const summary = summarizeTournamentJourney(entries, "champion", strongSquad, [fixture("fixture-6", "final")], "END-03");
    expect(summary.resultRankScore).toBe(96);
    expect(summary.score).toBeLessThan(99);
    expect(summary.evaluation).toBe("天神下凡");
  });

  it("awards tournament MVP from players who appeared in at least half of the journey", () => {
    const entries = Array.from({ length: 4 }, (_, index) => ({ fixtureId: `fixture-${index}`, result: result(1, 0, 8.1) }));
    entries[0].result.ratings.push({ characterId: "one-match-star", team: "home", rating: 9.9, goals: 2, assists: 0, skillTriggers: 1, ordinaryEvents: 2 });
    const summary = summarizeTournamentJourney(entries, "eliminated", weakSquad, [fixture("fixture-3", "quarter_final")], "END-01");
    expect(summary.tournamentMvp?.characterId).toBe("player-1");
  });

  it("scores the same finishing rank higher with a weaker locked roster", () => {
    const entries = [{ fixtureId: "final", result: result(1, 2, 7.6) }];
    const fixtures = [fixture("final", "final")];
    const weakResult = summarizeTournamentJourney(entries, "eliminated", weakSquad, fixtures, "END-02");
    const strongResult = summarizeTournamentJourney(entries, "eliminated", strongSquad, fixtures, "END-02");
    expect(weakResult.score).toBeGreaterThan(strongResult.score);
    expect(weakResult.evaluation).toBe("符合预期");
    expect(strongResult.evaluation).toBe("符合预期");
  });

  it("leaves rating headroom for a four-star-cap championship", () => {
    const entries = Array.from({ length: 7 }, (_, index) => ({ fixtureId: `fixture-${index}`, result: result(2, 0, 8.3), advanced: true }));
    const fourStarSquad = [...roster.characters].filter(({ stars }) => stars <= 4)
      .sort((left, right) => right.stars - left.stars || right.attributes.overall - left.attributes.overall).slice(0, 18);
    const strongResult = summarizeTournamentJourney(entries, "champion", strongSquad, [fixture("fixture-6", "final")], "END-03");
    const fourStarResult = summarizeTournamentJourney(entries, "champion", fourStarSquad, [fixture("fixture-6", "final")], "END-05");
    expect(fourStarResult.score).toBeGreaterThan(strongResult.score);
    expect(fourStarResult.score).toBeLessThanOrEqual(100);
  });

  it("counts extra-time goals while keeping a penalty shootout as a drawn match", () => {
    const extraTimeWin = summarizeTournamentJourney([
      { fixtureId: "final", result: result(1, 1, 7.8), extraTime: { player: 1, opponent: 0 }, advanced: true },
    ], "champion", strongSquad, [fixture("final", "final")], "END-03");
    const penaltyWin = summarizeTournamentJourney([
      { fixtureId: "final", result: result(1, 1, 7.8), extraTime: { player: 0, opponent: 0 }, penalties: { player: 5, opponent: 4 }, advanced: true },
    ], "champion", strongSquad, [fixture("final", "final")], "END-03");

    expect(extraTimeWin).toMatchObject({ wins: 1, draws: 0, goalsFor: 2, goalsAgainst: 1 });
    expect(penaltyWin).toMatchObject({ wins: 0, draws: 1, goalsFor: 1, goalsAgainst: 1 });
  });
});
