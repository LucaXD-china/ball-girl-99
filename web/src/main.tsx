import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ViewportSupportGate } from "./components/ViewportSupportGate";
import "./styles.css";
import "./sunny-club.css";
import "./prologue.css";
import "./tournament-ending.css";
import "./story-archive.css";

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
