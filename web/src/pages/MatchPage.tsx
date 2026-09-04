import {
  ArrowLeft,
  Check,
  ChevronRight,
  FastForward,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  Timer,
  Trophy,
  WandSparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { SayaGuide } from "../components/SayaGuide";
import { useTournamentCaptain } from "../components/TournamentCaptainContext";
import { captainFormationGuidePages, captainGuideIdentity, captainGuideMessage } from "../data/captainGuideCopy";
import { deriveMatchPresentation, MatchStadiumHud } from "../components/MatchStadiumHud";
import { StandsPitch } from "../components/StandsPitch";
import { chibiKitFamilyForOpponent, type ChibiSpriteFamily } from "../components/ChibiFigure";
import { buildMatchTimeline, buildPlayerPositions, type MatchTimelineEntry } from "../data/matchSpatial";
import { resolveMatchDaySceneUrl } from "../data/matchDayScenes";
import { factionMeta, playableCharacters, type Character } from "../data/gameData";
import { formatPlayerPositions, positionLabels, skillMeta } from "../data/lockerRoomData";
import { skillsById } from "../data/skillData";
import {
  attackFormations,
  assignLineupPlayer,
  completeLineup,
  compatibleDefenseFormations,
  cupFactionBondProfiles,
  defenseFormations,
  factionBondStates,
  positionFit,
  roleScore,
  simulateMatch,
  simulateTournamentDecider,
  teamCombatProfile,
  rankedPenaltyTakers,
  penaltyTakerScore,
  penaltyKeeperScore,
  type FormationId,
  type FormationSlot,
  type Lineup,
  type MatchEvent,
  type MatchResult,
  type TournamentDecisionSimulation,
  type TournamentMatchContext,
} from "../data/matchSimulator";
import { playSfx } from "../services/SoundEffects";
import { isGoalSoundEvent, playMatchGoalSound, prepareMatchGoalSound } from "../services/matchGoalAudio";
import { MATCH_ASSET_TIMEOUT_MS, matchAssetUrlsForLineups, preloadMatchAssets, type MatchAssetLoadState } from "../services/matchAssetLoader";
import { EmptyPlayerSilhouette, FormationPlayerSlot, Portrait } from "../components/MatchPortrait";
import type { TournamentResult, TournamentSquadState } from "../storage/tournamentSaveStorage";
import { clubBlueprints, playerClub, stageMeta, tournamentPreparationEffects, type GeneratedOpponent, type TournamentFixture } from "../data/tournamentJourney";
import { buildTournamentCharacters, trainingFocusTotal, type TournamentCharacter } from "../data/tournamentSquad";
import { attributionKeyLabels, buildMatchAttribution, type MatchAttribution } from "../data/matchReport";

export type MatchPhase = "setup" | "live" | "decision-preparation" | "decision-live" | "result";
type SetupStep = "attack" | "defense" | "lineup";

export function isBattleMusicPhase(phase: MatchPhase): boolean {
  return phase === "live" || phase === "decision-live";
}

export function shouldPlayFinalWhistle(phase: MatchPhase, decisionPending: boolean): boolean {
  return !(phase === "live" && decisionPending);
}

const formationOrder: FormationId[] = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2"];
export const OPENING_WHISTLE_DELAY_MS = 320;

function combatGrade(value: number) {
  if (value >= 88) return "强 ↑↑";
  if (value >= 82) return "良 ↑";
  if (value >= 76) return "稳 →";
  return "待补 ↓";
}

function matchupTrend(home: number, away: number) {
  if (home - away >= 2) return "占优 ↑";
  if (away - home >= 2) return "承压 ↓";
  return "接近 →";
}

function emptyLineup(formationId: FormationId): Lineup {
  return Object.fromEntries(attackFormations[formationId].slots.map((slot) => [slot.id, null]));
}

function formationUnitCounts(slots: FormationSlot[]) {
  const counts = { goalkeeper: 0, defenders: 0, midfielders: 0, forwards: 0 };
  for (const slot of slots) {
    if (slot.position === "GK") counts.goalkeeper += 1;
    else if (["CB", "LB", "RB"].includes(slot.position)) counts.defenders += 1;
    else if (["ST", "LW", "RW"].includes(slot.position)) counts.forwards += 1;
    else counts.midfielders += 1;
  }
  return counts;
}

function FormationDiagram({ formationId, mode }: { formationId: FormationId; mode: "attack" | "defense" }) {
  const slots = mode === "attack" ? attackFormations[formationId].slots : defenseFormations[formationId].slots;
  const displayName = mode === "attack" ? attackFormations[formationId].name : defenseFormations[formationId].name;
  const counts = formationUnitCounts(slots);
  return (
    <div className={`formation-diagram ${mode}`} aria-label={`${displayName}${mode === "attack" ? "进攻" : "防守"}站位图`}>
      <div className="formation-mini-pitch">
        <div className="formation-mini-circle" />
        <i className="pitch-penalty-area opponent" aria-hidden="true" />
        <i className="pitch-penalty-area home" aria-hidden="true" />
        <span className="pitch-direction-marker" aria-hidden="true"><b>↑</b>进攻</span>
        {slots.map((slot) => (
          <span key={slot.id} className="formation-mini-slot" style={{ "--slot-x": `${slot.x}%`, "--slot-y": `${slot.y}%` } as CSSProperties}>
            <strong>{slot.position}</strong>
          </span>
        ))}
      </div>
      <div className="formation-unit-counts">
        <span>门将 <b>{counts.goalkeeper}</b></span><span>后卫 <b>{counts.defenders}</b></span><span>中场 <b>{counts.midfielders}</b></span><span>前锋 <b>{counts.forwards}</b></span>
      </div>
    </div>
  );
}

type FormationBrowserProps = {
  mode: "attack" | "defense";
  options: FormationId[];
  selectedId: FormationId;
  attackFormationId: FormationId;
  onSelect: (formation: FormationId) => void;
  onContinue: () => void;
};

function FormationBrowser({ mode, options, selectedId, attackFormationId, onSelect, onContinue }: FormationBrowserProps) {
  const item = mode === "attack" ? attackFormations[selectedId] : defenseFormations[selectedId];
  const isAttack = mode === "attack";

  return (
    <section className={`formation-browser-panel ${mode}`}>
      <aside className="formation-sidebar">
        <header>
          {isAttack ? <Target aria-hidden="true" /> : <Shield aria-hidden="true" />}
          <div><span>{isAttack ? "STEP 2 · ATTACK" : "STEP 3 · DEFENCE"}</span><h2>{isAttack ? "进攻阵型" : "防守阵型"}</h2></div>
        </header>
        <p>{isAttack ? "自由切换阵型，右侧仅查看当前选择。" : `仅显示能由 ${attackFormationId} 自然切换的结构。`}</p>
        <div className="formation-sidebar-list">
          {options.map((id) => {
            const option = isAttack ? attackFormations[id] : defenseFormations[id];
            const active = selectedId === id;
            return (
              <button key={id} type="button" className={active ? "active" : undefined} onClick={() => onSelect(id)} aria-pressed={active}>
                <span><strong>{option.name}</strong><small>{option.identity}</small></span>
                {active ? <Check aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="formation-detail-panel">
        <header className="formation-detail-heading">
          <div><span>{isAttack ? "有球阶段" : "无球阶段"}</span><h2>{item.name}</h2><p>{item.identity}</p></div>
        </header>
        <div className="formation-detail-layout">
          <FormationDiagram formationId={selectedId} mode={mode} />
          <aside className="formation-detail-copy">
            <div><span>阵型特点</span><p>{item.summary}</p></div>
            <button type="button" className="continue-setup-button" data-saya-guide-target={isAttack ? "match-attack" : "match-defense"} data-sfx="confirm" onClick={onContinue}>
              <span><strong>{isAttack ? "确认进攻阵型" : "确认防守阵型"}</strong><small>{isAttack ? "下一步选择适配的防守结构" : "下一步敲定 11 人名单"}</small></span>
              <ChevronRight aria-hidden="true" />
            </button>
          </aside>
        </div>
      </section>
    </section>
  );
}

type TournamentMatchView = {
  fixture: TournamentFixture;
  opponent: GeneratedOpponent;
  fixtureSeed: number;
  currentDay: number;
  registeredIds: string[];
  persistedResult?: MatchResult;
  settlement?: TournamentResult;
  firstLegScore?: { home: number; away: number };
  onStarted: (result: MatchResult, context: TournamentMatchContext) => TournamentResult;
  onDecisionStarted: (simulation: TournamentDecisionSimulation) => TournamentResult;
  onContinue: () => void;
};

type TournamentMatchSettlement = Pick<TournamentResult, "advanced" | "extraTime" | "penalties">;

export function matchResultGuideTitle(result: Pick<MatchResult, "homeScore" | "awayScore">, settlement?: TournamentMatchSettlement) {
  const homeScore = result.homeScore + (settlement?.extraTime?.player ?? 0);
  const awayScore = result.awayScore + (settlement?.extraTime?.opponent ?? 0);
  const won = homeScore === awayScore && settlement?.penalties
    ? settlement.penalties.player > settlement.penalties.opponent
    : homeScore > awayScore;
  return won ? "好耶，首战告捷！" : "别灰心！";
}

export function matchResultOutcomeLabel(stage: TournamentFixture["stage"], settlement: TournamentMatchSettlement | undefined, homeScore: number, awayScore: number) {
  if (settlement?.advanced === true) return stage === "final" ? "冠军" : "晋级";
  if (settlement?.advanced === false) return "征程结束";
  return homeScore > awayScore ? "胜利" : homeScore === awayScore ? "平局" : "比赛结束";
}

export function twoLegAggregateScore(firstLeg: { home: number; away: number } | undefined, homeScore: number, awayScore: number) {
  return firstLeg ? { home: firstLeg.home + homeScore, away: firstLeg.away + awayScore } : undefined;
}

type MatchPageProps = {
  guideScope: string;
  managerNickname: string;
  clubName: string;
  squad: TournamentSquadState;
  onBackToOffice: () => void;
  onViewScoutReport?: () => void;
  scoutReportViewed?: boolean;
  onBattleMusicChange?: (playing: boolean) => void;
  match: TournamentMatchView;
};

export function MatchPage({ guideScope, managerNickname: _managerNickname, clubName, squad, onBackToOffice, onViewScoutReport, scoutReportViewed = true, onBattleMusicChange, match }: MatchPageProps) {
  const { captainId } = useTournamentCaptain();
  const allOwnedPlayers = useMemo(
    () => buildTournamentCharacters(playableCharacters, squad),
    [squad.characterProgress, squad.collection],
  );
  const ownedPlayers = useMemo(
    () => allOwnedPlayers.filter((player) => match.registeredIds.includes(player.character_id)),
    [allOwnedPlayers, match.registeredIds],
  );
  const matchCharacters = useMemo(() => [...ownedPlayers, ...match.opponent.characters], [match.opponent.characters, ownedPlayers]);
  const playerMap = useMemo(() => new Map(matchCharacters.map((player) => [player.character_id, player])), [matchCharacters]);
  const scoutedAwayLineup = match.opponent.lineup;
  const awayAttackFormationId = match.opponent.attackFormationId;
  const awayDefenseFormationId = match.opponent.defenseFormationId;
  const currentOpponentBlueprint = clubBlueprints.find(({ id }) => id === match.opponent.blueprintId);
  const awayKitFamily = currentOpponentBlueprint ? chibiKitFamilyForOpponent(currentOpponentBlueprint.id) : "field-away";
  const persistedContext = match.settlement?.matchContext;
  const [attackFormationId, setAttackFormationId] = useState<FormationId>(persistedContext?.homeAttackFormationId ?? "4-2-3-1");
  const [defenseFormationId, setDefenseFormationId] = useState<FormationId>(persistedContext?.homeDefenseFormationId ?? "4-4-2");
  const [lineup, setLineup] = useState<Lineup>(() => persistedContext?.homeLineup ?? emptyLineup("4-2-3-1"));
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [phase, setPhase] = useState<MatchPhase>(match.settlement?.decision?.status === "pending" ? "decision-preparation" : match.persistedResult ? "result" : "setup");
  const [setupStep, setSetupStep] = useState<SetupStep>("attack");
  const [result, setResult] = useState<MatchResult | null>(match.persistedResult ?? null);
  const [settlement, setSettlement] = useState<TournamentResult | undefined>(match.settlement);
  const [eventIndex, setEventIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 2>(1);
  const [assetLoad, setAssetLoad] = useState<MatchAssetLoadState>({ status: "idle", loaded: 0, total: 0, failedUrls: [], timedOut: false });
  const [forceFallbackSprites, setForceFallbackSprites] = useState(false);
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const openingWhistleTimerRef = useRef<number | null>(null);
  const finalWhistlePlayedRef = useRef(false);
  const playedGoalSoundIdsRef = useRef(new Set<string>());

  useEffect(() => {
    onBattleMusicChange?.(isBattleMusicPhase(phase));
  }, [onBattleMusicChange, phase]);

  useEffect(() => () => onBattleMusicChange?.(false), [onBattleMusicChange]);
  useEffect(() => () => {
    if (openingWhistleTimerRef.current !== null) window.clearTimeout(openingWhistleTimerRef.current);
  }, []);
  const attackFormation = attackFormations[attackFormationId];
  const selectedCount = Object.values(lineup).filter(Boolean).length;
  const selectedIds = new Set(Object.values(lineup).filter((id): id is string => Boolean(id)));
  const activeSlot = attackFormation.slots.find((slot) => slot.id === activeSlotId) ?? null;
  const pickerPlayers = useMemo(() => {
    if (!activeSlot) return [];
    return [...ownedPlayers].sort((left, right) => roleScore(right, activeSlot.position) - roleScore(left, activeSlot.position));
  }, [activeSlot, ownedPlayers]);
  const activeEvents = phase === "decision-live" ? settlement?.decision?.events ?? [] : result?.events ?? [];
  const matchPositions = useMemo(
    () => buildPlayerPositions({ homeLineup: lineup, awayLineup: scoutedAwayLineup, homeAttackFormationId: attackFormationId, awayAttackFormationId }),
    [lineup, scoutedAwayLineup, attackFormationId, awayAttackFormationId],
  );
  const matchTimeline = useMemo(
    () => (result && activeEvents.length ? buildMatchTimeline(activeEvents, matchPositions, result.seed) : []),
    [activeEvents, matchPositions, result],
  );
  const matchAssetUrls = useMemo(
    () => selectedCount === 11 ? matchAssetUrlsForLineups({
      homeLineup: lineup,
      awayLineup: scoutedAwayLineup,
      awayKitFamily,
      extraUrls: [playerClub.crestUrl, currentOpponentBlueprint?.crestUrl],
    }) : [],
    [awayKitFamily, currentOpponentBlueprint?.crestUrl, lineup, scoutedAwayLineup, selectedCount],
  );

  useEffect(() => {
    if (phase !== "setup" || selectedCount !== 11 || matchAssetUrls.length === 0) {
      setAssetLoad({ status: "idle", loaded: 0, total: 0, failedUrls: [], timedOut: false });
      return;
    }
    let active = true;
    setAssetLoad({ status: "loading", loaded: 0, total: matchAssetUrls.length, failedUrls: [], timedOut: false });
    const timeout = window.setTimeout(() => {
      if (active) setAssetLoad((current) => ({ ...current, status: "degraded", timedOut: true }));
    }, MATCH_ASSET_TIMEOUT_MS);
    void preloadMatchAssets(matchAssetUrls, (loaded, total) => {
      if (active) setAssetLoad((current) => ({ ...current, loaded, total }));
    }).then((failedUrls) => {
      if (!active) return;
      window.clearTimeout(timeout);
      setAssetLoad({
        status: failedUrls.length ? "degraded" : "ready",
        loaded: matchAssetUrls.length,
        total: matchAssetUrls.length,
        failedUrls,
        timedOut: false,
      });
    });
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [matchAssetUrls, phase, selectedCount]);

  const matchAttribution = useMemo<MatchAttribution | null>(() => {
    const context = settlement?.matchContext;
    if (phase !== "result" || !result || !context) return null;
    return buildMatchAttribution({
      homePlayers: ownedPlayers,
      awayPlayers: match.opponent.characters,
      homeLineup: context.homeLineup,
      homeAttackFormationId: context.homeAttackFormationId,
      homeDefenseFormationId: context.homeDefenseFormationId,
      awayLineup: scoutedAwayLineup,
      awayAttackFormationId,
      awayDefenseFormationId,
      opponent: match.opponent,
      stage: match.fixture.stage,
      result,
    });
  }, [phase, result, settlement, ownedPlayers, match.opponent, scoutedAwayLineup, awayAttackFormationId, awayDefenseFormationId, match.fixture.stage]);

  // 直播滚动随 eventIndex（由球的时钟驱动）变化，不再自己推进事件。
  useEffect(() => {
    if ((phase !== "live" && phase !== "decision-live") || !result) return;
    const event = activeEvents[eventIndex];
    if (!event) return;
    feedEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeEvents, eventIndex, phase, result]);

  useEffect(() => {
    if (phase !== "live" && phase !== "decision-live") return;
    const event = activeEvents[eventIndex];
    if (!event || !isGoalSoundEvent(event.kind) || playedGoalSoundIdsRef.current.has(event.id)) return;
    playedGoalSoundIdsRef.current.add(event.id);
    playMatchGoalSound();
  }, [activeEvents, eventIndex, phase]);

  // 球的时钟跑完全程时结算：读取最新 phase / settlement，决定进入加时还是结算。
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const settlementRef = useRef(settlement);
  settlementRef.current = settlement;
  const handleMatchComplete = useCallback(() => {
    const decisionPending = settlementRef.current?.decision?.status === "pending";
    if (shouldPlayFinalWhistle(phaseRef.current, decisionPending)) {
      if (!finalWhistlePlayedRef.current) playSfx("battle-whistle");
      finalWhistlePlayedRef.current = true;
      setPhase("result");
    } else {
      setPhase("decision-preparation");
    }
  }, []);

  function changeAttackFormation(next: FormationId) {
    if (next === attackFormationId) return;
    setAttackFormationId(next);
    if (!compatibleDefenseFormations[next].includes(defenseFormationId)) {
      setDefenseFormationId(compatibleDefenseFormations[next][0]);
    }
    setLineup(emptyLineup(next));
    setActiveSlotId(null);
  }

  function selectPlayer(slotId: string, playerId: string) {
    setLineup((current) => assignLineupPlayer(current, slotId, playerId));
    setActiveSlotId(null);
  }

  function completeRecommended() {
    setLineup((current) => completeLineup(ownedPlayers, attackFormationId, defenseFormationId, current));
  }

  function startMatch(useSimplifiedSprites = false) {
    if (selectedCount !== 11 || match.currentDay < match.fixture.day || (assetLoad.status !== "ready" && !useSimplifiedSprites)) return;
    setForceFallbackSprites(useSimplifiedSprites);
    prepareMatchGoalSound();
    const preparation = tournamentPreparationEffects({
      characters: ownedPlayers,
      lineup,
      attackFormationId,
      defenseFormationId,
      opponent: match.opponent,
      stage: match.fixture.stage,
    });
    const nextResult = simulateMatch({
      characters: matchCharacters,
      homeLineup: lineup,
      homeAttackFormationId: attackFormationId,
      homeDefenseFormationId: defenseFormationId,
      awayLineup: scoutedAwayLineup,
      homeName: clubName,
      awayName: match.opponent.name,
      awayAttackFormationId,
      awayDefenseFormationId,
      fixtureSeed: match.fixtureSeed,
      homeMatchEffects: preparation.effects,
    });
    const nextSettlement = match.onStarted(nextResult, { homeLineup: { ...lineup }, homeAttackFormationId: attackFormationId, homeDefenseFormationId: defenseFormationId, homeMatchEffects: preparation.effects });
    setSettlement(nextSettlement);
    setResult(nextResult);
    setEventIndex(0);
    playedGoalSoundIdsRef.current.clear();
    setPhase("live");
    finalWhistlePlayedRef.current = false;
    if (openingWhistleTimerRef.current !== null) window.clearTimeout(openingWhistleTimerRef.current);
    openingWhistleTimerRef.current = window.setTimeout(() => {
      playSfx("battle-whistle");
      openingWhistleTimerRef.current = null;
    }, OPENING_WHISTLE_DELAY_MS);
  }

  function startDecision() {
    if (!result || !settlement?.matchContext || settlement.decision?.status !== "pending") return;
    prepareMatchGoalSound();
    const simulation = simulateTournamentDecider({
      characters: matchCharacters,
      context: settlement.matchContext,
      awayLineup: scoutedAwayLineup,
      awayAttackFormationId,
      awayDefenseFormationId,
      homeName: clubName,
      awayName: match.opponent.name,
      regulation: result,
      aggregateAt90: settlement.decision.aggregateAt90,
    });
    const completed = match.onDecisionStarted(simulation);
    setSettlement(completed);
    setResult(completed.result);
    setEventIndex(0);
    playedGoalSoundIdsRef.current.clear();
    setPhase("decision-live");
  }

  function replay() {
    startMatch(forceFallbackSprites);
  }

  function backToSetup() {
    setPhase("setup");
    setSetupStep("lineup");
    setResult(null);
    setEventIndex(0);
    playedGoalSoundIdsRef.current.clear();
    finalWhistlePlayedRef.current = false;
    setForceFallbackSprites(false);
  }

  function goBack() {
    if (phase === "setup" && setupStep === "lineup") {
      setSetupStep("defense");
      return;
    }
    if (phase === "setup" && setupStep === "defense") {
      setSetupStep("attack");
      return;
    }
    onBackToOffice();
  }

  const flowStep = ["live", "decision-preparation", "decision-live"].includes(phase) ? 3 : phase === "result" ? 4 : ["attack", "defense", "lineup"].indexOf(setupStep);
  const flowLabels = ["进攻", "防守", "名单", "比赛", "结算"];
  const setupTitles: Record<SetupStep, string> = { attack: "选择进攻阵型", defense: "选择防守阵型", lineup: "敲定 11 人名单" };
  const formationGuidePages = captainFormationGuidePages[captainId];
  const decisionRulePages = captainId === "naya" ? [
    { title: "加时赛怎么踢", message: "90分钟打平就再踢30分钟，上下半场各15分钟。还分不出胜负，就点球见！" },
    { title: "点球大战 · 前 5 轮", message: "双方各派5人轮流主罚，掷硬币决定先后，5轮内进球更多的一方获胜。" },
    { title: "突然死亡", message: "5轮后还打平就进入突然死亡。一边罚进、一边罚失，比赛立刻结束。" },
  ] : captainId === "irena" ? [
    { title: "加时赛怎么踢", message: "常规时间打平后加赛30分钟，上下半场各15分钟；仍打平则进入点球大战。" },
    { title: "点球大战 · 前 5 轮", message: "双方各派5人轮流主罚，由掷硬币决定先后；5轮后进球更多的一方获胜。" },
    { title: "突然死亡", message: "前5轮仍打平时进入突然死亡。双方各完成一次主罚后，领先方获胜。" },
  ] : [
    { title: "加时赛怎么踢", message: "90 分钟常规时间打平后，加赛 30 分钟，分上下半场、各 15 分钟。加时赛结束仍打平，才会进入点球大战。" },
    { title: "点球大战 · 前 5 轮", message: "双方各派 5 名球员轮流主罚，掷硬币决定谁先踢。5 轮内进球多的一方获胜。" },
    { title: "突然死亡", message: "5 轮后仍打平，就进入突然死亡：双方继续轮流加罚，一方罚进、另一方罚失即分出胜负。" },
  ];
  const guidePrompt = phase === "result" && result
    ? { guideId: "match-result", title: matchResultGuideTitle(result, settlement), message: captainGuideMessage(captainId, "match-result", "再看看控球、射门和评分，我们就继续出发吧。"), target: "match-result", variant: "celebrate" as const }
    : phase === "decision-preparation"
      ? {
        guideId: "decision-rules",
        title: "加时赛与点球规则",
        message: captainGuideMessage(captainId, "decision-rules", "90 分钟常规时间打平后，加赛 30 分钟，分上下半场、各 15 分钟。"),
        target: "decision-rules",
        variant: "think" as const,
        pages: decisionRulePages,
      }
      : phase !== "setup" ? null
      : setupStep === "attack" || setupStep === "defense" ? {
        guideId: "match-formation-basics-v1",
        title: formationGuidePages[0].title,
        message: formationGuidePages[0].message,
        target: setupStep === "attack" ? "match-attack" : "match-defense",
        variant: "think" as const,
        pages: formationGuidePages,
        reopenable: true,
      }
        : selectedCount < 11 ? { guideId: "match-lineup", title: "把十一位球员放上场", message: captainGuideMessage(captainId, "match-lineup", "逐个选择，或先一键补完再调整，都可以哦。"), target: "match-lineup", variant: "guide" as const }
          : { guideId: "match-start", title: "首发已经准备好了", message: captainGuideMessage(captainId, "match-start", "再确认攻防和羁绊。满意的话，我们就上场吧。"), target: "match-start", variant: "remind" as const };

  const isMatchPhase = phase === "live" || phase === "decision-live" || phase === "result";
  const venueSceneUrl = phase === "setup"
    ? resolveMatchDaySceneUrl({ phase, setupStep })
    : phase === "decision-preparation" || phase === "result"
      ? resolveMatchDaySceneUrl({ phase })
      : undefined;

  return (
    <div className={`schedule-screen phase-${phase}`} data-match-day-scene={venueSceneUrl ? "ready" : undefined} style={venueSceneUrl ? { "--match-day-scene": `url("${venueSceneUrl}")` } as CSSProperties : undefined}>
      <header className={`schedule-heading${isMatchPhase ? " is-empty" : ""}`}>
        {!isMatchPhase ? <>
          <button type="button" className="schedule-back" onClick={goBack} aria-label={phase === "setup" && setupStep !== "attack" ? "返回上一步" : "返回经理办公室"}><ArrowLeft aria-hidden="true" /></button>
          <div className="schedule-club-heading"><img src={playerClub.crestUrl} alt={`${clubName}队徽`} /><p>DAY {match.fixture.day} · {stageMeta[match.fixture.stage].name}第{match.fixture.leg}回合</p><h1>{phase === "setup" ? setupTitles[setupStep] : phase === "decision-preparation" ? "决战准备" : phase === "live" || phase === "decision-live" ? "进行比赛" : "赛后结算报告"}</h1><span>冠军联赛 · {clubName} VS {match.opponent.name}</span></div>
          <div className="match-flow-steps" aria-label="比赛流程">
            {flowLabels.map((label, index) => <span key={label} className={index < flowStep ? "done" : index === flowStep ? "active" : ""}><i>{index + 1}</i>{label}</span>).reduce<React.ReactNode[]>((nodes, node, index) => {
              if (index > 0) nodes.push(<ChevronRight key={`arrow-${index}`} aria-hidden="true" />);
              nodes.push(node);
              return nodes;
            }, [])}
          </div>
          <button type="button" className="scout-report-toggle" onClick={() => onViewScoutReport?.()} aria-label={scoutReportViewed ? "查看球探报告" : "未获取对手情报"} disabled={!scoutReportViewed}><Shield aria-hidden="true" /><span>{scoutReportViewed ? "球探报告" : "未获取"}</span></button>
        </> : null}
      </header>

      {phase === "setup" ? (
        <SetupView
          key={setupStep}
          step={setupStep}
          attackFormationId={attackFormationId}
          defenseFormationId={defenseFormationId}
          lineup={lineup}
          ownedPlayers={ownedPlayers}
          playerMap={playerMap}
          selectedCount={selectedCount}
          onAttackFormationChange={changeAttackFormation}
          onDefenseFormationChange={setDefenseFormationId}
          onSlotClick={setActiveSlotId}
          onComplete={completeRecommended}
          onContinueToDefense={() => setSetupStep("defense")}
          onContinueToLineup={() => setSetupStep("lineup")}
          onBackToDefense={() => setSetupStep("defense")}
          startLockedReason={match.currentDay < match.fixture.day ? `比赛将在 Day ${match.fixture.day}开始，请先返回办公室推进至比赛日` : undefined}
          assetLoad={assetLoad}
          onStart={startMatch}
        />
      ) : null}

      {phase === "live" && result ? <LiveMatchView result={result} timeline={matchTimeline} eventIndex={eventIndex} playerMap={playerMap} homeLineup={lineup} awayLineup={scoutedAwayLineup} homeAttackFormationId={attackFormationId} awayAttackFormationId={awayAttackFormationId} feedEndRef={feedEndRef} awayCrestUrl={currentOpponentBlueprint?.crestUrl} awayKitFamily={awayKitFamily} forceFallbackSprites={forceFallbackSprites} playbackRate={playbackRate} onPlaybackRateChange={setPlaybackRate} onEventIndexChange={setEventIndex} onMatchComplete={handleMatchComplete} /> : null}
      {phase === "decision-preparation" && result && settlement?.decision && settlement.matchContext ? <DecisionPreparationView result={result} settlement={settlement} awayLineup={scoutedAwayLineup} playerMap={playerMap} onStart={startDecision} /> : null}
      {phase === "decision-live" && result ? <LiveMatchView result={result} timeline={matchTimeline} eventIndex={eventIndex} playerMap={playerMap} homeLineup={lineup} awayLineup={scoutedAwayLineup} homeAttackFormationId={attackFormationId} awayAttackFormationId={awayAttackFormationId} feedEndRef={feedEndRef} awayCrestUrl={currentOpponentBlueprint?.crestUrl} awayKitFamily={awayKitFamily} forceFallbackSprites={forceFallbackSprites} playbackRate={playbackRate} onPlaybackRateChange={setPlaybackRate} onEventIndexChange={setEventIndex} onMatchComplete={handleMatchComplete} /> : null}
      {phase === "result" && result ? <MatchResultView result={result} stage={match.fixture.stage} playerMap={playerMap} attribution={matchAttribution} onReplay={replay} onBackToSetup={backToSetup} onTournamentContinue={match.onContinue} tournamentSettlement={settlement} awayCrestUrl={currentOpponentBlueprint?.crestUrl} firstLegScore={match.firstLegScore} /> : null}
      {guidePrompt ? <SayaGuide scope={guideScope} preferredPlacement="bottom-left" {...guidePrompt} /> : null}

      {activeSlot ? (
        <div className="player-picker-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveSlotId(null); }}>
          <section className="player-picker" role="dialog" aria-modal="true" aria-labelledby="player-picker-title">
            <header><div><p>选择 {activeSlot.label}</p><h2 id="player-picker-title">从已持有球员中选择</h2></div><button type="button" onClick={() => setActiveSlotId(null)} aria-label="关闭球员选择"><X aria-hidden="true" /></button></header>
            <div className="picker-position-summary"><Target aria-hidden="true" /><span>目标位置 <strong>{positionLabels[activeSlot.position] ?? activeSlot.position}</strong></span><span>选择位置适配与职责能力最高的球员</span></div>
            <div className="picker-player-list">
              {pickerPlayers.map((player) => {
                const isUsed = selectedIds.has(player.character_id) && lineup[activeSlot.id] !== player.character_id;
                const assignedSlot = isUsed ? attackFormations[attackFormationId].slots.find((slot) => lineup[slot.id] === player.character_id) : undefined;
                const fit = Math.round(positionFit(player, activeSlot.position) * 100);
                const faction = factionMeta[player.faction_id];
                return (
                  <button key={player.character_id} type="button" className={isUsed ? "is-assigned" : undefined} style={{ "--faction-color": faction.color } as CSSProperties} onClick={() => selectPlayer(activeSlot.id, player.character_id)} aria-label={`${player.name}，${faction.name}，${formatPlayerPositions(player)}，位置适配${fit}%`}>
                    <Portrait player={player} />
                    <span className="picker-player-copy"><strong>{player.name}<small>{"★".repeat(player.stars)}</small></strong><span className="picker-player-meta"><b className="picker-faction-label"><i />{faction.name}</b><span>{formatPlayerPositions(player)} · 练度 {trainingFocusTotal(player.focus)}/6</span></span><i><b style={{ width: `${fit}%` }} /></i></span>
                    <span className="picker-score"><small>位置适配</small><strong>{fit}%</strong><i>位置能力 {roleScore(player, activeSlot.position).toFixed(0)}</i></span>
                    {isUsed ? <em className="picker-assigned-position">已在 {assignedSlot?.position}</em> : <ChevronRight aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

type SetupProps = {
  step: SetupStep;
  attackFormationId: FormationId;
  defenseFormationId: FormationId;
  lineup: Lineup;
  ownedPlayers: TournamentCharacter[];
  playerMap: Map<string, Character>;
  selectedCount: number;
  onAttackFormationChange: (formation: FormationId) => void;
  onDefenseFormationChange: (formation: FormationId) => void;
  onSlotClick: (slotId: string) => void;
  onComplete: () => void;
  onContinueToDefense: () => void;
  onContinueToLineup: () => void;
  onBackToDefense: () => void;
  startLockedReason?: string;
  assetLoad: MatchAssetLoadState;
  onStart: (useSimplifiedSprites?: boolean) => void;
};

function SetupView(props: SetupProps) {
  const formation = attackFormations[props.attackFormationId];
  const defenseOptions = compatibleDefenseFormations[props.attackFormationId];
  const ownedPlayerMap = new Map(props.ownedPlayers.map((player) => [player.character_id, player]));
  const selectedPlayers = Object.values(props.lineup).map((id) => ownedPlayerMap.get(id ?? "")).filter((player): player is TournamentCharacter => Boolean(player));
  const bondStates = factionBondStates(selectedPlayers);
  const visibleBondStates = bondStates.filter((bond) => bond.count > 1);
  const averageOverall = selectedPlayers.length ? selectedPlayers.reduce((sum, player) => sum + player.currentOverall, 0) / selectedPlayers.length : 0;
  const combatProfile = props.selectedCount === 11 ? teamCombatProfile(props.lineup, props.attackFormationId, props.playerMap) : null;

  return (
    <main className={`schedule-setup ${props.step}-step`}>
      {props.step === "attack" ? <FormationBrowser mode="attack" options={formationOrder} selectedId={props.attackFormationId} attackFormationId={props.attackFormationId} onSelect={props.onAttackFormationChange} onContinue={props.onContinueToDefense} /> : null}

      {props.step === "defense" ? <FormationBrowser mode="defense" options={defenseOptions} selectedId={props.defenseFormationId} attackFormationId={props.attackFormationId} onSelect={props.onDefenseFormationChange} onContinue={props.onContinueToLineup} /> : null}

      {props.step === "lineup" ? <>

      <section className="lineup-board">
        <header><div><p>STARTING XI</p><h2>{formation.name} · {formation.identity}</h2></div><button type="button" data-saya-guide-target="match-lineup" data-sfx="team-select" onClick={props.onComplete}><WandSparkles aria-hidden="true" />一键补完名单</button></header>
        <div className="tactics-pitch" aria-label={`${formation.name}首发阵容`}>
          <div className="pitch-center-circle" />
          <i className="pitch-penalty-area opponent" aria-hidden="true" />
          <i className="pitch-penalty-area home" aria-hidden="true" />
          <span className="pitch-direction-marker" aria-hidden="true"><b>↑</b>进攻</span>
          {formation.slots.map((slot) => {
            const player = props.playerMap.get(props.lineup[slot.id] ?? "");
            return (
              <button
                key={slot.id}
                type="button"
                className={`lineup-slot${player ? " filled" : ""}${slot.position === "GK" ? " goalkeeper" : ""}`}
                style={{ "--slot-x": `${slot.x}%`, "--slot-y": `${slot.y}%` } as CSSProperties}
                onClick={() => props.onSlotClick(slot.id)}
                aria-label={player ? `${slot.label}已选择${player.name}，点击更换` : `${slot.label}未选择，点击选择球员`}
              >
                {player ? <FormationPlayerSlot player={player} slot={slot} /> : <><span className="lineup-player-visual empty"><EmptyPlayerSilhouette /></span><span className="lineup-player-name"><strong>{slot.label}</strong><small>{slot.position}</small></span><b>+</b></>}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="lineup-summary-panel">
        <section className="lineup-readiness"><div className="readiness-ring" style={{ "--readiness": `${props.selectedCount / 11 * 360}deg` } as CSSProperties}><strong>{props.selectedCount}</strong><small>/ 11</small></div><div><strong>{props.selectedCount === 11 ? "阵容已就绪" : `还差 ${11 - props.selectedCount} 个位置`}</strong>{props.selectedCount !== 11 && <small>点击场上剪影选择持有球员</small>}</div></section>
        <section className="lineup-bonds">
          <header><span>阵营羁绊</span></header>
          <div>
            {visibleBondStates.length ? visibleBondStates.map((bond) => <article key={bond.factionId} className={bond.layers > 0 ? "active" : "pending"} style={{ "--faction-color": factionMeta[bond.factionId].color } as CSSProperties}>
              <i /><span><strong>{cupFactionBondProfiles[bond.factionId].name}</strong><small>{factionMeta[bond.factionId].name}</small></span><em><b>{bond.layers > 0 ? "已激活" : "未激活"}</b><small>{bond.layers > 0 ? cupFactionBondProfiles[bond.factionId].effectLabel : `${bond.count}/${bond.target}`}</small></em>
            </article>) : <p>同阵营至少 2 人后显示羁绊进度</p>}
          </div>
        </section>
        {combatProfile ? <dl className="lineup-combat-summary" aria-label="首发比赛能力趋势">
          <div><dt>进攻</dt><dd>{combatGrade(combatProfile.finishing)}</dd></div>
          <div><dt>组织</dt><dd>{combatGrade(combatProfile.creation)}</dd></div>
          <div><dt>防守</dt><dd>{combatGrade((combatProfile.prevention + combatProfile.goalkeeping) / 2)}</dd></div>
        </dl> : null}
        <dl className="lineup-numbers"><div><dt>平均综合</dt><dd>{averageOverall ? averageOverall.toFixed(1) : "—"}</dd></div><div><dt>比赛模式</dt><dd>全自动</dd></div><div><dt>进攻阵型</dt><dd>{props.attackFormationId}</dd></div><div><dt>防守阵型</dt><dd>{defenseFormations[props.defenseFormationId].name}</dd></div></dl>
        <button type="button" className="setup-back-button" onClick={props.onBackToDefense}><ArrowLeft aria-hidden="true" />重新选择防守阵型</button>
        <button
          type="button"
          className="start-match-button"
          data-saya-guide-target="match-start"
          data-sfx="confirm"
          disabled={props.selectedCount !== 11 || Boolean(props.startLockedReason) || props.assetLoad.status !== "ready"}
          onClick={() => props.onStart(false)}
        >
          <Play aria-hidden="true" />
          <span>
            <strong>{props.startLockedReason ? "尚未到比赛日" : props.assetLoad.status === "ready" ? "进入比赛" : props.assetLoad.status === "degraded" ? "资源未完全就绪" : "正在准备比赛资源"}</strong>
            {props.startLockedReason || props.selectedCount !== 11
              ? <small>{props.startLockedReason ?? "请先填满 11 人"}</small>
              : props.assetLoad.status !== "ready"
                ? <small>{props.assetLoad.loaded} / {props.assetLoad.total || "—"} 项已准备</small>
                : null}
          </span>
        </button>
        {props.assetLoad.status === "degraded" ? <button type="button" className="start-match-fallback-button" onClick={() => props.onStart(true)}><Play aria-hidden="true" />使用简化画面开赛</button> : null}
      </aside>
      </> : null}
    </main>
  );
}

export function matchEventPortraitMode(event: Pick<MatchEvent, "kind" | "playerId" | "skillId"> | undefined): "skill" | "goal" | "penalty-goal" | "penalty-stop" | null {
  if (!event?.playerId) return null;
  if (event.kind === "penalty-goal") return "penalty-goal";
  if (event.kind === "penalty-save" || event.kind === "penalty-miss") return "penalty-stop";
  if (event.kind === "goal") return "goal";
  if (event.skillId) return "skill";
  return null;
}

function DecisionPreparationView({ result, settlement, awayLineup, playerMap, onStart }: { result: MatchResult; settlement: TournamentResult; awayLineup: Lineup; playerMap: Map<string, Character>; onStart: () => void }) {
  const { captainId } = useTournamentCaptain();
  const decision = settlement.decision!;
  const context = settlement.matchContext!;
  const homePlayers = Object.values(context.homeLineup).flatMap((id) => id && playerMap.get(id) ? [playerMap.get(id)!] : []);
  const awayPlayers = Object.values(awayLineup).flatMap((id) => id && playerMap.get(id) ? [playerMap.get(id)!] : []);
  const homeOrder = rankedPenaltyTakers(homePlayers);
  const awayOrder = rankedPenaltyTakers(awayPlayers);
  const homeKeeper = playerMap.get(context.homeLineup.gk ?? "");
  const awayKeeper = playerMap.get(awayLineup.gk ?? "");
  const isAggregate = decision.reason === "aggregate-draw";
  return (
    <main className="decision-preparation-layout">
      <section className="decision-preparation-hero">
        <span>90 MINUTES COMPLETE</span>
        <Trophy aria-hidden="true" />
        <h2>{isAggregate ? "两回合总比分战平" : "决赛常规时间战平"}</h2>
        <strong>{decision.aggregateAt90.player}<i>:</i>{decision.aggregateAt90.opponent}</strong>
        <p>{isAggregate ? `本场 ${result.homeScore}:${result.awayScore}，总比分仍未分出胜负。` : "冠军必须在今晚产生，比赛将进入加时赛。"}</p>
        <div className="decision-hero-facts">
          <div><Timer aria-hidden="true" /><span><strong>加时赛</strong><small>30 分钟 · 上下半场各 15 分钟</small></span></div>
          <div><Target aria-hidden="true" /><span><strong>点球大战</strong><small>5 轮起 · 平局进入突然死亡</small></span></div>
        </div>
      </section>
      <section className="decision-plan-card" data-saya-guide-target="decision-rules">
        <header><div><h3>决战规则已锁定</h3><p>决胜规则速览 · 详细规则见{captainGuideIdentity[captainId].chibiName}提示</p></div></header>
        <div className="decision-rule-flow"><span><b>01</b>30分钟加时</span><ChevronRight aria-hidden="true" /><span><b>02</b>仍平进入点球</span><ChevronRight aria-hidden="true" /><span><b>03</b>突然死亡</span></div>
        <button type="button" className="start-decision-button" data-sfx="confirm" onClick={onStart}><Play aria-hidden="true" /><span><strong>进入加时赛</strong><small>加时 30 分钟 · 打平则进入点球大战</small></span></button>
      </section>
      <section className="penalty-order-card home">
        <header><span>我方点球顺序</span><small>按点球能力自动排序</small></header>
        <div>{homeOrder.slice(0, 5).map((player, index) => <article key={player.character_id}><b>{index + 1}</b><Portrait player={player} /><span><strong>{player.name}</strong><small>点球 {Math.round(penaltyTakerScore(player))}</small></span></article>)}</div>
        {homeKeeper ? <footer className="keeper-row"><Portrait player={homeKeeper} className="keeper-portrait" /><div className="keeper-identity"><span>我方门将</span><strong>{homeKeeper.name}</strong></div><div className="keeper-ability"><small>扑救能力</small><b>{Math.round(penaltyKeeperScore(homeKeeper))}</b></div></footer> : null}
      </section>
      <section className="penalty-order-card away">
        <header><span>对手点球顺序</span><small>前五名预览</small></header>
        <div>{awayOrder.slice(0, 5).map((player, index) => <article key={player.character_id}><b>{index + 1}</b><Portrait player={player} /><span><strong>{player.name}</strong><small>点球 {Math.round(penaltyTakerScore(player))}</small></span></article>)}</div>
        {awayKeeper ? <footer className="keeper-row"><Portrait player={awayKeeper} className="keeper-portrait" /><div className="keeper-identity"><span>对方门将</span><strong>{awayKeeper.name}</strong></div><div className="keeper-ability"><small>扑救能力</small><b>{Math.round(penaltyKeeperScore(awayKeeper))}</b></div></footer> : null}
      </section>
    </main>
  );
}

function LiveMatchView({ result, timeline, eventIndex, playerMap, homeLineup, awayLineup, homeAttackFormationId, awayAttackFormationId, feedEndRef, awayCrestUrl, awayKitFamily = "field-away", forceFallbackSprites = false, playbackRate, onPlaybackRateChange, onEventIndexChange, onMatchComplete }: { result: MatchResult; timeline: MatchTimelineEntry[]; eventIndex: number; playerMap: Map<string, Character>; homeLineup: Lineup; awayLineup: Lineup; homeAttackFormationId: FormationId; awayAttackFormationId: FormationId; feedEndRef: React.RefObject<HTMLDivElement | null>; awayCrestUrl?: string; awayKitFamily?: ChibiSpriteFamily; forceFallbackSprites?: boolean; playbackRate: 1 | 2; onPlaybackRateChange: (rate: 1 | 2) => void; onEventIndexChange?: (index: number) => void; onMatchComplete?: () => void }) {
  const events = timeline.map((entry) => entry.event);
  // 球的动作对应当前事件；文字/比分/立绘延迟一拍展示上一个事件，让「球先到、结果再报」，避免比分与立绘抢拍。
  const presentation = deriveMatchPresentation(events, eventIndex);
  const reveal = presentation.reveal ?? events[0]!;
  const portraitMode = matchEventPortraitMode(reveal);
  const eventPlayerId = portraitMode === "goal" || portraitMode === "penalty-goal" ? reveal.scorerId : reveal.playerId;
  const eventPlayer = portraitMode ? playerMap.get(eventPlayerId ?? "") : null;
  const innateSkill = reveal?.skillSource === "innate" && reveal.skillId ? skillMeta[reveal.skillId] : null;
  const fixedSkill = reveal?.skillSource === "fixed" && reveal.skillId ? skillsById.get(reveal.skillId) : null;
  const skill = innateSkill
    ? { name: innateSkill.name, effect: innateSkill.effect }
    : fixedSkill
      ? { name: fixedSkill.name, effect: fixedSkill.description }
      : null;
  return (
    <main className="live-match-layout stadium-live-layout">
      <aside className="live-visual-stage match-pitch-stage">
        <StandsPitch timeline={timeline} eventIndex={eventIndex} playerMap={playerMap} homeLineup={homeLineup} awayLineup={awayLineup} homeAttackFormationId={homeAttackFormationId} awayAttackFormationId={awayAttackFormationId} seed={result.seed} playbackRate={playbackRate} awayKitFamily={awayKitFamily} forceFallbackSprites={forceFallbackSprites} onEventIndexChange={onEventIndexChange} onMatchComplete={onMatchComplete} />
        <MatchStadiumHud homeName={result.homeName} awayName={result.awayName} homeCrestUrl={playerClub.crestUrl} awayCrestUrl={awayCrestUrl} reveal={reveal} visibleEvents={presentation.visibleEvents} feedEndRef={feedEndRef} />
        <button type="button" className="match-playback-rate" aria-label={`比赛回放速度：${playbackRate}倍`} aria-pressed={playbackRate === 2} onClick={() => onPlaybackRateChange(playbackRate === 1 ? 2 : 1)}>
          <FastForward aria-hidden="true" /><span>倍速 {playbackRate}×</span>
        </button>
        {eventPlayer && portraitMode === "skill" && skill ? <div className="skill-cut-in" key={reveal.id}><Portrait player={eventPlayer} preferCompositeCard /><div><span><Sparkles aria-hidden="true" />{reveal.skillSource === "fixed" ? "固定技能发动" : "固有天赋发动"}</span><h2>{skill.name}</h2><strong>{eventPlayer.name}</strong><p>{skill.effect}</p></div></div> : eventPlayer && (portraitMode === "goal" || portraitMode === "penalty-goal") ? <div className="skill-cut-in goal-cut-in penalty-cut-in" key={reveal.id}><Portrait player={eventPlayer} /><div><span><Target aria-hidden="true" />{portraitMode === "penalty-goal" ? "点球命中" : "进球球员"}</span><h2>{portraitMode === "penalty-goal" ? "SCORED!" : "GOAL!"}</h2><strong>{eventPlayer.name}</strong><p>{reveal.commentary}</p></div></div> : eventPlayer && portraitMode === "penalty-stop" ? <div className="skill-cut-in penalty-save-cut-in" key={reveal.id}><Portrait player={eventPlayer} /><div><span><Shield aria-hidden="true" />门将防守</span><h2>{reveal.kind === "penalty-save" ? "SAVED!" : "MISSED!"}</h2><strong>{eventPlayer.name}</strong><p>{reveal.commentary}</p></div></div> : null}
      </aside>
    </main>
  );
}

function radarPoint(index: number, value: number, axes: number, radius: number, center: number) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / axes;
  const distance = radius * Math.max(0, Math.min(100, value)) / 100;
  return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
}

function MatchRadar({ result }: { result: MatchResult }) {
  const axes = [
    { label: "控球", home: result.homePossession, away: 100 - result.homePossession },
    { label: "射门", home: Math.min(100, result.homeShots * 5), away: Math.min(100, result.awayShots * 5) },
    { label: "xG", home: Math.min(100, result.homeXg / 3 * 100), away: Math.min(100, result.awayXg / 3 * 100) },
    { label: "进攻", home: result.homeAttack, away: result.awayAttack },
    { label: "防守", home: result.homeDefense, away: result.awayDefense },
  ];
  const center = 110;
  const radius = 92;
  const ring = (scale: number) => axes.map((_, index) => radarPoint(index, scale, axes.length, radius, center)).join(" ");
  return <figure className="match-radar"><svg viewBox="0 0 220 220" role="img" aria-label="双方五维比赛表现雷达图">
    {[25, 50, 75, 100].map((scale) => <polygon key={scale} points={ring(scale)} className="radar-ring" />)}
    {axes.map((axis, index) => { const outer = radarPoint(index, 100, axes.length, radius, center); const [x, y] = outer.split(","); const label = radarPoint(index, 106, axes.length, radius, center).split(","); return <g key={axis.label}><line x1={center} y1={center} x2={x} y2={y} /><text x={label[0]} y={label[1]}>{axis.label}</text></g>; })}
    <polygon points={axes.map((axis, index) => radarPoint(index, axis.away, axes.length, radius, center)).join(" ")} className="radar-away" />
    <polygon points={axes.map((axis, index) => radarPoint(index, axis.home, axes.length, radius, center)).join(" ")} className="radar-home" />
  </svg><figcaption><span><i className="home" />{result.homeName}</span><span><i className="away" />{result.awayName}</span></figcaption></figure>;
}

function MatchResultView({ result, stage, playerMap, attribution, onReplay, onBackToSetup, onTournamentContinue, tournamentSettlement, awayCrestUrl, firstLegScore }: { result: MatchResult; stage: TournamentFixture["stage"]; playerMap: Map<string, Character>; attribution: MatchAttribution | null; onReplay: () => void; onBackToSetup: () => void; onTournamentContinue?: () => void; tournamentSettlement?: TournamentMatchSettlement; awayCrestUrl?: string; firstLegScore?: { home: number; away: number } }) {
  const [resultPage, setResultPage] = useState<"report" | "players">("report");
  const mvp = playerMap.get(result.mvpId)!;
  const mvpRating = result.ratings.find((rating) => rating.characterId === result.mvpId)!;
  const homeRatings = result.ratings.filter((rating) => rating.team === "home");
  const displayHomeScore = result.homeScore + (tournamentSettlement?.extraTime?.player ?? 0);
  const displayAwayScore = result.awayScore + (tournamentSettlement?.extraTime?.opponent ?? 0);
  const aggregate = twoLegAggregateScore(firstLegScore, displayHomeScore, displayAwayScore);
  const resultLabel = matchResultOutcomeLabel(stage, tournamentSettlement, displayHomeScore, displayAwayScore);
  const combatTrends = result.homeCombatProfile && result.awayCombatProfile ? [
    { label: "进攻", value: matchupTrend(result.homeCombatProfile.finishing, result.awayCombatProfile.finishing) },
    { label: "组织", value: matchupTrend(result.homeCombatProfile.creation, result.awayCombatProfile.creation) },
    { label: "防守", value: matchupTrend((result.homeCombatProfile.prevention + result.homeCombatProfile.goalkeeping) / 2, (result.awayCombatProfile.prevention + result.awayCombatProfile.goalkeeping) / 2) },
  ] : [];
  return (
    <main className={`match-result-layout result-page-${resultPage}`}>
      <section className="result-score-card"><div className="result-score-row"><div className="result-club home"><img src={playerClub.crestUrl} alt={`${result.homeName}队徽`} /><span>主队</span><strong>{result.homeName}</strong></div><div><small>{resultLabel}</small><strong>{displayHomeScore}<i>:</i>{displayAwayScore}</strong>{aggregate ? <span>总比分 {aggregate.home}:{aggregate.away}</span> : null}{tournamentSettlement?.extraTime ? <span>90分钟 {result.homeScore}:{result.awayScore} · 加时赛{tournamentSettlement.extraTime.player}:{tournamentSettlement.extraTime.opponent}</span> : null}{tournamentSettlement?.penalties ? <span>点球 {tournamentSettlement.penalties.player}:{tournamentSettlement.penalties.opponent}</span> : null}</div><div className="result-club away">{awayCrestUrl ? <img src={awayCrestUrl} alt={`${result.awayName}队徽`} /> : <Shield aria-hidden="true" />}<span>客队</span><strong>{result.awayName}</strong></div></div></section>
      {resultPage === "report" ? <section className="result-report">
        <header><Target aria-hidden="true" /><span>比赛结算报告</span></header>
        <div className="result-report-grid">
          <div className="result-report-body"><MatchRadar result={result} /><div className="report-comparison"><div><strong>{result.homePossession}%</strong><span>控球率</span><strong>{100 - result.homePossession}%</strong></div><div><strong>{result.homeShots}</strong><span>射门</span><strong>{result.awayShots}</strong></div><div><strong>{result.homeXg.toFixed(2)}</strong><span>预期进球</span><strong>{result.awayXg.toFixed(2)}</strong></div><div><strong>{result.homeAttack}</strong><span>进攻能力</span><strong>{result.awayAttack}</strong></div><div><strong>{result.homeDefense}</strong><span>防守能力</span><strong>{result.awayDefense}</strong></div></div></div>
          <div className="result-analysis">
            {combatTrends.length ? <dl className="result-combat-trends" aria-label="比赛三通道对比">{combatTrends.map((trend) => <div key={trend.label}><dt>{trend.label}</dt><dd>{trend.value}</dd></div>)}</dl> : null}
            {attribution ? (
              <ul className="attribution-lines">
                {attribution.lines.map((line) => (
                  <li key={line.key} className={`impact-${line.impact}`}>
                    <span className="attribution-label">{attributionKeyLabels[line.key]}</span>
                    <p>{line.copy}</p>
                  </li>
                ))}
                <li className="attribution-luck"><span className="attribution-label">运气</span><p>{attribution.luckCopy}</p></li>
              </ul>
            ) : null}
          </div>
        </div>
      </section> : <div className="result-player-page">
        <aside className="mvp-card"><div className="mvp-title"><Trophy aria-hidden="true" /><span>PLAYER OF THE MATCH</span></div><Portrait player={mvp} className="mvp-portrait" preferStandee /><div className="mvp-copy"><span>本场 MVP</span><h2>{mvp.name}</h2><p>{formatPlayerPositions(mvp)} · {"★".repeat(mvp.stars)}</p><div><strong>{mvpRating.rating.toFixed(1)}</strong><span>{mvpRating.goals} 进球 · {mvpRating.assists} 助攻 · {mvpRating.skillTriggers} 次技能</span></div></div></aside>
        <section className="rating-table"><header><span>我队球员评分</span><small>{homeRatings.length} 人 · 完整评分</small></header>{homeRatings.map((rating, index) => { const player = playerMap.get(rating.characterId); return player ? <div key={rating.characterId}><i>{index + 1}</i><Portrait player={player} className="rating-portrait" /><span>{player.name}<small>{result.homeName}</small></span><em>{rating.goals ? `${rating.goals}球` : rating.assists ? `${rating.assists}助` : rating.skillTriggers ? `${rating.skillTriggers}技能` : `${rating.ordinaryEvents}次参与`}</em><strong>{rating.rating.toFixed(1)}</strong></div> : null; })}</section>
      </div>}
      <div className="result-actions">
        {resultPage === "report" ? <button type="button" className="result-next-button" data-saya-guide-target="match-result" onClick={() => setResultPage("players")}>查看球员表现<ChevronRight aria-hidden="true" /></button> : <>
          <button type="button" onClick={() => setResultPage("report")}><ArrowLeft aria-hidden="true" />返回比赛报告</button>
          {onTournamentContinue ? <button type="button" className="result-continue-button" data-saya-guide-target="match-result" data-sfx="confirm" onClick={onTournamentContinue}><Check aria-hidden="true" />继续</button> : <><button type="button" onClick={onBackToSetup}><ArrowLeft aria-hidden="true" />调整阵容</button><button type="button" data-sfx="confirm" onClick={onReplay}><RotateCcw aria-hidden="true" />同阵容再战</button></>}
        </>}
      </div>
    </main>
  );
}
