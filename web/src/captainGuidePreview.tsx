import { createRoot } from "react-dom/client";
import { SayaGuide } from "./components/SayaGuide";
import { TournamentCaptainProvider } from "./components/TournamentCaptainContext";
import { isTournamentCaptainId } from "./data/tournamentCaptain";
import "./styles.css";
import "./sunny-club.css";

const root = document.getElementById("root");
if (!root) throw new Error("Captain guide preview root is missing");

const requested = new URLSearchParams(window.location.search).get("captain");
const captainId = isTournamentCaptainId(requested) ? requested : "saya";

createRoot(root).render(<TournamentCaptainProvider captainId={captainId}>
  <main style={{ minHeight: "100vh", background: "linear-gradient(145deg,#162330,#091018)", display: "grid", placeItems: "center" }}>
    <button type="button" data-saya-guide-target="preview-action">继续赛事</button>
    <SayaGuide
      scope={`captain-guide-preview-${captainId}`}
      guideId="preview-action"
      title="下一步"
      message="完成高亮位置的操作即可继续。"
      target="preview-action"
      variant="guide"
    />
  </main>
</TournamentCaptainProvider>);
