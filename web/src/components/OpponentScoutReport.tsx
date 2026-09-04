import { Shield, Target, X } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { factionMeta, type Character } from "../data/gameData";
import { resolveMatchDaySceneUrl } from "../data/matchDayScenes";
import { attackFormations, defenseFormations } from "../data/matchSimulator";
import { clubBlueprints, type GeneratedOpponent } from "../data/tournamentJourney";
import { EmptyPlayerSilhouette, FormationPlayerSlot } from "./MatchPortrait";
import { PlayerCardInspector } from "./PlayerCardInspector";

export function OpponentScoutReport({ opponent, fixtureLabel, onClose, aggregateScore, showPlayers = true }: {
  opponent: GeneratedOpponent;
  fixtureLabel: string;
  onClose: () => void;
  aggregateScore?: { player: number; opponent: number };
  showPlayers?: boolean;
}) {
  const opponentBlueprint = clubBlueprints.find(({ id }) => id === opponent.blueprintId);
  const playerMap = useMemo(() => new Map(opponent.characters.map((player) => [player.character_id, player])), [opponent.characters]);
  const score = aggregateScore ?? { player: 0, opponent: 0 };
  const venueSceneUrl = resolveMatchDaySceneUrl({ phase: "scout" });
  const [selectedPlayer, setSelectedPlayer] = useState<Character | null>(null);

  return (
    <div className="scout-report-backdrop" data-match-day-scene={venueSceneUrl ? "ready" : undefined} style={venueSceneUrl ? { "--match-day-scene": `url("${venueSceneUrl}")` } as CSSProperties : undefined} role="dialog" aria-modal="true" aria-label={`${opponent.name}球探报告`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="scout-report-modal tactical-board">
        <header className="scout-report-heading">
          <h2>球探报告 · {fixtureLabel}</h2>
          <button type="button" onClick={onClose} aria-label="关闭球探报告"><X aria-hidden="true" /><span>关闭</span></button>
        </header>

        <div className="opponent-scout-panel scout-report-panel">
          <div className="opponent-scout-layout">
            <div className="opponent-scout-summary">
              <section className="opponent-identity-card">
                <div className="opponent-crest">{opponentBlueprint ? <img src={opponentBlueprint.crestUrl} alt={`${opponentBlueprint.name}队徽`} /> : <Shield aria-hidden="true" />}</div>
                <div><h2>{opponent.name}</h2></div>
              </section>
              <section className="opponent-tactics-card">
                <header><Target aria-hidden="true" /><div><span>预计有球结构</span><strong>{opponent.attackFormationId}</strong></div></header>
                <div><span>重点观察</span><strong>前腰接球 · 双后腰保护</strong></div>
              </section>
              <section className="opponent-tactics-card defense">
                <header><Shield aria-hidden="true" /><div><span>预计无球结构</span><strong>{defenseFormations[opponent.defenseFormationId].name}</strong></div></header>
                <div><span>可利用空间</span><strong>边路身后 · 横向转移</strong></div>
              </section>
              <aside className="opponent-scout-advice">
                {aggregateScore ? <><span>当前总比分</span><strong className="scout-score">{score.player}<i>:</i>{score.opponent}</strong></> : <><span>档案线索</span><h3>故事里的细节，已经写进战术板</h3><p>认真读完对手档案，才能发现这份额外情报。</p></>}
              </aside>
            </div>
            <section className="opponent-lineup-card">
              <header><div><h3>预测首发阵型</h3></div>{showPlayers ? null : <small>仅展示阵型，不固定球员</small>}</header>
              <div className="tactics-pitch opponent-tactics-pitch" data-lineup-display={showPlayers ? "players" : "formation-only"} aria-label={`${opponent.name}${opponent.attackFormationId}预测首发阵容`}>
                <div className="pitch-center-circle" />
                <i className="pitch-penalty-area opponent" aria-hidden="true" />
                <i className="pitch-penalty-area home" aria-hidden="true" />
                <span className="pitch-direction-marker" aria-hidden="true"><b>↑</b>进攻</span>
                {attackFormations[opponent.attackFormationId].slots.map((slot) => {
                  const player = playerMap.get(opponent.lineup[slot.id] ?? "");
                  const displayPlayer = showPlayers ? player : undefined;
                  const className = `lineup-slot opponent-lineup-slot${displayPlayer ? " filled" : " formation-only"}${slot.position === "GK" ? " goalkeeper" : ""}`;
                  const style = { "--slot-x": `${slot.x}%`, "--slot-y": `${slot.y}%` } as CSSProperties;
                  return displayPlayer
                    ? <button key={slot.id} type="button" className={className} style={style} aria-label={`打开${displayPlayer.name}球员卡详情`} onClick={() => setSelectedPlayer(displayPlayer)}><FormationPlayerSlot player={displayPlayer} slot={slot} /></button>
                    : <article key={slot.id} className={className} style={style} aria-label={`${slot.label}${slot.position}位置`}><span className="lineup-player-visual empty"><EmptyPlayerSilhouette /></span><span className="lineup-player-name formation-only-name"><small>{slot.position}</small></span></article>;
                })}
              </div>
            </section>
          </div>
        </div>
      </section>
      {selectedPlayer ? <PlayerCardInspector player={selectedPlayer} eyebrow={`球探报告 · ${factionMeta[selectedPlayer.faction_id].name}`} onClose={() => setSelectedPlayer(null)} /> : null}
    </div>
  );
}
