import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ViewportSupportGate } from "./components/ViewportSupportGate";
import { assetUrl } from "./services/assetUrl";
import "./styles.css";
import "./sunny-club.css";
import "./prologue.css";
import "./tournament-ending.css";
import "./story-archive.css";

// CSS background images can't read import.meta.env.BASE_URL, so expose the resolved
// URLs as custom properties consumed by the stylesheets.
const rootStyle = document.documentElement.style;
rootStyle.setProperty("--stadium-bg", `url("${assetUrl("/assets/match-stadium-v1/stadium-dusk-base.webp")}")`);
rootStyle.setProperty("--ball-bg", `url("${assetUrl("/assets/characters/match-chibi-v3/ball-v2.webp")}")`);
rootStyle.setProperty("--pack-counter-bg", `url("${assetUrl("/assets/packs/recruitment-card-shop-counter-v2.webp")}")`);

const root = document.getElementById("root");

if (!root) {
  throw new Error("激射！绿茵少女！Web root element is missing");
}

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <ViewportSupportGate><App /></ViewportSupportGate>
    </AppErrorBoundary>
  </StrictMode>,
);
