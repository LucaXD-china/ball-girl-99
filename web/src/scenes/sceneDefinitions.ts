import { mascotOptions } from "../data/founderMascotData";
import type { OfficeJourneyStage } from "../data/founderMascotData";

export type SceneAnchorPosition = {
  xPercent: number;
  bottomPercent: number;
  heightPercent: number;
};

export type SceneCharacterAnchor = {
  id: string;
  label: string;
  assetId?: string;
  assetVariant?: string;
  desktop: SceneAnchorPosition;
};

export type SceneDefinition = {
  id: string;
  label: string;
  background: {
    assetId: string;
    desktopVariant: string;
    fallbackClassName: string;
  };
  safeArea: {
    dockReservePx: number;
    contentMaxWidthPercent: number;
  };
  characterAnchors: SceneCharacterAnchor[];
};

export type TournamentOfficeStage = "day1" | OfficeJourneyStage;

export const loginStadiumScene: SceneDefinition = {
  id: "login_stadium_key_visual",
  label: "激射！绿茵少女！登录球场",
  background: {
    assetId: "scene.login.key_visual",
    desktopVariant: "desktop",
    fallbackClassName: "scene-background-login-fallback",
  },
  safeArea: {
    dockReservePx: 116,
    contentMaxWidthPercent: 48,
  },
  characterAnchors: [],
};

const managerOfficeCharacterAnchors = mascotOptions.map((mascot) => ({
    id: mascot.anchorId,
    label: `${mascot.name}看板娘立绘`,
    assetId: mascot.assetId,
    assetVariant: mascot.assetVariant,
    desktop: mascot.desktop,
}));

function createManagerOfficeScene(id: string, label: string, assetId: string): SceneDefinition {
  return {
    id,
    label,
    background: {
      assetId,
      desktopVariant: "desktop",
      fallbackClassName: "scene-background-office-fallback",
    },
    safeArea: {
      dockReservePx: 116,
      contentMaxWidthPercent: 48,
    },
    characterAnchors: managerOfficeCharacterAnchors,
  };
}

export const tournamentManagerOfficeScenes: Record<TournamentOfficeStage, SceneDefinition> = {
  day1: createManagerOfficeScene("tournament_office_day1", "99冠军联赛赛事办公室", "scene.manager_office.tournament_day1"),
  round_of_16: createManagerOfficeScene("manager_office_round_of_16", "99冠军联赛十六强经理办公室", "scene.manager_office.round_of_16"),
  quarter_final: createManagerOfficeScene("manager_office_quarter_final", "99冠军联赛八强经理办公室", "scene.manager_office.quarter_final"),
  semi_final: createManagerOfficeScene("manager_office_semi_final", "99冠军联赛半决赛经理办公室", "scene.manager_office.semi_final"),
  final: createManagerOfficeScene("manager_office_final", "99冠军联赛决赛经理办公室", "scene.manager_office.final"),
};

export function validateSceneDefinition(scene: SceneDefinition): string[] {
  const errors: string[] = [];
  const anchorIds = new Set<string>();

  if (scene.safeArea.dockReservePx < 96) errors.push("dock safe area is too small");
  if (scene.safeArea.contentMaxWidthPercent > 55) errors.push("UI safe area overlaps the character zone");

  for (const anchor of scene.characterAnchors) {
    if (anchorIds.has(anchor.id)) errors.push(`duplicate anchor: ${anchor.id}`);
    anchorIds.add(anchor.id);
    const position = anchor.desktop;
    if (position.xPercent < 0 || position.xPercent > 100) errors.push(`${anchor.id} x is outside the scene`);
    if (position.bottomPercent < 0 || position.bottomPercent > 100) errors.push(`${anchor.id} bottom is outside the scene`);
    if (position.heightPercent <= 0 || position.heightPercent > 100) errors.push(`${anchor.id} height is invalid`);
  }

  return errors;
}
