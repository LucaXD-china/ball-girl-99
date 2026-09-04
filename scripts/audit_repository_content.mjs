#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function repositoryPath(target) {
  return relative(root, target).split(sep).join("/");
}

const markdownFiles = [
  join(root, "README.md"),
  ...walk(join(root, "docs")).filter((file) => extname(file) === ".md"),
  ...walk(join(root, "data")).filter((file) => file.endsWith("README.md")),
  ...walk(join(root, "web", "runtime-assets")).filter((file) => file.endsWith("README.md")),
];

for (const file of markdownFiles) {
  const contents = readFileSync(file, "utf8");
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of contents.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    const target = rawTarget.split("#", 1)[0];
    if (!target || /^(https?:|mailto:|data:)/.test(target)) continue;
    const line = contents.slice(0, match.index).split("\n").length;
    if (target.startsWith("file:")) {
      failures.push(`${repositoryPath(file)}:${line} uses a machine-local file URL`);
      continue;
    }
    const resolvedTarget = normalize(join(dirname(file), decodeURIComponent(target)));
    // Authoring references under the Git-ignored assets workspace are optional in a clean checkout.
    if (repositoryPath(resolvedTarget).startsWith("assets/")) continue;
    if (!existsSync(resolvedTarget)) failures.push(`${repositoryPath(file)}:${line} points to missing ${rawTarget}`);
  }
}

const manifest = JSON.parse(readFileSync(join(root, "data", "assets", "asset-manifest-v1.json"), "utf8"));
const manifestEntries = Object.entries(manifest.assets);
if (manifest.asset_count !== manifestEntries.length) {
  failures.push(`asset manifest declares ${manifest.asset_count} assets but contains ${manifestEntries.length}`);
}

const manifestRuntimePaths = new Set();
for (const [assetId, asset] of manifestEntries) {
  for (const [variantName, variant] of Object.entries(asset.variants ?? {})) {
    if (!variant.local_path || variant.pending) continue;
    // Author-master variants under the Git-ignored `assets/` workspace are optional in a clean checkout;
    // only the versioned runtime assets under `web/runtime-assets/` must exist for the build.
    if (!variant.local_path.startsWith("web/runtime-assets/")) continue;
    const localPath = join(root, variant.local_path);
    if (!existsSync(localPath)) failures.push(`${assetId}:${variantName} is missing ${variant.local_path}`);
    manifestRuntimePaths.add(variant.local_path);
  }
}

// These are build inputs consumed as collections by prepare-data.mjs, not individual Manifest variants.
const pipelineInputs = [
  /^web\/runtime-assets\/cards\/(launch-card-art-v1|faction-three-star-card-art-v1)\/[^/]+\.webp$/,
  /^web\/runtime-assets\/characters\/match-chibi-v2\/[^/]+\.png$/,
  /^web\/runtime-assets\/characters\/locker-motion-v1\/(irena-chibi-os-v2\.webp|naya-beach-interaction-v2\.webp|saya-interaction-v3\.gif)$/,
  /^web\/runtime-assets\/match-stadium-v1\/[^/]+$/,
  /^web\/runtime-assets\/packs\/factions-v2\/[^/]+\.png$/,
  /^web\/runtime-assets\/packs\/(faction-pack-covers-transparent-v2\.png|recruitment-card-shop-counter-v2\.webp|faction-crests-v1\.svg)$/,
  /^web\/runtime-assets\/clubs\/player-club-crest-v1\.svg$/,
  /^web\/runtime-assets\/opponents\/club-crests-v1\/[^/]+\.svg$/,
];
const runtimeFiles = walk(join(root, "web", "runtime-assets"))
  .map(repositoryPath)
  .filter((file) => !file.endsWith("README.md") && !file.endsWith(".DS_Store"));
for (const file of runtimeFiles) {
  if (!manifestRuntimePaths.has(file) && !pipelineInputs.some((pattern) => pattern.test(file))) {
    failures.push(`unregistered runtime asset ${file}`);
  }
}

if (failures.length) {
  console.error(`Repository content audit failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  const runtimeBytes = runtimeFiles.reduce((total, file) => total + statSync(join(root, file)).size, 0);
  console.log(`Repository content audit passed: ${markdownFiles.length} Markdown files, ${manifestEntries.length} assets, ${runtimeFiles.length} runtime files (${(runtimeBytes / 1024 / 1024).toFixed(1)} MiB).`);
}
