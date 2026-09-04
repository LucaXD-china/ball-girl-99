import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Node-only configuration file; avoid pulling @types/node just for `process.env`.
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
});
