import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repositoryRoot = new URL("../../", import.meta.url);
const roster = JSON.parse(
  await readFile(new URL("data/generated/expanded-roster-v1.public.json", repositoryRoot), "utf8"),
);
const manifest = JSON.parse(
  await readFile(new URL("data/assets/asset-manifest-v1.json", repositoryRoot), "utf8"),
);
const runtimeCharacterIds = new Set(roster.characters.map((character) => character.character_id));
let generated = 0;

for (const [assetId, asset] of Object.entries(manifest.assets)) {
  if (
    asset.category !== "player_card" ||
    !runtimeCharacterIds.has(asset.owner_id) ||
    assetId !== `card.${asset.owner_id}`
  ) continue;
  const source = asset.variants.source;
  const outputDirectory = new URL(`../runtime-assets/cards/${asset.source_version}/`, import.meta.url);
  const output = new URL(
    `../runtime-assets/cards/${asset.source_version}/${asset.owner_id}.webp`,
    import.meta.url,
  );
  await mkdir(outputDirectory, { recursive: true });
  await sharp(fileURLToPath(new URL(source.local_path, repositoryRoot)))
    .resize({ width: 420, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(fileURLToPath(output));
  generated += 1;
}

if (generated !== roster.characters.length) {
  throw new Error(`Expected ${roster.characters.length} runtime card previews, generated ${generated}`);
}

console.log(`Generated ${generated} tracked Web card previews from local high-resolution masters.`);
