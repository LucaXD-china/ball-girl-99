import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const files = [
  "data/generated/expanded-roster-v1.public.json",
  "data/assets/asset-manifest-v1.json",
  "data/contracts/text-match-seed-contract-v1.json",
  "data/recruitment/tournament-recruitment-v1.json",
  "data/generated/opponent-roster-v1.public.json",
];
const forbiddenMarkers = [
  "prototype_player_name",
  "source_player_id",
  "source_database_version",
  "source_snapshot_id",
  "sofifa.com",
];
const repositoryRoot = new URL("../../", import.meta.url);
const outputDirectory = new URL("../src/generated/", import.meta.url);
const publishedAssetDirectory = new URL("../public/assets/", import.meta.url);
const matchChibiV2SourceDirectory = new URL("../runtime-assets/characters/match-chibi-v2/", import.meta.url);
const matchChibiV3TargetDirectory = new URL("../public/assets/characters/match-chibi-v3/", import.meta.url);
const matchStadiumSourceDirectory = new URL("../runtime-assets/match-stadium-v1/", import.meta.url);
const matchStadiumTargetDirectory = new URL("../public/assets/match-stadium-v1/", import.meta.url);
const factionPackIds = ["fog_court", "gaul_iris", "iron_engine", "scarlet_toros", "samba_union", "pampas_silver", "sakura_link", "azure_fortress"];
const transparentPackSourceDirectory = new URL("../runtime-assets/packs/factions-v2/", import.meta.url);
const transparentPackTargetDirectory = new URL("../public/assets/packs/factions-v2/", import.meta.url);
const packShopSource = new URL("../runtime-assets/packs/recruitment-card-shop-counter-v2.webp", import.meta.url);
const packShopTarget = new URL("../public/assets/packs/recruitment-card-shop-counter-v2.webp", import.meta.url);
const factionCrestsSource = new URL("../runtime-assets/packs/faction-crests-v1.svg", import.meta.url);
const factionCrestsTarget = new URL("../public/assets/packs/faction-crests-v1.svg", import.meta.url);
const playerClubCrestSource = new URL("../runtime-assets/clubs/player-club-crest-v1.svg", import.meta.url);
const playerClubCrestTarget = new URL("../public/assets/clubs/player-club-crest-v1.svg", import.meta.url);
const lockerMotionSourceDirectory = new URL("../runtime-assets/characters/locker-motion-v1/", import.meta.url);
const lockerMotionTargetDirectory = new URL("../public/assets/characters/locker-motion-v1/", import.meta.url);
const lockerMotionFiles = [
  "irena-chibi-os-v2.webp",
  "naya-beach-interaction-v2.webp",
  "saya-interaction-v3.gif",
];
const opponentCrestIds = [
  "lumiere_crown", "north_foundry", "alpine_engine", "ivory_capital", "blue_moon_lab",
  "crimson_mosaic", "red_tide_union", "indigo_serpents", "iron_bastion", "ruhr_swarm",
  "eternal_legion", "emerald_lions", "violet_comets", "azure_gulf", "saxon_gale",
];
const opponentCrestSourceDirectory = new URL("../runtime-assets/opponents/club-crests-v1/", import.meta.url);
const opponentCrestTargetDirectory = new URL("../public/assets/opponents/club-crests-v1/", import.meta.url);
const publishDirectories = {
  scene_background: "scenes",
  character_standee: "characters",
  recruitment_animation: "recruitment",
};

await mkdir(outputDirectory, { recursive: true });
await rm(new URL("faction-pack-system-v1.json", outputDirectory), { force: true });

const prepared = new Map();
for (const relativePath of files) {
  const contents = await readFile(new URL(relativePath, repositoryRoot), "utf8");
  for (const marker of forbiddenMarkers) {
    if (contents.includes(marker)) {
      throw new Error(`Refusing to expose private marker ${marker} from ${relativePath}`);
    }
  }
  const value = JSON.parse(contents);
  prepared.set(relativePath, value);
}

const roster = structuredClone(prepared.get(files[0]));
delete roster.rules_version;
for (const character of roster.characters) {
  delete character.market_value_eur_m;
}
prepared.set(files[0], roster);
const opponents = structuredClone(prepared.get(files[4]));
delete opponents.rules_version;
for (const character of opponents.characters) {
  delete character.market_value_eur_m;
}
prepared.set(files[4], opponents);
const assets = prepared.get(files[1]);
const founderSource = JSON.parse(await readFile(new URL("data/characters/founder-trio-v1.json", repositoryRoot), "utf8"));
const founderRoster = {
  schema_version: 1,
  character_data_version: "founder-roster-v1",
  characters: founderSource.characters.map((character) => ({
    character_id: character.character_id,
    name: character.name,
    profile: { full_name: character.profile.full_name },
    faction_id: character.faction_id,
    position: character.position,
    stars: character.stars,
    base_trait_id: character.football.base_trait_id,
    signature_skill_id: character.football.signature_skill_id,
    attributes: {
      overall: character.football.overall,
      pace: character.football.attributes.pace,
      shooting: character.football.attributes.shooting,
      passing: character.football.attributes.passing,
      dribbling: character.football.attributes.dribbling,
      defending: character.football.attributes.defending,
      physical: character.football.attributes.physical,
      detailed: {},
      goalkeeping: {},
    },
    preferred_foot: character.preferred_foot,
    alternative_positions: [],
  })),
};
const founderCharacterIds = new Set(founderRoster.characters.map((character) => character.character_id));
const serializedFounderRoster = JSON.stringify(founderRoster);
const cupRosterForbiddenMarkers = [
  ...forbiddenMarkers,
  "market_value_eur_m",
  "market-value-v1",
];
for (const marker of cupRosterForbiddenMarkers) {
  if (JSON.stringify(roster).includes(marker)) {
    throw new Error(`Refusing to expose cup roster marker ${marker}`);
  }
  if (serializedFounderRoster.includes(marker)) {
    throw new Error(`Refusing to expose private marker ${marker} from founder roster`);
  }
}
const runtimeCharacterIds = new Set(roster.characters.map((character) => character.character_id));
const opponentCharacterIds = new Set(opponents.characters.map((character) => character.character_id));
const playerCardCount = Object.values(assets.assets).filter(
  (asset) => asset.category === "player_card",
).length;
if (roster.characters.length !== 88) {
  throw new Error("Web data preparation expects the current 88-character runtime roster");
}
if (playerCardCount !== 124 || assets.asset_count < 132) {
  throw new Error(
    "Web data preparation expects 88 runtime cards, 30 opponent cards, 3 founder cards, 3 rarity demos, and the required scene assets",
  );
}

await rm(publishedAssetDirectory, { recursive: true, force: true });
await mkdir(new URL("../public/assets/packs/", import.meta.url), { recursive: true });
await mkdir(new URL("../public/assets/clubs/", import.meta.url), { recursive: true });
await mkdir(matchChibiV3TargetDirectory, { recursive: true });
for (const filename of (await readdir(matchChibiV2SourceDirectory)).filter((entry) => entry.endsWith(".png"))) {
  await sharp(fileURLToPath(new URL(filename, matchChibiV2SourceDirectory)))
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85, alphaQuality: 90, effort: 5 })
    .toFile(fileURLToPath(new URL(filename.replace(/\.png$/, ".webp"), matchChibiV3TargetDirectory)));
}
await cp(matchStadiumSourceDirectory, matchStadiumTargetDirectory, { recursive: true });
await mkdir(transparentPackTargetDirectory, { recursive: true });
await mkdir(opponentCrestTargetDirectory, { recursive: true });
for (const factionId of factionPackIds) {
  await copyFile(new URL(`${factionId}.png`, transparentPackSourceDirectory), new URL(`${factionId}.png`, transparentPackTargetDirectory));
}
await copyFile(packShopSource, packShopTarget);
await copyFile(factionCrestsSource, factionCrestsTarget);
await copyFile(playerClubCrestSource, playerClubCrestTarget);
for (const opponentCrestId of opponentCrestIds) {
  await copyFile(
    new URL(`${opponentCrestId}.svg`, opponentCrestSourceDirectory),
    new URL(`${opponentCrestId}.svg`, opponentCrestTargetDirectory),
  );
}
await mkdir(lockerMotionTargetDirectory, { recursive: true });
for (const filename of lockerMotionFiles) {
  await copyFile(
    new URL(filename, lockerMotionSourceDirectory),
    new URL(filename, lockerMotionTargetDirectory),
  );
}
let publishedRuntimeVariants = 0;
for (const [assetId, asset] of Object.entries(assets.assets)) {
  if (
    asset.category === "player_card" &&
    founderCharacterIds.has(asset.owner_id) &&
    assetId === `card.${asset.owner_id}`
  ) {
    const source = asset.variants.source;
    const publishedSourceVersion = "founder-card-art-v2";
    const targetDirectory = new URL(
      `../public/assets/cards/${publishedSourceVersion}/`,
      import.meta.url,
    );
    const target = new URL(
      `../public/assets/cards/${publishedSourceVersion}/${asset.owner_id}.webp`,
      import.meta.url,
    );
    await mkdir(targetDirectory, { recursive: true });
    await sharp(fileURLToPath(new URL(source.local_path, repositoryRoot)))
      .resize({ width: 512, withoutEnlargement: true })
      .webp({ quality: 85, alphaQuality: 90, effort: 5 })
      .toFile(fileURLToPath(target));
    const published = await readFile(target);
    const metadata = await sharp(published).metadata();
    asset.source_version = publishedSourceVersion;
    source.local_path = `web/public/assets/cards/${publishedSourceVersion}/${asset.owner_id}.webp`;
    source.public_path = `/assets/cards/${publishedSourceVersion}/${asset.owner_id}.webp`;
    source.mime_type = "image/webp";
    source.bytes = (await stat(target)).size;
    source.sha256 = createHash("sha256").update(published).digest("hex");
    source.width = metadata.width;
    source.height = metadata.height;
    publishedRuntimeVariants += 1;
    continue;
  }
  if (
    asset.category === "player_card" &&
    opponentCharacterIds.has(asset.owner_id) &&
    assetId === `card.${asset.owner_id}`
  ) {
    const source = asset.variants.source;
    const publishedSourceVersion = "opponent-card-art-v2";
    const targetDirectory = new URL(
      `../public/assets/cards/${publishedSourceVersion}/`,
      import.meta.url,
    );
    const target = new URL(
      `../public/assets/cards/${publishedSourceVersion}/${asset.owner_id}.webp`,
      import.meta.url,
    );
    await mkdir(targetDirectory, { recursive: true });
    await sharp(fileURLToPath(new URL(source.local_path, repositoryRoot)))
      .resize({ width: 512, withoutEnlargement: true })
      .webp({ quality: 85, alphaQuality: 90, effort: 5 })
      .toFile(fileURLToPath(target));
    const published = await readFile(target);
    const metadata = await sharp(published).metadata();
    asset.source_version = publishedSourceVersion;
    source.local_path = `web/public/assets/cards/${publishedSourceVersion}/${asset.owner_id}.webp`;
    source.public_path = `/assets/cards/${publishedSourceVersion}/${asset.owner_id}.webp`;
    source.mime_type = "image/webp";
    source.bytes = (await stat(target)).size;
    source.sha256 = createHash("sha256").update(published).digest("hex");
    source.width = metadata.width;
    source.height = metadata.height;
    publishedRuntimeVariants += 1;
    continue;
  }
  if (
    asset.category === "player_card" &&
    runtimeCharacterIds.has(asset.owner_id) &&
    assetId === `card.${asset.owner_id}`
  ) {
    const source = asset.variants.source;
    const targetDirectory = new URL(
      `../public/assets/cards/${asset.source_version}/`,
      import.meta.url,
    );
    const target = new URL(
      `../public/assets/cards/${asset.source_version}/${asset.owner_id}.webp`,
      import.meta.url,
    );
    await mkdir(targetDirectory, { recursive: true });
    await copyFile(
      new URL(`../runtime-assets/cards/${asset.source_version}/${asset.owner_id}.webp`, import.meta.url),
      target,
    );
    source.public_path = `/assets/cards/${asset.source_version}/${asset.owner_id}.webp`;
    source.mime_type = "image/webp";
    publishedRuntimeVariants += 1;
    continue;
  }
  if (asset.category === "bgm" || asset.category === "sfx") {
    const web = asset.variants.web;
    const filename = web.local_path.split("/").at(-1);
    const targetDirectory = new URL(
      `../public/assets/audio/${asset.source_version}/`,
      import.meta.url,
    );
    const target = new URL(
      `../public/assets/audio/${asset.source_version}/${filename}`,
      import.meta.url,
    );
    await mkdir(targetDirectory, { recursive: true });
    await copyFile(new URL(web.local_path, repositoryRoot), target);
    web.public_path = `/assets/audio/${asset.source_version}/${filename}`;
    publishedRuntimeVariants += 1;
    continue;
  }
  if (asset.category === "character_standee" && asset.source_version === "match-chibi-v2") {
    asset.source_version = "match-chibi-v3";
    for (const variant of Object.values(asset.variants)) {
      const filename = variant.local_path.split("/").at(-1).replace(/\.png$/, ".webp");
      const target = new URL(filename, matchChibiV3TargetDirectory);
      const published = await readFile(target);
      const metadata = await sharp(published).metadata();
      variant.local_path = `web/public/assets/characters/match-chibi-v3/${filename}`;
      variant.public_path = `/assets/characters/match-chibi-v3/${filename}`;
      variant.mime_type = "image/webp";
      variant.bytes = (await stat(target)).size;
      variant.sha256 = createHash("sha256").update(published).digest("hex");
      variant.width = metadata.width;
      variant.height = metadata.height;
      publishedRuntimeVariants += 1;
    }
    continue;
  }
  const publishDirectory = publishDirectories[asset.category];
  if (!publishDirectory) continue;
  if (asset.category === "character_standee" && asset.load_policy === "on_demand") {
    continue;
  }
  for (const [variantName, variant] of Object.entries(asset.variants)) {
    const filename = variant.local_path.split("/").at(-1);
    const targetDirectory = new URL(
      `../public/assets/${publishDirectory}/${asset.source_version}/`,
      import.meta.url,
    );
    const target = new URL(
      `../public/assets/${publishDirectory}/${asset.source_version}/${filename}`,
      import.meta.url,
    );
    try {
      await mkdir(targetDirectory, { recursive: true });
      await copyFile(new URL(variant.local_path, repositoryRoot), target);
      variant.public_path = `/assets/${publishDirectory}/${asset.source_version}/${filename}`;
      publishedRuntimeVariants += 1;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      variant.public_path = null;
    }
    if (asset.category === "scene_background" && !filename.startsWith(variantName)) {
      throw new Error(`Scene variant filename must start with ${variantName}`);
    }
  }
}

for (const relativePath of files) {
  const filename = relativePath.split("/").at(-1);
  const value = prepared.get(relativePath);
  await writeFile(new URL(filename, outputDirectory), `${JSON.stringify(value, null, 2)}\n`);
}
await writeFile(
  new URL("founder-roster-v1.public.json", outputDirectory),
  `${JSON.stringify(founderRoster, null, 2)}\n`,
);

console.log(
  `Prepared 88-character public roster plus ${founderRoster.characters.length} founders, ${publishedRuntimeVariants} local runtime asset variants, asset manifest, match contract, and recruitment contract for Web.`,
);
