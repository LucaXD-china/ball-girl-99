import { createRoot } from "react-dom/client";
import { LockerRoomPage } from "./pages/LockerRoomPage";
import { createTournamentSave } from "./storage/tournamentSaveStorage";
import "./styles.css";
import "./sunny-club.css";

const irenaCharacterId = "founder_scarlet_toros_6";
const previewSave = createTournamentSave(7, "recruitment", "irena");

const root = createRoot(document.getElementById("root")!);
root.render(
  <LockerRoomPage
    squad={previewSave.squad}
    initialSelectedId={irenaCharacterId}
    initialDetailOpen
    onBackToOffice={() => undefined}
  />,
);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
