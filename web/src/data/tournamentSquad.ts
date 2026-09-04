import { founderCharacters, type Character } from "./gameData";
import { roleScore, type SlotPosition } from "./matchSimulator";

export const TOURNAMENT_STARTER_CHARACTER_IDS = [
  // 3×5★ 底座：御三家纱夜 + 门将 + 中锋锚点（其余 5★ 改为可抽取）
  "founder_sakura_link_4",
  "fog_eleanor_hart",
  "silver_luciana_vega",
  // 4★/3★ 补位（原底座 5★ 的 CB/CDM/CM/RB 位置）
  "fog_amelia_sterling",
  "rose_solene_marchand",
  "silver_milagros_luna",
  "silver_abril_sosa",
  // 其余 4★
  "rose_camille_delacroix",
  "gold_camila_ribeiro",
  "azure_elena_marchetti",
  "rhein_annika_weiss",
  "sol_martina_esteve",
  "sakura_mio_kanzaki",
  // 其余 3★
  "fog_nora_beckett",
  "fog_isla_mercer",
  "gold_isadora_freitas",
  "sakura_yuna_takamori",
  "azure_bianca_russo",
] as const;

export const TOURNAMENT_MAX_FOCUS = 6;
export const TRAINING_MAIN_BONUS = 2.4;
export const TRAINING_SUB_BONUS = 1.0;
export const TRAINING_DAY_COST = 5;
// 观察对手（查看球探报告）消耗与一次训练课相同的天数，二者在同一备战窗口内二选一。
export const SCOUT_DAY_COST = 5;

// 星级强度系数：拉大不同星级之间的基础能力差异（写入六维 + 门将属性；当前 OVR 另行派生）。
// 6★ 已接近 99 能力值封顶，故只下压 5/4/3★ 来拉开差距，避免把 6★ 顶到封顶。
// 目标：让「4★ 上限」相对「6★ 对手」的差距大到训练/阵型/羁绊难以完全追平。
export const STAR_ATTRIBUTE_SCALE: Record<number, number> = {
  3: 0.85,
  4: 0.90,
  5: 1.00,
  6: 1.10,
};

export type TrainingFocusId = "attack" | "playmaking" | "defense";

export type TrainingFocus = {
  attack: number;
  playmaking: number;
  defense: number;
};

export const trainingFocusIds: TrainingFocusId[] = ["attack", "playmaking", "defense"];

export const trainingFocusMeta: Record<TrainingFocusId, { name: string; mainLabel: string; subLabel: string; tagline: string; combatLabel: string }> = {
  attack: { name: "进攻", mainLabel: "射门", subLabel: "速度", tagline: "终结 + 冲刺", combatLabel: "终结能力" },
  playmaking: { name: "组织", mainLabel: "传球", subLabel: "盘带", tagline: "出球 + 控球", combatLabel: "机会创造" },
  defense: { name: "防守", mainLabel: "防守", subLabel: "身体", tagline: "抢断 + 对抗", combatLabel: "防守化解" },
};

export type TournamentCharacterProgress = {
  breakthroughRank: number;
  focus: TrainingFocus;
};

export type TournamentSquadState = {
  collection: Record<string, number>;
  characterProgress: Record<string, TournamentCharacterProgress>;
  skillInventory: Record<string, number>;
  skillLoadouts: Record<string, string[]>;
};

export type TournamentCharacter = Character & TournamentCharacterProgress & { copies: number; readonly currentOverall: number };
export type TournamentPlayerSortMode = "focus" | "overall" | "rarity";

export function emptyTrainingFocus(): TrainingFocus {
  return { attack: 0, playmaking: 0, defense: 0 };
}

export function trainingFocusTotal(focus: TrainingFocus) {
  return focus.attack + focus.playmaking + focus.defense;
}

export function isGoalkeeper(character: Pick<Character, "position" | "alternative_positions">) {
  return [character.position, ...character.alternative_positions].some((position) => position.split("/").includes("GK"));
}

const GOALKEEPER_FOCUS_KEYS = ["reflexes", "diving", "positioning"] as const;

function capAttribute(value: number, bonus: number) {
  return Math.min(99, Number((value + bonus).toFixed(2)));
}

export function sortTournamentPlayers(players: TournamentCharacter[], sortMode: TournamentPlayerSortMode = "focus") {
  return [...players].sort((left, right) => {
    if (sortMode === "overall") return right.currentOverall - left.currentOverall;
    if (sortMode === "rarity") return right.stars - left.stars || right.currentOverall - left.currentOverall;
    return trainingFocusTotal(right.focus) - trainingFocusTotal(left.focus) || right.stars - left.stars;
  });
}

export function applyTrainingFocus(character: Character, focus: TrainingFocus): Character {
  const attributes = { ...character.attributes };
  attributes.shooting = capAttribute(attributes.shooting, focus.attack * TRAINING_MAIN_BONUS);
  attributes.pace = capAttribute(attributes.pace, focus.attack * TRAINING_SUB_BONUS);
  attributes.passing = capAttribute(attributes.passing, focus.playmaking * TRAINING_MAIN_BONUS);
  attributes.dribbling = capAttribute(attributes.dribbling, focus.playmaking * TRAINING_SUB_BONUS);
  if (isGoalkeeper(character)) {
    attributes.goalkeeping = Object.fromEntries(
      Object.entries(attributes.goalkeeping).map(([key, value]) => [
        key,
        typeof value === "number" && (GOALKEEPER_FOCUS_KEYS as readonly string[]).includes(key)
          ? capAttribute(value, focus.defense * TRAINING_MAIN_BONUS)
          : value,
      ]),
    );
  } else {
    attributes.defending = capAttribute(attributes.defending, focus.defense * TRAINING_MAIN_BONUS);
  }
  attributes.physical = capAttribute(attributes.physical, focus.defense * TRAINING_SUB_BONUS);
  return { ...character, attributes };
}

function scaleAttribute(value: number, scale: number) {
  return Math.min(99, Number((value * scale).toFixed(2)));
}

// 星级强度系数只写入六维 + 门将 + 详细属性，不覆盖源 overall（后者仍供评分/对手校准等内部口径使用）。
function applyStarScale(character: Character): Character {
  const scale = STAR_ATTRIBUTE_SCALE[character.stars] ?? 1;
  if (scale === 1) return character;
  const attributes = { ...character.attributes };
  attributes.pace = scaleAttribute(attributes.pace, scale);
  attributes.shooting = scaleAttribute(attributes.shooting, scale);
  attributes.passing = scaleAttribute(attributes.passing, scale);
  attributes.dribbling = scaleAttribute(attributes.dribbling, scale);
  attributes.defending = scaleAttribute(attributes.defending, scale);
  attributes.physical = scaleAttribute(attributes.physical, scale);
  attributes.detailed = Object.fromEntries(Object.entries(attributes.detailed).map(([key, value]) => [key, typeof value === "number" ? scaleAttribute(value, scale) : value]));
  attributes.goalkeeping = Object.fromEntries(Object.entries(attributes.goalkeeping).map(([key, value]) => [key, typeof value === "number" ? scaleAttribute(value, scale) : value]));
  return { ...character, attributes };
}

export function applyTournamentProgress(character: Character, focus: TrainingFocus, breakthroughRank: number): Character {
  const scaled = applyStarScale(character);
  const focused = applyTrainingFocus(scaled, focus);
  const breakthroughPoints = Math.max(0, breakthroughRank) * .35;
  const addBreakthrough = (baseValue: number, focusedValue: number) => Math.min(99, Number((focusedValue + breakthroughPoints * (.65 + baseValue / 200)).toFixed(2)));
  return {
    ...focused,
    attributes: {
      ...focused.attributes,
      overall: Math.min(99, focused.attributes.overall + Math.floor(Math.max(0, breakthroughRank) / 2)),
      pace: addBreakthrough(scaled.attributes.pace, focused.attributes.pace),
      shooting: addBreakthrough(scaled.attributes.shooting, focused.attributes.shooting),
      passing: addBreakthrough(scaled.attributes.passing, focused.attributes.passing),
      dribbling: addBreakthrough(scaled.attributes.dribbling, focused.attributes.dribbling),
      defending: addBreakthrough(scaled.attributes.defending, focused.attributes.defending),
      physical: addBreakthrough(scaled.attributes.physical, focused.attributes.physical),
      detailed: Object.fromEntries(Object.entries(focused.attributes.detailed).map(([key, value]) => [key, addBreakthrough(scaled.attributes.detailed[key], value)])),
      goalkeeping: Object.fromEntries(Object.entries(focused.attributes.goalkeeping).map(([key, value]) => {
        const baseValue = scaled.attributes.goalkeeping[key];
        return [key, typeof value === "number" && typeof baseValue === "number" ? addBreakthrough(baseValue, value) : value];
      })),
    },
  };
}

function primaryRoleScore(character: Character) {
  const primary = character.position.split("/")[0];
  const position = primary === "CF" ? "ST" : primary as SlotPosition;
  return roleScore(primary === "CF" ? { ...character, position: "ST" } : character, position);
}

export function calculateTournamentCurrentOverall(character: Character, focus: TrainingFocus, breakthroughRank: number) {
  const scale = STAR_ATTRIBUTE_SCALE[character.stars] ?? 1;
  const breakthroughBonus = Math.floor(Math.max(0, breakthroughRank) / 2);
  const baseline = applyTournamentProgress(character, emptyTrainingFocus(), breakthroughRank);
  const progressed = applyTournamentProgress(character, focus, breakthroughRank);
  const trainingGain = primaryRoleScore(progressed) - primaryRoleScore(baseline);
  return Math.round(Math.min(99, character.attributes.overall * scale + trainingGain + breakthroughBonus));
}

export function buildTournamentCharacters(characters: Character[], squad: TournamentSquadState): TournamentCharacter[] {
  const charactersById = new Map([...characters, ...founderCharacters].map((character) => [character.character_id, character]));
  return Object.entries(squad.collection)
    .filter(([, copies]) => Number.isInteger(copies) && copies > 0)
    .map(([characterId, copies]) => {
      const character = charactersById.get(characterId);
      if (!character) return null;
      const progress = squad.characterProgress[characterId] ?? { focus: emptyTrainingFocus(), breakthroughRank: 0 };
      return {
        ...applyTournamentProgress(character, progress.focus, progress.breakthroughRank),
        ...progress,
        copies,
        currentOverall: calculateTournamentCurrentOverall(character, progress.focus, progress.breakthroughRank),
      };
    })
    .filter((character): character is TournamentCharacter => character !== null);
}

export function recommendedTrainingFocus(character: Pick<Character, "position" | "alternative_positions">): TrainingFocusId {
  const primary = character.position.split("/")[0];
  if (primary === "ST" || primary === "CF") return "attack";
  if (["CB", "LB", "RB", "LWB", "RWB", "CDM", "GK"].includes(primary)) return "defense";
  return "playmaking";
}

export function trainingFocusPreview(character: Character, focusId: TrainingFocusId) {
  const a = character.attributes;
  const meta = trainingFocusMeta[focusId];
  if (focusId === "attack") {
    return {
      main: { label: meta.mainLabel, before: a.shooting, after: capAttribute(a.shooting, TRAINING_MAIN_BONUS) },
      sub: { label: meta.subLabel, before: a.pace, after: capAttribute(a.pace, TRAINING_SUB_BONUS) },
    };
  }
  if (focusId === "playmaking") {
    return {
      main: { label: meta.mainLabel, before: a.passing, after: capAttribute(a.passing, TRAINING_MAIN_BONUS) },
      sub: { label: meta.subLabel, before: a.dribbling, after: capAttribute(a.dribbling, TRAINING_SUB_BONUS) },
    };
  }
  if (isGoalkeeper(character)) {
    const reflexes = a.goalkeeping.reflexes;
    return {
      main: {
        label: "门将三项",
        before: typeof reflexes === "number" ? reflexes : 0,
        after: typeof reflexes === "number" ? capAttribute(reflexes, TRAINING_MAIN_BONUS) : 0,
      },
      sub: { label: meta.subLabel, before: a.physical, after: capAttribute(a.physical, TRAINING_SUB_BONUS) },
    };
  }
  return {
    main: { label: meta.mainLabel, before: a.defending, after: capAttribute(a.defending, TRAINING_MAIN_BONUS) },
    sub: { label: meta.subLabel, before: a.physical, after: capAttribute(a.physical, TRAINING_SUB_BONUS) },
  };
}
