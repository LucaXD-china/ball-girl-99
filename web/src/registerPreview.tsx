import { createRoot } from "react-dom/client";
import { TournamentRegistrationPage } from "./pages/TournamentRegistrationPage";
import { buildTournamentCharacters, TOURNAMENT_STARTER_CHARACTER_IDS, type TournamentSquadState } from "./data/tournamentSquad";
import "./styles.css";
import "./sunny-club.css";

const registeredIds = [...TOURNAMENT_STARTER_CHARACTER_IDS];
const squad: TournamentSquadState = {
  collection: Object.fromEntries(registeredIds.map((id) => [id, 1])),
  characterProgress: {},
  skillInventory: {},
  skillLoadouts: {},
};
// a couple pre-selected so the confirm bar shows a status
const selectedIds = registeredIds.slice(0, 6);

createRoot(document.getElementById("root")!).render(
  <div className="app-shell">
    <main className="main-content">
      <TournamentRegistrationPage guideScope="reg-preview" clubName="北港晴空" squad={squad} selectedIds={selectedIds} onToggle={() => undefined} onQuickFill={() => undefined} onLock={() => undefined} onBack={() => undefined} />
    </main>
  </div>,
);
