import { describe, expect, it } from "vitest";
import { mascotOptions } from "../data/founderMascotData";
import { loginStadiumScene, tournamentManagerOfficeScenes, validateSceneDefinition } from "./sceneDefinitions";

describe("manager office scene", () => {
  it("binds every selectable mascot to a standee scene anchor", () => {
    expect(tournamentManagerOfficeScenes.day1.characterAnchors).toHaveLength(11);
    expect(tournamentManagerOfficeScenes.day1.characterAnchors.map((anchor) => anchor.id)).toEqual(
      mascotOptions.map((mascot) => mascot.anchorId),
    );
    expect(tournamentManagerOfficeScenes.day1.characterAnchors.every((anchor) => anchor.assetVariant === "standee")).toBe(true);
  });

  it("keeps UI and dock safe areas valid", () => {
    expect(validateSceneDefinition(tournamentManagerOfficeScenes.day1)).toEqual([]);
    expect(tournamentManagerOfficeScenes.day1.safeArea.dockReservePx).toBeGreaterThanOrEqual(96);
    expect(tournamentManagerOfficeScenes.day1.safeArea.contentMaxWidthPercent).toBeLessThanOrEqual(55);
  });

  it("uses a manifest asset ID with the current CSS background as fallback", () => {
    expect(tournamentManagerOfficeScenes.day1.background.assetId).toBe("scene.manager_office.tournament_day1");
    expect(tournamentManagerOfficeScenes.day1.background.fallbackClassName).toBe("scene-background-office-fallback");
  });

  it("provides one valid upgraded office for every knockout stage", () => {
    expect(Object.keys(tournamentManagerOfficeScenes)).toEqual(["day1", "round_of_16", "quarter_final", "semi_final", "final"]);
    expect(new Set(Object.values(tournamentManagerOfficeScenes).map((scene) => scene.background.assetId)).size).toBe(5);
    expect(Object.values(tournamentManagerOfficeScenes).every((scene) => validateSceneDefinition(scene).length === 0)).toBe(true);
    expect(Object.values(tournamentManagerOfficeScenes).every((scene) => scene.characterAnchors.length === mascotOptions.length)).toBe(true);
  });
});

describe("login stadium scene", () => {
  it("uses the promotional key visual without separate character anchors", () => {
    expect(loginStadiumScene.background.assetId).toBe("scene.login.key_visual");
    expect(loginStadiumScene.background.desktopVariant).toBe("desktop");
    expect(loginStadiumScene.characterAnchors).toEqual([]);
    expect(validateSceneDefinition(loginStadiumScene)).toEqual([]);
  });
});
