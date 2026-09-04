import type { Character } from "./gameData";

export const positionLabels: Record<string, string> = {
  GK: "门将",
  CB: "中后卫",
  LB: "左后卫",
  RB: "右后卫",
  "LB/CB": "左后卫 / 中卫",
  CDM: "防守中场",
  CM: "中前卫",
  CAM: "前腰",
  LM: "左中场",
  RM: "右中场",
  LW: "左边锋",
  RW: "右边锋",
  CF: "影锋",
  ST: "中锋",
};

export function formatPlayerPositions(
  player: Pick<Character, "position" | "alternative_positions">,
) {
  const positions = [player.position, ...player.alternative_positions]
    .flatMap((position) => position.split("/"))
    .filter((position, index, values) => values.indexOf(position) === index);
  return positions.map((position) => positionLabels[position] ?? position).join(" / ");
}

export const footLabels: Record<string, string> = { Left: "左脚", Right: "右脚" };

export const traitMeta: Record<string, { name: string; description: string }> = {
  ball_winner: { name: "夺球者", description: "擅长预判线路，在中场快速回收球权。" },
  defender: { name: "防线支柱", description: "保持站位并稳定处理禁区内的防守压力。" },
  finisher: { name: "终结者", description: "进入威胁区后，能把有限机会转化为高质量射门。" },
  keeper: { name: "守门专家", description: "专注门线反应、出击判断与二点球控制。" },
  playmaker: { name: "组织核心", description: "通过视野与传球节奏连接球队的进攻阶段。" },
  runner: { name: "无球跑者", description: "持续寻找纵深与肋部空间，为队友拉开线路。" },
  wide_defender: { name: "边路卫士", description: "兼顾边路封锁与由守转攻的推进职责。" },
  wide_runner: { name: "边路快马", description: "利用速度与带球制造宽度和一对一优势。" },
};

export const skillMeta: Record<string, { name: string; trigger: string; effect: string }> = {
  aerial_finish: { name: "高点轰门", trigger: "接到传中或定位球时", effect: "提升争顶成功率与头球射门质量。" },
  aerial_guard: { name: "制空屏障", trigger: "对手以高球进入禁区时", effect: "提升争顶、解围与二点保护表现。" },
  box_finisher: { name: "禁区猎手", trigger: "在禁区内获得射门机会时", effect: "提高射正倾向，并减少仓促射门带来的损失。" },
  build_out: { name: "从容出球", trigger: "后场夺回球权并开始推进时", effect: "降低出球失误，提高球队进入中场的稳定性。" },
  channel_run: { name: "穿越肋部", trigger: "进攻推进到前场并出现纵向空当时", effect: "增加反越位接球与直面球门的机会。" },
  front_foot_stop: { name: "上抢截断", trigger: "对手在身前接球或转身时", effect: "提高主动压迫和提前截断的成功率。" },
  late_arrival: { name: "后排突袭", trigger: "队友在前场牵制防线时", effect: "增加后插上接应与禁区外二次进攻机会。" },
  overlap_run: { name: "套边疾驰", trigger: "边路持球者向内侧移动时", effect: "制造额外传中点并拉开对手边路防线。" },
  press_resistance: { name: "破压转身", trigger: "在中场遭遇紧逼时", effect: "降低丢失球权概率，并为下一脚推进创造空间。" },
  recovery_cover: { name: "回追补位", trigger: "防线身后出现空当时", effect: "提高回追效率，削弱对手的快速反击质量。" },
  reflex_save: { name: "瞬时扑救", trigger: "面对禁区内近距离射门时", effect: "提高反应扑救表现，并减少补射机会。" },
  tempo_control: { name: "节拍掌控", trigger: "球队连续完成中场传递时", effect: "提升进攻组织稳定性与高质量机会的形成概率。" },
  wide_breakthrough: { name: "边线爆破", trigger: "在边路形成一对一时", effect: "提高突破成功率，并创造传中或内切射门空间。" },
};
