import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = fileURLToPath(new URL("../runtime-assets/packs/faction-pack-covers-transparent-v2.png", import.meta.url));
const outputDirectory = new URL("../runtime-assets/packs/factions-v2/", import.meta.url);
const factionIds = [
  "fog_court",
  "gaul_iris",
  "iron_engine",
  "scarlet_toros",
  "samba_union",
  "pampas_silver",
  "sakura_link",
  "azure_fortress",
];

const metadata = await sharp(source).metadata();
const columns = 4;
const rows = 2;
const cellWidth = metadata.width / columns;
const cellHeight = metadata.height / rows;

if (!Number.isInteger(cellWidth) || !Number.isInteger(cellHeight)) {
  throw new Error("Transparent faction pack sheet must be an exact 4 x 2 grid");
}

await mkdir(outputDirectory, { recursive: true });
for (const [index, factionId] of factionIds.entries()) {
  const cell = await sharp(source)
    .extract({
      left: (index % columns) * cellWidth,
      top: Math.floor(index / columns) * cellHeight,
      width: cellWidth,
      height: cellHeight,
    })
    .png()
    .toBuffer();
  const { data } = await sharp(cell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = cellWidth;
  let top = cellHeight;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < cellHeight; y += 1) {
    for (let x = 0; x < cellWidth; x += 1) {
      if (data[(y * cellWidth + x) * 4 + 3] <= 2) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error(`Transparent pack ${factionId} is empty`);
  await sharp(cell)
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png({ compressionLevel: 9 })
    .toFile(fileURLToPath(new URL(`${factionId}.png`, outputDirectory)));
}

console.log(`Materialized ${factionIds.length} transparent faction pack covers`);
