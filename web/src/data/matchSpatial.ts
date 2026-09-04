import { attackFormations, type FormationId, type Lineup, type MatchEvent } from "./matchSimulator";

// Pitch coordinates are percentages: x ∈ [0,100] left→right, y ∈ [0,100] top→bottom.
// Home attacks upward (toward y=0); away is a 180° rotation and attacks downward (toward y=100).

export type PitchPoint = { x: number; y: number };

export type PitchPlayerRole = "shooter" | "passer" | "keeper" | "defender" | "skill";

export type PitchPlayerState = {
  x: number;
  y: number;
  active?: PitchPlayerRole;
};

export type BallWaypoint = {
  x: number;
  y: number;
  mode: "idle" | "travel" | "shot" | "goal";
  /** 瞬移：不沿地面飞行，直接跳到该点（用于进球/半场后回到中圈重新开球）。 */
  teleport?: boolean;
  /** 瞬移前在原地的停顿时长（进球后的短暂停顿）。 */
  pauseMs?: number;
};

export type PitchFrame = {
  // 球的路径点序列：0 个表示无球参与（球停在原地），1 个表示单段，2 个表示「传球→射门」两段。
  ballPath: BallWaypoint[];
  players: Map<string, PitchPlayerState>;
};

// 球门半宽（x 方向，百分比）。用于区分进球（门内）、扑救（门将门内）、射偏（明显出界）。
const GOAL_MOUTH_HALF = 9;
// 进球落点越过门线进入网内；停顿单独占一个同点瞬移段，让球明确留在网窝中。
export const GOAL_NET_DEPTH = 3.5;
export const GOAL_NET_HOLD_MS = 560;

// 无球跑位参数（可调）：后场球员漂移小、前场球员漂移大，前锋多跑、后卫/门将更稳。
export const OFF_BALL_MIN_DRIFT = 2.5; // 后场（门将/中卫）基础漂移幅度
export const OFF_BALL_MAX_DRIFT = 6.5; // 前场（前锋/边锋）漂移幅度
export const SUPPORT_PULL = 0.22; // 持球方朝球接应的拉扯比例（0..1）

// 射门参数（可调）：射手贴近球门到合理距离再起脚，避免远距离草草射门。
export const SHOOTING_DISTANCE = 12; // 射门点距球门的合理距离（模型单位，约 12）
export const SHOOTING_DISTANCE_JITTER = 3; // 射门距离的浮动范围

function clamp(value: number, min = 2, max = 98) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

// Deterministic [0,1) noise so the animation replays identically for the same seed + event.
function noise01(seed: number, key: string, salt: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash = Math.imul(hash ^ (salt + 0x85ebca6b), 0x27d4eb2f) >>> 0;
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d) >>> 0;
  hash ^= hash >>> 12;
  return (hash >>> 0) / 4294967296;
}

export function buildPlayerPositions(args: {
  homeLineup: Lineup;
  awayLineup: Lineup;
  homeAttackFormationId: FormationId;
  awayAttackFormationId: FormationId;
}): Map<string, PitchPoint> {
  const positions = new Map<string, PitchPoint>();
  for (const slot of attackFormations[args.homeAttackFormationId].slots) {
    const playerId = args.homeLineup[slot.id];
    if (playerId) positions.set(playerId, { x: slot.x, y: slot.y });
  }
  for (const slot of attackFormations[args.awayAttackFormationId].slots) {
    const playerId = args.awayLineup[slot.id];
    if (playerId) positions.set(playerId, { x: 100 - slot.x, y: 100 - slot.y });
  }
  return positions;
}

// 找一个离中圈最近的球员上前踢球（开球 / 重开球共用）。
function moveKickerToCenter(players: Map<string, PitchPlayerState>, positions: Map<string, PitchPoint>) {
  let kickerId: string | null = null;
  let bestDistance = Infinity;
  for (const [playerId, point] of positions) {
    const distance = Math.hypot(point.x - 50, point.y - 50);
    if (distance < bestDistance) {
      bestDistance = distance;
      kickerId = playerId;
    }
  }
  if (kickerId) players.set(kickerId, { x: 50, y: 53, active: "shooter" });
}

export function deriveEventFrame(event: MatchEvent, positions: Map<string, PitchPoint>, seed: number, options?: { kicker?: boolean; homeIds?: Set<string> }): PitchFrame {
  const players = new Map<string, PitchPlayerState>();
  for (const [playerId, point] of positions) players.set(playerId, { ...point });

  // 无球跑位（基础漂移）：所有球员先离开固定站位，前场漂移大、后场漂移小，避免「站死」。
  // 事件直接涉及的球员随后会被 switch 覆盖，漂移只作用于无球者。
  if (options?.homeIds) {
    for (const [playerId, point] of positions) {
      const isHome = options.homeIds.has(playerId);
      const upfield = isHome ? (100 - point.y) / 100 : point.y / 100;
      const amplitude = OFF_BALL_MIN_DRIFT + (OFF_BALL_MAX_DRIFT - OFF_BALL_MIN_DRIFT) * upfield;
      const x = point.x + (noise01(seed, `${playerId}\u0000${event.id}`, 41) - 0.5) * 2 * amplitude;
      const y = point.y + (noise01(seed, `${playerId}\u0000${event.id}`, 42) - 0.5) * 2 * amplitude;
      players.set(playerId, { x: clamp(x), y: clamp(y) });
    }
  }

  const ballPath: BallWaypoint[] = [];
  const pointOf = (playerId?: string): PitchPoint | null => (playerId ? positions.get(playerId) ?? null : null);

  const move = (playerId: string | undefined, x: number, y: number, active?: PitchPlayerRole) => {
    if (!playerId || !positions.has(playerId)) return;
    players.set(playerId, { x: clamp(x), y: clamp(y), active });
  };

  const attackingGoal = (side: "home" | "away"): PitchPoint => (side === "home" ? { x: 50, y: 3 } : { x: 50, y: 97 });
  const attackDirection = (side: "home" | "away"): number => (side === "home" ? -1 : 1);

  switch (event.kind) {
    case "kickoff": {
      ballPath.push({ x: 50, y: 50, mode: "idle" });
      moveKickerToCenter(players, positions);
      break;
    }

    case "extra-time-start": {
      // 加时赛开球：球瞬移回中圈（不沿地面滚回）。
      ballPath.push({ x: 50, y: 50, mode: "idle", teleport: true, pauseMs: RESTART_PAUSE_MS });
      moveKickerToCenter(players, positions);
      break;
    }

    case "build-up":
    case "duel":
    case "transition": {
      const player = pointOf(event.playerId);
      if (player) {
        const direction = attackDirection(event.side === "away" ? "away" : "home");
        const jitter = (noise01(seed, event.id, 1) - 0.5) * 4;
        move(event.playerId, player.x + jitter, player.y + direction * 3.5);
        if (!event.offBall) {
          ballPath.push({ x: clamp(player.x + jitter * 0.6), y: clamp(player.y + direction * 2.2), mode: "travel" });
        }
      }
      break;
    }

    case "goal":
    case "save":
    case "miss": {
      const side = event.side === "away" ? "away" : "home";
      const goal = attackingGoal(side);
      const direction = attackDirection(side);
      const shooter = pointOf(event.shooterId ?? event.scorerId);
      const passer = pointOf(event.creatorId ?? event.assistId);
      const keeper = pointOf(event.keeperId);
      const defender = pointOf(event.defenderId);

      if (passer && shooter) {
        move(event.creatorId ?? event.assistId, lerp(passer.x, shooter.x, 0.45), lerp(passer.y, shooter.y, 0.34), "passer");
      }
      // 射手贴近球门到合理距离再起脚（距离带少量浮动），避免远距离草草射门。
      const shootDistance = SHOOTING_DISTANCE + (noise01(seed, event.id, 20) - 0.5) * 2 * SHOOTING_DISTANCE_JITTER;
      const shooterReceive: PitchPoint | null = shooter
        ? { x: clamp(lerp(shooter.x, goal.x, 0.5)), y: clamp(goal.y - direction * shootDistance) }
        : null;
      if (shooter) move(event.shooterId ?? event.scorerId, shooterReceive!.x, shooterReceive!.y, "shooter");
      if (defender && shooter) {
        move(event.defenderId, lerp(defender.x, shooter.x, 0.5), lerp(defender.y, shooter.y, 0.42), "defender");
      }
      const roll = noise01(seed, event.id, 11);
      if (event.kind === "goal") {
        // 进球：门将也朝来球扑出（球更快/更刁钻，擦着门将入网），不「卧底」。
        const target: PitchPoint = { x: clamp(goal.x + (roll - 0.5) * (GOAL_MOUTH_HALF - 2)), y: side === "home" ? -GOAL_NET_DEPTH : 100 + GOAL_NET_DEPTH };
        if (keeper) {
          move(event.keeperId, lerp(keeper.x, target.x, 0.6), lerp(keeper.y, goal.y, 0.55), "keeper");
        }
        if (shooterReceive) ballPath.push({ ...shooterReceive, mode: "travel" });
        ballPath.push({ ...target, mode: "goal" });
        ballPath.push({ ...target, mode: "goal", teleport: true, pauseMs: GOAL_NET_HOLD_MS });
      } else if (event.kind === "save") {
        // 扑救：门将扑向扑救点接住球。
        const stop = keeper ?? goal;
        const savePoint: PitchPoint = { x: clamp(stop.x + (roll - 0.5) * (GOAL_MOUTH_HALF - 3)), y: stop.y };
        if (keeper) move(event.keeperId, savePoint.x, savePoint.y, "keeper");
        if (shooterReceive) ballPath.push({ ...shooterReceive, mode: "travel" });
        ballPath.push({ ...savePoint, mode: "shot" });
        // 门将扑救后把球传给队友（后卫），让球停在球员脚下而不是空处。
        if (keeper && event.defenderId) {
          const receiver = players.get(event.defenderId);
          if (receiver) ballPath.push({ x: receiver.x, y: receiver.y, mode: "travel" });
        }
      } else {
        // 射偏：球明显飞出球门范围（门柱之外），门将移动过去把球抱住。
        const wide = roll < 0.5 ? -1 : 1;
        const collectX = clamp(goal.x + wide * (GOAL_MOUTH_HALF + 10 + noise01(seed, event.id, 13) * 10));
        const collectY = keeper?.y ?? goal.y;
        if (keeper) move(event.keeperId, collectX, collectY, "keeper");
        if (shooterReceive) ballPath.push({ ...shooterReceive, mode: "travel" });
        ballPath.push({ x: collectX, y: collectY, mode: "shot" });
        // 门将抱住球后把球传给队友（后卫），让球停在球员脚下而不是空处。
        if (keeper && event.defenderId) {
          const receiver = players.get(event.defenderId);
          if (receiver) ballPath.push({ x: receiver.x, y: receiver.y, mode: "travel" });
        }
      }
      break;
    }

    case "penalty-goal":
    case "penalty-save":
    case "penalty-miss": {
      const side = event.side === "away" ? "away" : "home";
      const goal = attackingGoal(side);
      const spot = side === "home" ? { x: 50, y: 12 } : { x: 50, y: 88 };
      const taker = pointOf(event.takerId);
      const keeper = pointOf(event.keeperId);
      if (taker) move(event.takerId, spot.x, spot.y, "shooter");
      if (keeper) move(event.keeperId, keeper.x, keeper.y, "keeper");
      // 点球：其他球员退到中线附近，各自队站一边，形成门将单挑的点球场面。
      if (options?.homeIds) {
        for (const [playerId, point] of positions) {
          if (playerId === event.takerId || playerId === event.keeperId) continue;
          const isHome = options.homeIds.has(playerId);
          players.set(playerId, { x: 50 + (point.x - 50) * 0.5, y: isHome ? 55 : 45 });
        }
      }
      const roll = noise01(seed, event.id, 5);
      // 点球：球先瞬移到点球点并停顿，再由主罚者起脚。
      ballPath.push({ x: spot.x, y: spot.y, mode: "travel", teleport: true, pauseMs: PENALTY_PLACE_PAUSE_MS });
      if (event.kind === "penalty-goal") {
        const target = { x: clamp(goal.x + (roll - 0.5) * (GOAL_MOUTH_HALF - 2)), y: side === "home" ? -GOAL_NET_DEPTH : 100 + GOAL_NET_DEPTH };
        ballPath.push({ ...target, mode: "goal" });
        ballPath.push({ ...target, mode: "goal", teleport: true, pauseMs: GOAL_NET_HOLD_MS });
      } else if (event.kind === "penalty-save") {
        const stop = keeper ?? goal;
        ballPath.push({ x: clamp(stop.x + (roll - 0.5) * (GOAL_MOUTH_HALF - 3)), y: stop.y, mode: "shot" });
      } else {
        const wide = roll < 0.5 ? -1 : 1;
        const collectX = clamp(goal.x + wide * (GOAL_MOUTH_HALF + 10 + noise01(seed, event.id, 6) * 10));
        const collectY = keeper?.y ?? goal.y;
        if (keeper) move(event.keeperId, collectX, collectY, "keeper");
        ballPath.push({ x: collectX, y: collectY, mode: "shot" });
      }
      break;
    }

    case "halftime":
    case "fulltime":
    case "extra-time-break":
    case "extra-time-end":
    case "penalty-start":
    case "penalty-end":
    default:
      // 球停在原地，不吸附到中场。
      break;
  }

  // 重开球（进球后）：也安排一名球员上前踢球。
  if (options?.kicker && event.kind !== "kickoff" && event.kind !== "extra-time-start") {
    moveKickerToCenter(players, positions);
  }

  if (event.skillId && event.playerId && players.has(event.playerId)) {
    const skillState = players.get(event.playerId)!;
    const isDefensiveSkill = event.playerId === event.defenderId || event.playerId === event.keeperId;

    if (isDefensiveSkill) {
      // 防守型技能：球不停在防守球员脚下；后卫向球追去，门将保持扑救，仅高亮。
      if (event.playerId === event.defenderId && ballPath[0]) {
        const target = ballPath[0];
        players.set(event.playerId, {
          x: lerp(skillState.x, target.x, 0.55),
          y: lerp(skillState.y, target.y, 0.55),
          active: "skill",
        });
      } else {
        players.set(event.playerId, { ...skillState, active: "skill" });
      }
    } else {
      // 进攻型技能：球先停在发动者脚下，和立绘切图对应，避免露馅。
      players.set(event.playerId, { ...skillState, active: "skill" });
      const first = ballPath[0];
      if (!first || first.x !== skillState.x || first.y !== skillState.y) {
        ballPath.unshift({ x: skillState.x, y: skillState.y, mode: "idle" });
      }
    }
  }

  // 无球跑位（接应）：持球方未被事件锁定的球员朝球靠拢，制造接应点。
  // 点球事件已把非参与球员排到中线两侧，跳过接应以免破坏点球站位。
  if (options?.homeIds) {
    const isPenalty = event.kind === "penalty-goal" || event.kind === "penalty-save" || event.kind === "penalty-miss";
    if (!isPenalty) {
      const ballRef = ballPath[0] ?? null;
      if (ballRef) {
        for (const [playerId, state] of players) {
          if (state.active) continue;
          const isHome = options.homeIds.has(playerId);
          const possessing = (event.side === "home" && isHome) || (event.side === "away" && !isHome);
          if (!possessing) continue;
          players.set(playerId, {
            x: clamp(lerp(state.x, ballRef.x, SUPPORT_PULL)),
            y: clamp(lerp(state.y, ballRef.y, SUPPORT_PULL)),
          });
        }
      }
    }
  }

  return { ballPath, players };
}

// 单段飞行时长：随距离线性增长，短传快、长传慢。基数放高，让球更从容、不赶工。
export function segmentMs(distance: number): number {
  return 240 + distance * 8;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// 弧线参数（按「屏幕距离」判断，单位与投影坐标一致 0–100）：
// 看着近就贴地短传，看着远才起长传，不再用模型距离（会因透视压缩显得随机）。
export const PASS_ARC_DEAD_ZONE = 14; // 屏幕距离 ≤ 该值完全贴地（短传）
export const PASS_ARC_FULL_DISTANCE = 42; // 屏幕距离 ≥ 该值满弧（长传）
export const SHOT_ARC_DEAD_ZONE = 8; // 近距离射门贴地
export const SHOT_ARC_FULL_DISTANCE = 30; // 远射满弧
export const SHOT_ARC_MAX = 0.5; // 射门最大弧线（低于长传）

export function segmentArcFactor(mode: BallWaypoint["mode"], distance: number): number {
  if (mode === "travel") return clamp01((distance - PASS_ARC_DEAD_ZONE) / (PASS_ARC_FULL_DISTANCE - PASS_ARC_DEAD_ZONE));
  if (mode === "shot" || mode === "goal") return SHOT_ARC_MAX * clamp01((distance - SHOT_ARC_DEAD_ZONE) / (SHOT_ARC_FULL_DISTANCE - SHOT_ARC_DEAD_ZONE));
  return 0;
}

export type MatchTimelineEntry = {
  event: MatchEvent;
  startMs: number;
  durationMs: number;
  ballPath: BallWaypoint[];
  // 每个路径点的飞行时长（已按事件时长缩放，确保球铺满事件、无停顿）。
  segmentDurations: number[];
  // 该事件是否需要「开球者」（进球后的重开球为 true）。
  kickoff?: boolean;
};

// 每个事件在文字直播里的最短停留时长：放宽到约 1.2 秒，让比赛从容、不赶工。
export const MIN_EVENT_MS = 1200;
// 射门需要留出角色出脚与门将扑救的可读窗口，不能和短传一样一闪而过。
export const MIN_SHOT_FLIGHT_MS = 650;

// 进球/半场后重新开球前，球在球门处短暂停顿，再瞬移回中圈（不沿地面飞回）。
export const RESTART_PAUSE_MS = 650;
// 点球前，球瞬移到点球点并短暂停顿，再让主罚者起脚。
export const PENALTY_PLACE_PAUSE_MS = 500;

// 找下一个有球的接球点（跳过无球填充事件），供开球 / 重开球确定传球对象。
function firstReceiver(events: MatchEvent[], fromIndex: number, positions: Map<string, PitchPoint>, seed: number): BallWaypoint | null {
  for (let index = fromIndex; index < events.length; index += 1) {
    const first = deriveEventFrame(events[index], positions, seed).ballPath[0];
    if (first) return first;
  }
  return null;
}

// 生成整场比赛「事件对齐」的时间线：每个事件占一段，球在其内连续飞行，
// 事件时长 = max(最小可读时长, 自然飞行时长)。进球后下一个事件先回到中圈重新开球。
export function buildMatchTimeline(events: MatchEvent[], positions: Map<string, PitchPoint>, seed: number): MatchTimelineEntry[] {
  const entries: MatchTimelineEntry[] = [];
  let ballPos: PitchPoint = { x: 50, y: 50 };
  let cumulative = 0;
  let previousRestart: "goal" | "break" | null = null;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    let path = deriveEventFrame(event, positions, seed).ballPath;
    const isTerminal = event.kind === "fulltime" || event.kind === "extra-time-end" || event.kind === "penalty-end";
    const isReKickoff = previousRestart !== null && !isTerminal;
    if (isReKickoff) {
      // 进球/半场后：先在原处停顿，再瞬移回中圈重新开球（不再贴地飞回中圈）。
      path = [{ x: 50, y: 50, mode: "idle" as const, teleport: true, pauseMs: RESTART_PAUSE_MS }, ...path];
    }
    // 开球 / 重开球：并入下一个有球事件的接球点，形成「中圈 → 队友」的踢球动作，
    // 避免球停在原地、开球者走开后球自己飞到队友脚下（跳过无球填充事件）。
    if ((event.kind === "kickoff" || event.kind === "extra-time-start" || isReKickoff) && path.length <= 1) {
      const receiver = firstReceiver(events, index + 1, positions, seed);
      if (receiver) path = [...path, { ...receiver, mode: "travel" as const }];
    }
    previousRestart = event.kind === "goal" ? "goal" : event.kind === "halftime" || event.kind === "extra-time-break" ? "break" : null;

    // 无球填充事件：给球一个微小漂移，让球保持「活着」（轻微滚动/控球），
    // 而不是完全冻结——此时球员 token 和文字仍在继续，球完全静止会很突兀。
    if (path.length === 0 && event.offBall) {
      path = [{ x: clamp(ballPos.x + (noise01(seed, event.id, 30) - 0.5) * 5), y: clamp(ballPos.y + (noise01(seed, event.id, 31) - 0.5) * 5), mode: "travel" }];
    }

    const baseDurations: number[] = [];
    let flightMs = 0;
    let from = ballPos;
    for (const waypoint of path) {
      if (waypoint.teleport) {
        // 瞬移段不飞行：时长为瞬移前停顿。
        baseDurations.push(waypoint.pauseMs ?? 0);
        flightMs += waypoint.pauseMs ?? 0;
      } else {
        const distance = Math.hypot(waypoint.x - from.x, waypoint.y - from.y);
        const naturalDuration = segmentMs(distance);
        const duration = waypoint.mode === "shot" || waypoint.mode === "goal"
          ? Math.max(naturalDuration, MIN_SHOT_FLIGHT_MS)
          : naturalDuration;
        baseDurations.push(duration);
        flightMs += duration;
      }
      from = waypoint;
    }
    const isPenalty = event.kind === "penalty-goal" || event.kind === "penalty-save" || event.kind === "penalty-miss";
    const minDuration = isPenalty ? MIN_EVENT_MS * 1.6 : MIN_EVENT_MS;
    const durationMs = Math.max(minDuration, flightMs);
    // 球按自然距离时长铺满整个事件（不压缩），配合「文字延迟一拍」实现球先到、结果再报。
    const scale = flightMs > 0 ? durationMs / flightMs : 1;
    const segmentDurations = baseDurations.map((duration) => duration * scale);

    entries.push({ event, startMs: cumulative, durationMs, ballPath: path, segmentDurations, kickoff: isReKickoff });
    cumulative += durationMs;
    if (path.length) ballPos = path[path.length - 1];
  }
  return entries;
}
