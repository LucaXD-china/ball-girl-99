// 归因消融基线脚本：逐因素测量杯赛结果的影响占比（净胜率差 ΔP）与比赛随机噪声。
//
// 用法：
//   npm run simulate:ablation [-- --seeds 500 --stage round_of_16]
//
// 说明：
// - 只读测量，不修改任何运行代码与数据（晋级确认前保持版本稳定）。
// - 绕过全流程的抽卡/训练随机，直接喂 matchSimulator.simulateMatch，逐因素消融。
// - 「实际决策 vs 反事实」用同一批种子配对相减，抵消共同噪声（见 04-attribution-model.md 第七节）。
// - 对手用真实的 generateOpponent（位置均衡 + boost 到 stage attributeTarget）。
// - 凝聚力（rosterCohesion）是「低 overall 追分」的橡皮筋，会污染养成/抽卡的净贡献测量，
//   因此主表默认关闭凝聚力（cohesionOn=false）测「纯因素贡献」，最后一节单独报告凝聚力影响。

import { factionMeta, playableCharacters, type Character, type FactionId } from "../src/data/gameData";
import {
  attackFormations,
  compatibleDefenseFormations,
  cupFactionBondEffects,
  cupFactionBondProfiles,
  factionBondStates,
  positionFit,
  recommendLineup,
  roleScore,
  simulateMatch,
  type FormationId,
  type Lineup,
  type TeamMatchEffects,
} from "../src/data/matchSimulator";
import {
  clubBlueprints,
  counters,
  counterFormations,
  COUNTER_STRENGTH,
  generateOpponent,
  type ClubBlueprint,
  type GeneratedOpponent,
  type TournamentFixture,
  type TournamentStage,
} from "../src/data/tournamentJourney";
import {
  applyTournamentProgress,
  buildTournamentCharacters,
  emptyTrainingFocus,
  recommendedTrainingFocus,
  TOURNAMENT_STARTER_CHARACTER_IDS,
  type TournamentCharacter,
} from "../src/data/tournamentSquad";
import {
  openTournamentRecruitment,
  TOURNAMENT_PACK_SIZE,
  TOURNAMENT_RECRUITMENT_BUDGET,
} from "../src/data/tournamentRecruitment";

const DEFAULT_FORMATION: { attack: FormationId; defense: FormationId } = {
  attack: "4-2-3-1",
  defense: "4-4-2",
};

type SideSetup = {
  name: string;
  characters: Character[];
  lineup: Lineup;
  attackFormationId: FormationId;
  defenseFormationId: FormationId;
  matchEffects?: TeamMatchEffects;
};

type MatchOutcome = { win: boolean; draw: boolean; homeScore: number; awayScore: number };

const byId = new Map(playableCharacters.map((character) => [character.character_id, character]));

function starSquad(minStar: number, maxStar: number, count = 18): Character[] {
  const pool = playableCharacters.filter((character) => character.stars >= minStar && character.stars <= maxStar);
  const keeper = pool
    .filter((character) => character.position.split("/").includes("GK"))
    .sort((left, right) => right.attributes.overall - left.attributes.overall)[0];
  const rest = pool
    .filter((character) => character.character_id !== keeper?.character_id)
    .sort((left, right) => right.attributes.overall - left.attributes.overall);
  const picked = keeper ? [keeper, ...rest] : [...rest];
  return picked.slice(0, count).map((character) => applyTournamentProgress(character, emptyTrainingFocus(), 0));
}

// ---- 抽卡增量：固定 18 底座 + 60 抽的运气范围 ----
// 说明：玩家可选名单 = 固定初始阵容（TOURNAMENT_STARTER_CHARACTER_IDS，所有玩家一致）
//       + 随机 60 抽（唯一方差来源）。固定底座是常量（贡献均值/下限，ΔP=0），
//       「抽卡」因素应测的是叠加在底座之上的「抽卡运气增量」，而不是
//       全池重选的全高星 vs 全低星天花板（那比任何真实玩家都极端）。

const factionIds = (Object.keys(factionMeta) as FactionId[]).filter((factionId) => playableCharacters.some((character) => character.faction_id === factionId));

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// 复刻全流程抽卡：固定 18 底座（每人 copies=1）+ 60 抽（均衡阵营：首包樱华，之后选当前
// 球员数最少的阵营）+ 自动突破（rank = min(5, copies-1)）。返回的球员已应用突破加成。
function recruitOnTopOfStarters(drawSeed: number): TournamentCharacter[] {
  const collection: Record<string, number> = Object.fromEntries(
    TOURNAMENT_STARTER_CHARACTER_IDS.map((id) => [id, 1]),
  );
  let progress: { pullsSinceSixStar: number; firstTenGuaranteeUsed: boolean } = {
    pullsSinceSixStar: 0,
    firstTenGuaranteeUsed: false,
  };
  const random = seededRandom(drawSeed);
  for (let packIndex = 0; packIndex < TOURNAMENT_RECRUITMENT_BUDGET / TOURNAMENT_PACK_SIZE; packIndex += 1) {
    const factionId: FactionId = packIndex === 0
      ? "sakura_link"
      : factionIds.slice().sort((left, right) => {
          const leftCount = playableCharacters.filter((c) => c.faction_id === left && collection[c.character_id]).length;
          const rightCount = playableCharacters.filter((c) => c.faction_id === right && collection[c.character_id]).length;
          return leftCount - rightCount || factionIds.indexOf(left) - factionIds.indexOf(right);
        })[0];
    const opened = openTournamentRecruitment(playableCharacters, factionId, collection, progress, random, TOURNAMENT_PACK_SIZE);
    for (const { character } of opened.cards) {
      collection[character.character_id] = (collection[character.character_id] ?? 0) + 1;
    }
    progress = opened.nextProgress;
  }
  const characterProgress = Object.fromEntries(
    Object.entries(collection).map(([id, copies]) => [
      id,
      { breakthroughRank: Math.min(5, Math.max(0, copies - 1)), focus: emptyTrainingFocus() },
    ]),
  );
  return buildTournamentCharacters(playableCharacters, {
    collection,
    characterProgress,
    skillInventory: {},
    skillLoadouts: {},
  });
}

// 复刻自动注册：综合四套阵型的一键首发频率 + overall + 星级排序，保底两名门将。
function top18(players: TournamentCharacter[]): TournamentCharacter[] {
  const appearances = new Map<string, number>();
  for (const attackFormationId of Object.keys(attackFormations) as FormationId[]) {
    const lineup = recommendLineup(players, attackFormationId, compatibleDefenseFormations[attackFormationId][0]);
    for (const id of Object.values(lineup)) {
      if (id) appearances.set(id, (appearances.get(id) ?? 0) + 1);
    }
  }
  const ranked = [...players].sort((left, right) =>
    (appearances.get(right.character_id) ?? 0) - (appearances.get(left.character_id) ?? 0) ||
    right.attributes.overall - left.attributes.overall ||
    right.stars - left.stars ||
    left.character_id.localeCompare(right.character_id),
  );
  const keepers = ranked.filter((player) => player.position.split("/").includes("GK")).slice(0, 2);
  const selected = [...keepers];
  for (const player of ranked) {
    if (selected.some(({ character_id }) => character_id === player.character_id)) continue;
    selected.push(player);
    if (selected.length === 18) break;
  }
  return selected;
}

// 用比赛口径给「自动注册 18 人 + 推荐布阵」打分：进攻职责分均值 + 防守职责分均值 + 羁绊。
// 这是抽卡结果最终能兑现成的战力（对应 matchSimulator.sideStrength 的攻防合计），
// 比「平均 overall」更贴合「这次抽卡让我的球队变强了多少」。
function poolStrengthScore(players: Character[], attackFormationId: FormationId, defenseFormationId: FormationId): number {
  const lineup = recommendLineup(players, attackFormationId, defenseFormationId);
  const byId = new Map(players.map((player) => [player.character_id, player]));
  let attack = 0;
  let defense = 0;
  let count = 0;
  for (const slot of attackFormations[attackFormationId].slots) {
    const player = byId.get(lineup[slot.id] ?? "");
    if (!player) continue;
    attack += roleScore(player, slot.position);
    defense += slot.position === "GK"
      ? roleScore(player, "GK")
      : player.attributes.defending * .55 + player.attributes.physical * .25 + player.attributes.pace * .2;
    count += 1;
  }
  if (!count) return 0;
  const bonds = cupFactionBondEffects(
    attackFormations[attackFormationId].slots
      .map((slot) => byId.get(lineup[slot.id] ?? ""))
      .filter((player): player is Character => Boolean(player)),
  );
  return attack / count + bonds.attack + defense / count + bonds.defense;
}

// 抽卡增量端点：固定 18 底座 + 60 抽，取多次抽卡序列中「可布阵容战力」的 P90（好抽）与
// P10（差抽）。用比赛口径战力打分，避免用天花板式的全高星/全低星重选整池
// （那比任何真实玩家都极端，会夸大玩家实际经历的抽卡运气方差）。
function gachaIncrementSquads(
  attackFormationId: FormationId,
  defenseFormationId: FormationId,
  drawSamples = 200,
): { lucky: Character[]; unlucky: Character[] } {
  const scored = Array.from({ length: drawSamples }, (_, index) => {
    const registered = top18(recruitOnTopOfStarters(0x5eed + index * 7919));
    const score = poolStrengthScore(registered, attackFormationId, defenseFormationId);
    return { score, registered };
  }).sort((left, right) => left.score - right.score);
  const lucky = scored[Math.min(scored.length - 1, Math.floor(scored.length * 0.9))];
  const unlucky = scored[Math.max(0, Math.floor(scored.length * 0.1))];
  return { lucky: lucky.registered, unlucky: unlucky.registered };
}

// 标准抽卡结果（确定性 60 抽）：用于「养成 / 阵容阵型 / 对手风格 / 比赛随机」等非抽卡因素，
// 把基线从「裸底座不抽卡」换成「抽卡后」，避免因 ① 底座变弱而虚高养成 ΔP。
const STANDARD_DRAW_SEED = 0x57d0000;
const standardDrawnPlayers: TournamentCharacter[] = recruitOnTopOfStarters(STANDARD_DRAW_SEED);
const standardDrawnIds = top18(standardDrawnPlayers).map((player) => player.character_id);

// 在标准抽卡结果上施加指定练度（保持该次抽卡的突破不变）。
function standardDrawnSquad(points: number): Character[] {
  return standardDrawnPlayers.map((player) => {
    const base = byId.get(player.character_id);
    if (!base) throw new Error(`未知球员：${player.character_id}`);
    const direction = recommendedTrainingFocus(base);
    return applyTournamentProgress(base, {
      attack: direction === "attack" ? points : 0,
      playmaking: direction === "playmaking" ? points : 0,
      defense: direction === "defense" ? points : 0,
    }, player.breakthroughRank);
  });
}

function fixtureFor(blueprint: ClubBlueprint, stage: TournamentStage): TournamentFixture {
  return { id: `ablate-${blueprint.id}`, stage, leg: 1, day: 1, opponentBlueprintId: blueprint.id };
}

function opponentSide(blueprint: ClubBlueprint, stage: TournamentStage, registeredIds: string[]): SideSetup {
  const opponent = generateOpponent(fixtureFor(blueprint, stage), 1, registeredIds, []);
  return {
    name: opponent.name,
    characters: opponent.characters,
    lineup: opponent.lineup,
    attackFormationId: opponent.attackFormationId,
    defenseFormationId: opponent.defenseFormationId,
  };
}

function toOpponentSide(opponent: GeneratedOpponent): SideSetup {
  return {
    name: opponent.name,
    characters: opponent.characters,
    lineup: opponent.lineup,
    attackFormationId: opponent.attackFormationId,
    defenseFormationId: opponent.defenseFormationId,
  };
}

// 复刻 tournamentPreparationEffects，增加 cohesionOn 开关：凝聚力是低 overall 追分橡皮筋，
// 会反转养成/抽卡的净贡献测量，故主表默认关闭。
function prepEffects(args: {
  characters: Character[];
  lineup: Lineup;
  attackFormationId: FormationId;
  defenseFormationId: FormationId;
  opponent: ClubBlueprint;
  stage: TournamentStage;
  cohesionOn: boolean;
}): TeamMatchEffects {
  const map = new Map(args.characters.map((character) => [character.character_id, character]));
  const layers: string[] = [];
  let strength = 0;
  let xg = 0;
  const attackWins = counters(args.attackFormationId, args.opponent.defenseFormationId);
  const attackLoses = counters(args.opponent.defenseFormationId, args.attackFormationId);
  if (attackWins) { layers.push("进攻阵型克制"); strength += COUNTER_STRENGTH; xg += .0035; }
  if (attackLoses) { layers.push("进攻阵型被克制"); strength -= COUNTER_STRENGTH; xg -= .0035; }
  const defenseWins = counters(args.defenseFormationId, args.opponent.attackFormationId);
  const defenseLoses = counters(args.opponent.attackFormationId, args.defenseFormationId);
  if (defenseWins) { layers.push("防守阵型克制"); strength += COUNTER_STRENGTH; xg += .0035; }
  if (defenseLoses) { layers.push("防守阵型被克制"); strength -= COUNTER_STRENGTH; xg -= .0035; }
  let rosterCohesion = 0;
  if (args.cohesionOn && layers.length >= 2) {
    const starters = Object.values(args.lineup).map((id) => map.get(id ?? "")).filter((character): character is Character => Boolean(character));
    const averageOverall = starters.reduce((sum, character) => sum + character.attributes.overall, 0) / Math.max(starters.length, 1);
    rosterCohesion = Math.min(5.5, Math.max(0, (87 - averageOverall) * .85));
  }
  strength += rosterCohesion;
  xg += rosterCohesion * .0007;
  const stageScale = args.stage === "round_of_16" ? .72 : args.stage === "quarter_final" ? .75 : args.stage === "semi_final" ? .92 : 1;
  strength *= stageScale;
  xg *= stageScale;
  return { attack: strength, defense: strength, xg };
}

function playerSide(
  name: string,
  characters: Character[],
  attackFormationId: FormationId,
  defenseFormationId: FormationId,
  opponent: ClubBlueprint,
  stage: TournamentStage,
  cohesionOn: boolean,
): SideSetup {
  const lineup = recommendLineup(characters, attackFormationId, defenseFormationId);
  const matchEffects = prepEffects({
    characters,
    lineup,
    attackFormationId,
    defenseFormationId,
    opponent,
    stage,
    cohesionOn,
  });
  return { name, characters, lineup, attackFormationId, defenseFormationId, matchEffects };
}

// 阵营羁绊（阵营 buff）只由首发 11 人的 faction_id 计数决定（同阵营 ≥3 激活一层），
// 不影响布阵与任何属性。消融口径（见 04 第七节「羁绊」）：保持布阵/球员不变，仅把已激活
// 羁绊加成置 0——用「重打首发 faction_id」实现，其余完全一致，配对同一批种子求 ΔP。
function retagStartingFactions(
  players: Character[],
  lineup: Lineup,
  attackFormationId: FormationId,
  target: FactionId | null,
): Character[] {
  const starters = attackFormations[attackFormationId].slots
    .map((slot) => lineup[slot.id])
    .filter((id): id is string => Boolean(id));
  const others = target ? factionIds.filter((id) => id !== target) : factionIds;
  const assignment = new Map<string, FactionId>();
  starters.forEach((id, index) => {
    // target != null：前 3 名首发归入目标阵营（激活该阵营一层羁绊），其余 8 名用剩余 7 阵营
    // 轮转铺开（最多 2 人同阵营，不会再触发第二层）。target == null：11 人全部轮转铺开，
    // 保证没有任何阵营达到 3 人 → 羁绊清零。
    const factionId = target && index < 3
      ? target
      : others[(index - (target ? 3 : 0) + others.length * 4) % others.length];
    assignment.set(id, factionId);
  });
  return players.map((player) => {
    const factionId = assignment.get(player.character_id);
    return factionId ? { ...player, faction_id: factionId } : player;
  });
}

function retagStartingBondSet(
  players: Character[],
  lineup: Lineup,
  attackFormationId: FormationId,
  targets: FactionId[],
): Character[] {
  const starters = attackFormations[attackFormationId].slots
    .map((slot) => lineup[slot.id])
    .filter((id): id is string => Boolean(id));
  const others = factionIds.filter((id) => !targets.includes(id));
  const assignment = new Map<string, FactionId>();
  starters.forEach((id, index) => {
    const target = targets[Math.floor(index / 3)];
    assignment.set(id, target ?? others[(index - targets.length * 3 + others.length * 4) % others.length]);
  });
  return players.map((player) => {
    const factionId = assignment.get(player.character_id);
    return factionId ? { ...player, faction_id: factionId } : player;
  });
}

// 把一名球员的六维统一下调 delta（用于「高能力值 → 低能力值」的换人容差测量）。
// 六维职责分权重之和为 1，故原生位置下调 delta ≈ 该位置职责分差 delta；overall 标签不参与比赛计算，不在这里动。
function reduceSix(player: Character, delta: number): Character {
  const a = player.attributes;
  return {
    ...player,
    attributes: {
      ...a,
      pace: Math.max(1, a.pace - delta),
      shooting: Math.max(1, a.shooting - delta),
      passing: Math.max(1, a.passing - delta),
      dribbling: Math.max(1, a.dribbling - delta),
      defending: Math.max(1, a.defending - delta),
      physical: Math.max(1, a.physical - delta),
    },
  };
}

function play(home: SideSetup, away: SideSetup, seed: number): MatchOutcome {
  const result = simulateMatch({
    characters: [...home.characters, ...away.characters],
    homeLineup: home.lineup,
    homeAttackFormationId: home.attackFormationId,
    homeDefenseFormationId: home.defenseFormationId,
    awayLineup: away.lineup,
    awayAttackFormationId: away.attackFormationId,
    awayDefenseFormationId: away.defenseFormationId,
    fixtureSeed: seed >>> 0,
    homeMatchEffects: home.matchEffects,
    homeName: home.name,
    awayName: away.name,
  });
  return { win: result.homeScore > result.awayScore, draw: result.homeScore === result.awayScore, homeScore: result.homeScore, awayScore: result.awayScore };
}

function pairedDelta(strong: SideSetup, weak: SideSetup, away: SideSetup, seedStart: number, n: number) {
  let sum = 0;
  let strongWin = 0;
  let weakWin = 0;
  let strongDraw = 0;
  let weakDraw = 0;
  for (let index = 0; index < n; index += 1) {
    const seed = (seedStart + index) >>> 0;
    const a = play(strong, away, seed);
    const b = play(weak, away, seed);
    sum += Number(a.win) - Number(b.win);
    strongWin += Number(a.win);
    weakWin += Number(b.win);
    strongDraw += Number(a.draw);
    weakDraw += Number(b.draw);
  }
  return {
    delta: sum / n,
    strongWin: strongWin / n,
    weakWin: weakWin / n,
    strongDraw: strongDraw / n,
    weakDraw: weakDraw / n,
  };
}

function winRateAgainst(home: SideSetup, away: SideSetup, seedStart: number, n: number) {
  let win = 0;
  let draw = 0;
  for (let index = 0; index < n; index += 1) {
    const outcome = play(home, away, (seedStart + index) >>> 0);
    win += Number(outcome.win);
    draw += Number(outcome.draw);
  }
  return { win: win / n, draw: draw / n };
}

function std(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

// 在单调递减的「δ → 胜率」曲线上找胜率打平 baseline 的 δ*（线性插值）。
function breakEven(baselineWin: number, curve: { delta: number; win: number }[]): string {
  if (!curve.length) return "?";
  if (curve[0].win <= baselineWin) return "≤0";
  for (let index = 1; index < curve.length; index += 1) {
    if (curve[index].win <= baselineWin) {
      const left = curve[index - 1];
      const right = curve[index];
      const t = (baselineWin - left.win) / (right.win - left.win);
      return (left.delta + t * (right.delta - left.delta)).toFixed(1);
    }
  }
  return `>${curve[curve.length - 1].delta}`;
}

function parseArgs(argv: string[]) {
  const options = { seeds: 500, stage: "round_of_16" as TournamentStage };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") return null;
    const value = argv[++index];
    if (flag === "--seeds") options.seeds = Number(value);
    else if (flag === "--stage") options.stage = value as TournamentStage;
    else throw new Error(`未知选项：${flag}`);
  }
  if (!Number.isSafeInteger(options.seeds) || options.seeds < 1) throw new Error("--seeds 必须是正整数");
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    console.log(`归因消融基线脚本
用法：npm run simulate:ablation [-- --seeds 500 --stage round_of_16]

  --seeds <数量>   每个端点的配对种子数，默认 500
  --stage <stage>  round_of_16 | quarter_final | semi_final | final（决定对手 attributeTarget 与 stageScale）`);
    return;
  }
  const { seeds, stage } = options;
  const seedStart = 1;

  // 参考对手选 4-4-2（铁幕城）：其克制阵型是 3-5-2/4-4-2，与固定默认阵型 4-2-3-1/4-4-2 不同，
  // 使「阵容阵型」消融非退化（若选 4-3-3 对手，默认阵型恰是其克制阵型，ΔP 恒为 0）。
  const referenceBlueprint = clubBlueprints.find((blueprint) => blueprint.attackFormationId === "4-4-2") ?? clubBlueprints[0];
  const referenceOpponent = generateOpponent(fixtureFor(referenceBlueprint, stage), 1, standardDrawnIds, []);
  const counter = counterFormations(referenceBlueprint);

  const report: string[] = [];
  const line = (text: string) => report.push(text);
  line(`归因消融基线（seeds=${seeds}, stage=${stage}，凝聚力已关闭以测纯因素贡献）`);
  line(`参考对手：${referenceBlueprint.name}（${referenceBlueprint.attackFormationId}/${referenceBlueprint.defenseFormationId}，克制 ${counter.attackFormationId}/${counter.defenseFormationId}）`);
  line("");

  // 一、养成：满练 → 0练（标准抽卡后，只变练度）
  {
    const lv6 = standardDrawnSquad(6);
    const lv0 = standardDrawnSquad(0);
    const strong = playerSide("我方", lv6, counter.attackFormationId, counter.defenseFormationId, referenceBlueprint, stage, false);
    const weak = playerSide("我方", lv0, counter.attackFormationId, counter.defenseFormationId, referenceBlueprint, stage, false);
    const result = pairedDelta(strong, weak, toOpponentSide(referenceOpponent), seedStart, seeds);
    line(`一、养成（训练，标准抽卡后）  满练(练度6) → 0练`);
    line(`   ΔP = ${pct(result.delta)}   满练胜率 ${pct(result.strongWin)}（平 ${pct(result.strongDraw)}） → 0练胜率 ${pct(result.weakWin)}（平 ${pct(result.weakDraw)}）`);
    line("");
  }

  // 二、抽卡增量：好 60 抽(P90) → 差 60 抽(P10)，都叠加在固定 18 底座上（同一参考对手，配对）。
  // 固定 18 底座对所有玩家一致（常量），只贡献均值/下限，不进 ΔP；「抽卡」测的是叠加其上的运气增量。
  {
    const { lucky, unlucky } = gachaIncrementSquads(counter.attackFormationId, counter.defenseFormationId);
    const strong = playerSide("我方", lucky, counter.attackFormationId, counter.defenseFormationId, referenceBlueprint, stage, false);
    const weak = playerSide("我方", unlucky, counter.attackFormationId, counter.defenseFormationId, referenceBlueprint, stage, false);
    const result = pairedDelta(strong, weak, toOpponentSide(referenceOpponent), seedStart, seeds);
    line(`二、抽卡增量（固定18底座 + 60抽运气）  好抽(P90) → 差抽(P10)`);
    line(`   ΔP = ${pct(result.delta)}   好抽胜率 ${pct(result.strongWin)}（平 ${pct(result.strongDraw)}） → 差抽胜率 ${pct(result.weakWin)}（平 ${pct(result.weakDraw)}）`);

    // 参考：整池天花板（全高星 vs 全低星）——比任何真实玩家都极端，仅供对照上限，不作为抽卡因素。
    const high = starSquad(5, 6);
    const low = starSquad(3, 4);
    const highIds = high.map((character) => character.character_id);
    const lowIds = low.map((character) => character.character_id);
    const strongCeil = playerSide("我方", high, counter.attackFormationId, counter.defenseFormationId, referenceBlueprint, stage, false);
    const weakCeil = playerSide("我方", low, counter.attackFormationId, counter.defenseFormationId, referenceBlueprint, stage, false);
    const ceilHigh = winRateAgainst(strongCeil, opponentSide(referenceBlueprint, stage, highIds), seedStart, seeds);
    const ceilLow = winRateAgainst(weakCeil, opponentSide(referenceBlueprint, stage, lowIds), seedStart, seeds);
    line(`   参考·整池天花板 全高星(5-6★)→全低星(3-4★)：ΔP ≈ ${pct(ceilHigh.win - ceilLow.win)}（${pct(ceilHigh.win)} → ${pct(ceilLow.win)}，非配对）`);
    line("");
  }

  // 三、阵容阵型：克制 → 默认（标准抽卡后练度3，只变阵型）
  {
    const lv3 = standardDrawnSquad(3);
    const strong = playerSide("我方", lv3, counter.attackFormationId, counter.defenseFormationId, referenceBlueprint, stage, false);
    const weak = playerSide("我方", lv3, DEFAULT_FORMATION.attack, DEFAULT_FORMATION.defense, referenceBlueprint, stage, false);
    const result = pairedDelta(strong, weak, toOpponentSide(referenceOpponent), seedStart, seeds);
    line(`三、阵容阵型  克制(${counter.attackFormationId}/${counter.defenseFormationId}) → 默认(${DEFAULT_FORMATION.attack}/${DEFAULT_FORMATION.defense})`);
    line(`   ΔP = ${pct(result.delta)}   克制胜率 ${pct(result.strongWin)} → 默认胜率 ${pct(result.weakWin)}`);
    line("");
  }

  // 四、对手风格：同强度换阵型（题不同，我方固定）
  {
    const lv3 = standardDrawnSquad(3);
    const home = playerSide("我方", lv3, DEFAULT_FORMATION.attack, DEFAULT_FORMATION.defense, referenceBlueprint, stage, false);
    const seen = new Set<FormationId>();
    const blueprints = clubBlueprints.filter((blueprint) => {
      if (seen.has(blueprint.attackFormationId)) return false;
      seen.add(blueprint.attackFormationId);
      return true;
    });
    const rates = blueprints.map((blueprint) => {
      // 每个风格用 generateOpponent 各自生成「适配该阵型」的对手，避免固定 11 人换阵导致的适配失真。
      const away = opponentSide(blueprint, stage, standardDrawnIds);
      return { blueprint, ...winRateAgainst(home, away, seedStart, seeds) };
    });
    const spread = Math.max(...rates.map((rate) => rate.win)) - Math.min(...rates.map((rate) => rate.win));
    line(`四、对手风格（同强度换阵型，我方固定默认阵型）`);
    for (const rate of rates) {
      line(`   ${rate.blueprint.attackFormationId.padEnd(7)} ${rate.blueprint.name.padEnd(5)} 胜率 ${pct(rate.win)}（平 ${pct(rate.draw)}）`);
    }
    line(`   胜率极差（风格影响） = ${pct(spread)}`);
    line("");
  }

  // 五、比赛随机：同强度跨种子分布
  {
    const lv3 = standardDrawnSquad(3);
    const home = playerSide("我方", lv3, DEFAULT_FORMATION.attack, DEFAULT_FORMATION.defense, referenceBlueprint, stage, false);
    let win = 0;
    let draw = 0;
    const goalDiff: number[] = [];
    for (let index = 0; index < seeds; index += 1) {
      const outcome = play(home, toOpponentSide(referenceOpponent), (seedStart + index) >>> 0);
      win += Number(outcome.win);
      draw += Number(outcome.draw);
      goalDiff.push(outcome.homeScore - outcome.awayScore);
    }
    line(`五、比赛随机（同强度跨 ${seeds} 种子）`);
    line(`   胜 ${pct(win / seeds)} / 平 ${pct(draw / seeds)} / 负 ${pct(1 - win / seeds - draw / seeds)}`);
    line(`   比分差 σ = ${std(goalDiff).toFixed(2)}（均值 ${(goalDiff.reduce((a, b) => a + b, 0) / goalDiff.length).toFixed(2)}）`);
    line("");
  }

  // 六、凝聚力影响（开启后，纯因素贡献被橡皮筋反转）
  {
    const counterAlt = counter;
    line(`六、凝聚力影响（cohesionOn=true，与主表对比）`);
    {
      const lv6 = standardDrawnSquad(6);
      const lv0 = standardDrawnSquad(0);
      const strong = playerSide("我方", lv6, counterAlt.attackFormationId, counterAlt.defenseFormationId, referenceBlueprint, stage, true);
      const weak = playerSide("我方", lv0, counterAlt.attackFormationId, counterAlt.defenseFormationId, referenceBlueprint, stage, true);
      const result = pairedDelta(strong, weak, toOpponentSide(referenceOpponent), seedStart, seeds);
      line(`   养成 满练→0练（开凝聚力）：ΔP = ${pct(result.delta)}（满练 ${pct(result.strongWin)} → 0练 ${pct(result.weakWin)}）`);
    }
    {
      const { lucky, unlucky } = gachaIncrementSquads(counterAlt.attackFormationId, counterAlt.defenseFormationId);
      const strong = playerSide("我方", lucky, counterAlt.attackFormationId, counterAlt.defenseFormationId, referenceBlueprint, stage, true);
      const weak = playerSide("我方", unlucky, counterAlt.attackFormationId, counterAlt.defenseFormationId, referenceBlueprint, stage, true);
      const result = pairedDelta(strong, weak, toOpponentSide(referenceOpponent), seedStart, seeds);
      line(`   抽卡增量 好抽(P90)→差抽(P10)（开凝聚力）：ΔP = ${pct(result.delta)}（好抽 ${pct(result.strongWin)} → 差抽 ${pct(result.weakWin)}）`);
    }
    {
      const lv3 = standardDrawnSquad(3);
      const strong = playerSide("我方", lv3, counterAlt.attackFormationId, counterAlt.defenseFormationId, referenceBlueprint, stage, true);
      const weak = playerSide("我方", lv3, DEFAULT_FORMATION.attack, DEFAULT_FORMATION.defense, referenceBlueprint, stage, true);
      const result = pairedDelta(strong, weak, toOpponentSide(referenceOpponent), seedStart, seeds);
      line(`   阵容阵型 克制→默认（开凝聚力）：ΔP = ${pct(result.delta)}（克制 ${pct(result.strongWin)} → 默认 ${pct(result.weakWin)}）`);
    }
  }

  // 七、阵营羁绊（阵营 buff）：布阵/球员不变，仅把已激活羁绊加成置 0（口径见 04 第七节「羁绊」）。
  {
    const lv3 = standardDrawnSquad(3);
    const lineup = recommendLineup(lv3, DEFAULT_FORMATION.attack, DEFAULT_FORMATION.defense);
    const byIdMap = new Map(lv3.map((player) => [player.character_id, player]));
    const starters = attackFormations[DEFAULT_FORMATION.attack].slots
      .map((slot) => byIdMap.get(lineup[slot.id] ?? ""))
      .filter((player): player is Character => Boolean(player));
    const activeBonds = factionBondStates(starters).filter((bond) => bond.layers > 0);

    const opponent = toOpponentSide(referenceOpponent);
    const onSide = playerSide("我方", lv3, DEFAULT_FORMATION.attack, DEFAULT_FORMATION.defense, referenceBlueprint, stage, false);
    const offSide = playerSide(
      "我方",
      retagStartingFactions(lv3, lineup, DEFAULT_FORMATION.attack, null),
      DEFAULT_FORMATION.attack,
      DEFAULT_FORMATION.defense,
      referenceBlueprint,
      stage,
      false,
    );
    onSide.lineup = lineup;
    offSide.lineup = lineup;

    line(`七、阵营羁绊（阵营 buff，标准抽卡后练度3，默认阵型 vs ${referenceBlueprint.name}）`);
    line(`   标准抽卡首发实际激活：${activeBonds.length
      ? activeBonds.map((bond) => `${cupFactionBondProfiles[bond.factionId].name}（${cupFactionBondProfiles[bond.factionId].effectLabel}）`).join("、")
      : "无（均衡抽卡未凑出任意三人同阵营）"}`);
    const total = pairedDelta(onSide, offSide, opponent, seedStart, seeds);
    line(`   全部羁绊 开 → 关：ΔP = ${pct(total.delta)}   开 ${pct(total.strongWin)}（平 ${pct(total.strongDraw)}） → 关 ${pct(total.weakWin)}（平 ${pct(total.weakDraw)}）`);

    const threeBondSide = playerSide(
      "我方",
      retagStartingBondSet(lv3, lineup, DEFAULT_FORMATION.attack, ["fog_court", "iron_engine", "samba_union"]),
      DEFAULT_FORMATION.attack,
      DEFAULT_FORMATION.defense,
      referenceBlueprint,
      stage,
      false,
    );
    threeBondSide.lineup = lineup;
    const threeBond = pairedDelta(threeBondSide, offSide, opponent, seedStart, seeds);
    line(`   强制三羁绊（进攻+防守+终结）→ 无羁绊：ΔP = ${pct(threeBond.delta)}   三羁绊 ${pct(threeBond.strongWin)} → 无羁绊 ${pct(threeBond.weakWin)}`);

    // 逐类型孤立：只激活「一类」羁绊 vs 完全无羁绊，测每类 buff 各自的 ΔP。
    const channelCases: { label: string; faction: FactionId }[] = [
      { label: "进攻 +2.4（雾都王庭/高卢鸢尾）", faction: "fog_court" },
      { label: "防守 +6.0（钢铁引擎/苍蓝堡垒）", faction: "iron_engine" },
      { label: "控球率 +4.5%（赤红斗牛/樱华连结）", faction: "scarlet_toros" },
      { label: "射门进球概率 +5%（桑巴联盟/潘帕斯银辉）", faction: "samba_union" },
    ];
    for (const channel of channelCases) {
      const channelOn = playerSide(
        "我方",
        retagStartingFactions(lv3, lineup, DEFAULT_FORMATION.attack, channel.faction),
        DEFAULT_FORMATION.attack,
        DEFAULT_FORMATION.defense,
        referenceBlueprint,
        stage,
        false,
      );
      channelOn.lineup = lineup;
      const result = pairedDelta(channelOn, offSide, opponent, seedStart, seeds);
      line(`   仅「${channel.label}」孤立 ΔP = ${pct(result.delta)}   有羁绊 ${pct(result.strongWin)} → 无羁绊 ${pct(result.weakWin)}`);
    }
    line("");
  }

  // 八、羁绊 vs 换人能力值容差：把首发一名原生位置球员的六维统一下调 δ（≈ 该位置职责分差 δ），
  // 同时凑齐一个羁绊，与「不换人、不凑羁绊」同种子对比，取胜率打平的 δ*（正数=该羁绊值得承受的换人能力差）。
  {
    const lv3 = standardDrawnSquad(3);
    const lineup = recommendLineup(lv3, DEFAULT_FORMATION.attack, DEFAULT_FORMATION.defense);
    const byIdMap = new Map(lv3.map((player) => [player.character_id, player]));
    const swapSlot = attackFormations[DEFAULT_FORMATION.attack].slots.find((slot) => {
      if (slot.position === "GK") return false;
      const player = byIdMap.get(lineup[slot.id] ?? "");
      return player ? positionFit(player, slot.position) === 1 : false;
    }) ?? attackFormations[DEFAULT_FORMATION.attack].slots.find((slot) => slot.position !== "GK");
    const swapId = lineup[swapSlot.id];
    const swapPlayer = byIdMap.get(swapId ?? "");
    const swapRole = swapPlayer && swapSlot ? roleScore(swapPlayer, swapSlot.position) : 0;

    const opponent = toOpponentSide(referenceOpponent);
    const buildSide = (characters: Character[]): SideSetup => {
      const side = playerSide("我方", characters, DEFAULT_FORMATION.attack, DEFAULT_FORMATION.defense, referenceBlueprint, stage, false);
      side.lineup = lineup;
      return side;
    };
    const swapSeeds = Math.max(seeds, 3000);
    const baseline = buildSide(retagStartingFactions(lv3, lineup, DEFAULT_FORMATION.attack, null));
    const baselineWin = winRateAgainst(baseline, opponent, seedStart, swapSeeds).win;

    const deltas = [0, 2, 4, 6, 8, 10, 12, 14];
    const channels: { label: string; faction: FactionId }[] = [
      { label: "进攻 +2.4（雾都/高卢）", faction: "fog_court" },
      { label: "防守 +6.0（钢铁/苍蓝）", faction: "iron_engine" },
      { label: "控球率 +4.5%（赤红/樱华）", faction: "scarlet_toros" },
      { label: "射门概率 +5%（桑巴/潘帕斯）", faction: "samba_union" },
    ];

    line(`八、羁绊 vs 换人能力值容差（标准抽卡后练度3，默认阵型 vs ${referenceBlueprint.name}）`);
    line(`   换人位置 ${swapSlot.position}（原职责分 ${swapRole.toFixed(1)}）：六维各降 δ（≈该位置职责分差 δ）并凑齐一个羁绊，`);
    line(`   与「不换人、不凑羁绊」（胜率 ${pct(baselineWin)}）同种子对比，取胜率打平的 δ*。`);
    for (const channel of channels) {
      const curve = deltas.map((delta) => ({
        delta,
        win: winRateAgainst(
          buildSide(retagStartingFactions(
            lv3.map((player) => (player.character_id === swapId ? reduceSix(player, delta) : player)),
            lineup,
            DEFAULT_FORMATION.attack,
            channel.faction,
          )),
          opponent,
          seedStart,
          swapSeeds,
        ).win,
      }));
      line(`   ${channel.label}   δ* ≈ ${breakEven(baselineWin, curve)} 分   [${curve.map((point) => `${point.delta}:${pct(point.win)}`).join(" ")}]`);
    }
    line("");
  }

  // 九、训练方向：同一总练度下，全练防守 / 全练组织 / 全练进攻 / 按位置推荐 谁更值（突破一致）。
  {
    const away = toOpponentSide(referenceOpponent);
    const trainAll = (points: number, focusId: "attack" | "playmaking" | "defense") => standardDrawnPlayers.map((player) => {
      const base = byId.get(player.character_id);
      if (!base) throw new Error(`未知球员：${player.character_id}`);
      return applyTournamentProgress(base, {
        attack: focusId === "attack" ? points : 0,
        playmaking: focusId === "playmaking" ? points : 0,
        defense: focusId === "defense" ? points : 0,
      }, player.breakthroughRank);
    });
    const untrained = standardDrawnPlayers.map((player) => {
      const base = byId.get(player.character_id);
      if (!base) throw new Error(`未知球员：${player.character_id}`);
      return applyTournamentProgress(base, emptyTrainingFocus(), player.breakthroughRank);
    });
    const formationCases = [
      { label: "克制阵型", attackFormationId: counter.attackFormationId, defenseFormationId: counter.defenseFormationId },
      { label: "默认阵型", attackFormationId: DEFAULT_FORMATION.attack, defenseFormationId: DEFAULT_FORMATION.defense },
    ];
    line(`九、训练方向（同一总练度、突破一致 vs ${referenceBlueprint.name}）`);
    for (const formationCase of formationCases) {
      line(`   [${formationCase.label} ${formationCase.attackFormationId}/${formationCase.defenseFormationId}]`);
      for (const points of [1, 3, 6]) {
        const cases = [
          { label: "按位置推荐", characters: standardDrawnSquad(points) },
          { label: "全练防守", characters: trainAll(points, "defense") },
          { label: "全练组织", characters: trainAll(points, "playmaking") },
          { label: "全练进攻", characters: trainAll(points, "attack") },
          { label: "不训练", characters: untrained },
        ];
        const rates = cases
          .map((item) => ({
            label: item.label,
            ...winRateAgainst(
              playerSide("我方", item.characters, formationCase.attackFormationId, formationCase.defenseFormationId, referenceBlueprint, stage, false),
              away,
              seedStart,
              seeds,
            ),
          }))
          .sort((left, right) => right.win - left.win);
        line(`     练度 ${points}：${rates.map((rate) => `${rate.label} ${pct(rate.win)}`).join("  |  ")}`);
      }
    }
    line("");
  }

  console.log(report.join("\n"));
}

main();
