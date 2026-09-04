import { describe, expect, it } from "vitest";
import type { AssetManifest } from "../services/assetResolver";
import { matchDaySceneFor, resolveMatchDaySceneUrl } from "./matchDayScenes";

describe("matchDaySceneFor", () => {
  it("maps the non-live match-day flow to venue scenes", () => {
    expect(matchDaySceneFor({ phase: "scout" })).toBe("tactics-room");
    expect(matchDaySceneFor({ phase: "setup", setupStep: "attack" })).toBe("tactics-room");
    expect(matchDaySceneFor({ phase: "setup", setupStep: "defense" })).toBe("tactics-room");
    expect(matchDaySceneFor({ phase: "setup", setupStep: "lineup" })).toBe("player-tunnel");
    expect(matchDaySceneFor({ phase: "decision-preparation" })).toBe("player-tunnel");
    expect(matchDaySceneFor({ phase: "result" })).toBe("post-match-locker");
    expect(matchDaySceneFor({ phase: "end" })).toBe("honors-corridor");
  });

  it("falls back cleanly when the manifest has no matching asset", () => {
    const emptyManifest: AssetManifest = {
      asset_manifest_version: "test",
      bundle_version: "test",
      bundle_hash: "test",
      asset_count: 0,
      assets: {},
    };
    expect(resolveMatchDaySceneUrl({ phase: "result" }, emptyManifest)).toBeUndefined();
  });
});
