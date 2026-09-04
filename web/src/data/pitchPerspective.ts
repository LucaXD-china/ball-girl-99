// 看台视角（广播机位）投影：把 matchSpatial 的 2D 球场坐标 (x,y ∈ 0–100) 投到
// 带透视消失点的屏幕坐标。模型不变，只换渲染层。
//
// 模型坐标约定（见 matchSpatial.ts）：
//   x ∈ [0,100]  边线到边线（横向 / 触线方向）
//   y ∈ [0,100]  球门到球门（纵向），主队从 y=100 攻向 y=0（向上）
//
// 广播视角映射：
//   - 纵向（y，球门到球门）→ 屏幕横向：主队球门在左，对手球门在右，主队左攻右。
//   - 横向（x，触线到触线）→ 屏幕纵深：x=0 是远侧边线（靠近地平线），x=100 是近侧边线（靠近镜头）。

export type StandsPoint = {
  /** 屏幕横向位置，0–100 百分比（viewBox 与 CSS left 共用）。 */
  left: number;
  /** 屏幕纵向位置，0–100 百分比。 */
  top: number;
  /** 精灵缩放：近端 =1，远端 = farScale。 */
  scale: number;
  /** 纵深：0 远 … 1 近，用于 z 排序。 */
  depth: number;
};

export const STANDS_RIG = {
  /** 球场投影的屏幕横向中心；与 V3 露天球场底图的草坪中轴对齐。 */
  centerX: 53.5,
  /** 远侧边线（x=0）在屏幕上的纵向位置。 */
  horizon: 49.2,
  /** 近侧边线（x=100）在屏幕上的纵向位置。 */
  nearBottom: 81.2,
  /** 近侧边线的半宽：近侧边线横向跨度约为 centerX±halfWidth。 */
  halfWidth: 46.5,
  /** 远端精灵相对近端的尺寸比。 */
  farScale: 0.59,
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function projectToStands(x: number, y: number): StandsPoint {
  // u：纵向（球门到球门）→ 屏幕横向；主队从 y=100 攻向 y=0，即左 → 右。
  const u = (100 - y) / 100;
  const lateral = u * 2 - 1; // -1 主队球门（左） … 1 对手球门（右）
  const depth = clamp01(x / 100); // x 是触线到触线，作为纵深
  const scale = STANDS_RIG.farScale + (1 - STANDS_RIG.farScale) * depth;
  return {
    left: STANDS_RIG.centerX + lateral * STANDS_RIG.halfWidth * scale,
    top: STANDS_RIG.horizon + (STANDS_RIG.nearBottom - STANDS_RIG.horizon) * depth,
    scale,
    depth,
  };
}

export function pointString(point: StandsPoint): string {
  return `${point.left.toFixed(2)},${point.top.toFixed(2)}`;
}

// 把球场上的模型矩形投影成屏幕四边形（顶点按屏幕顺时针：左上→右上→右下→左下）。
export function projectRect(x0: number, y0: number, x1: number, y1: number): string {
  const a = projectToStands(x0, y1); // 远侧·主队球门端（屏幕左上）
  const b = projectToStands(x0, y0); // 远侧·对手球门端（屏幕右上）
  const c = projectToStands(x1, y0); // 近侧·对手球门端（屏幕右下）
  const d = projectToStands(x1, y1); // 近侧·主队球门端（屏幕左下）
  return `${pointString(a)} ${pointString(b)} ${pointString(c)} ${pointString(d)}`;
}

export type StandsField = {
  outline: string;
  halfway: { x1: number; y1: number; x2: number; y2: number };
  centerCircle: { cx: number; cy: number; rx: number; ry: number };
  centerSpot: { cx: number; cy: number; rx: number; ry: number };
  /** 两个禁区多边形：[主队禁区（左）, 对手禁区（右）]。 */
  penaltyAreas: [string, string];
  /** 两个球门：[主队球门（左）, 对手球门（右）]。 */
  goals: [string, string];
  goalFrames: [StandsGoalFrame, StandsGoalFrame];
};

export type StandsGoalFrame = {
  side: "home" | "away";
  frontFar: StandsPoint;
  frontNear: StandsPoint;
  backFar: StandsPoint;
  backNear: StandsPoint;
  farPostHeight: number;
  nearPostHeight: number;
};

/**
 * 把球门拆成门线与向场外延伸的后网四点。后网先画、门柱后画，
 * 足球便能进入网内但仍被前门框遮住。
 */
export function buildStandsGoal(side: "home" | "away"): StandsGoalFrame {
  const goalLineY = side === "home" ? 100 : 0;
  const backY = side === "home" ? 105 : -5;
  const frontFar = projectToStands(41, goalLineY);
  const frontNear = projectToStands(59, goalLineY);
  const backFar = projectToStands(41, backY);
  const backNear = projectToStands(59, backY);
  return {
    side,
    frontFar,
    frontNear,
    backFar,
    backNear,
    farPostHeight: 4.4 * frontFar.scale,
    nearPostHeight: 4.4 * frontNear.scale,
  };
}

export function buildStandsField(): StandsField {
  const halfwayFrom = projectToStands(0, 50);
  const halfwayTo = projectToStands(100, 50);

  const center = projectToStands(50, 50);
  // 中圈在模型坐标半径取 10（与俯视图 20% 直径一致）。屏幕横向对应模型 y，纵向对应模型 x。
  const centerEdgeHorizontal = projectToStands(50, 40);
  const centerEdgeNear = projectToStands(60, 50);
  const centerEdgeFar = projectToStands(40, 50);
  const rx = Math.abs(centerEdgeHorizontal.left - center.left);
  const ry = Math.abs(centerEdgeNear.top - centerEdgeFar.top) / 2;

  return {
    outline: projectRect(0, 0, 100, 100),
    halfway: { x1: halfwayFrom.left, y1: halfwayFrom.top, x2: halfwayTo.left, y2: halfwayTo.top },
    centerCircle: { cx: center.left, cy: center.top, rx, ry },
    centerSpot: { cx: center.left, cy: center.top, rx: rx * 0.09, ry: ry * 0.09 },
    penaltyAreas: [
      projectRect(26, 84, 74, 100), // 主队禁区（左）
      projectRect(26, 0, 74, 16), // 对手禁区（右）
    ],
    goals: [
      projectRect(41, 95, 59, 100), // 主队球门（左）
      projectRect(41, 0, 59, 5), // 对手球门（右）
    ],
    goalFrames: [buildStandsGoal("home"), buildStandsGoal("away")],
  };
}
