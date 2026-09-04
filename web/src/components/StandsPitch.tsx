import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Character } from "../data/gameData";
import { buildPlayerPositions, deriveEventFrame, segmentArcFactor, type MatchTimelineEntry, type PitchPlayerRole } from "../data/matchSpatial";
import type { FormationId, Lineup } from "../data/matchSimulator";
import { buildStandsField, projectToStands, STANDS_RIG } from "../data/pitchPerspective";
import { characterArtworkAssetId, resolveCharacterArtwork } from "../services/assetResolver";
import { CHIBI_SAYA_ID, ChibiFigure, isCustomChibiPlayer, type ChibiAction, type ChibiSpriteFamily } from "./ChibiFigure";
import "./StandsPitch.css";

type BallKeyframe = {
  time: number;
  left: number;
  top: number;
  scale: number;
  depth: number;
  /** 该关键帧与上一关键帧之间这一段的弧线系数 0..1。 */
  arc: number;
  /** 该关键帧是否为「瞬移」终点（到点时直接跳，不沿地面飞行）。 */
  teleport?: boolean;
};

// 弧线峰值在屏幕上的抬升量（与投影同一 0–100 坐标空间，约等于舞台高度的百分比）。
const MAX_BALL_LIFT = 18;

function buildBallKeyframes(timeline: MatchTimelineEntry[]): BallKeyframe[] {
  const keyframes: BallKeyframe[] = [];
  let time = 0;
  const origin = projectToStands(50, 50);
  let previous: { left: number; top: number; scale: number } = origin;
  keyframes.push({ time: 0, left: origin.left, top: origin.top, scale: origin.scale, depth: origin.depth, arc: 0 });
  for (const entry of timeline) {
    for (let index = 0; index < entry.ballPath.length; index += 1) {
      const waypoint = entry.ballPath[index];
      const projected = projectToStands(waypoint.x, waypoint.y);
      time += entry.segmentDurations[index] ?? 320;
      // 弧线按「屏幕距离」判断：看着近就贴地短传，看着远才起长传（不受透视压缩干扰）。
      const screenDistance = Math.hypot(projected.left - previous.left, projected.top - previous.top);
      const arc = waypoint.teleport ? 0 : segmentArcFactor(waypoint.mode, screenDistance);
      keyframes.push({
        time,
        left: projected.left,
        top: projected.top,
        scale: projected.scale,
        depth: projected.depth,
        arc,
        teleport: waypoint.teleport,
      });
      previous = projected;
    }
  }
  return keyframes;
}

function sampleBallKeyframes(keyframes: BallKeyframe[], elapsed: number): { left: number; groundTop: number; top: number; scale: number; depth: number } {
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (elapsed <= first.time) return { left: first.left, groundTop: first.top, top: first.top, scale: first.scale, depth: first.depth };
  if (elapsed >= last.time) return { left: last.left, groundTop: last.top, top: last.top, scale: last.scale, depth: last.depth };
  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const from = keyframes[index];
    const to = keyframes[index + 1];
    if (elapsed <= to.time) {
      if (to.teleport) {
        // 瞬移段：整段停在 from（球门处），到 to 时刻才直接跳到目标点（中圈）。
        return { left: from.left, groundTop: from.top, top: from.top, scale: from.scale, depth: from.depth };
      }
      const span = to.time - from.time || 1;
      const progress = (elapsed - from.time) / span;
      const left = from.left + (to.left - from.left) * progress;
      const groundTop = from.top + (to.top - from.top) * progress;
      const lift = to.arc * MAX_BALL_LIFT * Math.sin(Math.PI * progress);
      return {
        left,
        groundTop,
        top: groundTop - lift,
        scale: from.scale + (to.scale - from.scale) * progress,
        depth: from.depth + (to.depth - from.depth) * progress,
      };
    }
  }
  return { left: last.left, groundTop: last.top, top: last.top, scale: last.scale, depth: last.depth };
}

export const SHOT_ACTION_LEAD_MS = 180;

// 人物与足球都遵循同一套投影纵深层级：球在同一深度略高一层，稳定落在鞋面/手套前；
// 深度更近的人物则会自然遮住远处的球，避免球横穿身体。
export function ballZIndexFor(depth: number): number {
  return Math.round(depth * 1000) + 1;
}

// 与 chibi 共用同一条远近缩放曲线；CSS 的容器尺寸下限负责小窗口可读性。
export function readableBallScaleFor(depth: number): number {
  const clampedDepth = Math.min(1, Math.max(0, depth));
  return STANDS_RIG.farScale + clampedDepth * (1 - STANDS_RIG.farScale);
}

// 由「球的时钟」推导当前是否处于某事件的射门阶段（球已到射手脚下）。
// 与球共用同一 rAF 时钟，消除与独立定时器之间的漂移。
export function shotPhaseAt(timeline: MatchTimelineEntry[], elapsed: number): boolean {
  for (const entry of timeline) {
    const start = entry.startMs;
    if (elapsed < start) return false;
    const end = start + entry.durationMs;
    if (elapsed < end) {
      let segmentStart = start;
      for (let index = 0; index < entry.ballPath.length; index += 1) {
        const waypoint = entry.ballPath[index];
        if (waypoint.mode === "shot" || waypoint.mode === "goal") {
          return elapsed >= Math.max(start, segmentStart - SHOT_ACTION_LEAD_MS);
        }
        segmentStart += entry.segmentDurations[index] ?? 0;
      }
      return false;
    }
  }
  return false;
}

export function isGoalShotCinematic(event: MatchTimelineEntry["event"] | undefined, shotPhase: boolean): boolean {
  return shotPhase && (event?.kind === "goal" || event?.kind === "penalty-goal");
}

// 由「球的时钟」推导当前事件下标（与球严格同帧）。
function eventIndexAt(timeline: MatchTimelineEntry[], elapsed: number): number {
  for (let index = 0; index < timeline.length; index += 1) {
    if (elapsed < timeline[index].startMs + timeline[index].durationMs) return index;
  }
  return timeline.length - 1;
}

export function goalNetSideAt(timeline: MatchTimelineEntry[], elapsed: number): "home" | "away" | null {
  for (const entry of timeline) {
    if (elapsed < entry.startMs || elapsed >= entry.startMs + entry.durationMs) continue;
    if (entry.event.kind !== "goal" && entry.event.kind !== "penalty-goal") return null;
    let segmentStart = entry.startMs;
    for (let index = 0; index < entry.ballPath.length; index += 1) {
      const segmentEnd = segmentStart + (entry.segmentDurations[index] ?? 0);
      const waypoint = entry.ballPath[index];
      if (waypoint.mode === "goal" && waypoint.teleport && elapsed >= segmentStart && elapsed < segmentEnd) {
        return entry.event.side === "home" ? "away" : "home";
      }
      segmentStart = segmentEnd;
    }
    return null;
  }
  return null;
}

type Props = {
  timeline: MatchTimelineEntry[];
  eventIndex: number;
  playerMap: Map<string, Character>;
  homeLineup: Lineup;
  awayLineup: Lineup;
  homeAttackFormationId: FormationId;
  awayAttackFormationId: FormationId;
  seed: number;
  /** 回放时钟倍率；只影响展示时间线，不参与比赛模拟。 */
  playbackRate?: 1 | 2;
  /** 客队通用场员的球衣色组（我方恒为主队红色；对手按俱乐部色）。 */
  awayKitFamily?: ChibiSpriteFamily;
  /** 资源超时时不再请求图片，整场使用程序化 SVG 形象。 */
  forceFallbackSprites?: boolean;
  /** 球推进到新事件时回调，供上层驱动文字直播/比分。 */
  onEventIndexChange?: (index: number) => void;
  /** 球跑完全程时回调，供上层结算/进入加时。 */
  onMatchComplete?: () => void;
};

// 事件角色 → chibi 动作（按射门阶段分前后）：
// 传球阶段（shotPhase=false）：传球者出脚，射手/门将/防守者等待；
// 射门阶段（shotPhase=true）：射手射门、门将扑救、防守者铲断，传球者收势。
export function chibiActionFor(role: PitchPlayerRole | undefined, shotPhase: boolean): ChibiAction {
  switch (role) {
    case "shooter": return shotPhase ? "shoot" : "idle";
    case "passer": return shotPhase ? "idle" : "pass";
    case "keeper": return shotPhase ? "save" : "idle";
    case "defender": return shotPhase ? "tackle" : "idle";
    default: return "idle";
  }
}

export function chibiActionForPlayer(role: PitchPlayerRole | undefined, shotPhase: boolean, playerId: string, event: MatchTimelineEntry["event"] | undefined): ChibiAction {
  // 技能高亮会把参与者的空间角色标成 skill；动作仍须按本次事件中的实际职责播放。
  const actionRole = role === "skill"
    ? event?.keeperId === playerId
      ? "keeper"
      : event?.shooterId === playerId || event?.scorerId === playerId || event?.takerId === playerId
        ? "shooter"
        : role
    : role;
  return chibiActionFor(actionRole, shotPhase);
}

// 事件角色 → 高亮（脚下光环 / 立绘倾斜）是否「此刻生效」，与动作同相位。
export function activeRoleFor(role: PitchPlayerRole | undefined, shotPhase: boolean): PitchPlayerRole | undefined {
  switch (role) {
    case "shooter":
    case "keeper":
    case "defender":
      return shotPhase ? role : undefined;
    case "passer":
      return shotPhase ? undefined : role;
    default:
      return role;
  }
}

export function usesChibiSpriteInsteadOfArtwork(playerId: string): boolean {
  return isCustomChibiPlayer(playerId);
}

export function isLineupGoalkeeper(playerId: string, homeLineup: Lineup, awayLineup: Lineup): boolean {
  return homeLineup.gk === playerId || awayLineup.gk === playerId;
}

// 稳定的逐球员浮动相位，避免 22 人完全同步呼吸。
function stableBobDelay(playerId: string): string {
  let hash = 2166136261;
  for (let index = 0; index < playerId.length; index += 1) {
    hash ^= playerId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${(((hash >>> 0) % 10) * -0.26).toFixed(2)}s`;
}

export function playbackElapsedMs(startedAt: number, now: number, playbackRate: number): number {
  return (now - startedAt) * playbackRate;
}

export function StandsPitch({ timeline, eventIndex, playerMap, homeLineup, awayLineup, homeAttackFormationId, awayAttackFormationId, seed, playbackRate = 1, awayKitFamily = "field-away", forceFallbackSprites = false, onEventIndexChange, onMatchComplete }: Props) {
  const positions = useMemo(
    () => buildPlayerPositions({ homeLineup, awayLineup, homeAttackFormationId, awayAttackFormationId }),
    [homeLineup, awayLineup, homeAttackFormationId, awayAttackFormationId],
  );
  const homeIds = useMemo(() => new Set(Object.values(homeLineup).filter((id): id is string => Boolean(id))), [homeLineup]);
  const field = useMemo(() => buildStandsField(), []);

  // 场上球员的立绘（透明全身图）。御三家与六星固定使用专属 V2 chibi；门将固定使用橙装门将 chibi；
  // 其余有正式立绘的球员保持原显示逻辑，缺失立绘的球员回退到 ChibiFigure。
  const artwork = useMemo(() => {
    const map = new Map<string, string>();
    if (forceFallbackSprites) return map;
    for (const playerId of positions.keys()) {
      if (usesChibiSpriteInsteadOfArtwork(playerId)) continue;
      // 门将始终使用 keeper chibi（橙装 + 手套），不用其静态立绘，便于在场上区分。
      if (isLineupGoalkeeper(playerId, homeLineup, awayLineup)) continue;
      const resolved = resolveCharacterArtwork(characterArtworkAssetId(playerId));
      if (resolved.status === "ready") map.set(playerId, resolved.url);
    }
    return map;
  }, [awayLineup, forceFallbackSprites, homeLineup, positions]);

  const currentEntry = timeline[eventIndex] ?? timeline[timeline.length - 1];
  const frame = useMemo(
    () => (currentEntry ? deriveEventFrame(currentEntry.event, positions, seed, { kicker: currentEntry.kickoff, homeIds }) : null),
    [currentEntry, positions, seed, homeIds],
  );

  // 射门阶段由「球的时钟」推导（见 shotPhaseAt），与球严格同步，避免漂移。
  const [shotPhase, setShotPhase] = useState(false);
  const [goalNetSide, setGoalNetSide] = useState<"home" | "away" | null>(null);
  const goalShotCinematic = isGoalShotCinematic(currentEntry?.event, shotPhase);

  const ballRef = useRef<HTMLSpanElement>(null);
  const ballShadowRef = useRef<HTMLSpanElement>(null);
  const playbackClockRef = useRef({ elapsed: 0, startedAt: 0, rate: playbackRate });

  useEffect(() => {
    const clock = playbackClockRef.current;
    const now = performance.now();
    if (clock.startedAt > 0) {
      clock.elapsed += playbackElapsedMs(clock.startedAt, now, clock.rate);
      clock.startedAt = now;
    }
    clock.rate = playbackRate;
  }, [playbackRate]);

  // 球用 rAF 连续插值：地面路径沿路径点线性走，长传/射门叠加 sin 抛物线抬升，做出弧线；
  // 地面阴影沿未抬升的路径走，给出「球在空中」的参照。
  useEffect(() => {
    const ball = ballRef.current;
    const shadow = ballShadowRef.current;
    const sprite = ball?.firstElementChild as HTMLElement | null;
    if (!ball) return;
    const keyframes = buildBallKeyframes(timeline);
    if (keyframes.length < 2) return;
    const total = keyframes[keyframes.length - 1].time;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let spinDegrees = 0;
    let previousBallState: { left: number; top: number } | null = null;
    const apply = (state: { left: number; groundTop: number; top: number; scale: number; depth: number }) => {
      const displayScale = readableBallScaleFor(state.depth);
      ball.style.left = `${state.left}%`;
      ball.style.top = `${state.top}%`;
      ball.style.transform = `translate(-50%, -50%) scale(${displayScale})`;
      ball.style.zIndex = String(ballZIndexFor(state.depth));
      if (sprite && previousBallState) {
        const travel = Math.hypot(state.left - previousBallState.left, state.top - previousBallState.top);
        if (travel < 12) spinDegrees += travel * 18;
        sprite.style.transform = `rotate(${spinDegrees}deg)`;
      }
      previousBallState = state;
      if (shadow) {
        const flight = Math.min(1, Math.max(0, (state.groundTop - state.top) / MAX_BALL_LIFT));
        shadow.style.left = `${state.left}%`;
        shadow.style.top = `${state.groundTop}%`;
        shadow.style.opacity = `${0.52 - flight * 0.27}`;
        shadow.style.filter = `blur(${(0.6 + flight * 1.8) * displayScale}px)`;
        shadow.style.transform = `translate(-50%, -50%) scale(${displayScale * (0.82 + flight * 0.28)})`;
        shadow.style.zIndex = String(Math.max(1, ballZIndexFor(state.depth) - 1));
      }
    };
    if (reduceMotion) {
      setShotPhase(true);
      apply(sampleBallKeyframes(keyframes, total));
      onEventIndexChange?.(timeline.length - 1);
      onMatchComplete?.();
      return;
    }
    let frameId = 0;
    let lastReportedIndex = 0;
    const startedAt = performance.now();
    playbackClockRef.current = { elapsed: 0, startedAt, rate: playbackRate };
    const tick = (now: number) => {
      const clock = playbackClockRef.current;
      const elapsed = Math.min(clock.elapsed + playbackElapsedMs(clock.startedAt, now, clock.rate), total);
      apply(sampleBallKeyframes(keyframes, elapsed));
      setShotPhase(shotPhaseAt(timeline, elapsed));
      setGoalNetSide(goalNetSideAt(timeline, elapsed));
      const index = eventIndexAt(timeline, elapsed);
      if (index !== lastReportedIndex) {
        lastReportedIndex = index;
        onEventIndexChange?.(index);
      }
      if (elapsed < total) {
        frameId = requestAnimationFrame(tick);
      } else {
        onMatchComplete?.();
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [timeline, onEventIndexChange, onMatchComplete]);

  return (
    <div className={`stands-pitch${goalShotCinematic ? " is-goal-shot" : ""}`} role="img" aria-label="比赛实时球场（看台视角）">
      <div className="stands-pitch-camera">
      <div className="stands-pitch-stands" aria-hidden="true" />

      <svg className="stands-pitch-markings" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon className="sp-pitch-outline" points={field.outline} />
        <line className="sp-line" x1={field.halfway.x1} y1={field.halfway.y1} x2={field.halfway.x2} y2={field.halfway.y2} />
        <ellipse className="sp-line" cx={field.centerCircle.cx} cy={field.centerCircle.cy} rx={field.centerCircle.rx} ry={field.centerCircle.ry} />
        <ellipse className="sp-center-spot" cx={field.centerSpot.cx} cy={field.centerSpot.cy} rx={field.centerSpot.rx} ry={field.centerSpot.ry} />
        {field.penaltyAreas.map((points, index) => <polygon key={`penalty-${index}`} className="sp-penalty-area" points={points} />)}
      </svg>

      <svg className="stands-pitch-goals stands-pitch-goals-back" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="sp-net" width="1.25" height="1.25" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 1.25 1.25 M 1.25 0 L 0 1.25" className="sp-goal-net-line" />
          </pattern>
        </defs>
        {field.goalFrames.map((goal) => (
          <g key={`goal-back-${goal.side}`} className={`sp-goal-net sp-goal-net-${goal.side}${goalNetSide === goal.side ? " is-impact" : ""}`}>
            <polygon
              className="sp-goal-net-ground"
              points={`${goal.frontFar.left},${goal.frontFar.top} ${goal.frontNear.left},${goal.frontNear.top} ${goal.backNear.left},${goal.backNear.top} ${goal.backFar.left},${goal.backFar.top}`}
            />
            <polygon
              className="sp-goal-net-panel"
              points={`${goal.backFar.left},${goal.backFar.top} ${goal.backNear.left},${goal.backNear.top} ${goal.backNear.left},${goal.backNear.top - goal.nearPostHeight} ${goal.backFar.left},${goal.backFar.top - goal.farPostHeight}`}
            />
            <polygon
              className="sp-goal-net-panel"
              points={`${goal.frontFar.left},${goal.frontFar.top} ${goal.backFar.left},${goal.backFar.top} ${goal.backFar.left},${goal.backFar.top - goal.farPostHeight} ${goal.frontFar.left},${goal.frontFar.top - goal.farPostHeight}`}
            />
            <polygon
              className="sp-goal-net-panel"
              points={`${goal.frontNear.left},${goal.frontNear.top} ${goal.backNear.left},${goal.backNear.top} ${goal.backNear.left},${goal.backNear.top - goal.nearPostHeight} ${goal.frontNear.left},${goal.frontNear.top - goal.nearPostHeight}`}
            />
          </g>
        ))}
      </svg>

      {frame ? [...frame.players.entries()].map(([playerId, state]) => {
        const point = projectToStands(state.x, state.y);
        const player = playerMap.get(playerId);
        const isHome = homeIds.has(playerId);
        const artUrl = artwork.get(playerId);
        const active = state.active;
        const phaseActive = activeRoleFor(active, shotPhase);
        const action = chibiActionForPlayer(active, shotPhase, playerId, currentEntry?.event);
        const style = {
          left: `${point.left}%`,
          top: `${point.top}%`,
          zIndex: Math.round(point.depth * 1000),
          "--depth-scale": point.scale,
          "--bob-delay": stableBobDelay(playerId),
        } as CSSProperties;
        return (
          <span
            key={playerId}
            className={`stands-player ${isHome ? "home" : "away"}${phaseActive ? ` is-active-${phaseActive}` : ""}`}
            style={style}
            title={player?.name}
            aria-hidden="true"
          >
            <i className="stands-player-shadow" />
            <i className="stands-player-ring" />
            <span className="stands-player-artbox">
              {artUrl
                ? <img className="stands-player-art" src={artUrl} alt="" draggable={false} />
                : <ChibiFigure side={isHome ? "home" : "away"} playerId={playerId} action={action} goalkeeper={isLineupGoalkeeper(playerId, homeLineup, awayLineup)} awayKitFamily={awayKitFamily} forceFallback={forceFallbackSprites} />}
            </span>
          </span>
        );
      }) : null}

      <i ref={ballShadowRef} className={`stands-pitch-ball-shadow${goalNetSide ? " is-in-net" : ""}`} style={{ left: "50%", top: "65%" } as CSSProperties} aria-hidden="true" />
      <span
        ref={ballRef}
        className={`stands-pitch-ball${goalNetSide ? " is-in-net" : ""}`}
        style={{ left: "50%", top: "65%" } as CSSProperties}
        aria-hidden="true"
      ><i /></span>

      <svg className="stands-pitch-goals stands-pitch-goals-front" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {field.goalFrames.map((goal) => (
          <g key={`goal-front-${goal.side}`} className="sp-goal-frame">
            <line x1={goal.frontFar.left} y1={goal.frontFar.top} x2={goal.frontFar.left} y2={goal.frontFar.top - goal.farPostHeight} />
            <line x1={goal.frontNear.left} y1={goal.frontNear.top} x2={goal.frontNear.left} y2={goal.frontNear.top - goal.nearPostHeight} />
            <line x1={goal.frontFar.left} y1={goal.frontFar.top - goal.farPostHeight} x2={goal.frontNear.left} y2={goal.frontNear.top - goal.nearPostHeight} />
          </g>
        ))}
      </svg>
      </div>
      <i className="stands-pitch-shot-flash" aria-hidden="true" />
      <i className="stands-pitch-shot-vignette" aria-hidden="true" />
    </div>
  );
}
