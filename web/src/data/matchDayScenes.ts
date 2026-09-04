import { assetManifest, resolveAsset, type AssetManifest } from "../services/assetResolver";

export type MatchDayScene = "tactics-room" | "player-tunnel" | "post-match-locker" | "honors-corridor";
export type MatchDaySceneContext =
  | { phase: "scout" }
  | { phase: "setup"; setupStep: "attack" | "defense" | "lineup" }
  | { phase: "decision-preparation" | "result" | "end" };

const matchDaySceneAssetIds: Record<MatchDayScene, string> = {
  "tactics-room": "scene.match_day.tactics_room",
  "player-tunnel": "scene.match_day.player_tunnel",
  "post-match-locker": "scene.match_day.post_match_locker",
  "honors-corridor": "scene.match_day.honors_corridor",
};

export function matchDaySceneFor(context: MatchDaySceneContext): MatchDayScene {
  if (context.phase === "scout") return "tactics-room";
  if (context.phase === "setup") return context.setupStep === "lineup" ? "player-tunnel" : "tactics-room";
  if (context.phase === "decision-preparation") return "player-tunnel";
  if (context.phase === "result") return "post-match-locker";
  return "honors-corridor";
}

export function resolveMatchDaySceneUrl(context: MatchDaySceneContext, manifest: AssetManifest = assetManifest): string | undefined {
  const scene = matchDaySceneFor(context);
  const resolved = resolveAsset(matchDaySceneAssetIds[scene], "desktop", "", manifest);
  return resolved.status === "ready" ? resolved.url : undefined;
}
