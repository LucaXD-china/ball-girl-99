import { useEffect, useState } from "react";

// V3 使用由透明 PNG 母版生成的 WebP；原程序化 SVG 仅在资源加载失败时兜底。

export type ChibiAction = "idle" | "pass" | "shoot" | "tackle" | "save";
export type ChibiExpression = "calm" | "effort";
export type ChibiSpriteFamily =
  | "saya"
  | "field-home"
  | "field-away"
  | "field-blue"
  | "field-skyblue"
  | "field-yellow"
  | "field-green"
  | "keeper"
  | "irena"
  | "naya"
  | "harriet"
  | "elodie"
  | "klara"
  | "lucia"
  | "luz"
  | "acosta"
  | "akari"
  | "giulia";

export const CHIBI_SAYA_ID = "founder_sakura_link_4";
const FIELD_ACTIONS = new Set<ChibiAction>(["idle", "pass", "shoot", "tackle"]);

// 额外拥有专属 chibi 动作小人的角色（御三家其余两位 + 八位六星）。
const CUSTOM_CHIBI_FAMILY: Record<string, string> = {
  founder_scarlet_toros_6: "irena",
  founder_samba_union_7: "naya",
  fog_harriet_wren: "harriet",
  rose_elodie_beaumont: "elodie",
  rhein_klara_neumann: "klara",
  sol_lucia_montoro: "lucia",
  gold_vitoria_luz: "luz",
  silver_sofia_acosta: "acosta",
  sakura_akari_fujimoto: "akari",
  azure_giulia_bellini: "giulia", // 门将，走 keeper 姿态（idle/save）
};

// 客队通用场员可按对手俱乐部选色。field-home(红)=我方；away(白)/blue/skyblue/yellow/green=对手。
const AWAY_KIT_DEFAULT: ChibiSpriteFamily = "field-away";
/** 通用场员各色组的兜底 SVG 球衣色（仅在图片加载失败时使用）。 */
export const AWAY_KIT_COLORS: Partial<Record<ChibiSpriteFamily, string>> = {
  "field-away": "#f5f6f3",
  "field-blue": "#1f4fa8",
  "field-skyblue": "#4b9fe1",
  "field-yellow": "#f2c230",
  "field-green": "#0b7d43",
  "field-home": "#d94141",
};

/** 客队通用场员的 chibi 素材组：按对手俱乐部定色；未知俱乐部默认白色。 */
export function chibiKitFamilyForOpponent(clubId: string): ChibiSpriteFamily {
  switch (clubId) {
    case "lumiere_crown":
    case "crimson_mosaic":
    case "indigo_serpents":
      return "field-blue";
    case "blue_moon_lab":
    case "azure_gulf":
      return "field-skyblue";
    case "ruhr_swarm":
      return "field-yellow";
    case "emerald_lions":
      return "field-green";
    default:
      return AWAY_KIT_DEFAULT;
  }
}

export function chibiSpriteFamily(side: "home" | "away", playerId: string, goalkeeper = false, awayKitFamily: ChibiSpriteFamily = AWAY_KIT_DEFAULT): ChibiSpriteFamily {
  if (playerId === CHIBI_SAYA_ID) return "saya";
  const custom = CUSTOM_CHIBI_FAMILY[playerId];
  // 六星门将拥有自己的 idle/save 素材；其余实际出任 GK 的球员使用通用门将素材。
  if (goalkeeper && custom === "giulia") return "giulia";
  if (goalkeeper) return "keeper";
  if (custom) return custom as ChibiSpriteFamily;
  if (side === "home") return "field-home";
  return awayKitFamily;
}

/** 该球员是否有专属 chibi 动作小人（而非回退到全身立绘 / 通用占位）。 */
export function isCustomChibiPlayer(playerId: string): boolean {
  return playerId === CHIBI_SAYA_ID || playerId in CUSTOM_CHIBI_FAMILY;
}

export function chibiSpriteAction(action: ChibiAction, goalkeeper = false): ChibiAction {
  if (goalkeeper) return action === "save" ? "save" : "idle";
  return FIELD_ACTIONS.has(action) ? action : "idle";
}

export function chibiSpriteUrl(side: "home" | "away", playerId: string, action: ChibiAction, goalkeeper = false, awayKitFamily: ChibiSpriteFamily = AWAY_KIT_DEFAULT): string {
  const family = chibiSpriteFamily(side, playerId, goalkeeper, awayKitFamily);
  const spriteAction = chibiSpriteAction(action, goalkeeper);
  return `/assets/characters/match-chibi-v3/${family}-${spriteAction}.webp`;
}

// 场景 → 表情映射：默认/传球/射门用「坚定冷静」，铲断/扑救用「闭眼努力」。
export function expressionForAction(action: ChibiAction): ChibiExpression {
  if (action === "tackle" || action === "save") return "effort";
  return "calm";
}

type Props = {
  side: "home" | "away";
  playerId: string;
  action?: ChibiAction;
  /** 门将用独立配色 + 手套，便于区分。 */
  goalkeeper?: boolean;
  /** 客队通用场员的球衣色组（我方恒为主队红色；对手按俱乐部色）。 */
  awayKitFamily?: ChibiSpriteFamily;
  /** 本场资源超时后强制使用不依赖图片的简化形象。 */
  forceFallback?: boolean;
};

const HAIR_COLORS = ["#2b2620", "#5b3a24", "#c98d4b", "#1f2733", "#7a4a2b", "#3a3f4a"];
const SKIN_COLORS = ["#ffe0c2", "#f3c19b", "#e8a97c"];
const GK_KIT = "#f2a33c"; // 门将独立配色（橙），区别于主红/客白
const GLOVE = "#f0f0ee"; // 门将手套

type Point = { x: number; y: number };
type Limb = { from: Point; to: Point };

type Pose = {
  /** 躯干 + 四肢整体倾斜角度（绕髋部），用于铲断/扑救的低姿。 */
  bodyRotate: number;
  frontLeg: Limb;
  backLeg: Limb;
  frontArm: Limb;
  backArm: Limb;
};

// 所有动作朝「右侧」画（主队从左攻右），客队由 CSS scaleX(-1) 镜像到朝左。
const POSES: Record<ChibiAction, Pose> = {
  idle: {
    bodyRotate: 0,
    backLeg: { from: { x: 9.7, y: 29 }, to: { x: 9.7, y: 36 } },
    frontLeg: { from: { x: 14.3, y: 29 }, to: { x: 14.3, y: 36 } },
    backArm: { from: { x: 9, y: 20.5 }, to: { x: 8.3, y: 24.5 } },
    frontArm: { from: { x: 15, y: 20.5 }, to: { x: 15.7, y: 24.5 } },
  },
  pass: {
    bodyRotate: -6,
    backLeg: { from: { x: 9.7, y: 29 }, to: { x: 9.7, y: 36 } },
    frontLeg: { from: { x: 14.3, y: 29 }, to: { x: 20, y: 30.5 } },
    backArm: { from: { x: 9, y: 20.5 }, to: { x: 5.5, y: 22 } },
    frontArm: { from: { x: 15, y: 20.5 }, to: { x: 18.5, y: 24 } },
  },
  shoot: {
    bodyRotate: -12,
    backLeg: { from: { x: 9.7, y: 29 }, to: { x: 9.7, y: 36 } },
    frontLeg: { from: { x: 14.3, y: 29 }, to: { x: 21, y: 26 } },
    backArm: { from: { x: 9, y: 20.5 }, to: { x: 4.5, y: 21 } },
    frontArm: { from: { x: 15, y: 20.5 }, to: { x: 20, y: 22.5 } },
  },
  tackle: {
    bodyRotate: -55,
    backLeg: { from: { x: 9.7, y: 29 }, to: { x: 7, y: 31 } },
    frontLeg: { from: { x: 14.3, y: 29 }, to: { x: 22, y: 33 } },
    backArm: { from: { x: 9, y: 20.5 }, to: { x: 5, y: 23 } },
    frontArm: { from: { x: 15, y: 20.5 }, to: { x: 20, y: 24 } },
  },
  save: {
    bodyRotate: -70,
    backLeg: { from: { x: 9.7, y: 29 }, to: { x: 4, y: 29 } },
    frontLeg: { from: { x: 14.3, y: 29 }, to: { x: 6, y: 31 } },
    backArm: { from: { x: 9, y: 20.5 }, to: { x: 14, y: 15 } },
    frontArm: { from: { x: 15, y: 20.5 }, to: { x: 21, y: 17 } },
  },
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function limbLine(limb: Limb, stroke: string, width: number, key: string) {
  return (
    <line
      key={key}
      x1={limb.from.x}
      y1={limb.from.y}
      x2={limb.to.x}
      y2={limb.to.y}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

// 两种表情只改眉眼嘴（头型/发型不变）。头圆心 (12, 13.4)、半径 6。
function renderFace(expression: ChibiExpression) {
  const ink = "#3a2f2a";
  if (expression === "effort") {
    return (
      <>
        {/* 闭眼努力：眼成短横线（紧闭），嘴张开发力 */}
        <line x1="9.3" y1="13.6" x2="10.9" y2="13.6" stroke={ink} strokeWidth="0.7" strokeLinecap="round" />
        <line x1="13.1" y1="13.6" x2="14.7" y2="13.6" stroke={ink} strokeWidth="0.7" strokeLinecap="round" />
        <ellipse cx="12" cy="16.4" rx="1" ry="1.2" fill={ink} />
      </>
    );
  }
  return (
    <>
      {/* 坚定冷静：眼成圆点（睁眼），嘴成短线 */}
      <circle cx="10.1" cy="13.6" r="0.9" fill={ink} />
      <circle cx="13.9" cy="13.6" r="0.9" fill={ink} />
      <line x1="11" y1="16.3" x2="13" y2="16.3" stroke={ink} strokeWidth="0.6" strokeLinecap="round" />
    </>
  );
}

export function ChibiFigure({ side, playerId, action = "idle", goalkeeper = false, awayKitFamily = AWAY_KIT_DEFAULT, forceFallback = false }: Props) {
  const spriteUrl = chibiSpriteUrl(side, playerId, action, goalkeeper, awayKitFamily);
  const [spriteFailed, setSpriteFailed] = useState(false);

  useEffect(() => setSpriteFailed(false), [spriteUrl]);
  if (!spriteFailed && !forceFallback) {
    return (
      <span className={`chibi-sprite-figure is-${action}${side === "away" ? " is-away" : ""}`} aria-hidden="true">
        <img
          className="chibi-sprite-image"
          src={spriteUrl}
          alt=""
          draggable={false}
          onError={() => setSpriteFailed(true)}
        />
      </span>
    );
  }

  const hash = hashString(playerId);
  const hair = HAIR_COLORS[hash % HAIR_COLORS.length];
  const skin = SKIN_COLORS[(hash >> 3) % SKIN_COLORS.length];
  const isHome = side === "home";
  const awayColor = AWAY_KIT_COLORS[awayKitFamily] ?? "#f5f6f3";
  const kit = goalkeeper ? GK_KIT : isHome ? "#d94141" : awayColor; // 门将橙 / 我方红 / 对手色
  const accent = goalkeeper ? "#6b2f10" : isHome ? "#f5f6f3" : awayColor === "#f5f6f3" || awayColor === "#f2c230" ? "#2a1c10" : "#f5f6f3"; // 反色点缀
  const outline = "rgba(18, 28, 22, 0.55)";
  const pose = POSES[action];
  const expression = expressionForAction(action);

  return (
    <svg className={`stands-player-chibi is-${action} is-${expression}`} viewBox="0 0 24 36" aria-hidden="true">
      <g transform={`rotate(${pose.bodyRotate} 12 30)`}>
        {limbLine(pose.backLeg, kit, 2.6, "back-leg")}
        {limbLine(pose.frontLeg, kit, 2.6, "front-leg")}
        <rect x="7.4" y="28.4" width="9.2" height="2.8" rx="1.1" fill={kit} stroke={outline} strokeWidth="0.5" />
        <path d="M7.6 19.6 h8.8 v9.2 h-8.8 z" fill={kit} stroke={outline} strokeWidth="0.6" strokeLinejoin="round" />
        {limbLine(pose.backArm, kit, 2.2, "back-arm")}
        {limbLine(pose.frontArm, kit, 2.2, "front-arm")}
        {goalkeeper ? <>
          <circle cx={pose.backArm.to.x} cy={pose.backArm.to.y} r="1.3" fill={GLOVE} stroke={outline} strokeWidth="0.4" />
          <circle cx={pose.frontArm.to.x} cy={pose.frontArm.to.y} r="1.3" fill={GLOVE} stroke={outline} strokeWidth="0.4" />
        </> : null}
        <circle cx="12" cy="23.6" r="1.3" fill={accent} />
      </g>
      {/* 头（不随身体倾斜，保持可读） */}
      <circle cx="12" cy="10.8" r="6.9" fill={hair} />
      <circle cx="12" cy="13.4" r="6" fill={skin} />
      {renderFace(expression)}
    </svg>
  );
}
