import { ArrowLeft, Check, ClipboardCheck, Lock, Search, SlidersHorizontal, Wand2, X } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import lockerRoomScene from "../assets/locker-room-v1.webp";
import { SayaGuide } from "../components/SayaGuide";
import { ProgressiveImage } from "../components/ProgressiveImage";
import { useTournamentCaptain } from "../components/TournamentCaptainContext";
import { captainGuideMessage } from "../data/captainGuideCopy";
import { factionMeta, roster, type FactionId } from "../data/gameData";
import { formatPlayerPositions } from "../data/lockerRoomData";
import { belongsToPositionGroup, positionGroups, type PositionGroup } from "./LockerRoomPage";
import { playerClub, TOURNAMENT_ROSTER_SIZE } from "../data/tournamentJourney";
import {
  buildTournamentCharacters,
  sortTournamentPlayers,
  trainingFocusTotal,
  type TournamentCharacter,
  type TournamentPlayerSortMode,
} from "../data/tournamentSquad";
import { resolveDisplayCharacterCard } from "../services/assetResolver";
import type { TournamentSquadState } from "../storage/tournamentSaveStorage";

type Props = { guideScope: string; clubName: string; squad: TournamentSquadState; selectedIds: string[]; onToggle: (characterId: string) => void; onQuickFill: (characterIds: string[]) => void; onLock: () => void; onBack: () => void };

export function filterRegistrationPlayers(players: TournamentCharacter[], filters: { query: string; positionGroup: PositionGroup; stars: number; factionId: "all" | FactionId; sortMode: TournamentPlayerSortMode }) {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("zh-CN");
  return sortTournamentPlayers(players
    .filter((player) => !normalizedQuery || `${player.name}${formatPlayerPositions(player)}${factionMeta[player.faction_id].name}`.toLocaleLowerCase("zh-CN").includes(normalizedQuery))
    .filter((player) => belongsToPositionGroup(player, filters.positionGroup))
    .filter((player) => filters.stars === 0 || player.stars === filters.stars)
    .filter((player) => filters.factionId === "all" || player.faction_id === filters.factionId), filters.sortMode);
}

export function TournamentRegistrationPage({ guideScope, clubName, squad, selectedIds, onToggle, onQuickFill, onLock, onBack }: Props) {
  const { captainId } = useTournamentCaptain();
  const players = useMemo(() => buildTournamentCharacters(roster.characters, squad), [squad]);
  const [query, setQuery] = useState("");
  const [positionGroup, setPositionGroup] = useState<PositionGroup>("all");
  const [stars, setStars] = useState(0);
  const [factionId, setFactionId] = useState<"all" | FactionId>("all");
  const [sortMode, setSortMode] = useState<TournamentPlayerSortMode>("focus");
  const filteredPlayers = useMemo(() => filterRegistrationPlayers(players, { query, positionGroup, stars, factionId, sortMode }), [factionId, players, positionGroup, query, sortMode, stars]);
  const rosterComplete = selectedIds.length === TOURNAMENT_ROSTER_SIZE;
  const rosterStatus = rosterComplete ? "名单完整，可以提交注册" : selectedIds.length > TOURNAMENT_ROSTER_SIZE ? `请取消 ${selectedIds.length - TOURNAMENT_ROSTER_SIZE} 人` : `还需选择 ${TOURNAMENT_ROSTER_SIZE - selectedIds.length} 人`;
  const quickFillIds = useMemo(() => sortTournamentPlayers(players, "overall").slice(0, TOURNAMENT_ROSTER_SIZE).map((player) => player.character_id), [players]);
  const quickFillActive = quickFillIds.length > 0 && quickFillIds.length === selectedIds.length && quickFillIds.every((id) => selectedIds.includes(id));
  function quickFillByOverall() {
    onQuickFill(quickFillActive ? [] : quickFillIds);
  }
  return <div className="registration-screen" style={{ "--registration-scene": `url(${lockerRoomScene})` } as CSSProperties}>
    <header className="registration-heading"><button type="button" onClick={onBack} aria-label="返回经理办公室"><ArrowLeft aria-hidden="true" /></button><div className="registration-club-heading"><img src={playerClub.crestUrl} alt={`${clubName}队徽`} /><span><small>DAY 1 · TOURNAMENT SQUAD</small><h1>{TOURNAMENT_ROSTER_SIZE}人赛事名单</h1><p>{clubName} · 这里只负责名单注册。球员档案与自带能力可在更衣室查看。</p></span></div><strong>{selectedIds.length}<span>/{TOURNAMENT_ROSTER_SIZE}</span></strong></header>
    <section className="registration-tools" aria-label="赛事名单筛选与排序">
      <label className="registration-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索球员、位置或阵营" aria-label="搜索赛事球员" />{query ? <button type="button" onClick={() => setQuery("")} aria-label="清空搜索"><X aria-hidden="true" /></button> : null}</label>
      <div className="registration-position-tabs" role="group" aria-label="按位置筛选">{positionGroups.map((group) => <button key={group.id} type="button" className={positionGroup === group.id ? "active" : undefined} aria-pressed={positionGroup === group.id} onClick={() => setPositionGroup(group.id)}>{group.label}</button>)}</div>
      <label><SlidersHorizontal aria-hidden="true" /><select value={stars} onChange={(event) => setStars(Number(event.target.value))} aria-label="按星级筛选"><option value={0}>全部星级</option><option value={6}>6星</option><option value={5}>5星</option><option value={4}>4星</option><option value={3}>3星</option></select></label>
      <label><select value={factionId} onChange={(event) => setFactionId(event.target.value as "all" | FactionId)} aria-label="按阵营筛选"><option value="all">全部阵营</option>{Object.entries(factionMeta).map(([id, meta]) => <option key={id} value={id}>{meta.name}</option>)}</select></label>
      <label><select value={sortMode} onChange={(event) => setSortMode(event.target.value as TournamentPlayerSortMode)} aria-label="赛事球员排序"><option value="focus">练度优先</option><option value="overall">能力优先</option><option value="rarity">星级优先</option></select></label>
      <button type="button" className={`registration-quick-fill${quickFillActive ? " active" : ""}`} data-sfx="team-select" aria-pressed={quickFillActive} onClick={quickFillByOverall} title={quickFillActive ? "取消当前填充的名单" : `按能力值从高到低勾选${TOURNAMENT_ROSTER_SIZE}人`}><Wand2 aria-hidden="true" />{quickFillActive ? "清空名单" : `按能力值填充${TOURNAMENT_ROSTER_SIZE}人`}</button>
      <span>显示 {filteredPlayers.length} 名</span>
    </section>
    <main className="registration-grid" data-saya-guide-target="registration-players">{filteredPlayers.map((player, index) => { const selected = selectedIds.includes(player.character_id); const art = resolveDisplayCharacterCard(player.character_id, player.stars); return <button key={player.character_id} type="button" data-sfx="team-select" className={`registration-player-card rarity-${player.stars}${selected ? " selected" : ""}`} aria-pressed={selected} disabled={!selected && selectedIds.length >= TOURNAMENT_ROSTER_SIZE} onClick={() => onToggle(player.character_id)}>{art.status === "ready" ? <ProgressiveImage src={art.url} alt={`${player.name}球星卡`} placeholder={player.name.slice(0, 1)} eager={index < 6} /> : <span className="progressive-image-placeholder">{player.name.slice(0, 1)}</span>}{selected ? <i><Check aria-hidden="true" /></i> : null}<div><strong>{player.name}</strong><small className="registration-card-positions">{formatPlayerPositions(player)}</small><small>练度 {trainingFocusTotal(player.focus)}/6 · OVR {player.currentOverall}</small></div></button>; })}{filteredPlayers.length === 0 ? <div className="registration-empty"><Search aria-hidden="true" /><strong>没有找到球员</strong><span>请调整搜索或筛选条件。</span></div> : null}</main>
    <footer className="registration-confirm-bar"><div><ClipboardCheck aria-hidden="true" /><span><b>已选择 {selectedIds.length} / {TOURNAMENT_ROSTER_SIZE}</b><small>{rosterStatus}</small></span></div><button type="button" data-saya-guide-target="registration-lock" data-sfx="confirm" disabled={!rosterComplete} onClick={onLock}><Lock aria-hidden="true" />锁定赛事名单</button></footer>
    <SayaGuide
      scope={guideScope}
      guideId={rosterComplete ? "registration-lock" : "registration-select"}
      title={rosterComplete ? "名单已经完整了" : `先选出${TOURNAMENT_ROSTER_SIZE}位球员`}
      message={rosterComplete ? captainGuideMessage(captainId, "registration-lock", "最后再确认一次吧。锁定后不能更换，其他球员仍会留在收藏中。") : captainGuideMessage(captainId, "registration-select", "点击卡片加入或移出名单。四条线都照顾到，慢慢选就好。")}
      target={rosterComplete ? "registration-lock" : "registration-players"}
      variant={rosterComplete ? "remind" : "think"}
    />
  </div>;
}
