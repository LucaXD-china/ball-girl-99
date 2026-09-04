import type { Character } from "./gameData";
import { skillMeta } from "./lockerRoomData";
import { defaultSpecialSkillFor } from "./skillData";

export type FormationId = "4-3-3" | "4-2-3-1" | "4-4-2" | "3-5-2";
export type SlotPosition = "GK" | "CB" | "LB" | "RB" | "CDM" | "CM" | "CAM" | "LM" | "RM" | "LW" | "RW" | "ST";

export type FormationSlot = {
  id: string;
  label: string;
  position: SlotPosition;
  x: number;
  y: number;
};

export type AttackFormation = {
  id: FormationId;
  name: string;
  identity: string;
  summary: string;
  slots: FormationSlot[];
};

export type DefenseFormation = {
  id: FormationId;
  name: string;
  identity: string;
  summary: string;
  slots: FormationSlot[];
};

export const attackFormations: Record<FormationId, AttackFormation> = {
  "4-3-3": {
    id: "4-3-3", name: "4-3-3", identity: "边路展开", summary: "三中场通过连续三角接应推进，边锋拉开宽度并参与前场压迫。边后卫前插后，要留意身后的转换空间。",
    slots: [
      { id: "gk", label: "门将", position: "GK", x: 50, y: 90 },
      { id: "lb", label: "左后卫", position: "LB", x: 13, y: 70 },
      { id: "lcb", label: "左中卫", position: "CB", x: 38, y: 75 },
      { id: "rcb", label: "右中卫", position: "CB", x: 62, y: 75 },
      { id: "rb", label: "右后卫", position: "RB", x: 87, y: 70 },
      { id: "lcm", label: "左中场", position: "CM", x: 28, y: 49 },
      { id: "dm", label: "后腰", position: "CDM", x: 50, y: 57 },
      { id: "rcm", label: "右中场", position: "CM", x: 72, y: 49 },
      { id: "lw", label: "左边锋", position: "LW", x: 17, y: 22 },
      { id: "st", label: "中锋", position: "ST", x: 50, y: 14 },
      { id: "rw", label: "右边锋", position: "RW", x: 83, y: 22 },
    ],
  },
  "4-2-3-1": {
    id: "4-2-3-1", name: "4-2-3-1", identity: "双轴推进", summary: "双后腰稳住出球并保护中卫身前，前腰在两线之间连接单前锋。边路球员需要及时进入禁区补足人数。",
    slots: [
      { id: "gk", label: "门将", position: "GK", x: 50, y: 90 },
      { id: "lb", label: "左后卫", position: "LB", x: 13, y: 70 },
      { id: "lcb", label: "左中卫", position: "CB", x: 38, y: 75 },
      { id: "rcb", label: "右中卫", position: "CB", x: 62, y: 75 },
      { id: "rb", label: "右后卫", position: "RB", x: 87, y: 70 },
      { id: "ldm", label: "左后腰", position: "CDM", x: 37, y: 55 },
      { id: "rdm", label: "右后腰", position: "CDM", x: 63, y: 55 },
      { id: "lm", label: "左前卫", position: "LM", x: 18, y: 34 },
      { id: "cam", label: "前腰", position: "CAM", x: 50, y: 34 },
      { id: "rm", label: "右前卫", position: "RM", x: 82, y: 34 },
      { id: "st", label: "中锋", position: "ST", x: 50, y: 14 },
    ],
  },
  "4-4-2": {
    id: "4-4-2", name: "4-4-2", identity: "双锋直击", summary: "两名前锋分别处理第一点和第二点，两翼快速输送并参与回防。面对三中场时，中场二人需要保持紧凑。",
    slots: [
      { id: "gk", label: "门将", position: "GK", x: 50, y: 90 },
      { id: "lb", label: "左后卫", position: "LB", x: 13, y: 70 },
      { id: "lcb", label: "左中卫", position: "CB", x: 38, y: 75 },
      { id: "rcb", label: "右中卫", position: "CB", x: 62, y: 75 },
      { id: "rb", label: "右后卫", position: "RB", x: 87, y: 70 },
      { id: "lm", label: "左中场", position: "LM", x: 16, y: 45 },
      { id: "lcm", label: "左中场", position: "CM", x: 39, y: 49 },
      { id: "rcm", label: "右中场", position: "CM", x: 61, y: 49 },
      { id: "rm", label: "右中场", position: "RM", x: 84, y: 45 },
      { id: "lst", label: "左前锋", position: "ST", x: 38, y: 17 },
      { id: "rst", label: "右前锋", position: "ST", x: 62, y: 17 },
    ],
  },
  "3-5-2": {
    id: "3-5-2", name: "3-5-2", identity: "中路合围", summary: "三中卫托住后场，三中场连续接应，双前锋互相做球。两名翼卫独立覆盖边路，是整套阵型的关键。",
    slots: [
      { id: "gk", label: "门将", position: "GK", x: 50, y: 90 },
      { id: "lcb", label: "左中卫", position: "CB", x: 25, y: 72 },
      { id: "cb", label: "中卫", position: "CB", x: 50, y: 77 },
      { id: "rcb", label: "右中卫", position: "CB", x: 75, y: 72 },
      { id: "lwb", label: "左翼卫", position: "LM", x: 12, y: 47 },
      { id: "dm", label: "后腰", position: "CDM", x: 38, y: 55 },
      { id: "cm", label: "中前卫", position: "CM", x: 62, y: 49 },
      { id: "cam", label: "前腰", position: "CAM", x: 50, y: 34 },
      { id: "rwb", label: "右翼卫", position: "RM", x: 88, y: 47 },
      { id: "lst", label: "左前锋", position: "ST", x: 38, y: 16 },
      { id: "rst", label: "右前锋", position: "ST", x: 62, y: 16 },
    ],
  },
};

export const defenseFormations: Record<FormationId, DefenseFormation> = {
  "4-3-3": { id: "4-3-3", name: "4-3-3", identity: "前场压迫", summary: "三名前场球员从第一线施压，三中场保护中央并支援边后卫。第一线被越过后，单后腰需要管理较大的空间。", slots: attackFormations["4-3-3"].slots },
  "4-2-3-1": { id: "4-2-3-1", name: "4-2-3-1", identity: "双轴保护", summary: "两名后腰共同封锁中路，边前卫回收后形成稳定的四人中场。前腰不回收时，双后腰仍可能面对人数劣势。", slots: attackFormations["4-2-3-1"].slots },
  "4-4-2": { id: "4-4-2", name: "4-4-2", identity: "紧凑双线", summary: "两条四人线随球整体横移，双前锋封锁中路并把出球赶向边线。纵向距离拉大时，线间空间会暴露。", slots: attackFormations["4-4-2"].slots },
  "3-5-2": {
    id: "3-5-2", name: "5-3-2", identity: "禁区合围", summary: "两名翼卫回落形成五后卫，三中场保护禁区正面。翼卫必须及时回收，避免边中卫被迫独自拉到外侧。",
    slots: attackFormations["3-5-2"].slots.map((slot) => slot.id === "lwb" ? { ...slot, position: "LB", y: 69 } : slot.id === "rwb" ? { ...slot, position: "RB", y: 69 } : slot),
  },
};

export const compatibleDefenseFormations: Record<FormationId, FormationId[]> = {
  "4-3-3": ["4-3-3", "4-4-2"],
  "4-2-3-1": ["4-2-3-1", "4-4-2"],
  "4-4-2": ["4-4-2", "4-2-3-1"],
  "3-5-2": ["3-5-2", "4-4-2"],
};

export type Lineup = Record<string, string | null>;

export function assignLineupPlayer(lineup: Lineup, slotId: string, playerId: string): Lineup {
  const next = Object.fromEntries(Object.entries(lineup).map(([id, value]) => [id, value === playerId ? null : value]));
  next[slotId] = playerId;
  return next;
}

export type FactionBondState = {
  factionId: Character["faction_id"];
  count: number;
  layers: number;
  target: number;
};

export type CupFactionBondProfile = {
  name: string;
  effectLabel: string;
  ability: "attack" | "defense" | "possession" | "xg";
  bonus: number;
};

export const cupFactionBondProfiles: Record<Character["faction_id"], CupFactionBondProfile> = {
  fog_court: { name: "王庭制空", effectLabel: "进攻能力 +2.4", ability: "attack", bonus: 2.4 },
  gaul_iris: { name: "疾速突围", effectLabel: "进攻能力 +2.4", ability: "attack", bonus: 2.4 },
  iron_engine: { name: "压迫齿轮", effectLabel: "防守能力 +6.0", ability: "defense", bonus: 6 },
  scarlet_toros: { name: "连续传控", effectLabel: "控球率 +4.5%", ability: "possession", bonus: 4.5 },
  samba_union: { name: "边线桑巴", effectLabel: "进球概率 +5%", ability: "xg", bonus: .05 },
  pampas_silver: { name: "银辉定音", effectLabel: "进球概率 +5%", ability: "xg", bonus: .05 },
  sakura_link: { name: "樱华连携", effectLabel: "控球率 +4.5%", ability: "possession", bonus: 4.5 },
  azure_fortress: { name: "苍蓝反击", effectLabel: "防守能力 +6.0", ability: "defense", bonus: 6 },
  cape_voyagers: { name: "远航连携", effectLabel: "控球率 +4.5%", ability: "possession", bonus: 4.5 },
};

export function factionBondStates(players: Character[]): FactionBondState[] {
  const counts = new Map<Character["faction_id"], number>();
  for (const player of players) counts.set(player.faction_id, (counts.get(player.faction_id) ?? 0) + 1);
  return [...counts.entries()].map(([factionId, count]) => {
    return { factionId, count, layers: count >= 3 ? 1 : 0, target: 3 };
  }).sort((left, right) => right.layers - left.layers || right.count - left.count || left.factionId.localeCompare(right.factionId));
}

export function cupFactionBondEffects(players: Character[]) {
  const effects = { attack: 0, defense: 0, possession: 0, xg: 0 };
  const fixedOpponentFactionId = players.find(({ tournamentOpponentBondFactionId }) => tournamentOpponentBondFactionId)?.tournamentOpponentBondFactionId;
  const activeFactionIds = fixedOpponentFactionId
    ? [fixedOpponentFactionId]
    : factionBondStates(players).filter(({ layers }) => layers > 0).map(({ factionId }) => factionId);
  for (const factionId of activeFactionIds) {
    const profile = cupFactionBondProfiles[factionId];
    effects[profile.ability] += profile.bonus;
  }
  return effects;
}

function positionSet(player: Character) {
  return new Set([player.position, ...player.alternative_positions].flatMap((position) => position.split("/")));
}

export function positionFit(player: Character, target: SlotPosition) {
  const positions = positionSet(player);
  if (positions.has(target)) return 1;
  if (target === "GK" || positions.has("GK")) return 0.2;
  const defense = ["CB", "LB", "RB"];
  const midfield = ["CDM", "CM", "CAM"];
  const wide = ["LM", "RM", "LW", "RW"];
  if (defense.includes(target) && [...positions].some((position) => defense.includes(position))) return 0.91;
  if (midfield.includes(target) && [...positions].some((position) => midfield.includes(position))) return 0.93;
  if (wide.includes(target) && [...positions].some((position) => wide.includes(position))) return 0.93;
  if (target === "ST" && [...positions].some((position) => [...wide, "CAM"].includes(position))) return 0.84;
  if (wide.includes(target) && [...positions].some((position) => ["ST", "CAM", "LB", "RB"].includes(position))) return 0.84;
  return 0.72;
}

export function roleScore(player: Character, target: SlotPosition) {
  const a = player.attributes;
  let score: number;
  if (target === "GK") {
    score = goalkeeperSaveScore(player);
  } else if (target === "CB") score = a.defending * .5 + a.physical * .25 + a.pace * .1 + a.passing * .15;
  else if (target === "LB" || target === "RB") score = a.defending * .34 + a.pace * .26 + a.passing * .2 + a.physical * .2;
  else if (target === "CDM") score = a.defending * .32 + a.passing * .28 + a.physical * .2 + a.dribbling * .1 + a.pace * .1;
  else if (target === "CM") score = a.passing * .34 + a.dribbling * .2 + a.defending * .16 + a.shooting * .15 + a.pace * .15;
  else if (target === "CAM") score = a.passing * .34 + a.dribbling * .3 + a.shooting * .21 + a.pace * .15;
  else if (["LM", "RM", "LW", "RW"].includes(target)) score = a.pace * .3 + a.dribbling * .3 + a.passing * .25 + a.shooting * .15;
  else score = a.shooting * .48 + a.pace * .2 + a.physical * .16 + a.dribbling * .16;
  return score * positionFit(player, target);
}

// 阵型不再给球员能力加成：槽位能力即位置职责分 × 位置适配系数。
// defenseFormationId 保留仅为兼容既有调用方签名，不再参与计算。
export function formationAbilityForSlot(player: Character, slot: FormationSlot, _defenseFormationId: FormationId) {
  return roleScore(player, slot.position);
}

export function completeLineup(players: Character[], attackFormationId: FormationId, defenseFormationId: FormationId, existingLineup: Lineup): Lineup {
  const formation = attackFormations[attackFormationId];
  const lineup: Lineup = Object.fromEntries(formation.slots.map((slot) => [slot.id, existingLineup[slot.id] ?? null]));
  const usedIds = new Set(Object.values(lineup).filter((id): id is string => Boolean(id)));
  const remaining = new Map(players.filter((player) => !usedIds.has(player.character_id)).map((player) => [player.character_id, player]));
  const orderedSlots = formation.slots.filter((slot) => !lineup[slot.id]).sort((left, right) => {
    if (left.position === "GK") return -1;
    if (right.position === "GK") return 1;
    return Math.max(...players.map((player) => positionFit(player, left.position))) - Math.max(...players.map((player) => positionFit(player, right.position)));
  });
  for (const slot of orderedSlots) {
    const player = [...remaining.values()].sort((left, right) => {
      const leftScore = formationAbilityForSlot(left, slot, defenseFormationId);
      const rightScore = formationAbilityForSlot(right, slot, defenseFormationId);
      return rightScore - leftScore;
    })[0];
    lineup[slot.id] = player?.character_id ?? null;
    if (player) remaining.delete(player.character_id);
  }
  return lineup;
}

export function recommendLineup(players: Character[], attackFormationId: FormationId, defenseFormationId: FormationId): Lineup {
  return completeLineup(players, attackFormationId, defenseFormationId, {});
}

export type MatchSide = "home" | "away" | "neutral";
export type MatchEventKind = "kickoff" | "build-up" | "duel" | "transition" | "chance" | "goal" | "save" | "miss" | "halftime" | "fulltime" | "extra-time-start" | "extra-time-break" | "extra-time-end" | "penalty-start" | "penalty-goal" | "penalty-save" | "penalty-miss" | "penalty-end";

export type MatchEvent = {
  id: string;
  minute: number;
  side: MatchSide;
  kind: MatchEventKind;
  commentary: string;
  homeScore: number;
  awayScore: number;
  playerId?: string;
  scorerId?: string;
  assistId?: string;
  shooterId?: string;
  creatorId?: string;
  defenderId?: string;
  skillId?: string;
  skillSource?: "innate" | "fixed";
  xg?: number;
  phase?: "regulation" | "extra-time" | "penalties";
  minuteLabel?: string;
  aggregateHomeScore?: number;
  aggregateAwayScore?: number;
  homePenaltyScore?: number;
  awayPenaltyScore?: number;
  penaltyRound?: number;
  penaltyOutcome?: "goal" | "saved" | "missed";
  takerId?: string;
  keeperId?: string;
  sourceTags?: CombatSourceTag[];
  // 无球参与记录：只用于保证每名首发至少进入一次过程记录，不吸附球权。
  offBall?: boolean;
};

// 每个事件在文字直播里停留的时长（视觉层用它反推整场比赛的总时长）。
export function eventVisualDurationMs(event: MatchEvent): number {
  if (["goal", "penalty-goal", "penalty-save", "penalty-miss"].includes(event.kind) || event.skillId) return 1450;
  if (["fulltime", "extra-time-end", "penalty-end"].includes(event.kind)) return 1050;
  return 900;
}

export type PlayerMatchRating = { characterId: string; team: Exclude<MatchSide, "neutral">; rating: number; goals: number; assists: number; skillTriggers: number; ordinaryEvents: number; saves?: number };

export type MatchResult = {
  seed: number;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  homePossession: number;
  homeShots: number;
  awayShots: number;
  homeXg: number;
  awayXg: number;
  homeAttack: number;
  homeDefense: number;
  awayAttack: number;
  awayDefense: number;
  homeCombatProfile?: TeamCombatProfile;
  awayCombatProfile?: TeamCombatProfile;
  skillTriggers: number;
  mvpId: string;
  ratings: PlayerMatchRating[];
  events: MatchEvent[];
};

export type CombatSourceTag = "creation" | "finishing" | "prevention" | "goalkeeping";

export type TeamCombatProfile = {
  creation: number;
  finishing: number;
  prevention: number;
  goalkeeping: number;
};

export type TeamMatchEffects = {
  creation?: number;
  finishing?: number;
  prevention?: number;
  attack?: number;
  defense?: number;
  xg?: number;
};

export const TEAM_FINISHING_CONVERSION = .0045;

export type TournamentMatchContext = {
  homeLineup: Lineup;
  homeAttackFormationId: FormationId;
  homeDefenseFormationId: FormationId;
  homeMatchEffects?: TeamMatchEffects;
};

export type TournamentDecisionSimulation = {
  result: MatchResult;
  advanced: boolean;
  extraTime: { player: number; opponent: number };
  penalties?: { player: number; opponent: number };
  events: MatchEvent[];
};

function seedFromText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomGenerator(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function lineupPlayers(lineup: Lineup, formation: AttackFormation, characters: Map<string, Character>) {
  return formation.slots.map((slot) => ({ slot, player: characters.get(lineup[slot.id] ?? "") })).filter((item): item is { slot: FormationSlot; player: Character } => Boolean(item.player));
}

function weightedAverage(values: Array<{ value: number; weight: number }>) {
  const weight = values.reduce((sum, item) => sum + item.weight, 0);
  return values.reduce((sum, item) => sum + item.value * item.weight, 0) / Math.max(weight, 1);
}

function creationScore(player: Character, slot: FormationSlot) {
  const a = player.attributes;
  const score = slot.position === "GK"
    ? a.passing * .65 + a.dribbling * .15 + a.pace * .2
    : ["CB", "LB", "RB"].includes(slot.position)
      ? a.passing * .45 + a.dribbling * .2 + a.pace * .2 + a.physical * .15
      : ["CDM", "CM", "CAM"].includes(slot.position)
        ? a.passing * .45 + a.dribbling * .35 + a.pace * .2
        : a.passing * .28 + a.dribbling * .37 + a.pace * .25 + a.shooting * .1;
  return score * positionFit(player, slot.position);
}

function finishingScore(player: Character, slot: FormationSlot) {
  const a = player.attributes;
  return (a.shooting * .72 + a.pace * .18 + a.dribbling * .1) * positionFit(player, slot.position);
}

function preventionScore(player: Character, slot: FormationSlot) {
  const a = player.attributes;
  return (a.defending * .58 + a.physical * .25 + a.pace * .17) * positionFit(player, slot.position);
}

function finishingWeight(position: SlotPosition) {
  if (position === "ST") return 1.4;
  if (["CAM", "LM", "RM", "LW", "RW"].includes(position)) return 1.05;
  if (["CM", "CDM"].includes(position)) return .65;
  if (position === "GK") return .1;
  return .3;
}

function creationWeight(position: SlotPosition) {
  if (["CM", "CAM"].includes(position)) return 1.25;
  if (["LM", "RM", "LW", "RW"].includes(position)) return 1.2;
  if (position === "CDM") return .95;
  if (position === "ST") return .8;
  if (["LB", "RB"].includes(position)) return .65;
  if (position === "CB") return .35;
  return .1;
}

function preventionWeight(position: SlotPosition) {
  if (["CB", "LB", "RB", "CDM"].includes(position)) return 1.25;
  if (["CM", "LM", "RM"].includes(position)) return .8;
  if (position === "GK") return 0;
  return .45;
}

export function teamCombatProfile(
  lineup: Lineup,
  attackFormationId: FormationId,
  characters: Map<string, Character>,
): TeamCombatProfile {
  const formation = attackFormations[attackFormationId];
  const players = lineupPlayers(lineup, formation, characters);
  const bondEffects = cupFactionBondEffects(players.map(({ player }) => player));
  const founderCoreBonus = players.reduce((bonus, { player }) => bonus
    + ((player as Character & { tournamentCoreBonus?: number }).tournamentCoreBonus ?? 0), 0);
  const keeper = players.find(({ slot }) => slot.position === "GK")?.player;
  return {
    creation: weightedAverage(players.map(({ slot, player }) => ({ value: creationScore(player, slot), weight: creationWeight(slot.position) }))) + bondEffects.attack + bondEffects.possession * .6 + founderCoreBonus,
    finishing: weightedAverage(players.map(({ slot, player }) => ({ value: finishingScore(player, slot), weight: finishingWeight(slot.position) }))) + bondEffects.xg * 100 + founderCoreBonus,
    prevention: weightedAverage(players.map(({ slot, player }) => ({ value: preventionScore(player, slot), weight: preventionWeight(slot.position) }))) + bondEffects.defense + founderCoreBonus,
    goalkeeping: keeper ? goalkeeperSaveScore(keeper) : 0,
  };
}

export function sideStrength(
  lineup: Lineup,
  attackFormationId: FormationId,
  _defenseFormationId: FormationId,
  characters: Map<string, Character>,
) {
  const formation = attackFormations[attackFormationId];
  const players = lineupPlayers(lineup, formation, characters);
  const bondEffects = cupFactionBondEffects(players.map(({ player }) => player));
  // 剧情对手的核心加成由生成阵容显式标记，避免校准偏移改变 overall 后整块丢失；玩家持有版本没有该标记。
  const founderCoreBonus = players.reduce((bonus, { player }) => bonus
    + ((player as Character & { tournamentCoreBonus?: number }).tournamentCoreBonus ?? 0), 0);
  const combat = teamCombatProfile(lineup, attackFormationId, characters);
  // 旧 attack/defense 字段继续供赛后报告和旧存档兼容；V2 赛果读取 combat 三通道。
  return {
    attack: average(players.map(({ slot, player }) => roleScore(player, slot.position))) + bondEffects.attack + founderCoreBonus,
    defense: average(players.map(({ slot, player }) => slot.position === "GK"
      ? roleScore(player, "GK")
      : player.attributes.defending * .55 + player.attributes.physical * .25 + player.attributes.pace * .2)) + bondEffects.defense + founderCoreBonus,
    possessionBonus: bondEffects.possession,
    xgBonus: bondEffects.xg,
    ...combat,
  };
}

const defensiveInnateSkillIds = new Set(["aerial_guard", "front_foot_stop", "recovery_cover", "reflex_save"]);
const defensiveFixedSkillIds = new Set(["front_foot_intercept", "aerial_wall", "last_line_oath"]);

type TriggeredAbility = {
  player: Character;
  skillId: string;
  skillName: string;
  copy: string;
  source: "innate" | "fixed";
};

function innateAbility(player: Character, defending: boolean): TriggeredAbility | null {
  const meta = skillMeta[player.signature_skill_id];
  if (!meta || defensiveInnateSkillIds.has(player.signature_skill_id) !== defending) return null;
  // 技能已退出数值模型：只保留「身份名 + 风味文案」用于比赛过程立绘展示，不再产生 xgDelta。
  return {
    player,
    skillId: player.signature_skill_id,
    skillName: meta.name,
    copy: meta.effect,
    source: "innate",
  };
}

function fixedAbility(player: Character, defending: boolean): TriggeredAbility | null {
  const skill = defaultSpecialSkillFor(player);
  if (!skill || defensiveFixedSkillIds.has(skill.id) !== defending) return null;
  // 技能已退出数值模型：默认招牌技能只做立绘展示，不再产生 xgDelta。
  return {
    player,
    skillId: skill.id,
    skillName: skill.name,
    copy: skill.description,
    source: "fixed",
  };
}

function chooseByPositions(items: Array<{ slot: FormationSlot; player: Character }>, positions: SlotPosition[], random: () => number) {
  const candidates = items.filter(({ slot }) => positions.includes(slot.position));
  const pool = candidates.length ? candidates : items;
  return pool[Math.floor(random() * pool.length) % pool.length];
}

function ordinaryEventKind(position: SlotPosition): Extract<MatchEventKind, "build-up" | "duel" | "transition"> {
  if (["GK", "CB", "LB", "RB"].includes(position)) return "build-up";
  if (["CDM", "CM", "LM", "RM"].includes(position)) return "duel";
  return "transition";
}

function ordinaryEventCommentary(teamName: string, item: { slot: FormationSlot; player: Character }) {
  const kind = ordinaryEventKind(item.slot.position);
  if (kind === "build-up") return `${teamName}从防线重新组织，${item.player.name}观察压迫后稳妥完成出球。`;
  if (kind === "duel") return `${item.player.name}在中场对抗中保护住球权，${teamName}继续保持阵型。`;
  return `${item.player.name}通过无球跑动拉开接应角度，${teamName}把进攻推进到下一线。`;
}

type LineupItem = { slot: FormationSlot; player: Character };

// 槽位在进攻方向上的推进深度：本方门将约 10，对方门前约 86，越高越靠前。
function slotAdvance(slot: FormationSlot) {
  return 100 - slot.y;
}

// 从持球队伍里选一个与 anchor 空间相邻的队友（可选限制为「更靠后」），
// 优先从未进入普通事件的球员中挑选，保证覆盖。只消耗独立的空间 RNG。
function pickChainLink(
  items: LineupItem[],
  anchor: LineupItem,
  excludeIds: Set<string>,
  seenOrdinary: Set<string>,
  random: () => number,
  deeperOnly: boolean,
): LineupItem | null {
  const anchorAdvance = slotAdvance(anchor.slot);
  // 门将不参与推进链（deep/passer），避免「回传门将」时球飞向本方球门。
  const candidates = items.filter((item) => !excludeIds.has(item.player.character_id) && item.slot.position !== "GK");
  const deeper = deeperOnly ? candidates.filter((item) => slotAdvance(item.slot) < anchorAdvance) : candidates;
  const base = deeper.length ? deeper : candidates;
  if (!base.length) return null;
  const unseen = base.filter((item) => !seenOrdinary.has(item.player.character_id));
  const source = unseen.length ? unseen : base;
  const scored = source
    .map((item) => ({ item, score: Math.abs(slotAdvance(item.slot) - anchorAdvance) + Math.abs(item.slot.x - anchor.slot.x) * 0.45 }))
    .sort((left, right) => left.score - right.score);
  const top = scored.slice(0, 3);
  return top[Math.floor(random() * top.length) % top.length].item;
}

// 为一次射门推导「后场 → 前场」的两脚推进链：deep（更靠后的接应点）→ passer（紧邻射手的传球者）。
function buildUpChain(attacking: LineupItem[], shooter: LineupItem, seenOrdinary: Set<string>, random: () => number) {
  const passer = pickChainLink(attacking, shooter, new Set([shooter.player.character_id]), seenOrdinary, random, true);
  if (!passer) return { deep: null, passer: null };
  const deep = pickChainLink(attacking, passer, new Set([shooter.player.character_id, passer.player.character_id]), seenOrdinary, random, true);
  return { deep, passer };
}

export function simulateMatch(args: {
  characters: Character[];
  homeLineup: Lineup;
  homeAttackFormationId: FormationId;
  homeDefenseFormationId: FormationId;
  awayLineup?: Lineup;
  homeSkillLoadouts?: Record<string, string[]>;
  awaySkillLoadouts?: Record<string, string[]>;
  homeSkillLevels?: Record<string, number>;
  awaySkillLevels?: Record<string, number>;
  homeName?: string;
  awayName?: string;
  awayAttackFormationId?: FormationId;
  awayDefenseFormationId?: FormationId;
  fixtureSeed?: number;
  homeMatchEffects?: TeamMatchEffects;
  awayMatchEffects?: TeamMatchEffects;
  phase?: "regulation" | "extra-time";
  initialHomeScore?: number;
  initialAwayScore?: number;
}): MatchResult {
  const { characters, homeLineup, homeAttackFormationId, homeDefenseFormationId } = args;
  const homeName = args.homeName ?? "新俱乐部";
  const awayName = args.awayName ?? "海港学院";
  const characterMap = new Map(characters.map((character) => [character.character_id, character]));
  const homeIds = new Set(Object.values(homeLineup).filter((id): id is string => Boolean(id)));
  const awayCandidates = characters.filter((character) => !homeIds.has(character.character_id));
  const awayAttackFormationId = args.awayAttackFormationId ?? "4-2-3-1";
  const awayDefenseFormationId = args.awayDefenseFormationId ?? "4-4-2";
  const awayLineup = args.awayLineup ?? recommendLineup(awayCandidates, awayAttackFormationId, awayDefenseFormationId);
  const homeFormation = attackFormations[homeAttackFormationId];
  const awayFormation = attackFormations[awayAttackFormationId];
  const homePlayers = lineupPlayers(homeLineup, homeFormation, characterMap);
  const awayPlayers = lineupPlayers(awayLineup, awayFormation, characterMap);
  if (homePlayers.length !== 11) throw new Error("首发阵容尚未填满 11 个位置");
  if (awayPlayers.length !== 11) throw new Error("对手首发阵容尚未填满 11 个位置");
  const seed = args.fixtureSeed ?? seedFromText(`${homeAttackFormationId}|${homeDefenseFormationId}|${homePlayers.map(({ player }) => player.character_id).join("|")}`);
  const random = randomGenerator(seed);
  // 独立的空间 RNG 流：只用于推导传球链，不触碰决定比分/技能的主 random 序列，保证赛果逐字节不变。
  const spatialRandom = randomGenerator(seedFromText(`${seed}|spatial-play`));
  const isExtraTime = args.phase === "extra-time";
  const homeBaseStrength = sideStrength(homeLineup, homeAttackFormationId, homeDefenseFormationId, characterMap);
  const awayBaseStrength = sideStrength(awayLineup, awayAttackFormationId, awayDefenseFormationId, characterMap);
  const applyEffects = (base: typeof homeBaseStrength, effects: TeamMatchEffects | undefined) => ({
    ...base,
    creation: base.creation + (effects?.creation ?? effects?.attack ?? 0),
    finishing: base.finishing + (effects?.finishing ?? effects?.attack ?? 0),
    prevention: base.prevention + (effects?.prevention ?? effects?.defense ?? 0),
    // 阵营射门羁绊已折算进 finishing；这里只保留赛前准备的直接 xG 效果，避免同一 buff 双算。
    xgBonus: effects?.xg ?? 0,
  });
  const homeStrength = applyEffects(homeBaseStrength, args.homeMatchEffects);
  const awayStrength = applyEffects(awayBaseStrength, args.awayMatchEffects);
  const possessionRaw = 50 + (homeStrength.creation - awayStrength.creation) * 1.2 + (random() - .5) * 3;
  const homePossession = Math.round(Math.min(72, Math.max(28, possessionRaw)));
  let homeScore = args.initialHomeScore ?? 0;
  let awayScore = args.initialAwayScore ?? 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeXg = 0;
  let awayXg = 0;
  let skillTriggers = 0;
  const playerStats = new Map<string, { team: "home" | "away"; goals: number; assists: number; skills: number; saves: number; ordinaryEvents: number }>();
  for (const { player } of homePlayers) playerStats.set(player.character_id, { team: "home", goals: 0, assists: 0, skills: 0, saves: 0, ordinaryEvents: 0 });
  for (const { player } of awayPlayers) playerStats.set(player.character_id, { team: "away", goals: 0, assists: 0, skills: 0, saves: 0, ordinaryEvents: 0 });
  const seenOrdinary = new Set<string>();
  const events: MatchEvent[] = isExtraTime
    ? [{ id: "extra-time-start", minute: 90, minuteLabel: "加时", side: "neutral", kind: "extra-time-start", phase: "extra-time", commentary: `加时赛开始！双方将在接下来的30分钟决出胜负。`, homeScore, awayScore }]
    : [{ id: "kickoff", minute: 0, side: "neutral", kind: "kickoff", phase: "regulation", commentary: `开场哨响！${homeName}率先开球。`, homeScore, awayScore }];
  const opportunityCount = (creation: number, opposingPrevention: number) => Math.min(isExtraTime ? 4 : 10, Math.max(isExtraTime ? 1 : 3,
    Math.round((isExtraTime ? 2 : 6.5) + (creation - opposingPrevention) * (isExtraTime ? .045 : .11) + (random() - .5) * 1.5)));
  const opportunitySides: Array<"home" | "away"> = [
    ...Array.from({ length: opportunityCount(homeStrength.creation, awayStrength.prevention) }, () => "home" as const),
    ...Array.from({ length: opportunityCount(awayStrength.creation, homeStrength.prevention) }, () => "away" as const),
  ];
  for (let index = opportunitySides.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [opportunitySides[index], opportunitySides[swapIndex]] = [opportunitySides[swapIndex], opportunitySides[index]];
  }
  const minutes = opportunitySides.map((_, index) => isExtraTime
    ? 90 + Math.round((index + 1) * 30 / (opportunitySides.length + 1))
    : Math.round((index + 1) * 90 / (opportunitySides.length + 1)));
  let intervalAdded = false;

  for (const [minuteIndex, minute] of minutes.entries()) {
    if (!intervalAdded && !isExtraTime && minute > 45) {
      events.push({ id: "halftime", minute: 45, side: "neutral", kind: "halftime", phase: "regulation", commentary: `半场结束，比分 ${homeScore} : ${awayScore}。双方交换场地。`, homeScore, awayScore });
      intervalAdded = true;
    }
    if (!intervalAdded && isExtraTime && minute > 105) {
      events.push({ id: "extra-time-break", minute: 105, side: "neutral", kind: "extra-time-break", phase: "extra-time", commentary: `加时赛半场结束，比分 ${homeScore} : ${awayScore}。双方短暂调整后交换场地。`, homeScore, awayScore });
      intervalAdded = true;
    }
    const homeChance = opportunitySides[minuteIndex] === "home";
    const attacking = homeChance ? homePlayers : awayPlayers;
    const defending = homeChance ? awayPlayers : homePlayers;
    const side: "home" | "away" = homeChance ? "home" : "away";
    const shooterItem = chooseByPositions(attacking, ["ST", "LW", "RW", "CAM", "LM", "RM", "CM"], random);
    const creatorItem = chooseByPositions(attacking, ["CAM", "CM", "LM", "RM", "LW", "RW", "ST"], random);
    const defenderItem = chooseByPositions(defending, ["CB", "LB", "RB", "CDM"], random);
    const keeperItem = chooseByPositions(defending, ["GK"], random);

    // 空间层：为本次机会推导一条「后场→前场」的持球推进链。链末端 passer 仅用于解说、
    // 助攻归属和场上动画；creatorItem 继续作为技能候选（不改变赛果）。
    const chain = buildUpChain(attacking, shooterItem, seenOrdinary, spatialRandom);
    const passerItem = chain.passer;
    if (!isExtraTime && minuteIndex < 11) {
      const linkMinutes = [minute === 49 ? 46 : minute - 4, minute === 49 ? 48 : minute - 2];
      [chain.deep, chain.passer].forEach((item, index) => {
        if (!item) return;
        const stats = playerStats.get(item.player.character_id);
        if (stats) stats.ordinaryEvents += 1;
        seenOrdinary.add(item.player.character_id);
        events.push({
          id: `ordinary-${side}-${linkMinutes[index]}`,
          minute: linkMinutes[index],
          side,
          kind: ordinaryEventKind(item.slot.position),
          commentary: ordinaryEventCommentary(side === "home" ? homeName : awayName, item),
          homeScore,
          awayScore,
          playerId: item.player.character_id,
        });
      });
    }
    const attackerStrength = homeChance ? homeStrength : awayStrength;
    const defenderStrength = homeChance ? awayStrength : homeStrength;
    const strengthFactor = Math.min(2.05, Math.max(.35, Math.exp((attackerStrength.creation - defenderStrength.prevention) / 18)));
    let xg = (.08 + random() * .14) * strengthFactor + attackerStrength.xgBonus;
    const attackingCandidates = [shooterItem, creatorItem, passerItem, chain.deep]
      .filter((item): item is LineupItem => Boolean(item))
      .map(({ player }) => player)
      .filter((player, index, players) => players.findIndex(({ character_id }) => character_id === player.character_id) === index);
    const defendingCandidates = [defenderItem.player, keeperItem.player];
    const fixedCandidates = [
      ...attackingCandidates.map((player) => fixedAbility(player, false)),
      ...defendingCandidates.map((player) => fixedAbility(player, true)),
    ].filter((ability): ability is TriggeredAbility => Boolean(ability));
    const innateCandidates = [
      ...attackingCandidates.map((player) => innateAbility(player, false)),
      ...defendingCandidates.map((player) => innateAbility(player, true)),
    ].filter((ability): ability is TriggeredAbility => Boolean(ability));
    const fixedTriggerRoll = random();
    const innateTriggerRoll = random();
    const selectionRoll = random();
    const triggerPool = fixedCandidates.length && fixedTriggerRoll < .36
      ? fixedCandidates
      : innateCandidates.length && innateTriggerRoll < .52
        ? innateCandidates
        : [];
    const triggeredAbility = triggerPool.length
      ? triggerPool[Math.floor(selectionRoll * triggerPool.length) % triggerPool.length]
      : null;
    if (triggeredAbility) {
      skillTriggers += 1;
      const stats = playerStats.get(triggeredAbility.player.character_id);
      if (stats) stats.skills += 1;
    }
    xg = Math.min(.62, Math.max(.018, xg));
    if (homeChance) { homeShots += 1; homeXg += xg; } else { awayShots += 1; awayXg += xg; }
    const shooterScore = shooterItem.player.attributes.shooting;
    const keeperScore = goalkeeperSaveScore(keeperItem.player);
    const finishDelta = (shooterScore - keeperScore) * .0022
      + (attackerStrength.finishing - defenderStrength.goalkeeping) * TEAM_FINISHING_CONVERSION;
    const isGoal = random() < Math.min(.62, Math.max(.02, xg + finishDelta));
    const isSaved = !isGoal && random() < Math.min(.85, Math.max(.3, .55 + (keeperScore - shooterScore) * .01));
    let kind: MatchEventKind = "miss";
    let outcome = "稍稍偏出球门。";
    if (isGoal) {
      kind = "goal";
      if (homeChance) homeScore += 1; else awayScore += 1;
      const shooterStats = playerStats.get(shooterItem.player.character_id);
      if (shooterStats) shooterStats.goals += 1;
      if (passerItem && passerItem.player.character_id !== shooterItem.player.character_id) {
        const passerStats = playerStats.get(passerItem.player.character_id);
        if (passerStats) passerStats.assists += 1;
      }
      outcome = `射门直入网窝！${homeChance ? homeName : awayName}取得进球。`;
    } else if (isSaved) {
      kind = "save";
      const keeperStats = playerStats.get(keeperItem.player.character_id);
      if (keeperStats) keeperStats.saves += 1;
      outcome = `${keeperItem.player.name}做出扑救，将球稳稳挡下。`;
    }
    const skillCopy = triggeredAbility
      ? `${triggeredAbility.player.name}${triggeredAbility.source === "innate" ? "的固有天赋" : "固定携带技能"}「${triggeredAbility.skillName}」发动！${triggeredAbility.copy}`
      : "";
    const passerName = passerItem?.player.name ?? creatorItem.player.name;
    const commentary = `${skillCopy ? `${skillCopy} ` : ""}${passerName}送出传递，${shooterItem.player.name}${outcome}`;
    events.push({
      id: `event-${minute}`,
      minute,
      side,
      kind,
      commentary,
      homeScore,
      awayScore,
      playerId: triggeredAbility?.player.character_id ?? shooterItem.player.character_id,
      scorerId: isGoal ? shooterItem.player.character_id : undefined,
      assistId: isGoal && passerItem && passerItem.player.character_id !== shooterItem.player.character_id ? passerItem.player.character_id : undefined,
      shooterId: shooterItem.player.character_id,
      creatorId: passerItem?.player.character_id,
      keeperId: keeperItem.player.character_id,
      defenderId: defenderItem.player.character_id,
      skillId: triggeredAbility?.skillId,
      skillSource: triggeredAbility?.source,
      sourceTags: kind === "goal" ? ["creation", "finishing"] : kind === "save" ? ["creation", "goalkeeping"] : ["creation", "prevention"],
      xg: Number(xg.toFixed(3)),
      phase: isExtraTime ? "extra-time" : "regulation",
    });
  }
  if (!isExtraTime) {
    // 保证每名首发至少进入一次过程记录：未被普通事件覆盖的球员补一条参与记录，
    // 并把补录均匀打散到全场（6'–86'），避免全部堆在终场前。
    const uncovered = [...homePlayers, ...awayPlayers].filter(({ player }) => (playerStats.get(player.character_id)?.ordinaryEvents ?? 0) === 0);
    uncovered.forEach(({ slot, player }, index) => {
      const stats = playerStats.get(player.character_id)!;
      stats.ordinaryEvents += 1;
      const minute = uncovered.length > 1 ? 6 + Math.round((index * 80) / (uncovered.length - 1)) : 86;
      const teamName = stats.team === "home" ? homeName : awayName;
      events.push({
        id: `ordinary-fill-${stats.team}-${player.character_id}`,
        minute,
        side: stats.team,
        kind: ordinaryEventKind(slot.position),
        commentary: ordinaryEventCommentary(teamName, { slot, player }),
        homeScore,
        awayScore,
        playerId: player.character_id,
        offBall: true,
      });
    });
  }

  events.push(isExtraTime
    ? { id: "extra-time-end", minute: 120, side: "neutral", kind: "extra-time-end", phase: "extra-time", commentary: `加时赛结束！${homeName} ${homeScore} : ${awayScore} ${awayName}。`, homeScore, awayScore }
    : { id: "fulltime", minute: 90, side: "neutral", kind: "fulltime", phase: "regulation", commentary: `终场哨响！${homeName} ${homeScore} : ${awayScore} ${awayName}。`, homeScore, awayScore });

  events.sort((left, right) => left.minute - right.minute);

  const ratings: PlayerMatchRating[] = [...playerStats.entries()].map(([characterId, stats]) => {
    const player = characterMap.get(characterId)!;
    const won = (stats.team === "home" && homeScore > awayScore) || (stats.team === "away" && awayScore > homeScore);
    const rating = 6 + stats.goals * 1.3 + stats.assists * .7 + stats.saves * .16 + stats.ordinaryEvents * .08 + (won ? .15 : 0) + (player.attributes.overall - 80) * .012;
    return { characterId, team: stats.team, rating: Number(Math.min(9.9, Math.max(5, rating)).toFixed(1)), goals: stats.goals, assists: stats.assists, skillTriggers: stats.skills, ordinaryEvents: stats.ordinaryEvents, saves: stats.saves };
  }).sort((left, right) => right.rating - left.rating || right.goals - left.goals || right.assists - left.assists);

  return {
    seed, homeName, awayName, homeScore, awayScore, homePossession,
    homeShots, awayShots,
    homeXg: Number(homeXg.toFixed(2)), awayXg: Number(awayXg.toFixed(2)),
    homeAttack: Number(((homeStrength.creation + homeStrength.finishing) / 2).toFixed(1)), homeDefense: Number(((homeStrength.prevention + homeStrength.goalkeeping) / 2).toFixed(1)),
    awayAttack: Number(((awayStrength.creation + awayStrength.finishing) / 2).toFixed(1)), awayDefense: Number(((awayStrength.prevention + awayStrength.goalkeeping) / 2).toFixed(1)),
    homeCombatProfile: { creation: Number(homeStrength.creation.toFixed(1)), finishing: Number(homeStrength.finishing.toFixed(1)), prevention: Number(homeStrength.prevention.toFixed(1)), goalkeeping: Number(homeStrength.goalkeeping.toFixed(1)) },
    awayCombatProfile: { creation: Number(awayStrength.creation.toFixed(1)), finishing: Number(awayStrength.finishing.toFixed(1)), prevention: Number(awayStrength.prevention.toFixed(1)), goalkeeping: Number(awayStrength.goalkeeping.toFixed(1)) },
    skillTriggers, mvpId: ratings[0].characterId, ratings, events,
  };
}

function detail(player: Character, key: string, fallback: number) {
  return player.attributes.detailed[key] ?? fallback;
}

function goalkeeping(player: Character, key: string) {
  const value = player.attributes.goalkeeping[key];
  return typeof value === "number" ? value : player.attributes.overall * .35;
}

export function penaltyTakerScore(player: Character) {
  return detail(player, "penalties", player.attributes.shooting) * .62
    + detail(player, "composure", player.attributes.overall) * .18
    + detail(player, "finishing", player.attributes.shooting) * .12
    + detail(player, "shot_power", player.attributes.shooting) * .08;
}

export function rankedPenaltyTakers(players: Character[]) {
  return [...players].sort((left, right) => penaltyTakerScore(right) - penaltyTakerScore(left)
    || detail(right, "composure", right.attributes.overall) - detail(left, "composure", left.attributes.overall)
    || detail(right, "finishing", right.attributes.shooting) - detail(left, "finishing", left.attributes.shooting)
    || left.character_id.localeCompare(right.character_id));
}

export function goalkeeperSaveScore(player: Character) {
  return goalkeeping(player, "reflexes") * .45 + goalkeeping(player, "diving") * .35 + goalkeeping(player, "positioning") * .2;
}

export function penaltyKeeperScore(player: Character) {
  return goalkeeperSaveScore(player);
}

function mergeDecisionResult(regulation: MatchResult, extraTime: MatchResult, characters: Map<string, Character>) {
  const extraRatings = new Map(extraTime.ratings.map((rating) => [rating.characterId, rating]));
  const finalHomeScore = extraTime.homeScore;
  const finalAwayScore = extraTime.awayScore;
  const ratings = regulation.ratings.map((base) => {
    const extra = extraRatings.get(base.characterId);
    const player = characters.get(base.characterId)!;
    const goals = base.goals + (extra?.goals ?? 0);
    const assists = base.assists + (extra?.assists ?? 0);
    const skillTriggers = base.skillTriggers + (extra?.skillTriggers ?? 0);
    const ordinaryEvents = base.ordinaryEvents + (extra?.ordinaryEvents ?? 0);
    const saves = (base.saves ?? 0) + (extra?.saves ?? 0);
    const won = (base.team === "home" && finalHomeScore > finalAwayScore) || (base.team === "away" && finalAwayScore > finalHomeScore);
    const rating = 6 + goals * 1.3 + assists * .7 + saves * .16 + ordinaryEvents * .08 + (won ? .15 : 0) + (player.attributes.overall - 80) * .012;
    return { ...base, goals, assists, skillTriggers, ordinaryEvents, saves, rating: Number(Math.min(9.9, Math.max(5, rating)).toFixed(1)) };
  }).sort((left, right) => right.rating - left.rating || right.goals - left.goals || right.assists - left.assists);
  return {
    ...regulation,
    homeShots: regulation.homeShots + extraTime.homeShots,
    awayShots: regulation.awayShots + extraTime.awayShots,
    homeXg: Number((regulation.homeXg + extraTime.homeXg).toFixed(2)),
    awayXg: Number((regulation.awayXg + extraTime.awayXg).toFixed(2)),
    skillTriggers: regulation.skillTriggers + extraTime.skillTriggers,
    ratings,
    mvpId: ratings[0].characterId,
  };
}

export function simulateTournamentDecider(args: {
  characters: Character[];
  context: TournamentMatchContext;
  awayLineup: Lineup;
  awayAttackFormationId: FormationId;
  awayDefenseFormationId: FormationId;
  homeName: string;
  awayName: string;
  regulation: MatchResult;
  aggregateAt90: { player: number; opponent: number };
}): TournamentDecisionSimulation {
  const { context, regulation } = args;
  const characterMap = new Map(args.characters.map((character) => [character.character_id, character]));
  const extraTime = simulateMatch({
    characters: args.characters,
    homeLineup: context.homeLineup,
    homeAttackFormationId: context.homeAttackFormationId,
    homeDefenseFormationId: context.homeDefenseFormationId,
    awayLineup: args.awayLineup,
    awayAttackFormationId: args.awayAttackFormationId,
    awayDefenseFormationId: args.awayDefenseFormationId,
    homeName: args.homeName,
    awayName: args.awayName,
    fixtureSeed: seedFromText(`${regulation.seed}|extra-time`),
    homeMatchEffects: context.homeMatchEffects,
    phase: "extra-time",
    initialHomeScore: regulation.homeScore,
    initialAwayScore: regulation.awayScore,
  });
  const playerExtraGoals = extraTime.homeScore - regulation.homeScore;
  const opponentExtraGoals = extraTime.awayScore - regulation.awayScore;
  const aggregateHome = args.aggregateAt90.player + playerExtraGoals;
  const aggregateAway = args.aggregateAt90.opponent + opponentExtraGoals;
  const withAggregate = extraTime.events.map((event) => ({
    ...event,
    aggregateHomeScore: args.aggregateAt90.player + event.homeScore - regulation.homeScore,
    aggregateAwayScore: args.aggregateAt90.opponent + event.awayScore - regulation.awayScore,
  }));
  const result = mergeDecisionResult(regulation, extraTime, characterMap);
  if (aggregateHome !== aggregateAway) {
    return {
      result,
      advanced: aggregateHome > aggregateAway,
      extraTime: { player: playerExtraGoals, opponent: opponentExtraGoals },
      events: withAggregate,
    };
  }

  const homePlayers = lineupPlayers(context.homeLineup, attackFormations[context.homeAttackFormationId], characterMap);
  const awayPlayers = lineupPlayers(args.awayLineup, attackFormations[args.awayAttackFormationId], characterMap);
  const homeKeeper = homePlayers.find(({ slot }) => slot.position === "GK")?.player;
  const awayKeeper = awayPlayers.find(({ slot }) => slot.position === "GK")?.player;
  if (!homeKeeper || !awayKeeper) throw new Error("点球大战缺少实际门将");
  const homeTakers = rankedPenaltyTakers(homePlayers.map(({ player }) => player));
  const awayTakers = rankedPenaltyTakers(awayPlayers.map(({ player }) => player));
  const random = randomGenerator(seedFromText(`${regulation.seed}|penalties`));
  const kickOrder: Array<"home" | "away"> = random() < .5 ? ["home", "away"] : ["away", "home"];
  let homePenaltyScore = 0;
  let awayPenaltyScore = 0;
  let homeTaken = 0;
  let awayTaken = 0;
  const penaltyEvents: MatchEvent[] = [{
    id: "penalty-start", minute: 120, minuteLabel: "点球", side: "neutral", kind: "penalty-start", phase: "penalties",
    commentary: "加时赛后仍未分出胜负，点球大战开始！", homeScore: extraTime.homeScore, awayScore: extraTime.awayScore,
    aggregateHomeScore: aggregateHome, aggregateAwayScore: aggregateAway, homePenaltyScore, awayPenaltyScore,
  }];

  const takePenalty = (side: "home" | "away", round: number) => {
    const takers = side === "home" ? homeTakers : awayTakers;
    const keeper = side === "home" ? awayKeeper : homeKeeper;
    const taken = side === "home" ? homeTaken : awayTaken;
    const taker = takers[taken % takers.length];
    const takerScore = penaltyTakerScore(taker);
    const keeperScore = penaltyKeeperScore(keeper);
    const goalChance = Math.max(.5, Math.min(.92, .74 + (takerScore - 75) * .0025 - (keeperScore - 75) * .0025));
    const scored = random() < goalChance;
    const saved = !scored && random() < Math.max(.35, Math.min(.9, .65 + (keeperScore - takerScore) * .01));
    if (side === "home") { homeTaken += 1; if (scored) homePenaltyScore += 1; }
    else { awayTaken += 1; if (scored) awayPenaltyScore += 1; }
    const teamName = side === "home" ? args.homeName : args.awayName;
    const outcome = scored ? "goal" : saved ? "saved" : "missed";
    const commentary = scored
      ? `${taker.name}冷静命中！${teamName}在点球大战中把握住这次机会。`
      : saved ? `${taker.name}主罚，${keeper.name}判断正确，将点球扑出！` : `${taker.name}的射门偏出，${keeper.name}守住了球门！`;
    penaltyEvents.push({
      id: `penalty-${side}-${taken}`, minute: 120 + homeTaken + awayTaken, minuteLabel: `点球·第${round}轮`, side,
      kind: scored ? "penalty-goal" : saved ? "penalty-save" : "penalty-miss", phase: "penalties", commentary,
      homeScore: extraTime.homeScore, awayScore: extraTime.awayScore, aggregateHomeScore: aggregateHome, aggregateAwayScore: aggregateAway,
      homePenaltyScore, awayPenaltyScore, penaltyRound: round, penaltyOutcome: outcome, takerId: taker.character_id, keeperId: keeper.character_id,
      playerId: scored ? taker.character_id : keeper.character_id, scorerId: scored ? taker.character_id : undefined,
    });
  };

  const decidedInFive = () => homePenaltyScore > awayPenaltyScore + (5 - awayTaken) || awayPenaltyScore > homePenaltyScore + (5 - homeTaken);
  let round = 1;
  let decided = false;
  for (; round <= 5 && !decided; round += 1) {
    for (const side of kickOrder) {
      takePenalty(side, round);
      if (decidedInFive()) { decided = true; break; }
    }
  }
  while (homeTaken >= 5 && awayTaken >= 5 && homePenaltyScore === awayPenaltyScore) {
    for (const side of kickOrder) takePenalty(side, round);
    round += 1;
  }
  const advanced = homePenaltyScore > awayPenaltyScore;
  penaltyEvents.push({
    id: "penalty-end", minute: 160, minuteLabel: "点球结束", side: "neutral", kind: "penalty-end", phase: "penalties",
    commentary: `点球大战结束，${advanced ? args.homeName : args.awayName}以 ${homePenaltyScore} : ${awayPenaltyScore} 赢得决胜！`,
    homeScore: extraTime.homeScore, awayScore: extraTime.awayScore, aggregateHomeScore: aggregateHome, aggregateAwayScore: aggregateAway,
    homePenaltyScore, awayPenaltyScore,
  });
  return {
    result,
    advanced,
    extraTime: { player: playerExtraGoals, opponent: opponentExtraGoals },
    penalties: { player: homePenaltyScore, opponent: awayPenaltyScore },
    events: [...withAggregate, ...penaltyEvents],
  };
}
