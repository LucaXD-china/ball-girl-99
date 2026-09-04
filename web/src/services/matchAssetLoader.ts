import {
  chibiSpriteUrl,
  isCustomChibiPlayer,
  type ChibiAction,
  type ChibiSpriteFamily,
} from "../components/ChibiFigure";
import type { Lineup } from "../data/matchSimulator";
import { characterArtworkAssetId, resolveCharacterArtwork } from "./assetResolver";

export const MATCH_ASSET_TIMEOUT_MS = 8_000;
export const MATCH_STADIUM_URL = "/assets/match-stadium-v1/stadium-dusk-base.webp";
export const MATCH_BALL_URL = "/assets/characters/match-chibi-v3/ball-v2.webp";

export type MatchAssetLoadState = {
  status: "idle" | "loading" | "ready" | "degraded";
  loaded: number;
  total: number;
  failedUrls: string[];
  timedOut: boolean;
};

type MatchAssetRequest = {
  homeLineup: Lineup;
  awayLineup: Lineup;
  awayKitFamily: ChibiSpriteFamily;
  extraUrls?: Array<string | undefined>;
};

const OUTFIELD_ACTIONS: ChibiAction[] = ["idle", "pass", "shoot", "tackle"];
const GOALKEEPER_ACTIONS: ChibiAction[] = ["idle", "save"];
const imageCache = new Map<string, Promise<boolean>>();

function addPlayerAssets(urls: Set<string>, side: "home" | "away", lineup: Lineup, awayKitFamily: ChibiSpriteFamily) {
  for (const playerId of Object.values(lineup)) {
    if (!playerId) continue;
    const goalkeeper = lineup.gk === playerId;
    if (!goalkeeper && !isCustomChibiPlayer(playerId)) {
      const artwork = resolveCharacterArtwork(characterArtworkAssetId(playerId));
      if (artwork.status === "ready") {
        urls.add(artwork.url);
        continue;
      }
    }
    for (const action of goalkeeper ? GOALKEEPER_ACTIONS : OUTFIELD_ACTIONS) {
      urls.add(chibiSpriteUrl(side, playerId, action, goalkeeper, awayKitFamily));
    }
  }
}

export function matchAssetUrlsForLineups({ homeLineup, awayLineup, awayKitFamily, extraUrls = [] }: MatchAssetRequest): string[] {
  const urls = new Set<string>([MATCH_STADIUM_URL, MATCH_BALL_URL]);
  addPlayerAssets(urls, "home", homeLineup, awayKitFamily);
  addPlayerAssets(urls, "away", awayLineup, awayKitFamily);
  for (const url of extraUrls) if (url) urls.add(url);
  return [...urls];
}

function loadImageOnce(url: string): Promise<boolean> {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const pending = new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (typeof image.decode !== "function") {
        resolve(true);
        return;
      }
      void image.decode().then(() => resolve(true), () => resolve(true));
    };
    image.onerror = () => resolve(false);
    image.src = url;
  });
  imageCache.set(url, pending);
  return pending;
}

export async function preloadMatchAssets(
  urls: string[],
  onProgress: (loaded: number, total: number) => void,
  loadImage: (url: string) => Promise<boolean> = loadImageOnce,
): Promise<string[]> {
  let loaded = 0;
  const failedUrls: string[] = [];
  await Promise.all(urls.map(async (url) => {
    if (!(await loadImage(url))) failedUrls.push(url);
    loaded += 1;
    onProgress(loaded, urls.length);
  }));
  return failedUrls;
}
