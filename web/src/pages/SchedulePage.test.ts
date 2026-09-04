import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { deriveTournamentBracket, type BracketCampaignInput } from "../data/tournamentBracket";
import { generateTournament, stageOrder, TOURNAMENT_PLAYER_CLUB_ID } from "../data/tournamentJourney";
import { TournamentCaptainProvider } from "../components/TournamentCaptainContext";
import { clubBlueprints } from "../data/tournamentJourney";
import { TournamentBracketView, TournamentDrawView } from "./SchedulePage";

function bracketInput(seed: number, results: BracketCampaignInput["results"] = [], outcome: BracketCampaignInput["outcome"] = null): BracketCampaignInput {
  const tournament = generateTournament(seed);
  return { campaignSeed: seed, bracket: tournament.bracket, route: tournament.route, fixtures: tournament.fixtures, results, outcome };
}

function renderBracket(seed: number, currentStageIndex: number, results: BracketCampaignInput["results"] = [], outcome: BracketCampaignInput["outcome"] = null) {
  const input = bracketInput(seed, results, outcome);
  const bracket = deriveTournamentBracket(input, currentStageIndex);
  return renderToStaticMarkup(createElement(TournamentBracketView, { bracket, clubName: "北港晴空" }));
}

describe("tournament bracket view", () => {
  it("keeps the draw result sealed until the player opens the envelope", () => {
    const tournament = generateTournament(9917);
    const opponent = clubBlueprints.find(({ id }) => id === tournament.route[0])!;
    const markup = renderToStaticMarkup(createElement(TournamentCaptainProvider, { captainId: "saya", children: createElement(TournamentDrawView, { guideScope: "test", opponent, bracketIds: tournament.bracket, clubName: "北港晴空", onConfirm: () => undefined, onBack: () => undefined }) }));
    expect(markup).toContain("16强抽签信封");
    expect(markup).toContain("冠军联赛 · 启程");
    expect(markup).toContain('aria-label="撕开信封，揭晓对手"');
    expect(markup).not.toContain("接受抽签结果");
    expect(markup).not.toContain(opponent.name);
  });

  it("renders a left-right 16→8→4→2 bracket without spoiling future opponents", () => {
    const markup = renderBracket(9917, 0);
    expect(markup).toContain("draw-bracket");
    expect(markup).toContain("16强");
    expect(markup).toContain("八强");
    expect(markup).toContain("半决赛");
    expect(markup).toContain("决赛");
    expect(markup).toContain("player-team");
    expect(markup).toContain("待定");
    expect(markup).not.toContain("可能对手");
    expect(markup).not.toContain("下一轮对手");
    expect(markup).not.toContain("待晋级");
    expect(markup).not.toContain("undefined");
  });

  it("marks the player's advancement with a 晋级 badge after a round-of-16 win", () => {
    const seed = 9917;
    const tournament = generateTournament(seed);
    const r16Leg2 = tournament.fixtures.find((fixture) => fixture.stage === "round_of_16" && fixture.leg === 2)!;
    const markup = renderBracket(seed, 1, [{ fixtureId: r16Leg2.id, advanced: true }]);
    expect(markup).toContain("晋级");
    expect(markup).toContain("待定");
  });

  it("fills other round-of-16 qualifiers deterministically after the player advances", () => {
    const seed = 9917;
    const tournament = generateTournament(seed);
    const r16Leg2 = tournament.fixtures.find((fixture) => fixture.stage === "round_of_16" && fixture.leg === 2)!;
    const bracket = deriveTournamentBracket(bracketInput(seed, [{ fixtureId: r16Leg2.id, advanced: true }]), 1);
    const roundOf16 = bracket.rounds[0];
    expect(roundOf16.matches.every(({ winnerId }) => winnerId !== null)).toBe(true);
    expect(roundOf16.matches.filter(({ involvesPlayer }) => !involvesPlayer).every(({ winnerId }) => winnerId !== null)).toBe(true);
  });

  it("keeps the semi-final and final path inside the fixed story-opponent route", () => {
    const seed = 9917;
    const tournament = generateTournament(seed);
    const results = [
      tournament.fixtures.find(({ stage, leg }) => stage === "round_of_16" && leg === 2)!,
      tournament.fixtures.find(({ stage, leg }) => stage === "quarter_final" && leg === 2)!,
    ].map(({ id }) => ({ fixtureId: id, advanced: true }));
    const bracket = deriveTournamentBracket(bracketInput(seed, results), 2);
    const semi = bracket.rounds[2].matches;
    const playerSemi = semi.find(({ involvesPlayer }) => involvesPlayer)!;
    const otherSemi = semi.find(({ involvesPlayer }) => !involvesPlayer)!;
    expect([playerSemi.leftTeamId, playerSemi.rightTeamId]).toContain(tournament.route[2]);
    expect([otherSemi.leftTeamId, otherSemi.rightTeamId]).toContain(tournament.route[3]);

    const finalBracket = deriveTournamentBracket(bracketInput(seed, [
      ...results,
      { fixtureId: tournament.fixtures.find(({ stage, leg }) => stage === "semi_final" && leg === 2)!.id, advanced: true },
    ]), 3);
    expect([finalBracket.rounds[3].matches[0].leftTeamId, finalBracket.rounds[3].matches[0].rightTeamId]).toContain(tournament.route[3]);
  });

  it("keeps the player's future rounds as pending instead of naming opponents", () => {
    const seed = 9917;
    const tournament = generateTournament(seed);
    const r16Leg2 = tournament.fixtures.find((fixture) => fixture.stage === "round_of_16" && fixture.leg === 2)!;
    const markup = renderBracket(seed, 1, [{ fixtureId: r16Leg2.id, advanced: true }]);
    expect(markup).not.toContain("可能对手");
    expect(markup).not.toContain("晋级后遭遇");
    expect(markup).toContain("待定");
  });

  it("shows the champion club when the tournament is complete", () => {
    const seed = 9917;
    const tournament = generateTournament(seed);
    const results = stageOrder.map((stage) => {
      const fixture = tournament.fixtures.find((item) => item.stage === stage && (stage === "final" ? true : item.leg === 2))!;
      return { fixtureId: fixture.id, advanced: true };
    });
    const markup = renderBracket(seed, stageOrder.length, results, "champion");
    expect(markup).toContain("CHAMPION");
    expect(markup).toContain("北港晴空");
    expect(markup).not.toContain(TOURNAMENT_PLAYER_CLUB_ID);
  });
});
