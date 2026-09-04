import type { CSSProperties } from "react";
import { factionMeta, type Character } from "../data/gameData";
import type { FormationSlot } from "../data/matchSimulator";
import { characterArtworkAssetId, resolveCharacterArtwork, resolveCharacterCard, resolveDisplayCharacterCard } from "../services/assetResolver";

export function Portrait({ player, className = "", preferStandee = false, preferCompositeCard = false }: { player: Character; className?: string; preferStandee?: boolean; preferCompositeCard?: boolean }) {
  const artworkStars = player.opponentPromotion?.baseStars ?? player.stars;
  const standee = preferStandee ? resolveCharacterArtwork(characterArtworkAssetId(player.character_id, artworkStars)) : null;
  const displayCard = resolveDisplayCharacterCard(player.character_id, artworkStars);
  const compositeArtwork = preferCompositeCard && resolveCharacterCard(player.character_id).status !== "ready"
    ? resolveCharacterArtwork(characterArtworkAssetId(player.character_id, artworkStars))
    : null;
  const usesCompositeCard = compositeArtwork?.status === "ready";
  const asset = standee?.status === "ready" ? standee : usesCompositeCard ? compositeArtwork : displayCard;
  return (
    <div className={`match-portrait rarity-${artworkStars}${standee?.status === "ready" ? " standee" : usesCompositeCard ? " composite-card" : " card"} ${className}`}>
      <span aria-hidden="true">{player.name.slice(0, 1)}</span>
      {asset.status === "ready" ? <img src={asset.url} alt={`${player.name}立绘`} decoding="async" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
      {usesCompositeCard ? <div className="match-composite-card-frame" aria-hidden="true"><i>{"★".repeat(player.stars)}</i><b>{player.name}</b></div> : null}
    </div>
  );
}

export function FormationPlayerSlot({ player, slot, preferStandee = false }: { player: Character; slot: FormationSlot; preferStandee?: boolean }) {
  const faction = factionMeta[player.faction_id];
  return (
    <>
      <span className="lineup-player-visual" style={{ "--faction-color": faction.color } as CSSProperties}><Portrait player={player} preferStandee={preferStandee} /></span>
      <span className="lineup-player-name"><strong>{player.name}</strong><small>{slot.position}</small></span>
    </>
  );
}

export function EmptyPlayerSilhouette() {
  return <span className="empty-player-silhouette" aria-hidden="true"><i /><b /></span>;
}
