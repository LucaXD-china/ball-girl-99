import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Playwright specs live in e2e/ and are run by `npm run test:e2e`, not vitest.
      exclude: ["e2e/**", "node_modules/**", "dist/**"],
    },
  }),
);
