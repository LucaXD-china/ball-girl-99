import { describe, expect, it } from "vitest";
import { deriveTournamentBracket, playerAdvancementForStage, type BracketCampaignInput } from "./tournamentBracket";
import { generateTournament, stageOrder, TOURNAMENT_PLAYER_CLUB_ID } from "./tournamentJourney";

function bracketInput(seed: number, results: BracketCampaignInput["results"] = [], outcome: BracketCampaignInput["outcome"] = null): BracketCampaignInput {
  const tournament = generateTournament(seed);
  return { campaignSeed: seed, bracket: tournament.bracket, route: tournament.route, fixtures: tournament.fixtures, results, outcome };
}

function decisiveResultFixtureIds(seed: number) {
  const tournament = generateTournament(seed);
  return stageOrder.map((stage) => tournament.fixtures.find((fixture) => fixture.stage === stage && (stage === "final" ? true : fixture.leg === 2))!.id);
}

function playerWinsAllResults(seed: number) {
  return decisiveResultFixtureIds(seed).map((fixtureId) => ({ fixtureId, advanced: true }));
}

describe("tournament bracket derivation", () => {
  it("renders the full round of 16 and leaves later rounds pending", () => {
    const bracket = deriveTournamentBracket(bracketInput(7));
    expect(bracket.rounds).toHaveLength(4);
    expect(bracket.rounds[0].matches).toHaveLength(8);
    expect(bracket.rounds[0].matches.every((match) => match.leftTeamId !== null && match.rightTeamId !== null)).toBe(true);
    expect(bracket.rounds[0].matches.some((match) => match.involvesPlayer)).toBe(true);
    // 未决出的八强、半决赛、决赛全部待定，冠军未定。
    expect(bracket.rounds[1].matches.every((match) => match.winnerId === null)).toBe(true);
    expect(bracket.rounds[2].matches.every((match) => match.leftTeamId === null && match.rightTeamId === null)).toBe(true);
    expect(bracket.rounds[3].matches[0].leftTeamId).toBeNull();
    expect(bracket.championId).toBeNull();
    expect(bracket.playerEliminated).toBe(false);
  });

  it("places the player at their drawn round-of-16 slot", () => {
    const seed = 7;
    const tournament = generateTournament(seed);
    const playerIdx = tournament.bracket.indexOf(TOURNAMENT_PLAYER_CLUB_ID);
    const bracket = deriveTournamentBracket(bracketInput(seed));
    const playerR16 = bracket.rounds[0].matches.find((match) => match.involvesPlayer)!;
    const neighbor = tournament.bracket[playerIdx % 2 === 0 ? playerIdx + 1 : playerIdx - 1];
    const opponent = playerR16.leftTeamId === TOURNAMENT_PLAYER_CLUB_ID ? playerR16.rightTeamId : playerR16.leftTeamId;
    expect(opponent).toBe(neighbor);
  });

  it("keeps the player's future opponents hidden until their round is reached", () => {
    const bracket = deriveTournamentBracket(bracketInput(7), 0);
    const quarter = bracket.rounds[1].matches.find((match) => match.involvesPlayer)!;
    expect(quarter.leftTeamId).toBeNull();
    expect(quarter.rightTeamId).toBeNull();
    const semi = bracket.rounds[2].matches.find((match) => match.involvesPlayer)!;
    expect(semi.leftTeamId).toBeNull();
    expect(semi.rightTeamId).toBeNull();
  });

  it("advances the player into the quarter-final and reveals only that opponent after a round-of-16 win", () => {
    const seed = 7;
    const tournament = generateTournament(seed);
    const fixtureId = decisiveResultFixtureIds(seed)[0];
    const bracket = deriveTournamentBracket(bracketInput(seed, [{ fixtureId, advanced: true }]), 1);
    const playerR16 = bracket.rounds[0].matches.find((match) => match.involvesPlayer)!;
    expect(playerR16.winnerId).toBe(TOURNAMENT_PLAYER_CLUB_ID);
    const playerQuarter = bracket.rounds[1].matches.find((match) => match.involvesPlayer)!;
    expect([playerQuarter.leftTeamId, playerQuarter.rightTeamId]).toContain(TOURNAMENT_PLAYER_CLUB_ID);
    const opponent = playerQuarter.leftTeamId === TOURNAMENT_PLAYER_CLUB_ID ? playerQuarter.rightTeamId : playerQuarter.leftTeamId;
    expect(opponent).toBe(tournament.route[1]);
    expect(playerQuarter.winnerId).toBeNull();
    const semi = bracket.rounds[2].matches.find((match) => match.involvesPlayer)!;
    expect(semi.leftTeamId).toBeNull();
    expect(semi.rightTeamId).toBeNull();
  });

  it("stops revealing the player path after an elimination", () => {
    const seed = 7;
    const fixtureId = decisiveResultFixtureIds(seed)[0];
    const bracket = deriveTournamentBracket(bracketInput(seed, [{ fixtureId, advanced: false }], "eliminated"), 1);
    expect(bracket.playerEliminated).toBe(true);
    const playerR16 = bracket.rounds[0].matches.find((match) => match.involvesPlayer)!;
    expect(playerR16.winnerId).not.toBe(TOURNAMENT_PLAYER_CLUB_ID);
    expect(playerR16.winnerId).not.toBeNull();
    expect(bracket.rounds[1].matches.some((match) => match.involvesPlayer)).toBe(false);
    expect(bracket.championId).toBeNull();
  });

  it("crowns the player champion after winning the final", () => {
    const seed = 9;
    const bracket = deriveTournamentBracket(bracketInput(seed, playerWinsAllResults(seed), "champion"), 4);
    expect(bracket.championId).toBe(TOURNAMENT_PLAYER_CLUB_ID);
    expect(bracket.playerEliminated).toBe(false);
  });

  it("is deterministic for identical inputs", () => {
    const results = playerWinsAllResults(11);
    expect(deriveTournamentBracket(bracketInput(11, results, "champion"), 4)).toEqual(deriveTournamentBracket(bracketInput(11, results, "champion"), 4));
  });

  it("reproduces the player's quarter-final to final route when the player always wins", () => {
    const seed = 42;
    const tournament = generateTournament(seed);
    const bracket = deriveTournamentBracket(bracketInput(seed, playerWinsAllResults(seed)), 4);
    for (let round = 1; round < stageOrder.length; round += 1) {
      const match = bracket.rounds[round].matches.find((item) => item.involvesPlayer)!;
      const opponent = match.leftTeamId === TOURNAMENT_PLAYER_CLUB_ID ? match.rightTeamId : match.leftTeamId;
      expect(opponent).toBe(tournament.route[round]);
    }
  });

  it("reads the player advancement from the decisive fixture", () => {
    const seed = 3;
    const tournament = generateTournament(seed);
    const r16Leg1 = tournament.fixtures.find((fixture) => fixture.stage === "round_of_16" && fixture.leg === 1)!;
    const r16Leg2 = tournament.fixtures.find((fixture) => fixture.stage === "round_of_16" && fixture.leg === 2)!;
    const campaign = bracketInput(seed, [{ fixtureId: r16Leg1.id, advanced: true }]);
    expect(playerAdvancementForStage(campaign, "round_of_16")).toBeUndefined();
    const decided = { ...campaign, results: [{ fixtureId: r16Leg1.id, advanced: true }, { fixtureId: r16Leg2.id, advanced: false }] };
    expect(playerAdvancementForStage(decided, "round_of_16")).toBe(false);
  });
});
