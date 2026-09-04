import { createRoot } from "react-dom/client";
import { roster } from "./data/gameData";
import type { MatchResult } from "./data/matchSimulator";
import type { TournamentFixture } from "./data/tournamentJourney";
import type { TournamentEndingId } from "./data/tournamentEnding";
import { isTournamentCaptainId, type TournamentCaptainId } from "./data/tournamentCaptain";
import { TournamentEndView } from "./pages/SchedulePage";
import "./styles.css";
import "./sunny-club.css";
import "./tournament-ending.css";

const root = document.getElementById("root");
const query = new URLSearchParams(window.location.search);
const requested = query.get("ending");
const requestedCaptain = query.get("captain");
const endingIds: TournamentEndingId[] = ["END-01", "END-02", "END-03", "END-04", "END-05"];
const endingId: TournamentEndingId = endingIds.includes(requested as TournamentEndingId) ? requested as TournamentEndingId : "END-01";
const captainId: TournamentCaptainId = endingId === "END-04"
  ? "naya"
  : endingId === "END-05"
    ? "irena"
    : isTournamentCaptainId(requestedCaptain) ? requestedCaptain : "saya";
const champion = endingId === "END-03" || endingId === "END-04" || endingId === "END-05";
const fixture = ({
  "END-01": { id: "qf-2", stage: "quarter_final", day: 56, leg: 2 },
  "END-02": { id: "sf-2", stage: "semi_final", day: 83, leg: 2 },
  "END-03": { id: "final", stage: "final", day: 99, leg: 1 },
  "END-04": { id: "final", stage: "final", day: 99, leg: 1 },
  "END-05": { id: "final", stage: "final", day: 99, leg: 1 },
} as const)[endingId];
const tournamentFixture: TournamentFixture = { ...fixture, opponentBlueprintId: "lumiere_crown" };
const featuredPlayer = roster.characters[0];
const previewResult: MatchResult = {
  seed: 99,
  homeName: "晴空竞技",
  awayName: "流光竞技",
  homeScore: champion ? 2 : 1,
  awayScore: champion ? 1 : 2,
  homePossession: 51,
  homeShots: 11,
  awayShots: 10,
  homeXg: 1.4,
  awayXg: 1.3,
  homeAttack: 88,
  homeDefense: 87,
  awayAttack: 89,
  awayDefense: 88,
  skillTriggers: 2,
  mvpId: featuredPlayer.character_id,
  ratings: [{ characterId: featuredPlayer.character_id, team: "home", rating: 8.1, goals: 1, assists: 0, skillTriggers: 2, ordinaryEvents: 4 }],
  events: [],
};

if (!root) throw new Error("Ending preview root is missing");

createRoot(root).render(
  <TournamentEndView
    guideScope="ending-preview"
    outcome={champion ? "champion" : "eliminated"}
    results={[{ fixtureId: fixture.id, result: previewResult, advanced: champion }]}
    fixtures={[tournamentFixture]}
    registeredIds={roster.characters.slice(0, 18).map(({ character_id }) => character_id)}
    managerNickname="测试经理"
    clubName="晴空竞技"
    captainId={captainId}
    players={roster.characters}
    onBack={() => window.location.assign("/")}
    onRestart={() => window.location.reload()}
  />,
);
