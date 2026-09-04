import { createRoot } from "react-dom/client";
import { MatchPage } from "./pages/MatchPage";
import { TournamentCaptainProvider } from "./components/TournamentCaptainContext";
import { TournamentEndView } from "./pages/SchedulePage";
import { playableCharacters } from "./data/gameData";
import { fixtureSeed, generateOpponent, generateTournament, type TournamentFixture } from "./data/tournamentJourney";
import { recommendLineup, simulateMatch, type MatchResult, type TournamentDecisionSimulation, type TournamentMatchContext } from "./data/matchSimulator";
import { buildTournamentCharacters, TOURNAMENT_STARTER_CHARACTER_IDS, type TournamentSquadState } from "./data/tournamentSquad";
import type { TournamentSummaryEntry } from "./data/tournamentSummary";
import { isTournamentCaptainId } from "./data/tournamentCaptain";
import "./styles.css";
import "./sunny-club.css";

const query = new URLSearchParams(window.location.search);
const phase = (query.get("phase") ?? "setup") as "setup" | "result" | "end";
const requestedCaptain = query.get("captain");
const captainId = isTournamentCaptainId(requestedCaptain) ? requestedCaptain : "saya";
const tournament = generateTournament(9917);
const fixture = tournament.fixtures.find(({ stage }) => stage === "semi_final")!;
const registeredIds = [...TOURNAMENT_STARTER_CHARACTER_IDS];
const squad: TournamentSquadState = {
  collection: Object.fromEntries(registeredIds.map((id) => [id, 1])),
  characterProgress: {},
  skillInventory: {},
  skillLoadouts: {},
};
const ownedPlayers = buildTournamentCharacters(playableCharacters, squad);
const opponent = generateOpponent(fixture, 9917, registeredIds, []);
const homeAttackFormationId = "4-2-3-1" as const;
const homeDefenseFormationId = "4-4-2" as const;
const homeLineup = recommendLineup(ownedPlayers, homeAttackFormationId, homeDefenseFormationId);
const characters = [...ownedPlayers, ...opponent.characters];
const fixtureSeedValue = fixtureSeed(9917, fixture.id, fixture.leg);
const result: MatchResult = simulateMatch({
  characters,
  homeLineup,
  homeAttackFormationId,
  homeDefenseFormationId,
  awayLineup: opponent.lineup,
  awayAttackFormationId: opponent.attackFormationId,
  awayDefenseFormationId: opponent.defenseFormationId,
  homeName: "北港晴空",
  awayName: opponent.name,
  fixtureSeed: 42,
});
const matchContext: TournamentMatchContext = { homeLineup, homeAttackFormationId, homeDefenseFormationId, homeMatchEffects: undefined };
const settlement = { fixtureId: fixture.id, result, advanced: true, matchContext };

const endResults: TournamentSummaryEntry[] = tournament.fixtures.map((item: TournamentFixture) => {
  const itemOpponent = generateOpponent(item, 9917, registeredIds, []);
  const itemResult = simulateMatch({
    characters: [...ownedPlayers, ...itemOpponent.characters],
    homeLineup,
    homeAttackFormationId,
    homeDefenseFormationId,
    awayLineup: itemOpponent.lineup,
    awayAttackFormationId: itemOpponent.attackFormationId,
    awayDefenseFormationId: itemOpponent.defenseFormationId,
    homeName: "北港晴空",
    awayName: itemOpponent.name,
    fixtureSeed: fixtureSeed(9917, item.id, item.leg),
  });
  return { fixtureId: item.id, result: itemResult, advanced: itemResult.homeScore > itemResult.awayScore };
});

const match = {
  fixture,
  opponent,
  fixtureSeed: fixtureSeedValue,
  currentDay: fixture.day,
  registeredIds,
  ...(phase === "result" ? { persistedResult: result, settlement } : {}),
  onStarted: (_r: MatchResult, c: TournamentMatchContext) => ({ fixtureId: fixture.id, result: _r, advanced: true, matchContext: c }),
  onDecisionStarted: (s: TournamentDecisionSimulation) => ({ fixtureId: fixture.id, result: s.result, advanced: true }),
  onContinue: () => undefined,
};

createRoot(document.getElementById("root")!).render(
  <TournamentCaptainProvider captainId={captainId}><div className="app-shell">
    <main className="main-content">
      {phase === "end"
        ? <TournamentEndView guideScope="schedule-preview" outcome="champion" results={endResults} fixtures={tournament.fixtures} registeredIds={registeredIds} managerNickname="测试" clubName="北港晴空" players={ownedPlayers} onRestart={() => undefined} onBack={() => undefined} />
        : <MatchPage guideScope="schedule-preview" managerNickname="测试" clubName="北港晴空" squad={squad} onBackToOffice={() => undefined} match={match} />}
    </main>
  </div></TournamentCaptainProvider>,
);
