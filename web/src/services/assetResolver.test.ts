import { describe, expect, it } from "vitest";
import {
  assetManifest,
  characterArtworkAssetId,
  resolveAsset,
  resolveBgm,
  resolveCharacterArtwork,
  resolveCharacterCard,
  resolveDisplayCharacterCard,
  resolveSfx,
  resolveSixStarSummon,
  summarizeAssets,
  type AssetManifest,
} from "./assetResolver";

const publishedManifest: AssetManifest = {
  asset_manifest_version: "test",
  bundle_version: "test",
  bundle_hash: "test",
  asset_count: 1,
  assets: {
    "card.test": {
      media_type: "image",
      category: "player_card",
      load_policy: "lazy",
      source_version: "test",
      variants: {
        thumb: {
          local_path: "assets/test.png",
          public_path: "cards/test.hash.png",
          mime_type: "image/png",
          bytes: 12,
          sha256: "abc",
        },
      },
    },
  },
};

describe("asset resolver", () => {
  it("keeps local source media out of browser URLs", () => {
    expect(resolveAsset("card.azure_alessia_romano").status).toBe("ready");
    const summary = summarizeAssets(assetManifest);
    expect(summary.registered).toBe(assetManifest.asset_count);
    expect(summary.published + summary.localOnly).toBe(assetManifest.asset_count);
    expect(summary.published).toBeGreaterThanOrEqual(88);
    expect(["ready", "local-only"]).toContain(
      resolveAsset("scene.manager_office.tournament_day1", "desktop").status,
    );
    expect(resolveAsset("scene.prologue.v1", "p1-01-twilight-manager-office")).toMatchObject({
      status: "ready",
      mimeType: "image/webp",
    });
  });

  it("publishes both captain guide sets and all 28 route-ending scenes", () => {
    for (const assetId of ["character.guide.naya_chibi", "character.guide.irena_chibi"]) {
      const variants = assetManifest.assets[assetId].variants;
      expect(Object.keys(variants).sort()).toEqual(["celebrate", "guide", "remind", "think", "welcome"]);
      expect(Object.values(variants).every(({ public_path }) => Boolean(public_path))).toBe(true);
    }
    const ending = assetManifest.assets["scene.tournament-ending.v2"];
    expect(ending.load_policy).toBe("preload");
    expect(Object.keys(ending.variants)).toHaveLength(28);
    expect(Object.values(ending.variants).every(({ public_path, mime_type }) => Boolean(public_path) && mime_type === "image/webp")).toBe(true);
  });

  it("resolves published BGM metadata without exposing the WAV source", () => {
    expect(resolveAsset("bgm.hub.default").status).toBe("local-only");
    expect(resolveBgm("bgm.hub.default")).toMatchObject({
      status: "ready",
      url: "/assets/audio/hub-quest-v1/quest.m4a?v=fea95b71ad4a",
      mimeType: "audio/mp4",
      loopStartMs: 0,
      loopEndMs: 128661,
      defaultGainDb: -6,
    });
  });

  it("resolves published SFX metadata without exposing the WAV source", () => {
    expect(resolveAsset("sfx.ui.click-common").status).toBe("local-only");
    expect(resolveSfx("sfx.ui.click-common")).toMatchObject({
      status: "ready",
      url: "/assets/audio/sfx-v1/click-common.m4a?v=c290a00c92f1",
      mimeType: "audio/mp4",
      defaultGainDb: 0,
    });
    expect(resolveSfx("bgm.hub.default").status).toBe("missing");
  });

  it("resolves founder card layers independently from reusable character art", () => {
    expect(resolveCharacterArtwork("character.founder.sakura_link_4")).toMatchObject({
      status: "ready",
      url: "/assets/characters/founder-promo-v4-standee-v1/sakura-link-number-4-standee.png?v=024373de9107",
    });
    expect(resolveCharacterCard("founder_sakura_link_4").status).toBe("ready");
    expect(resolveCharacterCard("founder_sakura_link_4", "background_base").status).toBe(
      "local-only",
    );
    expect(resolveCharacterCard("founder_sakura_link_4", "frame").status).toBe("local-only");
  });

  it("keeps planned but not-yet-materialized standees local-only", () => {
    expect(resolveCharacterArtwork("character.azure_caterina_de_luca")).toEqual({
      status: "local-only",
      assetId: "character.azure_caterina_de_luca",
      variant: "standee",
    });
  });

  it("resolves all eight six-star recruitment animations on demand", () => {
    const animationAssets = Object.values(assetManifest.assets).filter(
      (asset) => asset.category === "recruitment_animation",
    );
    expect(animationAssets).toHaveLength(8);
    expect(animationAssets.every((asset) => asset.load_policy === "on_demand")).toBe(true);
    expect(resolveSixStarSummon("fog_harriet_wren")).toMatchObject({
      status: "ready",
      mimeType: "image/webp",
    });
    expect(resolveSixStarSummon("fog_harriet_wren", "idle")).toMatchObject({
      status: "ready",
      mimeType: "image/webp",
    });
  });

  it("resolves six-star detail artwork from the extracted standee namespace", () => {
    const characterIds = [
      "fog_harriet_wren",
      "rose_elodie_beaumont",
      "rhein_klara_neumann",
      "sol_lucia_montoro",
      "gold_vitoria_luz",
      "silver_sofia_acosta",
      "sakura_akari_fujimoto",
      "azure_giulia_bellini",
    ];

    for (const characterId of characterIds) {
      const artwork = resolveCharacterArtwork(characterArtworkAssetId(characterId, 6));
      expect(artwork).toMatchObject({ status: "ready", mimeType: "image/png" });
      if (artwork.status === "ready") {
        expect(artwork.url).toMatch(
          new RegExp(`^/assets/characters/six-star-standee-v1/${characterId}-standee(?:-v\\d+)?\\.png\\?v=[0-9a-f]{12}$`),
        );
      }
    }
  });

  it("uses the new idle summon as the six-star display card only", () => {
    expect(resolveDisplayCharacterCard("fog_harriet_wren", 6)).toMatchObject({
      status: "ready",
      url: "/assets/recruitment/six-star-summon-animation-v1/fog_harriet_wren-idle.webp?v=146e41deeb7a",
    });
    expect(resolveDisplayCharacterCard("fog_beatrice_ashford", 5)).toMatchObject({
      status: "ready",
      url: "/assets/cards/launch-card-art-v1/fog_beatrice_ashford.webp?v=fea363de5592",
    });
    expect(resolveDisplayCharacterCard("founder_sakura_link_4", 5)).toMatchObject({
      status: "ready",
      url: "/assets/cards/founder-card-art-v2/founder_sakura_link_4.webp?v=785c3ae37356",
    });
  });

  it("joins published paths with a configured asset base", () => {
    expect(resolveAsset("card.test", "thumb", "https://cdn.example.com/v1/", publishedManifest)).toEqual({
      status: "ready",
      url: "https://cdn.example.com/v1/cards/test.hash.png?v=abc",
      mimeType: "image/png",
    });
  });

  it("versions stable runtime paths with their content hash", () => {
    expect(resolveAsset("scene.day1.story.v1", "d1-07-members-assembly")).toMatchObject({
      status: "ready",
      url: "/assets/scenes/day1-story-v1/d1-07-members-assembly.webp?v=8439e93213f7",
    });
  });

  it("reports missing logical IDs explicitly", () => {
    expect(resolveAsset("card.unknown").status).toBe("missing");
  });

  it("resolves 3/4/5-star locker-room artwork from character.locker.<id> (post-match MVP + locker room)", () => {
    // Locker room / MVP pass stars -> locker standee.
    expect(characterArtworkAssetId("azure_elena_marchetti", 4)).toBe("character.locker.azure_elena_marchetti");
    expect(characterArtworkAssetId("azure_bianca_russo", 3)).toBe("character.locker.azure_bianca_russo");
    expect(characterArtworkAssetId("fog_eleanor_hart", 5)).toBe("character.locker.fog_eleanor_hart");
    expect(resolveCharacterArtwork(characterArtworkAssetId("azure_elena_marchetti", 4))).toMatchObject({
      status: "ready",
      mimeType: "image/png",
    });
    expect(resolveCharacterArtwork(characterArtworkAssetId("azure_bianca_russo", 3))).toMatchObject({
      status: "ready",
      mimeType: "image/png",
    });
  });

  it("keeps the match-plane figure (no stars) on character.<id> and the rating card on the flat card", () => {
    // Match chibi / on-pitch artwork resolves without stars -> card standee namespace, NOT locker.
    expect(characterArtworkAssetId("azure_elena_marchetti")).toBe("character.azure_elena_marchetti");
    // Regular player rating card still uses the flat card preview, not the locker standee.
    expect(resolveDisplayCharacterCard("azure_elena_marchetti", 4)).toMatchObject({
      status: "ready",
      url: expect.stringContaining("/assets/cards/"),
    });
    expect(resolveDisplayCharacterCard("fog_eleanor_hart", 5)).toMatchObject({
      status: "ready",
      url: expect.stringContaining("/assets/cards/"),
    });
  });
});
