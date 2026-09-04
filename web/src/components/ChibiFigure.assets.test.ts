import sharp from "sharp";
import { describe, expect, it } from "vitest";

const SPRITES = [
  "ball-v1.png",
  "ball-v2.png",
  "saya-idle.png",
  "saya-pass.png",
  "saya-shoot.png",
  "saya-tackle.png",
  "field-home-idle.png",
  "field-home-pass.png",
  "field-home-shoot.png",
  "field-home-tackle.png",
  "field-away-idle.png",
  "field-away-pass.png",
  "field-away-shoot.png",
  "field-away-tackle.png",
  "keeper-idle.png",
  "keeper-save.png",
  "irena-idle.png",
  "irena-pass.png",
  "irena-shoot.png",
  "irena-tackle.png",
  "naya-idle.png",
  "naya-pass.png",
  "naya-shoot.png",
  "naya-tackle.png",
  "harriet-idle.png",
  "harriet-pass.png",
  "harriet-shoot.png",
  "harriet-tackle.png",
  "elodie-idle.png",
  "elodie-pass.png",
  "elodie-shoot.png",
  "elodie-tackle.png",
  "klara-idle.png",
  "klara-pass.png",
  "klara-shoot.png",
  "klara-tackle.png",
  "lucia-idle.png",
  "lucia-pass.png",
  "lucia-shoot.png",
  "lucia-tackle.png",
  "luz-idle.png",
  "luz-pass.png",
  "luz-shoot.png",
  "luz-tackle.png",
  "acosta-idle.png",
  "acosta-pass.png",
  "acosta-shoot.png",
  "acosta-tackle.png",
  "akari-idle.png",
  "akari-pass.png",
  "akari-shoot.png",
  "akari-tackle.png",
  "giulia-idle.png",
  "giulia-save.png",
  "field-blue-idle.png",
  "field-blue-pass.png",
  "field-blue-shoot.png",
  "field-blue-tackle.png",
  "field-skyblue-idle.png",
  "field-skyblue-pass.png",
  "field-skyblue-shoot.png",
  "field-skyblue-tackle.png",
  "field-yellow-idle.png",
  "field-yellow-pass.png",
  "field-yellow-shoot.png",
  "field-yellow-tackle.png",
  "field-green-idle.png",
  "field-green-pass.png",
  "field-green-shoot.png",
  "field-green-tackle.png",
] as const;

const assetDirectory = new URL("../../runtime-assets/characters/match-chibi-v2/", import.meta.url);
const publishedDirectory = new URL("../../public/assets/characters/match-chibi-v3/", import.meta.url);

describe("chibi V2 素材完整性", () => {
  it.each(SPRITES)("%s 是统一尺寸的透明 PNG", async (filename) => {
    const assetPath = decodeURIComponent(new URL(filename, assetDirectory).pathname);

    const image = sharp(assetPath);
    const metadata = await image.metadata();
    expect(metadata).toMatchObject({ format: "png", width: 1024, height: 1024, hasAlpha: true });

    const corner = await image.extract({ left: 0, top: 0, width: 1, height: 1 }).ensureAlpha().raw().toBuffer();
    expect(corner[3]).toBe(0);
  });
});

describe("chibi V3 发布资源", () => {
  it("完整生成 512px 透明 WebP，且总量不超过 3 MiB", async () => {
    let totalBytes = 0;
    for (const sourceFilename of SPRITES) {
      const filename = sourceFilename.replace(/\.png$/, ".webp");
      const assetPath = decodeURIComponent(new URL(filename, publishedDirectory).pathname);
      const metadata = await sharp(assetPath).metadata();
      expect(metadata).toMatchObject({ format: "webp", width: 512, height: 512, hasAlpha: true });
      totalBytes += (await sharp(assetPath).toBuffer()).length;
    }
    expect(totalBytes).toBeLessThanOrEqual(3 * 1024 * 1024);
  });
});
