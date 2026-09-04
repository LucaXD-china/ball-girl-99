import React from "react";
import { createRoot } from "react-dom/client";
import { playableCharacters } from "./data/gameData";
import { recommendLineup, simulateMatch, type TournamentMatchContext } from "./data/matchSimulator";
import { generateOpponent, generateTournament } from "./data/tournamentJourney";
import { TOURNAMENT_STARTER_CHARACTER_IDS, type TournamentSquadState } from "./data/tournamentSquad";
import { MatchPage } from "./pages/MatchPage";
import type { TournamentResult } from "./storage/tournamentSaveStorage";
import "./styles.css";
import "./sunny-club.css";

const scenario = new URLSearchParams(window.location.search).get("scenario") === "aggregate" ? "aggregate" : "final";
const tournament = generateTournament(9917);
const fixture = scenario === "final"
  ? tournament.fixtures.find(({ stage }) => stage === "final")!
  : tournament.fixtures.find(({ stage, leg }) => stage === "semi_final" && leg === 2)!;
const registeredIds = [...TOURNAMENT_STARTER_CHARACTER_IDS];
const registeredIdSet = new Set<string>(registeredIds);
const homePlayers = playableCharacters.filter(({ character_id }) => registeredIdSet.has(character_id));
const context: TournamentMatchContext = {
  homeLineup: recommendLineup(homePlayers, "4-2-3-1", "4-4-2"),
  homeAttackFormationId: "4-2-3-1",
  homeDefenseFormationId: "4-4-2",
};
const opponent = generateOpponent(fixture, 9917, registeredIds, []);
const characters = [...homePlayers, ...opponent.characters];
let regulation = simulateMatch({
  characters,
  homeLineup: context.homeLineup,
  homeAttackFormationId: context.homeAttackFormationId,
  homeDefenseFormationId: context.homeDefenseFormationId,
  awayLineup: opponent.lineup,
  awayAttackFormationId: opponent.attackFormationId,
  awayDefenseFormationId: opponent.defenseFormationId,
  homeName: "北港晴空",
  awayName: opponent.name,
  fixtureSeed: scenario === "final" ? 4 : 17,
});
regulation = { ...regulation, homeScore: 1, awayScore: 1 };
const aggregateAt90 = scenario === "aggregate" ? { player: 3, opponent: 3 } : { player: 1, opponent: 1 };
const pending: TournamentResult = {
  fixtureId: fixture.id,
  result: regulation,
  matchContext: context,
  decision: { status: "pending", reason: scenario === "aggregate" ? "aggregate-draw" : "final-draw", aggregateAt90, events: [] },
};
const squad: TournamentSquadState = {
  collection: Object.fromEntries(registeredIds.map((id) => [id, 1])),
  characterProgress: Object.fromEntries(registeredIds.map((id) => [id, { focus: { attack: 0, playmaking: 0, defense: 0 }, breakthroughRank: 0 }])),
  skillInventory: {},
  skillLoadouts: {},
};

function Preview() {
  return <>
    <MatchPage
      guideScope={`decider-preview-${scenario}`}
      managerNickname="测试经理"
      clubName="北港晴空"
      squad={squad}
      onBackToOffice={() => window.location.reload()}
      match={{
        fixture,
        opponent,
        fixtureSeed: regulation.seed,
        currentDay: fixture.day,
        registeredIds,
        persistedResult: regulation,
        settlement: pending,
        onStarted: () => pending,
        onDecisionStarted: (simulation) => ({
          ...pending,
          result: simulation.result,
          advanced: simulation.advanced,
          extraTime: simulation.extraTime,
          penalties: simulation.penalties,
          decision: { ...pending.decision!, status: "complete", events: simulation.events },
        }),
        onContinue: () => window.location.reload(),
      }}
    />
  </>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><Preview /></React.StrictMode>);
