import { createRoot } from "react-dom/client";
import { OpponentScoutReport } from "./components/OpponentScoutReport";
import { generateOpponent, generateTournament, stageMeta, type TournamentStage } from "./data/tournamentJourney";
import "./styles.css";
import "./sunny-club.css";

const validStages: TournamentStage[] = ["round_of_16", "quarter_final", "semi_final", "final"];
const requestedStage = new URLSearchParams(window.location.search).get("stage") as TournamentStage | null;
const stage = validStages.includes(requestedStage as TournamentStage) ? requestedStage as TournamentStage : "semi_final";
const seed = Number(new URLSearchParams(window.location.search).get("seed")) || 1234;

const fixture = generateTournament(seed).fixtures.find((item) => item.stage === stage)!;
const opponent = generateOpponent(fixture, seed, [], []);
const fixtureLabel = `${stageMeta[stage].name} · 首回合`;
const scoreParam = new URLSearchParams(window.location.search).get("score") ?? "2:1";
const [playerGoals, opponentGoals] = scoreParam.split(":").map(Number);
const aggregateScore = { player: Number.isFinite(playerGoals) ? playerGoals : 0, opponent: Number.isFinite(opponentGoals) ? opponentGoals : 0 };

createRoot(document.getElementById("root")!).render(
  <OpponentScoutReport opponent={opponent} fixtureLabel={fixtureLabel} aggregateScore={aggregateScore} onClose={() => undefined} />,
);
