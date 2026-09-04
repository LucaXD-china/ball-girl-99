import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const forbiddenText = [
  "prototype_player_name",
  "source_player_id",
  "source_database_version",
  "source_snapshot_id",
  "sofifa.com",
  "market_value_eur_m",
  "market-value-v1",
];
const forbiddenExtensions = new Set([".wav", ".sqlite"]);
const forbiddenRuntimeText = [
  "actionPoints",
  "社区季前赛",
  "COMMUNITY PRESEASON",
  "领取今日补给",
  "训练资金",
  "身价",
];
const approvedPngBundles = [
  `${sep}assets${sep}scenes${sep}`,
  `${sep}assets${sep}characters${sep}`,
  `${sep}assets${sep}packs${sep}`,
];

async function listFiles(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry);
    if ((await stat(path)).isDirectory()) {
      files.push(...(await listFiles(path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

const files = await listFiles(dist);
if (!files.some((file) => file.endsWith("index.html"))) {
  throw new Error("Production build is missing index.html");
}

const chibiFiles = files.filter((file) => file.includes(`${sep}assets${sep}characters${sep}match-chibi-v3${sep}`));
if (chibiFiles.length !== 70 || chibiFiles.some((file) => extname(file) !== ".webp")) {
  throw new Error(`Production build must contain exactly 70 WebP match sprites: ${chibiFiles.length}`);
}
if (files.some((file) => file.includes(`${sep}assets${sep}characters${sep}match-chibi-v2${sep}`))) {
  throw new Error("Production build must not publish the source match-chibi-v2 PNG bundle");
}
const chibiBytes = (
  await Promise.all(chibiFiles.map(async (file) => (await stat(file)).size))
).reduce((sum, size) => sum + size, 0);
if (chibiBytes > 3 * 1024 * 1024) {
  throw new Error(`Production match Chibi exceeds the 3 MiB budget: ${chibiBytes} bytes`);
}

const founderCardFiles = files.filter((file) => file.includes(`${sep}assets${sep}cards${sep}founder-card-art-v2${sep}`));
if (founderCardFiles.length !== 3 || founderCardFiles.some((file) => extname(file) !== ".webp")) {
  throw new Error(`Production build must contain exactly three WebP founder cards: ${founderCardFiles.length}`);
}
const founderCardBytes = (
  await Promise.all(founderCardFiles.map(async (file) => (await stat(file)).size))
).reduce((sum, size) => sum + size, 0);
if (founderCardBytes > 1024 * 1024) {
  throw new Error(`Production founder cards exceed the 1 MiB budget: ${founderCardBytes} bytes`);
}

const expectedBgmFiles = new Set(["battle.m4a", "quest.m4a", "theme.m4a"]);
const expectedSfxFiles = new Set([
  "battle-whistle.m4a",
  "click-common.m4a",
  "click-confirm.m4a",
  "lottery-result.m4a",
  "lottery-slide.m4a",
  "team-select.m4a",
]);
const audioFiles = files.filter((file) => file.includes(`${sep}assets${sep}audio${sep}`));
const bgmFiles = audioFiles.filter((file) => expectedBgmFiles.has(file.split(sep).at(-1)));
const sfxFiles = audioFiles.filter((file) => expectedSfxFiles.has(file.split(sep).at(-1)));
if (
  bgmFiles.length !== expectedBgmFiles.size ||
  sfxFiles.length !== expectedSfxFiles.size ||
  audioFiles.length !== expectedBgmFiles.size + expectedSfxFiles.size
) {
  throw new Error(`Production build must contain exactly the approved AAC BGM and SFX files: ${audioFiles.join(", ")}`);
}
const bgmBytes = (
  await Promise.all(bgmFiles.map(async (file) => (await stat(file)).size))
).reduce((sum, size) => sum + size, 0);
if (bgmBytes > 6 * 1024 * 1024) {
  throw new Error(`Production BGM exceeds the 6 MiB budget: ${bgmBytes} bytes`);
}
const sfxBytes = (
  await Promise.all(sfxFiles.map(async (file) => (await stat(file)).size))
).reduce((sum, size) => sum + size, 0);
if (sfxBytes > 512 * 1024) {
  throw new Error(`Production SFX exceeds the 512 KiB budget: ${sfxBytes} bytes`);
}

const expectedLockerMotionFiles = new Set([
  "irena-chibi-os-v2.webp",
  "naya-beach-interaction-v2.webp",
  "saya-interaction-v3.gif",
]);
const lockerMotionFiles = files.filter((file) => file.includes(`${sep}assets${sep}characters${sep}locker-motion-v1${sep}`));
if (
  lockerMotionFiles.length !== expectedLockerMotionFiles.size ||
  lockerMotionFiles.some((file) => !expectedLockerMotionFiles.has(file.split(sep).at(-1)))
) {
  throw new Error(`Production build must contain exactly the three approved locker motion files: ${lockerMotionFiles.join(", ")}`);
}
if (files.some((file) => file.includes(`${sep}assets${sep}previews${sep}`))) {
  throw new Error("Production build must not publish local preview assets");
}

for (const file of files) {
  if (forbiddenExtensions.has(extname(file))) {
    throw new Error(`Unexpected source asset in production build: ${file}`);
  }
  if (extname(file) === ".png" && !approvedPngBundles.some((bundle) => file.includes(bundle))) {
    throw new Error(`Unexpected PNG outside the approved runtime bundles: ${file}`);
  }
  if (![".html", ".js", ".css", ".map"].includes(extname(file))) continue;
  const contents = await readFile(file, "utf8");
  for (const marker of forbiddenText) {
    if (contents.includes(marker)) {
      throw new Error(`Private data marker ${marker} found in ${file}`);
    }
  }
  for (const marker of forbiddenRuntimeText) {
    if (contents.includes(marker)) {
      throw new Error(`Archived standard-runtime marker ${marker} found in ${file}`);
    }
  }
}

const totalBytes = (
  await Promise.all(files.map(async (file) => (await stat(file)).size))
).reduce((sum, size) => sum + size, 0);

console.log(
  `Verified Web build: ${files.length} files, ${(totalBytes / 1024).toFixed(1)} KiB, tournament-only runtime, no private roster fields or unapproved source media.`,
);
