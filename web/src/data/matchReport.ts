import type { Character } from "./gameData";
import {
  attackFormations,
  cupFactionBondEffects,
  factionBondStates,
  recommendLineup,
  roleScore,
  teamCombatProfile,
  type FormationId,
  type FormationSlot,
  type Lineup,
  type MatchResult,
} from "./matchSimulator";
import { tournamentPreparationEffects, type ClubBlueprint, type TournamentStage } from "./tournamentJourney";

// 赛后归因总结（简单版）：确定性解析，不重跑模拟。见
// docs/archive/contest-2026-mini-game/round-2-improvements/11-post-match-attribution-summary-v1.md

export type AttributionKey = "formation_counter" | "squad_strength" | "lineup_fit" | "bond";

export type AttributionImpact = "big" | "small" | "none";
export type AttributionDirection = "up" | "down" | "even";

export type MatchAttributionLine = {
  key: AttributionKey;
  impact: AttributionImpact;
  direction: AttributionDirection;
  copy: string;
};

export type MatchAttribution = {
  lines: MatchAttributionLine[];
  luckCopy: string;
};

export const attributionKeyLabels: Record<AttributionKey, string> = {
  formation_counter: "阵型克制",
  squad_strength: "球员强度",
  lineup_fit: "阵容适配",
  bond: "羁绊",
};

export type MatchAttributionInput = {
  homePlayers: Character[];
  awayPlayers: Character[];
  homeLineup: Lineup;
  homeAttackFormationId: FormationId;
  homeDefenseFormationId: FormationId;
  awayLineup: Lineup;
  awayAttackFormationId: FormationId;
  awayDefenseFormationId: FormationId;
  opponent: Pick<ClubBlueprint, "attackFormationId" | "defenseFormationId">;
  stage: TournamentStage;
  result: MatchResult;
};

// 净强度差 → 内部档位（玩家侧不显示数值，只显示 impact/direction）。
const STRENGTH_BIG = 3;
const STRENGTH_SMALL = 1;

function classify(delta: number): { impact: AttributionImpact; direction: AttributionDirection } {
  const abs = Math.abs(delta);
  if (abs < STRENGTH_SMALL) return { impact: "none", direction: "even" };
  return { impact: abs >= STRENGTH_BIG ? "big" : "small", direction: delta > 0 ? "up" : "down" };
}

type LineupItem = { slot: FormationSlot; player: Character };

function lineupItems(lineup: Lineup, formationId: FormationId, characters: Character[]): LineupItem[] {
  const map = new Map(characters.map((character) => [character.character_id, character]));
  return attackFormations[formationId].slots
    .map((slot) => ({ slot, player: map.get(lineup[slot.id] ?? "") }))
    .filter((item): item is LineupItem => Boolean(item.player));
}

function lineupRoleTotal(lineup: Lineup, formationId: FormationId, characters: Character[]) {
  return lineupItems(lineup, formationId, characters).reduce((sum, { slot, player }) => sum + roleScore(player, slot.position), 0);
}

// 裸强度 = V2 三通道画像（含羁绊）− 羁绊映射，供「球员强度」行使用。
function nakedStrength(
  lineup: Lineup,
  attackFormationId: FormationId,
  _defenseFormationId: FormationId,
  characters: Character[],
) {
  const map = new Map(characters.map((character) => [character.character_id, character]));
  const raw = teamCombatProfile(lineup, attackFormationId, map);
  const items = lineupItems(lineup, attackFormationId, characters);
  const bond = cupFactionBondEffects(items.map(({ player }) => player));
  const creation = raw.creation - bond.attack - bond.possession * .6;
  const finishing = raw.finishing - bond.xg * 100;
  const prevention = raw.prevention - bond.defense;
  return { score: (creation + finishing + prevention + raw.goalkeeping * .25) / 3.25, bond };
}

const copyByDirection: Record<AttributionKey, Record<AttributionDirection, string>> = {
  formation_counter: {
    up: "阵型对位克制了对手。",
    down: "对方的打法克制了我们的阵型，下回合优先换成能反制它的阵型。",
    even: "阵型对位没有明显优劣势，可继续保持。",
  },
  squad_strength: {
    up: "我方球员整体更强，稳住节奏就好。",
    down: "对方个人能力更强，优先把训练和补强给到对位的关键位置。",
    even: "双方球员能力接近，胜负更看临场布置。",
  },
  lineup_fit: {
    up: "首发位置搭配到位，保持现状。",
    down: "有几个位置球员不太对口，可以微调一下首发。",
    even: "位置分工基本合理，无需大改。",
  },
  bond: {
    up: "羁绊已生效，正在影响比赛。",
    down: "羁绊尚未凑齐，可以留意同阵营球员。",
    even: "阵容还没激活羁绊，可以留意同阵营球员再凑一层。",
  },
};

function luckCopy(result: MatchResult): string {
  const xgDiff = result.homeXg - result.awayXg;
  const won = result.homeScore > result.awayScore;
  const lost = result.homeScore < result.awayScore;
  if (xgDiff > 0.4 && !won) return "这场机会更多但没把握住，运气略差，不必调整战术。";
  if (xgDiff < -0.4 && !lost) return "这场机会更少却把握住了，把握机会做得不错。";
  return "机会双方接近，结果基本合理。";
}

export function buildMatchAttribution(input: MatchAttributionInput): MatchAttribution {
  const {
    homePlayers,
    awayPlayers,
    homeLineup,
    homeAttackFormationId,
    homeDefenseFormationId,
    awayLineup,
    awayAttackFormationId,
    awayDefenseFormationId,
    opponent,
    stage,
    result,
  } = input;

  // 阵型克制：复用赛前准备效果（两轴合计 −4~+4 × 阶段系数）。
  const preparation = tournamentPreparationEffects({
    characters: homePlayers,
    lineup: homeLineup,
    attackFormationId: homeAttackFormationId,
    defenseFormationId: homeDefenseFormationId,
    opponent,
    stage,
  });
  const counterDelta = preparation.effects.attack ?? 0;
  const fullyCountersOpponent = preparation.layers.includes("进攻阵型克制")
    && preparation.layers.includes("防守阵型克制");

  // 球员强度：裸三通道画像（不含羁绊）的综合差，练级 + 抽卡合并（单场不可分）。
  const home = nakedStrength(homeLineup, homeAttackFormationId, homeDefenseFormationId, homePlayers);
  const away = nakedStrength(awayLineup, awayAttackFormationId, awayDefenseFormationId, awayPlayers);
  const strengthDelta = home.score - away.score;

  // 阵容适配：手动布阵 vs 自动贪心的位置职责分差（手动通常 ≤ 贪心，非正）。
  const manualScore = lineupRoleTotal(homeLineup, homeAttackFormationId, homePlayers);
  const recommended = recommendLineup(homePlayers, homeAttackFormationId, homeDefenseFormationId);
  const recommendedScore = lineupRoleTotal(recommended, homeAttackFormationId, homePlayers);
  const fitDelta = manualScore - recommendedScore;

  // 羁绊：按 V2 映射到创造 / 终结 / 防守；归因行只判断是否激活，不重复计入球员强度。
  const bond = home.bond;
  const bondActive = bond.attack + bond.defense + bond.xg + bond.possession > 0;
  const activeBondCount = factionBondStates(lineupItems(homeLineup, homeAttackFormationId, homePlayers).map(({ player }) => player))
    .filter(({ layers }) => layers > 0).length;

  const rows: Array<{ key: AttributionKey; delta: number }> = [
    { key: "formation_counter", delta: counterDelta },
    { key: "squad_strength", delta: strengthDelta },
    { key: "lineup_fit", delta: fitDelta },
  ];
  const lines: MatchAttributionLine[] = rows.map(({ key, delta }) => {
    const { impact, direction } = classify(delta);
    const copy = key === "formation_counter" && fullyCountersOpponent
      ? "本轮阵型完克对手，当心对手变阵。"
      : copyByDirection[key][direction];
    return { key, impact, direction, copy };
  });

  // 羁绊行独立判断：两个以上有效羁绊作为显著影响，单羁绊作为小幅影响。
  lines.push({
    key: "bond",
    impact: activeBondCount >= 2 ? "big" : bondActive ? "small" : "none",
    direction: bondActive ? "up" : "even",
    copy: activeBondCount >= 2 ? `本场激活了 ${activeBondCount} 个羁绊，已经形成显著加成。` : bondActive ? copyByDirection.bond.up : copyByDirection.bond.even,
  });

  return { lines, luckCopy: luckCopy(result) };
}
