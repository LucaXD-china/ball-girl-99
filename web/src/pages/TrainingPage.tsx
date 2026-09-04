import { ArrowLeft, Check, ChevronLeft, ChevronRight, Route, Search, Shield, SlidersHorizontal, Target, UsersRound, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { SayaGuide } from "../components/SayaGuide";
import { ProgressiveImage } from "../components/ProgressiveImage";
import { useTournamentCaptain } from "../components/TournamentCaptainContext";
import { tournamentCaptainRoutes, type TournamentCaptainId } from "../data/tournamentCaptain";
import { factionMeta, roster, type Character, type FactionId } from "../data/gameData";
import { formatPlayerPositions } from "../data/lockerRoomData";
import { belongsToPositionGroup, positionGroups, type PositionGroup } from "./LockerRoomPage";
import {
  buildTournamentCharacters,
  isGoalkeeper,
  recommendedTrainingFocus,
  sortTournamentPlayers,
  TOURNAMENT_MAX_FOCUS,
  TRAINING_DAY_COST,
  TRAINING_MAIN_BONUS,
  TRAINING_SUB_BONUS,
  trainingFocusIds,
  trainingFocusMeta,
  trainingFocusPreview,
  trainingFocusTotal,
  type TrainingFocusId,
  type TournamentCharacter,
} from "../data/tournamentSquad";
import { resolveDisplayCharacterCard } from "../services/assetResolver";
import { playSfx } from "../services/SoundEffects";
import { hasSeenTournamentGuide, rememberTournamentGuide } from "../storage/tournamentGuideStorage";
import type { TournamentSaveV6, TournamentSquadState } from "../storage/tournamentSaveStorage";
import trainingCenterScene from "../assets/training-center-v2.webp";

type Props = {
  guideScope: string;
  managerNickname: string;
  squad: TournamentSquadState;
  registeredIds: string[];
  day: number;
  fixtureDay: number;
  fixtureName: string;
  remainingDays: number;
  onTrain: (focusId: TrainingFocusId, characterIds: string[]) => TournamentSaveV6;
  onBackToOffice: () => void;
  onGoToMatch: () => void;
};

type TrainingView = "hub" | "room";
type FirstTrainingStep = number;

type TrainingPlayerFilters = {
  query: string;
  positionGroup: PositionGroup;
  stars: number;
  factionId: "all" | FactionId;
};

const TRAINING_PLAYER_PAGE_SIZE = 10;
const FIRST_TRAINING_DONE_GUIDE_ID = "training-first-flow-done";
const TRAINING_MAIN_BONUS_LABEL = TRAINING_MAIN_BONUS.toFixed(1);
const TRAINING_SUB_BONUS_LABEL = TRAINING_SUB_BONUS.toFixed(1);

const focusIcons = {
  attack: Target,
  playmaking: Route,
  defense: Shield,
} as const;

export const trainingSystemIntroduction = {
  title: "先选方向，再练三人",
  message: "进攻练射门、组织练传球、防守练防守。选 3 人训练 5 天，每人本届最多练 6 次。",
} as const;

export const trainingNoActionPrompt = {
  title: "该去比赛了",
  message: "要来不及啦经理，快去比赛！",
} as const;

export const trainingGoToMatchActionLabel = "前往比赛";

export function resolveTrainingNoActionGuide() {
  return {
    guideId: "training-no-action-exit",
    title: trainingNoActionPrompt.title,
    message: trainingNoActionPrompt.message,
    actionLabel: trainingGoToMatchActionLabel,
    kind: "match" as const,
  };
}

export function shouldPromptForMatchAfterTraining(remainingDays: number) {
  return remainingDays - TRAINING_DAY_COST < TRAINING_DAY_COST;
}

export function filterTrainingPlayers(players: TournamentCharacter[], filters: TrainingPlayerFilters) {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("zh-CN");
  return players
    .filter((player) => !normalizedQuery || `${player.name}${formatPlayerPositions(player)}${factionMeta[player.faction_id].name}`.toLocaleLowerCase("zh-CN").includes(normalizedQuery))
    .filter((player) => belongsToPositionGroup(player, filters.positionGroup))
    .filter((player) => filters.stars === 0 || player.stars === filters.stars)
    .filter((player) => filters.factionId === "all" || player.faction_id === filters.factionId);
}

function resolveTrainingActionMode(remainingDays: number, selectedIds: string[], focusId: TrainingFocusId | null) {
  if (remainingDays < TRAINING_DAY_COST) return "prompt-exit" as const;
  const validGroup = focusId !== null && selectedIds.length === 3 && new Set(selectedIds).size === 3;
  return validGroup ? "train" as const : "disabled" as const;
}

type TrainingResultEntry = {
  id: string;
  name: string;
  main: { label: string; before: number; after: number };
  sub: { label: string; before: number; after: number };
  overall: { before: number; after: number };
};

export function buildTrainingResultEntry(before: TournamentCharacter, after: TournamentCharacter, focusId: TrainingFocusId): TrainingResultEntry {
  return {
    id: before.character_id,
    name: before.name,
    ...trainingFocusPreview(before, focusId),
    overall: { before: before.currentOverall, after: after.currentOverall },
  };
}

type FirstTrainingGuideStep = {
  guideId: string;
  title: string;
  message: string;
  target: string;
  advance?: boolean;
};

type FirstTrainingRole = "captain" | "gk" | "defender";
type FirstTrainingPick = { player: TournamentCharacter; role: FirstTrainingRole };

export function isDefensiveTrainingCharacter(character: Pick<Character, "position" | "alternative_positions">) {
  return recommendedTrainingFocus(character) === "defense";
}

function firstTrainingPageOf(characterId: string, rosterOrder: TournamentCharacter[], pageSize: number) {
  const index = rosterOrder.findIndex((player) => player.character_id === characterId);
  return index >= 0 ? Math.floor(index / pageSize) : 0;
}

function firstTrainingPositionLabel(player: Pick<Character, "position" | "alternative_positions">) {
  return formatPlayerPositions(player).split(" / ")[0];
}

// 首次防守训练的教学阵容：优先用成品叙事里的纱夜 / 哈特 / 埃斯特，
// 缺少时回退到档主实际持有的可训练球员，保证引导一定能推进。
export function selectFirstTrainingPlayers(players: TournamentCharacter[], rosterOrder: TournamentCharacter[], captainId: TournamentCaptainId = "saya"): FirstTrainingPick[] {
  const route = tournamentCaptainRoutes[captainId];
  const trainable = rosterOrder.filter((player) => trainingFocusTotal(player.focus) < TOURNAMENT_MAX_FOCUS);
  const taken = new Set<string>();
  const picks: FirstTrainingPick[] = [];
  function addPreferred(role: FirstTrainingRole, preferredId: string | null, predicate: (player: TournamentCharacter) => boolean): void {
    const preferred = preferredId ? trainable.find((player) => player.character_id === preferredId && !taken.has(player.character_id)) : null;
    const chosen = preferred ?? trainable.find((player) => !taken.has(player.character_id) && predicate(player));
    if (chosen) {
      taken.add(chosen.character_id);
      picks.push({ player: chosen, role });
    }
  }
  addPreferred("captain", route.characterId, (player) => !isGoalkeeper(player) && recommendedTrainingFocus(player) === route.trainingFocusId);
  addPreferred("gk", captainId === "saya" ? "fog_eleanor_hart" : null, (player) => captainId === "saya"
    ? isGoalkeeper(player)
    : recommendedTrainingFocus(player) === route.trainingFocusId && player.character_id !== picks[0]?.player.character_id);
  addPreferred("defender", captainId === "saya" ? "sol_martina_esteve" : null, (player) => !isGoalkeeper(player) && recommendedTrainingFocus(player) === route.trainingFocusId && player.character_id !== picks[0]?.player.character_id);
  while (picks.length < 3) {
    const next = trainable.find((player) => !taken.has(player.character_id) && recommendedTrainingFocus(player) === route.trainingFocusId)
      ?? trainable.find((player) => !taken.has(player.character_id));
    if (!next) break;
    taken.add(next.character_id);
    picks.push({ player: next, role: "defender" });
  }
  return picks.slice(0, 3);
}

function buildFirstTrainingPlayerStep(pick: FirstTrainingPick, captainId: TournamentCaptainId): FirstTrainingGuideStep {
  const { player, role } = pick;
  const label = firstTrainingPositionLabel(player);
  const target = `training-player-${player.character_id}`;
  if (role === "captain") {
    if (captainId === "naya") return { guideId: "training-first-captain", title: `先选${label}${player.name}`, message: `先选${label}${player.name}——就是我！点一下我的卡片。`, target, advance: true };
    if (captainId === "irena") return { guideId: "training-first-captain", title: `先选${label}${player.name}`, message: `先选择${label}${player.name}。她是本届队长，也是组织训练的基准球员。`, target, advance: true };
    return { guideId: "training-first-saya", title: `先选${label}${player.name}`, message: `先选${player.name}——她是我们的队长。点一下她的卡片。`, target, advance: true };
  }
  if (captainId === "naya") return { guideId: `training-first-${role}`, title: `再选${label}${player.name}`, message: role === "gk" ? `再选一位适合进攻训练的球员。点${label}${player.name}的卡片！` : `就是${player.name}，点她组成三人组！`, target, advance: true };
  if (captainId === "irena") return { guideId: `training-first-${role}`, title: `再选${label}${player.name}`, message: role === "gk" ? `再选择一名适合组织训练的球员：${label}${player.name}。` : `选择${player.name}，完成三人训练组。`, target, advance: true };
  if (role === "gk") {
    return { guideId: "training-first-gk", title: `再选${label}${player.name}`, message: `防守训练会让门将的门将三项一起变强。点${label}${player.name}的卡片。`, target, advance: true };
  }
  return { guideId: "training-first-cb", title: `再选${label}${player.name}`, message: `就是${player.name}，点她组成三人组。`, target, advance: true };
}

export function buildFirstTrainingGuideSteps(picks: FirstTrainingPick[], rosterOrder: TournamentCharacter[], pageSize: number, captainId: TournamentCaptainId = "saya"): FirstTrainingGuideStep[] {
  if (picks.length < 3) return [];
  const route = tournamentCaptainRoutes[captainId];
  const firstMessage = captainId === "naya"
    ? "训练有三个方向，一次训练要选一个方向和3名球员，消耗5天。我的优势是进攻，这次先点「进攻」！"
    : captainId === "irena"
      ? "训练分为进攻、组织、防守。一次训练选择一个方向和3名球员，消耗5天；本轮先选择「组织」。"
      : "训练有三个方向：进攻练射门、组织练传球、防守练防守。一次训练 = 选一个方向 + 3 名球员，花 5 天，每人本届最多练 6 次。这一轮我们先练「防守」——点一下「防守」方向卡。";
  const steps: FirstTrainingGuideStep[] = [{
    guideId: `training-first-${route.trainingFocusId}`,
    title: "先认识训练中心",
    message: firstMessage,
    target: `training-direction-${route.trainingFocusId}`,
    advance: true,
  }];
  const pageOf = (pick: FirstTrainingPick) => firstTrainingPageOf(pick.player.character_id, rosterOrder, pageSize);
  const pages = [...new Set(picks.map(pageOf))].sort((left, right) => left - right);
  let currentPage = 0;
  for (const page of pages) {
    while (currentPage < page) {
      steps.push({ guideId: "training-first-flip", title: "翻页找下一位", message: captainId === "naya" ? "还有一位在下一页！点右下角的「下一组球员」，我们去找她。" : captainId === "irena" ? "下一名球员位于下一页。点击右下角的「下一组球员」。" : "还有一位没选到，她在下一页——点右下角的「下一组球员」翻过去找找。", target: "training-roster-next", advance: true });
      currentPage++;
    }
    for (const pick of picks.filter((item) => pageOf(item) === page)) {
      steps.push(buildFirstTrainingPlayerStep(pick, captainId));
    }
  }
  steps.push({ guideId: "training-first-run", title: "开始训练", message: captainId === "naya" ? "三人齐了！点「训练」开始进攻专项训练！" : captainId === "irena" ? "三人训练组已经完成。点击「训练」开始组织专项训练。" : "三人齐了！点「训练」开始防守专项训练。", target: "training-run" });
  return steps;
}

export function TrainingPage({ guideScope, managerNickname, squad, registeredIds, day, fixtureDay, fixtureName, remainingDays, onTrain, onBackToOffice, onGoToMatch }: Props) {
  const { captainId } = useTournamentCaptain();
  const captainGuideScope = captainId === "saya" ? guideScope : `${guideScope}:${captainId}`;
  const registeredPlayers = useMemo(() => {
    const registered = new Set(registeredIds);
    return sortTournamentPlayers(buildTournamentCharacters(roster.characters, squad).filter((player) => registered.has(player.character_id)));
  }, [registeredIds, squad.characterProgress, squad.collection]);
  const [focusId, setFocusId] = useState<TrainingFocusId | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<TrainingView>("hub");
  const [rosterPage, setRosterPage] = useState(0);
  const [query, setQuery] = useState("");
  const [positionGroup, setPositionGroup] = useState<PositionGroup>("all");
  const [stars, setStars] = useState(0);
  const [factionId, setFactionId] = useState<"all" | FactionId>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showNoActionPrompt, setShowNoActionPrompt] = useState(false);
  const [trainingResult, setTrainingResult] = useState<{ focusName: string; combatLabel: string; entries: TrainingResultEntry[] } | null>(null);
  const [promptAfterResult, setPromptAfterResult] = useState(false);
  const [firstTrainingStep, setFirstTrainingStep] = useState<FirstTrainingStep | null>(() => (
    captainId === "saya" && (typeof window === "undefined" || !hasSeenTournamentGuide(window.localStorage, captainGuideScope, FIRST_TRAINING_DONE_GUIDE_ID)) ? 0 : null
  ));
  const screenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { screenRef.current?.scrollTo({ top: 0 }); }, [view, focusId]);
  useEffect(() => {
    const availableIds = new Set(registeredPlayers.filter((player) => trainingFocusTotal(player.focus) < TOURNAMENT_MAX_FOCUS).map((player) => player.character_id));
    setSelectedIds((current) => current.filter((id) => availableIds.has(id)));
  }, [registeredPlayers]);

  const trainingRosterPlayers = useMemo(() => [...registeredPlayers].sort((left, right) =>
    Number(trainingFocusTotal(left.focus) >= TOURNAMENT_MAX_FOCUS) - Number(trainingFocusTotal(right.focus) >= TOURNAMENT_MAX_FOCUS),
  ), [registeredPlayers]);
  const filteredTrainingRosterPlayers = useMemo(
    () => filterTrainingPlayers(trainingRosterPlayers, { query, positionGroup, stars, factionId }),
    [factionId, positionGroup, query, stars, trainingRosterPlayers],
  );
  const firstTrainingSteps = useMemo(
    () => buildFirstTrainingGuideSteps(selectFirstTrainingPlayers(registeredPlayers, trainingRosterPlayers, captainId), trainingRosterPlayers, TRAINING_PLAYER_PAGE_SIZE, captainId),
    [captainId, registeredPlayers, trainingRosterPlayers],
  );
  const rosterPageCount = Math.max(1, Math.ceil(filteredTrainingRosterPlayers.length / TRAINING_PLAYER_PAGE_SIZE));
  const visiblePlayers = filteredTrainingRosterPlayers.slice(rosterPage * TRAINING_PLAYER_PAGE_SIZE, (rosterPage + 1) * TRAINING_PLAYER_PAGE_SIZE);
  const selectedPlayers = selectedIds.map((id) => registeredPlayers.find((player) => player.character_id === id)).filter((player) => player !== undefined);
  const activeFocus = focusId ?? "attack";
  const focusMeta = trainingFocusMeta[activeFocus];

  useEffect(() => { setRosterPage((current) => Math.min(current, rosterPageCount - 1)); }, [rosterPageCount]);
  useEffect(() => { setRosterPage(0); }, [factionId, positionGroup, query, stars]);

  const activeFilterCount = Number(query.trim().length > 0) + Number(positionGroup !== "all") + Number(stars !== 0) + Number(factionId !== "all");

  function resetFilters() {
    setQuery("");
    setPositionGroup("all");
    setStars(0);
    setFactionId("all");
  }

  function goBack() {
    if (showNoActionPrompt) onBackToOffice();
    else if (view !== "hub") { setView("hub"); setFocusId(null); setSelectedIds([]); }
    else onBackToOffice();
  }

  function openDirection(id: TrainingFocusId) {
    setFocusId(id);
    setSelectedIds([]);
    setRosterPage(0);
    setView("room");
  }

  function advanceFirstTraining() {
    setFirstTrainingStep((current) => current == null ? null : Math.min(current + 1, firstTrainingSteps.length - 1));
  }

  const hasActionWindow = remainingDays >= TRAINING_DAY_COST;
  const trainingActionMode = resolveTrainingActionMode(remainingDays, selectedIds, focusId);

  const guidePrompt = (() => {
    if (showNoActionPrompt) {
      const guide = resolveTrainingNoActionGuide();
      return { guideId: guide.guideId, title: guide.title, message: captainId === "naya" ? "要来不及啦经理，快去比赛！" : captainId === "irena" ? "剩余时间不足以完成训练。请直接前往比赛。" : guide.message, target: "", variant: "remind" as const, required: true, actionLabel: guide.actionLabel, onAction: onGoToMatch };
    }
    if (view === "hub") return { guideId: "training-system-introduction-v2", title: trainingSystemIntroduction.title, message: captainId === "naya" ? "进攻练射门、组织练传球、防守练防守。选3个人练5天，每人最多练6次。别站着啦，选好就开练！" : captainId === "irena" ? "进攻提升射门，组织提升传球，防守提升防守。每次选择3人、消耗5天，每人最多训练6次。" : trainingSystemIntroduction.message, target: "training-paths", variant: "guide" as const };
    if (view === "room" && selectedIds.length < 3) return { guideId: "training-select-three", title: "选择三位球员", message: captainId === "naya" ? "练度没满的人都能再练。选满三位，我们马上开始！" : captainId === "irena" ? "请选择三名练度未满的球员。" : "练度未满的球员都可以再次训练。选满三位，我们就开始吧。", target: "training-roster", variant: "think" as const };
    if (view === "room") return { guideId: "training-run", title: "训练组准备好了", message: captainId === "naya" ? `三个人准备好了！训练5天，每人提升一次${focusMeta.name}练度，开始吧！` : captainId === "irena" ? `训练组已完成。消耗5天，三人各提升一次${focusMeta.name}练度；确认后开始。` : `训练五天，三人各提升一次${focusMeta.name}练度。确认后就开始吧。`, target: "training-run", variant: "remind" as const };
    return null;
  })();

  const firstTrainingGuide = (() => {
    if (firstTrainingStep == null) return null;
    const step = firstTrainingSteps[firstTrainingStep];
    if (!step) return null;
    const { advance, ...guide } = step;
    return { ...guide, onAction: advance ? advanceFirstTraining : undefined };
  })();

  function train() {
    playSfx("confirm");
    if (trainingActionMode === "prompt-exit") {
      setShowNoActionPrompt(true);
      return;
    }
    if (trainingActionMode !== "train" || focusId === null) return;
    try {
      const nextSave = onTrain(focusId, selectedIds);
      const trainedPlayers = new Map(buildTournamentCharacters(roster.characters, nextSave.squad).map((player) => [player.character_id, player]));
      const entries = selectedPlayers.map((player) => buildTrainingResultEntry(player, trainedPlayers.get(player.character_id)!, focusId));
      setTrainingResult({ focusName: focusMeta.name, combatLabel: focusMeta.combatLabel, entries });
      setPromptAfterResult(shouldPromptForMatchAfterTraining(remainingDays));
      setSelectedIds([]);
      if (firstTrainingStep !== null) {
        rememberTournamentGuide(window.localStorage, captainGuideScope, FIRST_TRAINING_DONE_GUIDE_ID);
        setFirstTrainingStep(null);
      }
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "操作失败");
    }
  }

  return <div className={`training-screen view-${view} tournament-training-scene`} ref={screenRef} style={{ "--training-scene": `url(${trainingCenterScene})` } as CSSProperties}>
    <header className="training-heading">
      <button type="button" className="locker-back" onClick={goBack} aria-label={showNoActionPrompt || view === "hub" ? "返回经理办公室" : "返回训练方向"}><ArrowLeft aria-hidden="true" /></button>
      {view === "room" ? <div className="training-room-heading-spacer" /> : <div><h1>训练中心</h1><span>{managerNickname} 的杯赛专项训练</span></div>}
    </header>

    {view === "hub" ? <main className="training-hub-stage">
      <section className="training-hub-intro" aria-label="训练规则说明">
        <blockquote className="training-ferguson-quote">
          <p lang="en">“You have to have a good imagination to be a top coach … intensity and work ethic in the training sessions. These three things marry together.”</p>
          <p>“要成为顶级教练，你必须拥有丰富的想象力；训练课也必须有足够的强度和投入。对好教练而言，这三者要结合在一起。”</p>
          <cite>— 亚历克斯·弗格森爵士</cite>
        </blockquote>
        <div className="training-window-strip">
          <span><small>本轮备战</small><strong>Day {day} → Day {fixtureDay}</strong></span>
          <span><small>下一场</small><strong>{fixtureName}</strong></span>
          <span><small>剩余时间</small><strong>{remainingDays} 天</strong></span>
        </div>
      </section>

      <section className="training-hub" data-saya-guide-target="training-paths" aria-label="训练方向选择">
        {trainingFocusIds.map((id, index) => {
          const meta = trainingFocusMeta[id];
          const Icon = focusIcons[id];
          return (
            <button key={id} type="button" className={`training-module-card room direction-${id}`} data-saya-guide-target={`training-direction-${id}`} onClick={() => openDirection(id)}>
              <span className="training-module-number">0{index + 1}</span>
              <span className="training-module-icon"><Icon aria-hidden="true" /></span>
              <span className="training-module-copy"><small>FOCUS · {id.toUpperCase()}</small><strong>{meta.name}</strong><p>单次最多：主属性 {meta.mainLabel} +{TRAINING_MAIN_BONUS_LABEL} · 副属性 {meta.subLabel} +{TRAINING_SUB_BONUS_LABEL}。{meta.tagline}，{meta.combatLabel} ↑。</p></span>
              <aside><span><b>{meta.mainLabel}</b><small>主属性</small></span><em>进入训练场 <ChevronRight aria-hidden="true" /></em></aside>
            </button>
          );
        })}
      </section>
    </main> : null}

    {view === "room" && focusId ? <section className="training-detail-layout"><div className="training-room-panel training-player-console">
      <header className="training-console-heading">
        <div><small>{focusMeta.name.toUpperCase()} TRAINING · MATCH PREPARATION</small><h2>安排{focusMeta.name}训练</h2><p>单次最多：主属性 {focusMeta.mainLabel} +{TRAINING_MAIN_BONUS_LABEL} · 副属性 {focusMeta.subLabel} +{TRAINING_SUB_BONUS_LABEL}{focusId === "defense" ? "（门将防守练反应 / 扑救 / 站位）" : ""}。</p></div>
      </header>

      <div className="training-action-strip" aria-label="专项训练行动点">
        <article className="available"><span><Zap aria-hidden="true" /></span><small>剩余时间</small><strong>{remainingDays}<i>天</i></strong><em>训练与观察各消耗 5 天</em></article>
        <article className="cost"><small>本次训练消耗</small><strong>−{TRAINING_DAY_COST}<i>天</i></strong><em>{hasActionWindow ? `完成后剩余 ${Math.max(0, remainingDays - TRAINING_DAY_COST)} 天` : "时间不足"}</em></article>
        <article><small>训练方向</small><strong>{focusMeta.name}<i>向</i></strong><em>每位入选球员：该方向练度 +1</em></article>
      </div>

      <div className="training-roster-heading">
        <span><UsersRound aria-hidden="true" /><b>选择球员</b><small>显示 {filteredTrainingRosterPlayers.length} 名 · 已选 {selectedIds.length} / 3</small></span>
        <nav aria-label="球员卡片翻页">
          <button type="button" className={`training-filter-trigger${filtersOpen || activeFilterCount > 0 ? " active" : ""}`} onClick={() => setFiltersOpen(true)} aria-label="筛选训练球员"><SlidersHorizontal aria-hidden="true" />筛选{activeFilterCount > 0 ? <b>{activeFilterCount}</b> : null}</button>
          <button type="button" onClick={() => setRosterPage((current) => Math.max(0, current - 1))} disabled={rosterPage === 0} aria-label="上一组球员"><ChevronLeft aria-hidden="true" /></button>
          <strong>{rosterPage + 1} / {rosterPageCount}</strong>
          <button type="button" data-saya-guide-target="training-roster-next" onClick={() => setRosterPage((current) => Math.min(rosterPageCount - 1, current + 1))} disabled={rosterPage === rosterPageCount - 1} aria-label="下一组球员"><ChevronRight aria-hidden="true" /></button>
        </nav>
      </div>

      <div className="training-roster-viewport" data-saya-guide-target="training-roster">
        <div className="tournament-training-roster">{visiblePlayers.map((player) => {
          const selected = selectedIds.includes(player.character_id);
          const focusTotal = trainingFocusTotal(player.focus);
          const maxed = focusTotal >= TOURNAMENT_MAX_FOCUS;
          const card = resolveDisplayCharacterCard(player.character_id, player.stars);
          return <button key={player.character_id} type="button" className={`training-player-card${selected ? " selected" : ""}${maxed ? " maxed" : ""}`} data-saya-guide-target={`training-player-${player.character_id}`} data-sfx="team-select" disabled={maxed || (!selected && selectedIds.length >= 3)} onClick={() => setSelectedIds((current) => selected ? current.filter((id) => id !== player.character_id) : [...current, player.character_id])} aria-pressed={selected} aria-label={`${player.name}，${formatPlayerPositions(player)}，${maxed ? "本届练度已满" : selected ? "已选择" : "可选择"}`}><span className="training-card-art">{card.status === "ready" ? <ProgressiveImage src={card.url} alt={`${player.name}球星卡`} placeholder={player.name.slice(0, 1)} eager /> : <span className="progressive-image-placeholder">{player.name.slice(0, 1)}</span>}</span>{selected ? <span className="training-card-selected-mark" aria-hidden="true"><Check />已选择</span> : null}<span className="training-card-copy"><strong>{player.name}</strong><small>{formatPlayerPositions(player)} · {maxed ? "练度已满" : `练度 ${focusTotal}/6`}</small></span></button>;
        })}</div>
        {filteredTrainingRosterPlayers.length === 0 ? <p className="training-filter-empty">没有符合筛选条件的球员</p> : null}
      </div>

      <footer className="training-execution-dock">
        <div className="training-selected-squad" aria-label="已选择的训练球员">
          <small>本次训练组</small>
          {[0, 1, 2].map((index) => {
            const player = selectedPlayers[index];
            if (!player) return <span key={index} className="empty"><b>{index + 1}</b><i>待选择</i></span>;
            const preview = trainingFocusPreview(player, focusId);
            return <button key={player.character_id} type="button" data-sfx="team-select" onClick={() => setSelectedIds((current) => current.filter((id) => id !== player.character_id))} aria-label={`移除${player.name}`}><b>{index + 1}</b><span>{player.name}</span><em>{preview.main.label} {preview.main.before.toFixed(1)} → {preview.main.after.toFixed(1)}</em></button>;
          })}
        </div>
        <button type="button" className={`training-primary${trainingActionMode === "prompt-exit" ? " is-unavailable" : ""}`} data-saya-guide-target="training-run" data-sfx="none" disabled={trainingActionMode === "disabled"} onClick={train}>训练</button>
      </footer>
    </div></section> : null}

    {filtersOpen ? <div className="training-filter-backdrop" role="dialog" aria-modal="true" aria-label="筛选训练球员">
      <section className="training-filter-sheet">
        <header><div><small>TRAINING ROSTER</small><strong>筛选球员</strong></div><button type="button" onClick={() => setFiltersOpen(false)} aria-label="关闭筛选"><X aria-hidden="true" /></button></header>
        <label className="training-filter-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、位置或阵营" aria-label="搜索训练球员" /></label>
        <div className="filter-row"><span>位置</span><div className="position-tabs" role="group" aria-label="按位置筛选">{positionGroups.map((group) => <button key={group.id} type="button" className={positionGroup === group.id ? "active" : undefined} aria-pressed={positionGroup === group.id} onClick={() => setPositionGroup(group.id)}>{group.label}</button>)}</div></div>
        <div className="training-filter-selects">
          <label><span>星级</span><select value={stars} onChange={(event) => setStars(Number(event.target.value))} aria-label="按星级筛选"><option value={0}>全部星级</option><option value={6}>6星</option><option value={5}>5星</option><option value={4}>4星</option><option value={3}>3星</option></select></label>
          <label><span>阵营</span><select value={factionId} onChange={(event) => setFactionId(event.target.value as "all" | FactionId)} aria-label="按阵营筛选"><option value="all">全部阵营</option>{Object.entries(factionMeta).map(([id, meta]) => <option key={id} value={id}>{meta.name}</option>)}</select></label>
        </div>
        <footer><span>显示 {filteredTrainingRosterPlayers.length} 名</span><button type="button" onClick={resetFilters}>重置</button><button type="button" onClick={() => setFiltersOpen(false)}>完成</button></footer>
      </section>
    </div> : null}

    {notice ? <div className="training-notice" role="status" onAnimationEnd={() => setNotice(null)}>{notice}</div> : null}

    {trainingResult ? <div className="training-result-backdrop" role="dialog" aria-modal="true" aria-label="本次训练结果" onClick={() => { setTrainingResult(null); if (promptAfterResult) setShowNoActionPrompt(true); }}>
      <section className="training-result-modal">
        <header><small>TRAINING COMPLETE</small><h2>{trainingResult.focusName}训练完成</h2><p>{trainingResult.combatLabel} ↑ · 三位球员属性已成长（点击任意处关闭）</p></header>
        <div className="training-result-list">
          {trainingResult.entries.map((entry) => (
            <article key={entry.id}>
              <strong>{entry.name}</strong>
              <span data-label="OVR"><b>{entry.overall.before} → {entry.overall.after}</b></span>
              <span data-label={entry.main.label}><b>{entry.main.before.toFixed(1)} → {entry.main.after.toFixed(1)}</b></span>
              <span data-label={entry.sub.label}><b>{entry.sub.before.toFixed(1)} → {entry.sub.after.toFixed(1)}</b></span>
            </article>
          ))}
        </div>
        <button type="button" onClick={() => { setTrainingResult(null); if (promptAfterResult) setShowNoActionPrompt(true); }}>知道了</button>
      </section>
    </div> : null}

    {firstTrainingGuide ? <SayaGuide scope={guideScope} required variant="guide" {...firstTrainingGuide} /> : guidePrompt ? <SayaGuide scope={guideScope} {...guidePrompt} /> : null}
  </div>;
}
