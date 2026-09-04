import type { MatchResult } from "./matchSimulator";
import type { Character } from "./gameData";
import type { TournamentEndingId } from "./tournamentEnding";
import type { TournamentFixture } from "./tournamentJourney";

export type TournamentSummaryEntry = {
  fixtureId: string;
  result: MatchResult;
  advanced?: boolean;
  extraTime?: { player: number; opponent: number };
  penalties?: { player: number; opponent: number };
};

export type JourneyPlayerPerformance = {
  characterId: string;
  appearances: number;
  averageRating: number;
  goals: number;
  assists: number;
  skillTriggers: number;
};

const endingEvaluations: Record<TournamentEndingId, string> = {
  "END-01": "差强人意",
  "END-02": "符合预期",
  "END-03": "天神下凡",
  "END-04": "功成名就",
  "END-05": "红衣奇迹",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function summarizeTournamentJourney(
  entries: TournamentSummaryEntry[],
  outcome: "champion" | "eliminated",
  registeredPlayers: Character[],
  fixtures: TournamentFixture[],
  endingId: TournamentEndingId,
) {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  const players = new Map<string, { appearances: number; rating: number; goals: number; assists: number; skillTriggers: number }>();

  for (const { result, extraTime } of entries) {
    const homeScore = result.homeScore + (extraTime?.player ?? 0);
    const awayScore = result.awayScore + (extraTime?.opponent ?? 0);
    goalsFor += homeScore;
    goalsAgainst += awayScore;
    if (homeScore > awayScore) wins += 1;
    else if (homeScore < awayScore) losses += 1;
    else draws += 1;
    for (const rating of result.ratings.filter(({ team }) => team === "home")) {
      const current = players.get(rating.characterId) ?? { appearances: 0, rating: 0, goals: 0, assists: 0, skillTriggers: 0 };
      current.appearances += 1;
      current.rating += rating.rating;
      current.goals += rating.goals;
      current.assists += rating.assists;
      current.skillTriggers += rating.skillTriggers;
      players.set(rating.characterId, current);
    }
  }

  const playerPerformances: JourneyPlayerPerformance[] = [...players.entries()].map(([characterId, performance]) => ({
    characterId,
    appearances: performance.appearances,
    averageRating: Number((performance.rating / performance.appearances).toFixed(1)),
    goals: performance.goals,
    assists: performance.assists,
    skillTriggers: performance.skillTriggers,
  })).sort((left, right) => right.averageRating - left.averageRating || right.goals - left.goals || right.assists - left.assists);

  const matches = entries.length;
  const mvpMinimumAppearances = Math.max(1, Math.ceil(matches / 2));
  const tournamentMvp = playerPerformances.filter(({ appearances }) => appearances >= mvpMinimumAppearances).sort((left, right) => {
    const leftImpact = left.averageRating + left.goals * .12 + left.assists * .06;
    const rightImpact = right.averageRating + right.goals * .12 + right.assists * .06;
    return rightImpact - leftImpact || right.appearances - left.appearances;
  })[0] ?? null;
  const squadRating = playerPerformances.length
    ? playerPerformances.reduce((sum, player) => sum + player.averageRating * player.appearances, 0) / playerPerformances.reduce((sum, player) => sum + player.appearances, 0)
    : 6;
  const averageStars = registeredPlayers.length ? registeredPlayers.reduce((sum, player) => sum + player.stars, 0) / registeredPlayers.length : 3;
  const averageOverall = registeredPlayers.length ? registeredPlayers.reduce((sum, player) => sum + player.attributes.overall, 0) / registeredPlayers.length : 68;
  const qualificationScore = clamp((averageStars - 3) / 3 * 100, 0, 100);
  const abilityScore = clamp((averageOverall - 68) / 26 * 100, 0, 100);
  const squadStrength = Math.round((qualificationScore + abilityScore) / 2);
  const finalFixture = fixtures.find(({ id }) => id === entries.at(-1)?.fixtureId);
  const resultRankScore = outcome === "champion" ? 96
    : finalFixture?.stage === "final" ? 80
      : finalFixture?.stage === "semi_final" ? 60
        : finalFixture?.stage === "quarter_final" ? 40
          : 20;
  const squadAdjustment = Math.round((50 - squadStrength) * .25);
  const score = clamp(resultRankScore + squadAdjustment, 0, 100);
  const evaluation = endingEvaluations[endingId];

  return {
    matches,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    squadRating: Number(squadRating.toFixed(1)),
    averageStars: Number(averageStars.toFixed(2)),
    averageOverall: Number(averageOverall.toFixed(1)),
    squadStrength,
    resultRankScore,
    squadAdjustment,
    score,
    evaluation,
    playerPerformances,
    tournamentMvp,
  };
}
