import type { Character } from "./gameData";

export type SkillQuality = "white" | "blue" | "purple" | "gold" | "rainbow";
export type SkillCategory = "technique" | "movement" | "tactics" | "special";
export type SkillEffect = {
  attack?: number;
  defense?: number;
  xg?: number;
  save?: number;
};

export type ConfigurableSkill = {
  id: string;
  name: string;
  quality: SkillQuality;
  category: SkillCategory;
  positions: string[];
  trigger: string;
  description: string;
  effect: SkillEffect;
};

export const skillQualityRank: Record<SkillQuality, number> = {
  white: 1,
  blue: 2,
  purple: 3,
  gold: 4,
  rainbow: 5,
};

export const skillQualityMeta: Record<SkillQuality, { name: string; color: string; researchCost: number }> = {
  white: { name: "白", color: "#d9dfdc", researchCost: 2 },
  blue: { name: "蓝", color: "#58a9ee", researchCost: 6 },
  purple: { name: "紫", color: "#9c72e8", researchCost: 16 },
  gold: { name: "金", color: "#d8a83e", researchCost: 36 },
  rainbow: { name: "彩", color: "#ed77b8", researchCost: 80 },
};

export const skillCategoryMeta: Record<SkillCategory, string> = {
  technique: "技术",
  movement: "跑位",
  tactics: "战术",
  special: "特殊",
};

export const configurableSkills: ConfigurableSkill[] = [
  { id: "steady_touch", name: "稳健触球", quality: "white", category: "technique", positions: ["OUTFIELD"], trigger: "接到普通传球时", description: "稍微改善第一脚处理，减少仓促丢球。", effect: { attack: 0.35 } },
  { id: "quick_start", name: "快速启动", quality: "white", category: "movement", positions: ["OUTFIELD"], trigger: "由守转攻开始时", description: "更快进入接应线路，提供轻微推进帮助。", effect: { attack: 0.35 } },
  { id: "basic_handling", name: "基础手型", quality: "white", category: "technique", positions: ["GK"], trigger: "面对常规射门时", description: "提高处理常规射门的稳定性。", effect: { defense: 0.45, save: 0.01 } },
  { id: "wide_support", name: "边路接应", quality: "blue", category: "movement", positions: ["LB", "RB", "LM", "RM", "LW", "RW"], trigger: "球队从中路向边侧转移时", description: "更早进入边路传球线路并改善推进。", effect: { attack: 0.8, xg: 0.006 } },
  { id: "first_time_finish", name: "第一脚终结", quality: "blue", category: "technique", positions: ["ST", "CF", "LW", "RW", "CAM"], trigger: "在禁区附近直接接到传球时", description: "减少调整动作并改善低质量射门。", effect: { attack: 0.65, xg: 0.012 } },
  { id: "press_escape", name: "破压接应", quality: "blue", category: "tactics", positions: ["CDM", "CM", "CAM", "LM", "RM"], trigger: "中场接球遭遇压迫时", description: "通过提前观察提高中场推进稳定性。", effect: { attack: 0.9 } },
  { id: "compact_shape", name: "紧凑站位", quality: "blue", category: "tactics", positions: ["CB", "LB", "RB", "CDM"], trigger: "对手进入本方防守三区时", description: "缩短防线间距，改善封堵和二点保护。", effect: { defense: 0.9 } },
  { id: "set_reaction", name: "预备反应", quality: "blue", category: "movement", positions: ["GK"], trigger: "射门者完成最后一次触球时", description: "提前调整重心，提高扑救准备质量。", effect: { defense: 1, save: 0.018 } },
  { id: "weak_side_burst", name: "弱侧突袭", quality: "purple", category: "movement", positions: ["LM", "RM", "LW", "RW", "ST"], trigger: "球权从另一侧进入进攻三区时", description: "增加弱侧无球接应，并提高直接形成射门的概率。", effect: { attack: 1.45, xg: 0.018 } },
  { id: "tempo_release", name: "节奏释放", quality: "purple", category: "tactics", positions: ["CDM", "CM", "CAM"], trigger: "球队连续完成中场传递后", description: "将稳定控球转化为一次更高质量的向前传递。", effect: { attack: 1.6, xg: 0.01 } },
  { id: "front_foot_intercept", name: "主动截断", quality: "purple", category: "technique", positions: ["CB", "LB", "RB", "CDM"], trigger: "对手背身接球或准备转身时", description: "提高提前上抢质量，并削弱随后的射门空间。", effect: { defense: 1.65 } },
  { id: "reflex_chain", name: "连续反应", quality: "purple", category: "special", positions: ["GK"], trigger: "扑救后仍有二点球威胁时", description: "改善第一次扑救后的再次起身与封堵。", effect: { defense: 1.4, save: 0.026 } },
  { id: "box_predator", name: "禁区猎手", quality: "gold", category: "technique", positions: ["ST", "CF", "LW", "RW"], trigger: "在禁区内获得射门窗口时", description: "先改善接球方向，再提高终结质量。", effect: { attack: 2.2, xg: 0.032 } },
  { id: "transition_conductor", name: "转换指挥", quality: "gold", category: "tactics", positions: ["CDM", "CM", "CAM"], trigger: "球队夺回球权并准备第一次向前传递时", description: "稳定第一脚并为第二次推进创造更清晰的线路。", effect: { attack: 2.3, xg: 0.018 } },
  { id: "aerial_wall", name: "制空壁垒", quality: "gold", category: "special", positions: ["CB", "GK"], trigger: "高球进入禁区时", description: "连续影响争顶和二点球保护。", effect: { defense: 2.35, save: 0.014 } },
  { id: "silent_corridor", name: "无声走廊", quality: "rainbow", category: "special", positions: ["LM", "RM", "LW", "RW"], trigger: "球队拉开宽度且弱侧无人贴防时", description: "把一次弱侧跑动转化为突破与终结相连的机会链。", effect: { attack: 3.1, xg: 0.045 } },
  { id: "midfield_clock", name: "永动节拍", quality: "rainbow", category: "special", positions: ["CM", "CAM", "CDM"], trigger: "球队连续控制中场并完成第三次向前接应时", description: "改变本回合节奏，使创造者和终结者获得连贯机会。", effect: { attack: 3.2, xg: 0.03 } },
  { id: "last_line_oath", name: "最后防线", quality: "rainbow", category: "special", positions: ["CB", "GK"], trigger: "对手形成禁区内绝佳机会时", description: "在最危险阶段同时提高封堵和扑救成功率。", effect: { defense: 3.25, save: 0.04 } },
  { id: "box_verdict", name: "禁区裁决", quality: "rainbow", category: "special", positions: ["ST", "CF"], trigger: "在禁区内形成关键射门窗口时", description: "降低防守干扰，并把关键机会转化为更稳定的终结。", effect: { attack: 3.3, xg: 0.05 } },
];

export const skillsById = new Map(configurableSkills.map((skill) => [skill.id, skill]));

export const defaultSpecialSkillIds: Readonly<Record<string, string>> = {
  azure_giulia_bellini: "last_line_oath",
  fog_harriet_wren: "box_verdict",
  rose_elodie_beaumont: "silent_corridor",
  rhein_klara_neumann: "midfield_clock",
  silver_sofia_acosta: "midfield_clock",
  sakura_akari_fujimoto: "midfield_clock",
  gold_vitoria_luz: "silent_corridor",
  sol_lucia_montoro: "midfield_clock",
  azure_chiara_conti: "transition_conductor",
  azure_alessia_romano: "aerial_wall",
  fog_eleanor_hart: "aerial_wall",
  fog_beatrice_ashford: "front_foot_intercept",
  rose_juliette_moreau: "front_foot_intercept",
  rose_maelle_garnier: "aerial_wall",
  rhein_greta_adler: "aerial_wall",
  rhein_johanna_falk: "aerial_wall",
  silver_valentina_rojas: "aerial_wall",
  silver_luciana_vega: "box_predator",
  sakura_noa_kisaragi: "transition_conductor",
  sakura_reina_tachibana: "transition_conductor",
  founder_sakura_link_4: "aerial_wall",
  founder_samba_union_7: "box_predator",
  gold_beatriz_nascimento: "aerial_wall",
  gold_mariana_alves: "transition_conductor",
  sol_ines_valera: "aerial_wall",
  founder_scarlet_toros_6: "transition_conductor",
  sol_alba_serrano: "front_foot_intercept",
};

export function defaultSpecialSkillFor(character: Pick<Character, "character_id" | "stars">) {
  if (character.stars < 5) return null;
  return skillsById.get(defaultSpecialSkillIds[character.character_id] ?? "") ?? null;
}

export function skillSlotCaps(stars: number): SkillQuality[] {
  if (stars >= 6) return ["purple", "purple", "gold", "rainbow"];
  if (stars === 5) return ["purple", "purple", "gold"];
  if (stars === 4) return ["blue", "purple", "purple"];
  return ["blue", "purple"];
}

function positionSet(character: Pick<Character, "position" | "alternative_positions">) {
  return new Set([character.position, ...character.alternative_positions].flatMap((position) => position.split("/")));
}

export function isSkillCompatible(character: Pick<Character, "position" | "alternative_positions">, skill: ConfigurableSkill) {
  const positions = positionSet(character);
  if (skill.positions.includes("OUTFIELD")) return !positions.has("GK");
  return skill.positions.some((position) => positions.has(position));
}

export function starterSkillIds(character: Pick<Character, "position" | "alternative_positions">) {
  const positions = positionSet(character);
  if (positions.has("GK")) return ["basic_handling", "set_reaction"];
  if ([...positions].some((position) => ["CB", "LB", "RB"].includes(position))) return ["steady_touch", "compact_shape"];
  if ([...positions].some((position) => ["CDM", "CM", "CAM"].includes(position))) return ["steady_touch", "press_escape"];
  if ([...positions].some((position) => ["LM", "RM", "LW", "RW"].includes(position))) return ["steady_touch", "wide_support"];
  return ["quick_start", "first_time_finish"];
}
