import { createRoot } from "react-dom/client";
import { Day1StoryPage } from "./pages/Day1StoryPage";
import { day1StoryBeats } from "./data/day1Story";
import type { TournamentCaptainId } from "./data/tournamentCaptain";
import "./styles.css";
import "./sunny-club.css";
import "./prologue.css";

const root = document.getElementById("root");
if (!root) throw new Error("Day 1 preview root is missing");

const unlocked = new URLSearchParams(window.location.search).get("unlocked");
const availableCaptainIds: TournamentCaptainId[] = unlocked === "END-04"
  ? ["saya", "naya", "irena"]
  : ["saya", "naya"];
const beats = day1StoryBeats("测试经理", true);
const requestedBeat = Number(new URLSearchParams(window.location.search).get("beat"));
const initialBeat = Number.isInteger(requestedBeat) && requestedBeat >= 0 && requestedBeat < beats.length
  ? requestedBeat
  : beats.length - 2;

createRoot(root).render(<Day1StoryPage
  initialBeat={initialBeat}
  nickname="测试经理"
  availableCaptainIds={availableCaptainIds}
  onBeatChange={() => undefined}
  onCaptainSelect={() => undefined}
  onComplete={() => window.location.reload()}
/>);
