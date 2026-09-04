import manifestJson from "../generated/asset-manifest-v1.json";

type AssetVariant = {
  local_path: string;
  public_path: string | null;
  mime_type: string;
  bytes?: number;
  sha256?: string;
  pending?: boolean;
  width?: number;
  height?: number;
  duration_ms?: number;
  sample_rate_hz?: number;
  channels?: number;
  bit_rate_kbps?: number;
};

type AssetEntry = {
  media_type: "image" | "audio";
  category: string;
  load_policy: "eager" | "lazy" | "on_demand" | "preload";
  source_version: string;
  variants: Record<string, AssetVariant>;
  owner_id?: string;
  dependencies?: string[];
  composition_mode?: "legacy_flat" | "layered";
  composition_recipe_id?: string;
  migration_recipe_id?: string;
  loop_start_ms?: number;
  loop_end_ms?: number;
  default_gain_db?: number;
};

export type AssetManifest = {
  asset_manifest_version: string;
  bundle_version: string;
  bundle_hash: string;
  asset_count: number;
  assets: Record<string, AssetEntry>;
};

export type ResolvedAsset =
  | { status: "ready"; url: string; mimeType: string }
  | { status: "local-only"; assetId: string; variant: string }
  | { status: "missing"; assetId: string; variant: string };

export type ResolvedBgm =
  | {
      status: "ready";
      url: string;
      mimeType: string;
      loopStartMs: number;
      loopEndMs: number;
      defaultGainDb: number;
    }
  | { status: "local-only"; assetId: string; variant: string }
  | { status: "missing"; assetId: string; variant: string };

export type ResolvedSfx =
  | {
      status: "ready";
      url: string;
      mimeType: string;
      defaultGainDb: number;
    }
  | { status: "local-only"; assetId: string; variant: string }
  | { status: "missing"; assetId: string; variant: string };

export const assetManifest = manifestJson as AssetManifest;

function joinPublicPath(publicPath: string, baseUrl: string): string {
  if (/^(https?:|data:|blob:)/.test(publicPath)) return publicPath;
  if (!baseUrl) return publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
  return `${baseUrl.replace(/\/$/, "")}/${publicPath.replace(/^\//, "")}`;
}

function versionPublicUrl(url: string, sha256?: string): string {
  if (!sha256 || /^(data:|blob:)/.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${sha256.slice(0, 12)}`;
}

export function resolveAsset(
  assetId: string,
  variant = "source",
  baseUrl = import.meta.env.BASE_URL,
  manifest: AssetManifest = assetManifest,
): ResolvedAsset {
  const entry = manifest.assets[assetId];
  const selected = entry?.variants[variant];

  if (!selected) return { status: "missing", assetId, variant };
  if (!selected.public_path) return { status: "local-only", assetId, variant };

  return {
    status: "ready",
    url: versionPublicUrl(joinPublicPath(selected.public_path, baseUrl), selected.sha256),
    mimeType: selected.mime_type,
  };
}

export function resolveBgm(
  assetId: string,
  baseUrl = import.meta.env.BASE_URL,
  manifest: AssetManifest = assetManifest,
): ResolvedBgm {
  const entry = manifest.assets[assetId];
  const resolved = resolveAsset(assetId, "web", baseUrl, manifest);
  if (resolved.status !== "ready") return resolved;
  if (entry.category !== "bgm" || entry.media_type !== "audio") {
    return { status: "missing", assetId, variant: "web" };
  }
  return {
    ...resolved,
    loopStartMs: entry.loop_start_ms ?? 0,
    loopEndMs: entry.loop_end_ms ?? 0,
    defaultGainDb: entry.default_gain_db ?? 0,
  };
}

export function resolveSfx(
  assetId: string,
  baseUrl = import.meta.env.BASE_URL,
  manifest: AssetManifest = assetManifest,
): ResolvedSfx {
  const entry = manifest.assets[assetId];
  const resolved = resolveAsset(assetId, "web", baseUrl, manifest);
  if (resolved.status !== "ready") return resolved;
  if (entry.category !== "sfx" || entry.media_type !== "audio") {
    return { status: "missing", assetId, variant: "web" };
  }
  return {
    ...resolved,
    defaultGainDb: entry.default_gain_db ?? 0,
  };
}

export function resolveCharacterCard(characterId: string, variant = "source") {
  return resolveAsset(`card.${characterId}`, variant);
}

export function resolveCharacterArtwork(characterAssetId: string, variant = "standee") {
  return resolveAsset(characterAssetId, variant);
}

export function characterArtworkAssetId(characterId: string, stars?: number) {
  if (characterId.startsWith("founder_")) {
    return `character.founder.${characterId.slice("founder_".length)}`;
  }
  if (stars === 3 || stars === 4 || stars === 5) return `character.locker.${characterId}`;
  return stars === 6 ? `character.six-star.${characterId}` : `character.${characterId}`;
}

export function resolveSixStarSummon(characterId: string, variant: "animation" | "idle" = "animation") {
  return resolveAsset(`recruitment.six-star.${characterId}`, variant);
}

export function resolveDisplayCharacterCard(characterId: string, stars: number) {
  if (stars === 6) {
    const summon = resolveSixStarSummon(characterId, "idle");
    if (summon.status === "ready") return summon;
    const standee = resolveCharacterArtwork(characterArtworkAssetId(characterId));
    if (standee.status === "ready") return standee;
  }
  return resolveCharacterCard(characterId);
}

export function summarizeAssets(manifest: AssetManifest = assetManifest) {
  let published = 0;
  for (const entry of Object.values(manifest.assets)) {
    if (Object.values(entry.variants).some((variant) => variant.public_path)) published += 1;
  }
  return {
    registered: Object.keys(manifest.assets).length,
    published,
    localOnly: Object.keys(manifest.assets).length - published,
  };
}
