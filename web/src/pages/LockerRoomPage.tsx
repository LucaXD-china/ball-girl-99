import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Dumbbell,
  Footprints,
  Gauge,
  Lock,
  Route,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import lockerRoomScene from "../assets/locker-room-v2.webp";
import { factionMeta, roster, type Character, type FactionId } from "../data/gameData";
import {
  footLabels,
  formatPlayerPositions,
  positionLabels,
  skillMeta,
  traitMeta,
} from "../data/lockerRoomData";
import { characterArtworkAssetId, resolveCharacterArtwork, resolveDisplayCharacterCard } from "../services/assetResolver";
import { assetUrl } from "../services/assetUrl";
import {
  defaultSpecialSkillFor,
  skillQualityMeta,
  type ConfigurableSkill,
  type SkillCategory,
} from "../data/skillData";
import {
  buildTournamentCharacters,
  sortTournamentPlayers,
  TOURNAMENT_MAX_FOCUS,
  trainingFocusTotal,
  type TournamentCharacter,
  type TournamentPlayerSortMode,
} from "../data/tournamentSquad";
import type { TournamentSquadState } from "../storage/tournamentSaveStorage";

export type PositionGroup = "all" | "keeper" | "defender" | "midfielder" | "forward";
type DetailTab = "overview" | "growth" | "skills" | "profile";

export const positionGroups: Array<{ id: PositionGroup; label: string }> = [
  { id: "all", label: "全部" },
  { id: "keeper", label: "门将" },
  { id: "defender", label: "后卫" },
  { id: "midfielder", label: "中场" },
  { id: "forward", label: "前锋" },
];

const outfieldAttributeRows: Array<{ key: keyof Character["attributes"]; label: string }> = [
  { key: "pace", label: "速度" },
  { key: "shooting", label: "射门" },
  { key: "passing", label: "传球" },
  { key: "dribbling", label: "盘带" },
  { key: "defending", label: "防守" },
  { key: "physical", label: "身体" },
];

const goalkeeperAttributeRows = [
  { key: "diving", label: "扑救" },
  { key: "handling", label: "手控" },
  { key: "kicking", label: "开球" },
  { key: "positioning", label: "站位" },
  { key: "reflexes", label: "反应" },
] as const;

const SAYA_CHARACTER_ID = "founder_sakura_link_4";
const NAYA_CHARACTER_ID = "founder_samba_union_7";
const IRENA_CHARACTER_ID = "founder_scarlet_toros_6";
const SAYA_LOCKER_MOTION_DURATION_MS = 7200;
const SAYA_LOCKER_MOTION_URL = assetUrl("/assets/characters/locker-motion-v1/saya-interaction-v3.gif");
const NAYA_LOCKER_MOTION_DURATION_MS = 5000;
const NAYA_LOCKER_MOTION_URL = assetUrl("/assets/characters/locker-motion-v1/naya-beach-interaction-v2.webp");
const IRENA_LOCKER_MOTION_DURATION_MS = 6340;
const IRENA_LOCKER_MOTION_URL = assetUrl("/assets/characters/locker-motion-v1/irena-chibi-os-v2.webp");

export function formatAttributeValue(value: number) {
  return Math.round(value).toString();
}

function isGoalkeeper(player: Pick<Character, "position" | "alternative_positions">) {
  return [player.position, ...player.alternative_positions].some((position) => position.split("/").includes("GK"));
}

export function belongsToPositionGroup(player: Pick<Character, "position" | "alternative_positions">, group: PositionGroup) {
  if (group === "all") return true;
  const positions = [player.position, ...player.alternative_positions].flatMap((position) => position.split("/"));
  if (group === "keeper") return positions.includes("GK");
  if (group === "defender") return positions.some((position) => ["CB", "LB", "RB", "LWB", "RWB"].includes(position));
  if (group === "midfielder") return positions.some((position) => ["CDM", "CM", "CAM", "LM", "RM"].includes(position));
  return positions.some((position) => ["ST", "CF", "LW", "RW"].includes(position));
}

export function playerSwipeDirection(deltaX: number, deltaY: number): -1 | 0 | 1 {
  const horizontalDistance = Math.abs(deltaX);
  if (horizontalDistance <= 64 || horizontalDistance <= Math.abs(deltaY) * 1.25) return 0;
  return deltaX < 0 ? 1 : -1;
}

function PlayerArtwork({ player, detail = false }: { player: TournamentCharacter; detail?: boolean }) {
  const standee = detail ? resolveCharacterArtwork(characterArtworkAssetId(player.character_id, player.stars)) : null;
  const asset = standee?.status === "ready" ? standee : resolveDisplayCharacterCard(player.character_id, player.stars);
  const usesStandee = standee?.status === "ready" || (asset.status === "ready" && asset.url.includes("/assets/characters/"));
  return (
    <div className={`locker-artwork rarity-${player.stars}${detail ? " detail" : ""}${usesStandee ? " standee-artwork" : " card-artwork"}`}>
      <span className="artwork-fallback" aria-hidden="true">{player.name.slice(0, 1)}</span>
      {asset.status === "ready" ? (
        <img
          src={asset.url}
          alt={`${player.name}球员卡立绘`}
          draggable={false}
          loading={detail ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={detail ? "high" : "auto"}
          onError={(event) => { event.currentTarget.hidden = true; }}
        />
      ) : null}
      {usesStandee ? <span className="runtime-rarity-mark" aria-label={`${player.stars}星`}>{"★".repeat(player.stars)}</span> : null}
    </div>
  );
}

function LockerMotion({ player }: { player: TournamentCharacter }) {
  const isNaya = player.character_id === NAYA_CHARACTER_ID;
  const isIrena = player.character_id === IRENA_CHARACTER_ID;
  const characterName = isNaya ? "娜雅" : isIrena ? "伊蕾娜" : "纱夜";
  const motionUrl = isNaya ? NAYA_LOCKER_MOTION_URL : isIrena ? IRENA_LOCKER_MOTION_URL : SAYA_LOCKER_MOTION_URL;
  const motionDuration = isNaya ? NAYA_LOCKER_MOTION_DURATION_MS : isIrena ? IRENA_LOCKER_MOTION_DURATION_MS : SAYA_LOCKER_MOTION_DURATION_MS;
  const motionAlt = isNaya
    ? "娜雅在海滩球场秀技的互动演出"
    : isIrena
      ? "伊蕾娜装大人讲战术、被发现后害羞的互动演出"
      : "纱夜训练后擦汗并害羞的互动演出";
  const [playing, setPlaying] = useState(true);
  const [playToken, setPlayToken] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const timeout = window.setTimeout(() => setPlaying(false), motionDuration);
    return () => window.clearTimeout(timeout);
  }, [motionDuration, playing, playToken]);

  function replay() {
    setPlaying(true);
    setPlayToken((token) => token + 1);
  }

  return <>
    <PlayerArtwork player={player} detail />
    <button type="button" className="saya-locker-replay" onClick={replay} aria-label={`重新播放${characterName}更衣室互动演出`} />
    {playing ? <div className="saya-locker-motion" aria-label={`${characterName}更衣室互动演出播放中`} style={{ "--locker-motion-duration": `${motionDuration}ms` } as CSSProperties}>
      <img src={`${motionUrl}?play=${playToken}`} alt={motionAlt} draggable={false} decoding="async" fetchPriority="high" />
    </div> : null}
  </>;
}

const skillCategoryIcons = {
  technique: Sparkles,
  movement: Footprints,
  tactics: Route,
  special: Shield,
} satisfies Record<SkillCategory, typeof Sparkles>;

function SkillGlyph({ skill }: { skill: ConfigurableSkill }) {
  const Icon = skillCategoryIcons[skill.category];
  return <span className="skill-glyph" style={{ "--skill-quality": skillQualityMeta[skill.quality].color } as CSSProperties}><Icon aria-hidden="true" /><b>{skill.name.slice(0, 1)}</b></span>;
}

type Props = {
  squad: TournamentSquadState;
  visibleCharacterIds?: string[];
  onBackToOffice: () => void;
  initialSelectedId?: string;
  initialDetailOpen?: boolean;
};

export function LockerRoomPage({ squad, visibleCharacterIds, onBackToOffice, initialSelectedId, initialDetailOpen = false }: Props) {
  const ownedPlayers = useMemo(() => {
    const players = buildTournamentCharacters(roster.characters, squad);
    if (!visibleCharacterIds) return players;
    const visibleIds = new Set(visibleCharacterIds);
    return players.filter((player) => visibleIds.has(player.character_id));
  }, [squad.characterProgress, squad.collection, visibleCharacterIds]);
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? ownedPlayers[0].character_id);
  const [detailOpen, setDetailOpen] = useState(initialDetailOpen);
  const [query, setQuery] = useState("");
  const [positionGroup, setPositionGroup] = useState<PositionGroup>("all");
  const [stars, setStars] = useState(0);
  const [factionId, setFactionId] = useState<"all" | FactionId>("all");
  const [sortMode, setSortMode] = useState<TournamentPlayerSortMode>("focus");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedPlayer = ownedPlayers.find((player) => player.character_id === selectedId) ?? ownedPlayers[0];
  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    return sortTournamentPlayers(ownedPlayers
      .filter((player) => !normalizedQuery || `${player.name}${formatPlayerPositions(player)}${factionMeta[player.faction_id].name}`.toLocaleLowerCase("zh-CN").includes(normalizedQuery))
      .filter((player) => belongsToPositionGroup(player, positionGroup))
      .filter((player) => stars === 0 || player.stars === stars)
      .filter((player) => factionId === "all" || player.faction_id === factionId), sortMode);
  }, [factionId, ownedPlayers, positionGroup, query, sortMode, stars]);
  const activeFilterCount = Number(positionGroup !== "all") + Number(stars !== 0) + Number(factionId !== "all") + Number(sortMode !== "focus");

  function selectPlayer(player: TournamentCharacter) {
    setSelectedId(player.character_id);
    setDetailTab("overview");
    setDetailOpen(true);
  }

  function showAdjacentPlayer(direction: -1 | 1) {
    const currentIndex = filteredPlayers.findIndex((player) => player.character_id === selectedPlayer.character_id);
    if (currentIndex < 0) return;
    const adjacentPlayer = filteredPlayers[currentIndex + direction];
    if (adjacentPlayer) setSelectedId(adjacentPlayer.character_id);
  }

  return (
    <div className="locker-screen" style={{ "--locker-scene": `url(${lockerRoomScene})` } as CSSProperties}>
      <button type="button" className="locker-back locker-floating-back" onClick={() => detailOpen ? setDetailOpen(false) : onBackToOffice()} aria-label={detailOpen ? "返回球员列表" : "返回经理办公室"}>
        <ArrowLeft aria-hidden="true" />
      </button>

      <section className={`locker-workspace ${detailOpen ? "detail-view" : "list-view"}`}>
        {!detailOpen ? <div className="locker-collection">
          <div className="locker-tools">
            <div className="locker-results-heading">
              <span>我的球员</span>
            </div>
            <label className="locker-search">
              <Search aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索球员、位置或阵营" aria-label="搜索持有球员" />
              {query ? <button type="button" onClick={() => setQuery("")} aria-label="清空搜索"><X aria-hidden="true" /></button> : null}
            </label>
            <button type="button" className={`locker-filter-trigger${activeFilterCount ? " active" : ""}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal aria-hidden="true" /><span>筛选</span>{activeFilterCount ? <b>{activeFilterCount}</b> : null}
            </button>
          </div>

          {filtersOpen ? <div className="locker-filter-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFiltersOpen(false); }}>
            <section className="locker-filter-sheet" aria-label="球员筛选">
              <header><div><small>PLAYER FILTER</small><strong>筛选与排序</strong></div><button type="button" onClick={() => setFiltersOpen(false)} aria-label="关闭筛选"><X aria-hidden="true" /></button></header>
              <div className="filter-row"><span>位置</span><div className="position-tabs" role="group" aria-label="按位置筛选">{positionGroups.map((group) => <button key={group.id} type="button" className={positionGroup === group.id ? "active" : undefined} aria-pressed={positionGroup === group.id} onClick={() => setPositionGroup(group.id)}>{group.label}</button>)}</div></div>
              <div className="locker-selects">
                <label><span>星级</span><select value={stars} onChange={(event) => setStars(Number(event.target.value))}><option value={0}>全部星级</option><option value={6}>6 星</option><option value={5}>5 星</option><option value={4}>4 星</option><option value={3}>3 星</option></select></label>
                <label><span>阵营</span><select value={factionId} onChange={(event) => setFactionId(event.target.value as "all" | FactionId)}><option value="all">全部阵营</option>{Object.entries(factionMeta).map(([id, meta]) => <option key={id} value={id}>{meta.name}</option>)}</select></label>
                <label><span>排序</span><select value={sortMode} onChange={(event) => setSortMode(event.target.value as TournamentPlayerSortMode)}><option value="focus">练度优先</option><option value="overall">能力优先</option><option value="rarity">星级优先</option></select></label>
              </div>
              <footer><button type="button" onClick={() => { setPositionGroup("all"); setStars(0); setFactionId("all"); setSortMode("focus"); }}>重置条件</button><button type="button" onClick={() => setFiltersOpen(false)}>显示 {filteredPlayers.length} 名球员</button></footer>
            </section>
          </div> : null}

          <div className="player-card-grid">
            {filteredPlayers.map((player) => (
              <button
                type="button"
                key={player.character_id}
                className={`player-card-tile rarity-${player.stars}${selectedPlayer.character_id === player.character_id ? " selected" : ""}`}
                onClick={() => selectPlayer(player)}
                aria-label={`查看${player.name}详情，${player.stars}星，${formatPlayerPositions(player)}，练度${trainingFocusTotal(player.focus)}`}
              >
                <PlayerArtwork player={player} />
                  <span className="tile-copy">
                    <span className="tile-name-row"><strong>{player.name}</strong></span>
                    <span className="tile-positions">{formatPlayerPositions(player)}</span>
                    <span className="tile-meta">
                      <span className="tile-level-corner"><strong>练度 {trainingFocusTotal(player.focus)}/6</strong></span>
                      <span className="tile-overall-corner"><small>综合</small><strong>{player.currentOverall}</strong></span>
                    </span>
                </span>
              </button>
            ))}
            {filteredPlayers.length === 0 ? (
              <div className="locker-empty"><Search aria-hidden="true" /><strong>没有找到球员</strong><span>试试更换位置、星级或阵营条件。</span></div>
            ) : null}
          </div>
        </div> : null}

        {detailOpen ? <aside className="player-dossier detail-page" aria-label={`${selectedPlayer.name}球员档案`}>
          <PlayerDossier
            player={selectedPlayer}
            activeTab={detailTab}
            onTabChange={setDetailTab}
            onSwipePlayer={showAdjacentPlayer}
          />
        </aside> : null}
      </section>
    </div>
  );
}

export function PlayerDossier({
  player,
  activeTab,
  onTabChange,
  onSwipePlayer,
}: {
  player: TournamentCharacter;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onSwipePlayer?: (direction: -1 | 1) => void;
}) {
  const swipeStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const faction = factionMeta[player.faction_id];
  const skill = skillMeta[player.signature_skill_id];
  const fixedSkill = defaultSpecialSkillFor(player);
  const trait = traitMeta[player.base_trait_id];
  const alternativePositions = player.alternative_positions.map((position) => positionLabels[position] ?? position);
  function startSwipe(event: ReactPointerEvent<HTMLElement>) {
    if (!onSwipePlayer || (event.pointerType === "mouse" && event.button !== 0)) return;
    swipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishSwipe(event: ReactPointerEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.pointerId !== event.pointerId || !onSwipePlayer) return;
    const direction = playerSwipeDirection(event.clientX - start.x, event.clientY - start.y);
    if (direction) onSwipePlayer(direction);
  }

  return (
    <div className="dossier-console" style={{ "--faction-color": faction.color } as CSSProperties}>
      <section
        className={`dossier-visual-stage${onSwipePlayer ? " player-swipe-zone" : ""}`}
        aria-label={onSwipePlayer ? `${player.name}立绘，左右拖动切换相邻球员` : undefined}
        tabIndex={onSwipePlayer ? 0 : undefined}
        onPointerDown={startSwipe}
        onPointerUp={finishSwipe}
        onPointerCancel={() => { swipeStart.current = null; }}
        onKeyDown={(event) => {
          if (!onSwipePlayer || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
          event.preventDefault();
          onSwipePlayer(event.key === "ArrowRight" ? 1 : -1);
        }}
      >
        {[SAYA_CHARACTER_ID, NAYA_CHARACTER_ID, IRENA_CHARACTER_ID].includes(player.character_id) ? <LockerMotion player={player} /> : <PlayerArtwork player={player} detail />}
        <div className="overall-medallion"><small>综合</small><strong>{player.currentOverall}</strong></div>
        {onSwipePlayer ? <span className="dossier-swipe-hint" aria-hidden="true">‹ 左右拖动切换球员 ›</span> : null}
      </section>
      <section className="dossier-system-panel">
        <header className="dossier-player-identity" aria-label={`球员昵称 ${player.name}，阵营 ${faction.name}`}><div><small>球员昵称</small><strong>{player.name}</strong></div><span>{faction.name} ｜ {player.profile.full_name}</span></header>
        <nav className="dossier-tabs" aria-label="球员养成分类">
          <button type="button" className={activeTab === "overview" ? "active" : undefined} onClick={() => onTabChange("overview")}><Gauge aria-hidden="true" /><span>概览</span></button>
          <button type="button" className={activeTab === "growth" ? "active" : undefined} onClick={() => onTabChange("growth")}><Dumbbell aria-hidden="true" /><span>养成</span></button>
          <button type="button" className={activeTab === "skills" ? "active" : undefined} onClick={() => onTabChange("skills")}><Sparkles aria-hidden="true" /><span>技能</span></button>
          <button type="button" className={activeTab === "profile" ? "active" : undefined} onClick={() => onTabChange("profile")}><BookOpen aria-hidden="true" /><span>档案</span></button>
        </nav>
        <div className="dossier-tab-content">
          {activeTab === "overview" ? <>
            <section className="dossier-section attribute-section">
              <div className="section-title"><span>能力面板</span><small>本届练度 {trainingFocusTotal(player.focus)}/{TOURNAMENT_MAX_FOCUS}</small></div>
              <div className="attribute-grid">{isGoalkeeper(player)
                ? goalkeeperAttributeRows.map(({ key, label }) => { const value = player.attributes.goalkeeping[key] ?? 0; return <div key={key}><span>{label}</span><strong>{formatAttributeValue(value)}</strong><i><b style={{ width: `${value}%` }} /></i></div>; })
                : outfieldAttributeRows.map(({ key, label }) => { const value = player.attributes[key] as number; return <div key={key}><span>{label}</span><strong>{formatAttributeValue(value)}</strong><i><b style={{ width: `${value}%` }} /></i></div>; })}</div>
            </section>
            <section className="dossier-section role-summary"><div className="section-title"><span>场上定位</span></div><article className="base-trait"><Shield aria-hidden="true" /><div><span>基础特性</span><strong>{trait?.name ?? player.base_trait_id}</strong><p>{trait?.description}</p></div></article></section>
          </> : null}
          {activeTab === "growth" ? <>
            <section className="level-panel" aria-label={`本届练度 ${trainingFocusTotal(player.focus)}，上限 ${TOURNAMENT_MAX_FOCUS}`}><div><span><Star aria-hidden="true" />本届练度</span><strong>{trainingFocusTotal(player.focus)}<small>/ {TOURNAMENT_MAX_FOCUS}</small></strong></div><p><span>进攻 {player.focus.attack}</span><span>组织 {player.focus.playmaking}</span><span>防守 {player.focus.defense}</span></p></section>
            <section className="dossier-section breakthrough-section"><div className="section-title"><span>重复卡升星</span><small>独立于基础 {player.stars} 星</small></div><div className="breakthrough-track" aria-label={`升星阶段 ${player.breakthroughRank} / 5`}>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < player.breakthroughRank ? "active" : undefined}>★</i>)}</div><p>抽到重复卡会自动升星，不需要额外操作。升星强化固有天赋与职位核心能力。</p></section>
          </> : null}
          {activeTab === "skills" ? <>
            <section className="dossier-section skill-display-notice" aria-label="技能展示说明"><div className="section-title"><span>技能展示说明</span><small>DISPLAY ONLY</small></div><p>当前版本技能只做立绘展示，不参与比赛数值结算。</p></section>
            <section className="dossier-section skill-section"><div className="section-title"><span>固有天赋</span><small>升星 {player.breakthroughRank} / 5</small></div><article className="signature-skill"><div className="skill-icon"><Sparkles aria-hidden="true" /></div><div><span>不可替换 · 角色身份</span><h3>{skill?.name ?? player.signature_skill_id}</h3><p><strong>触发：</strong>{skill?.trigger ?? "比赛中满足角色条件时"}</p><p>{skill?.effect ?? "强化对应比赛阶段的个人贡献。"}</p></div><ChevronRight aria-hidden="true" /></article></section>
            {fixedSkill ? <section className="dossier-section configurable-skill-section fixed-special-skill"><div className="section-title"><span>默认携带技能</span><small>{skillQualityMeta[fixedSkill.quality].name}色</small></div><article className="skill-slot-card fixed" style={{ "--skill-quality": skillQualityMeta[fixedSkill.quality].color } as CSSProperties}><span className="skill-slot-frame"><SkillGlyph skill={fixedSkill} /></span><span className="skill-slot-copy"><small>自动生效 · 本届不可更换</small><strong>{fixedSkill.name}</strong><span>{fixedSkill.trigger}</span></span><ChevronRight aria-hidden="true" /></article></section> : null}
            <section className="dossier-section configurable-skill-section development-preview"><div className="section-title"><span>配置技能</span><small>开发预览</small></div><article className="skill-slot-card locked"><span className="skill-slot-frame"><Lock aria-hidden="true" /></span><span className="skill-slot-copy"><small>正式版本规划</small><strong>技能装配与研习</strong><span>未来将开放位置职责和战术构筑，本届不可操作。</span></span></article></section>
          </> : null}
          {activeTab === "profile" ? <section className="dossier-section player-registration"><div className="section-title"><span>球员资料</span><small>公开球员信息</small></div><dl><div><dt>主位置</dt><dd>{positionLabels[player.position] ?? player.position}</dd></div><div><dt>可用位置</dt><dd>{alternativePositions.length ? alternativePositions.join(" · ") : "仅主位置"}</dd></div><div><dt>惯用脚</dt><dd>{footLabels[player.preferred_foot] ?? player.preferred_foot}</dd></div><div><dt>球员星级</dt><dd>{player.stars} 星</dd></div><div><dt>所属阵营</dt><dd>{faction.name}</dd></div><div><dt>收藏张数</dt><dd>{player.copies} 张{player.copies > 1 ? "（含重复卡）" : ""}</dd></div></dl></section> : null}
        </div>
      </section>
    </div>
  );
}
