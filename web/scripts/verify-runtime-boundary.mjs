import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const forbiddenMarkers = [
  "gameStorage",
  "tournamentJourneyStorage",
  "actionPoints",
  "trainingFunds",
  "trainingNotes",
  "recruitmentTokens",
  "experiencePercent",
  "isInLineup",
  "applyCharacterProgress",
  "preseason",
  "single_cost_recruitment_tokens",
  "cost_recruitment_tokens",
  "TournamentSaveV2",
  "tournament-save-v2",
  "faction-pack-system-v1",
  "training-supply-button",
  "training-resource-row",
  "社区季前赛",
  "每日补给",
  "训练资金",
  "招募代币",
];

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listSourceFiles(path));
    else if ([".ts", ".tsx", ".css"].includes(extname(entry.name)) && !entry.name.includes(".test.") && !entry.name.endsWith("Preview.tsx")) files.push(path);
  }
  return files;
}

for (const file of await listSourceFiles(sourceRoot)) {
  const contents = await readFile(file, "utf8");
  for (const marker of forbiddenMarkers) {
    if (contents.includes(marker)) throw new Error(`Archived standard-runtime marker ${marker} found in ${file}`);
  }
}

console.log("Verified source boundary: tournament-only runtime modules and styles.");
