import type { CSSProperties, ReactNode } from "react";
import { resolveAsset } from "../services/assetResolver";
import type { SceneCharacterAnchor, SceneDefinition } from "../scenes/sceneDefinitions";

type Props = {
  scene: SceneDefinition;
  activeCharacterAnchorId?: SceneCharacterAnchor["id"] | null;
  children: ReactNode;
};

type SceneStyle = CSSProperties & Record<`--${string}`, string | number>;

export function SceneStage({ scene, activeCharacterAnchorId, children }: Props) {
  const desktopBackground = resolveAsset(scene.background.assetId, scene.background.desktopVariant);
  const characterAnchors = activeCharacterAnchorId === undefined
    ? scene.characterAnchors
    : scene.characterAnchors.filter((anchor) => anchor.id === activeCharacterAnchorId);
  const sceneStyle: SceneStyle = {
    "--scene-dock-reserve": `${scene.safeArea.dockReservePx}px`,
    "--scene-ui-max-width": `${scene.safeArea.contentMaxWidthPercent}%`,
  };

  if (desktopBackground.status === "ready") {
    sceneStyle["--scene-background-desktop"] = `url("${desktopBackground.url}")`;
  }

  return (
    <section
      className={`scene-stage ${scene.background.fallbackClassName}`}
      style={sceneStyle}
      data-scene-id={scene.id}
      data-active-character-anchor={activeCharacterAnchorId}
      aria-label={scene.label}
    >
      <div className="scene-background-layer" aria-hidden="true" />
      <div className="scene-atmosphere-layer" aria-hidden="true" />

      <div className="scene-character-layer" aria-hidden="true">
        {characterAnchors.map((anchor) => {
          const artwork = anchor.assetId ? resolveAsset(anchor.assetId, anchor.assetVariant ?? "standee") : null;
          const anchorStyle: SceneStyle = {
            "--anchor-desktop-x": `${anchor.desktop.xPercent}%`,
            "--anchor-desktop-bottom": `${anchor.desktop.bottomPercent}%`,
            "--anchor-desktop-height": `${anchor.desktop.heightPercent}%`,
          };
          return (
            <div
              key={anchor.id}
              className="scene-character-anchor"
              style={anchorStyle}
              data-character-anchor={anchor.id}
              data-character-status={artwork?.status ?? "unassigned"}
              title={anchor.label}
            >
              {artwork?.status === "ready" ? <img src={artwork.url} alt="" /> : null}
            </div>
          );
        })}
      </div>

      <div className="scene-ui-layer">{children}</div>
    </section>
  );
}
