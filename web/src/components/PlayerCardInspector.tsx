import { X } from "lucide-react";
import { useEffect, type CSSProperties } from "react";
import type { Character } from "../data/gameData";
import { footLabels, formatPlayerPositions } from "../data/lockerRoomData";
import { resolveDisplayCharacterCard, resolveSixStarSummon } from "../services/assetResolver";

export function PlayerCardArtwork({ player, reveal = false }: { player: Character; reveal?: boolean }) {
  const asset = resolveDisplayCharacterCard(player.character_id, player.stars);
  const summonAnimation = reveal && player.stars === 6 ? resolveSixStarSummon(player.character_id) : null;
  const summonIdle = reveal && player.stars === 6 ? resolveSixStarSummon(player.character_id, "idle") : null;
  return (
    <div className={`pack-card-art rarity-${player.stars}${reveal ? " recruit-reveal" : ""}${reveal && player.stars === 5 ? " five-star-hit" : ""}${reveal && player.stars === 6 ? " six-star-hit" : ""}`}>
      <span className="pack-card-fallback" aria-hidden="true">{player.name.slice(0, 1)}</span>
      {asset.status === "ready" ? <img src={asset.url} alt={`${player.name}球员卡`} /> : null}
      {summonAnimation?.status === "ready" ? <img className="six-star-summon-animation" src={summonAnimation.url} alt="" aria-hidden="true" /> : null}
      {summonIdle?.status === "ready" ? <img className="six-star-summon-idle" src={summonIdle.url} alt="" aria-hidden="true" /> : null}
      {asset.status !== "ready" ? <span className="pack-card-stars">{"★".repeat(player.stars)}</span> : null}
      {reveal ? <><span className="recruit-edge-lock" aria-hidden="true"><i /><i /><i /><i /></span><span className="recruit-vertical-scan" aria-hidden="true" /><span className="recruit-lock-label">PLAYER SIGNAL LOCKED</span></> : null}
      {reveal && player.stars === 5 ? <><span className="five-star-spotlight" aria-hidden="true" /><span className="five-star-gate left" aria-hidden="true" /><span className="five-star-gate right" aria-hidden="true" /><span className="five-star-sweep" aria-hidden="true" /><span className="five-star-rarity-activate" aria-hidden="true" /><span className="five-star-shards" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--shard-index": index } as CSSProperties} />)}</span><span className="five-star-hit-label">GOLDEN CORE · 5 STAR</span></> : null}
      {reveal && player.stars === 6 ? <span className="six-star-impact" aria-hidden="true"><b /><em /><span>{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ "--impact-index": index } as CSSProperties} />)}</span></span> : null}
    </div>
  );
}

export function PlayerCardInspector({ player, eyebrow, status, ariaLabel = `${player.name}球员卡详情`, onClose }: {
  player: Character;
  eyebrow: string;
  status?: string;
  ariaLabel?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const isGoalkeeper = [player.position, ...player.alternative_positions].some((position) => position.split("/").includes("GK"));
  const attributes = isGoalkeeper
    ? [["扑救", player.attributes.goalkeeping.diving], ["手控", player.attributes.goalkeeping.handling], ["开球", player.attributes.goalkeeping.kicking], ["站位", player.attributes.goalkeeping.positioning], ["反应", player.attributes.goalkeeping.reflexes]]
    : [["速度", player.attributes.pace], ["射门", player.attributes.shooting], ["传球", player.attributes.passing], ["盘带", player.attributes.dribbling], ["防守", player.attributes.defending], ["身体", player.attributes.physical]];

  return (
    <div className="pack-result-inspector" role="dialog" aria-modal="true" aria-label={ariaLabel} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article className={`pack-result-inspector-card rarity-${player.stars}`}>
        <button type="button" className="pack-result-inspector-close" onClick={onClose} aria-label="关闭球员卡详情"><X aria-hidden="true" /></button>
        <div className="pack-result-inspector-art"><PlayerCardArtwork player={player} /></div>
        <div className="pack-result-inspector-copy">
          <small>{eyebrow}</small>
          <h3>{player.name}</h3>
          <p>{"★".repeat(player.stars)} · {formatPlayerPositions(player)} · {footLabels[player.preferred_foot] ?? player.preferred_foot}</p>
          {status ? <strong className="pack-result-obtained">{status}</strong> : null}
          <div className="pack-result-overall"><span>卡面基础 OVR</span><strong>{player.attributes.overall}</strong></div>
          <dl className="pack-result-attributes">{attributes.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </div>
      </article>
    </div>
  );
}
