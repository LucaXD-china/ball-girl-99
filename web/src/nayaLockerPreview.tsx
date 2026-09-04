import { createRoot } from "react-dom/client";
import { LockerRoomPage } from "./pages/LockerRoomPage";
import { createTournamentSave } from "./storage/tournamentSaveStorage";
import "./styles.css";
import "./sunny-club.css";

const nayaCharacterId = "founder_samba_union_7";
const previewSave = createTournamentSave(7, "recruitment", "naya");

const root = createRoot(document.getElementById("root")!);
root.render(
  <LockerRoomPage
    squad={previewSave.squad}
    initialSelectedId={nayaCharacterId}
    initialDetailOpen
    onBackToOffice={() => undefined}
  />,
);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
