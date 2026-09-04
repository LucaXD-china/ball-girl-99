import { founderCharacters, opponentRoster, roster, type Character, type FactionId } from "./gameData";
import { attackFormations, compatibleDefenseFormations, completeLineup, formationAbilityForSlot, positionFit, type FormationId, type Lineup, type TeamMatchEffects } from "./matchSimulator";
import { configurableSkills, isSkillCompatible, skillQualityRank } from "./skillData";
import { STORY_OPPONENT_IDS } from "./opponentStories";
import { tournamentCaptainRoutes, type OpponentRarityBonus, type TournamentCaptainId } from "./tournamentCaptain";
import { applyTournamentProgress, emptyTrainingFocus } from "./tournamentSquad";

export const TOURNAMENT_DAYS = 99;
export const TOURNAMENT_ROSTER_SIZE = 18;
export const TOURNAMENT_PLAYER_CLUB_ID = "player_club";
// 抽签日(Day 2)后的正式备战起始日。赛历按「每个窗口都是 TRAINING_DAY_COST 整数倍」铺排，
// 使整届不产生被吞掉的 1–4 天尾巴：Day 1 补强+注册、Day 2 抽签、Day 3 起备战。
export const TOURNAMENT_PREPARATION_START_DAY = 3;

export type TournamentStage = "round_of_16" | "quarter_final" | "semi_final" | "final";
export type ClubHeritageId = FactionId | "cape_voyagers";

export type ClubBlueprint = {
  id: string;
  name: string;
  shortName: string;
  nickname: string;
  heritageFactionId: ClubHeritageId;
  crestUrl: string;
  attackFormationId: FormationId;
  defenseFormationId: FormationId;
  keyRoles: string[];
  skillBias: string[];
  strengths: string[];
  weaknesses: string[];
  baseStrength: number;
};

export type TournamentFixture = {
  id: string;
  stage: TournamentStage;
  leg: 1 | 2;
  day: number;
  opponentBlueprintId: string;
};

export type GeneratedOpponent = {
  blueprintId: string;
  name: string;
  shortName: string;
  nickname: string;
  crestUrl: string;
  stage: TournamentStage;
  characters: Array<Character & { tournamentCoreBonus?: number }>;
  lineup: Lineup;
  attackFormationId: FormationId;
  defenseFormationId: FormationId;
  templateCharacterIds: string[];
  skillLoadouts: Record<string, string[]>;
  seed: number;
};

export const stageOrder: TournamentStage[] = ["round_of_16", "quarter_final", "semi_final", "final"];
export const stageMeta: Record<TournamentStage, { name: string }> = {
  round_of_16: { name: "16强" },
  quarter_final: { name: "八强" },
  semi_final: { name: "半决赛" },
  final: { name: "决赛" },
};

export const opponentRarityTargets: Record<TournamentStage, { fiveStar: number; sixStar: number }> = {
  round_of_16: { fiveStar: 1, sixStar: 0 },
  quarter_final: { fiveStar: 2, sixStar: 1 },
  semi_final: { fiveStar: 3, sixStar: 2 },
  final: { fiveStar: 4, sixStar: 3 },
};

export const nativeSixStarShareByStage: Record<TournamentStage, number> = {
  round_of_16: 0.25,
  quarter_final: 0.5,
  semi_final: 0.75,
  final: 1,
};

export function nativeSixStarTargetForStage(stage: TournamentStage, sixStarTarget: number) {
  return Math.ceil(sixStarTarget * nativeSixStarShareByStage[stage]);
}

function progressiveRarityCounts(total: number, maximum: number) {
  const counts = [0, 0, 0, 0];
  const allocationOrder = [3, 2, 3, 1, 2, 3, 3, 2, 1, 0];
  for (let index = 0; index < Math.min(total, maximum); index += 1) counts[allocationOrder[index]] += 1;
  return counts;
}

export function opponentRarityTargetForPool(stage: TournamentStage, fiveStarPool: number, sixStarPool: number) {
  const stageIndex = stageOrder.indexOf(stage);
  return {
    fiveStar: progressiveRarityCounts(fiveStarPool, 10)[stageIndex],
    sixStar: progressiveRarityCounts(sixStarPool, 6)[stageIndex],
  };
}

const crest = (id: string) => `/assets/opponents/club-crests-v1/${id}.svg`;

export const playerClub = { name: "待命名俱乐部", shortName: "我方", nickname: "新生球队", crestUrl: "/assets/clubs/player-club-crest-v1.svg" };

export const clubBlueprints: ClubBlueprint[] = [
  { id: "lumiere_crown", name: "流光竞技", shortName: "流光", nickname: "王冠", heritageFactionId: "gaul_iris", crestUrl: crest("lumiere_crown"), attackFormationId: "4-3-3", defenseFormationId: "4-4-2", keyRoles: ["爆发边锋", "肋部创造者"], skillBias: ["速度", "终结"], strengths: ["边路单点爆破", "禁区前换位"], weaknesses: ["边后卫身后", "高位回防距离"], baseStrength: 95 },
  { id: "north_foundry", name: "北境联队", shortName: "北境", nickname: "铸造师", heritageFactionId: "fog_court", crestUrl: crest("north_foundry"), attackFormationId: "4-3-3", defenseFormationId: "4-3-3", keyRoles: ["压迫前锋", "覆盖中场"], skillBias: ["压迫", "制空"], strengths: ["高位反抢", "定位球二点"], weaknesses: ["第一线身后", "反向转移"], baseStrength: 94 },
  { id: "alpine_engine", name: "山岳竞技", shortName: "山岳", nickname: "引擎", heritageFactionId: "iron_engine", crestUrl: crest("alpine_engine"), attackFormationId: "4-2-3-1", defenseFormationId: "4-4-2", keyRoles: ["前插中场", "冲击边锋"], skillBias: ["身体", "速度"], strengths: ["纵向冲击", "连续压迫"], weaknesses: ["压迫后的中路", "边中卫外侧"], baseStrength: 96 },
  { id: "ivory_capital", name: "白曜城", shortName: "白曜", nickname: "王都", heritageFactionId: "scarlet_toros", crestUrl: crest("ivory_capital"), attackFormationId: "4-4-2", defenseFormationId: "4-4-2", keyRoles: ["节拍中场", "禁区终结者"], skillBias: ["控球", "终结"], strengths: ["中场控序", "强侧配合"], weaknesses: ["弱侧转换", "回追落位"], baseStrength: 98 },
  { id: "blue_moon_lab", name: "苍月竞技", shortName: "苍月", nickname: "实验家", heritageFactionId: "fog_court", crestUrl: crest("blue_moon_lab"), attackFormationId: "3-5-2", defenseFormationId: "4-2-3-1", keyRoles: ["出球中卫", "肋部创造者"], skillBias: ["传球", "跑位"], strengths: ["耐心控球", "肋部渗透"], weaknesses: ["丢球后第一点", "禁区后点"], baseStrength: 96 },
  { id: "crimson_mosaic", name: "绯红联队", shortName: "绯红", nickname: "拼图师", heritageFactionId: "scarlet_toros", crestUrl: crest("crimson_mosaic"), attackFormationId: "4-3-3", defenseFormationId: "4-3-3", keyRoles: ["组织中场", "技术边锋"], skillBias: ["盘带", "短传"], strengths: ["小范围传切", "边中轮转"], weaknesses: ["身体对抗", "直接纵传"], baseStrength: 94 },
  { id: "red_tide_union", name: "赤潮联队", shortName: "赤潮", nickname: "浪潮", heritageFactionId: "fog_court", crestUrl: crest("red_tide_union"), attackFormationId: "4-3-3", defenseFormationId: "4-3-3", keyRoles: ["冲刺边锋", "扫荡后腰"], skillBias: ["速度", "压迫"], strengths: ["转换冲刺", "前场围抢"], weaknesses: ["阵地节奏", "压迫落空"], baseStrength: 95 },
  { id: "indigo_serpents", name: "靛蓝竞技", shortName: "靛蓝", nickname: "银蛇", heritageFactionId: "azure_fortress", crestUrl: crest("indigo_serpents"), attackFormationId: "3-5-2", defenseFormationId: "3-5-2", keyRoles: ["制空中卫", "双锋支点"], skillBias: ["防守", "制空"], strengths: ["三中卫保护", "双锋协作"], weaknesses: ["翼卫身后", "横向拉扯"], baseStrength: 93 },
  { id: "iron_bastion", name: "铁幕城", shortName: "铁幕", nickname: "守卫", heritageFactionId: "scarlet_toros", crestUrl: crest("iron_bastion"), attackFormationId: "4-4-2", defenseFormationId: "4-4-2", keyRoles: ["扫荡后腰", "反击支点"], skillBias: ["防守", "对抗"], strengths: ["低位密度", "快速纵传"], weaknesses: ["两线之间", "持续控球消耗"], baseStrength: 92 },
  { id: "ruhr_swarm", name: "黄金联队", shortName: "黄金", nickname: "蜂群", heritageFactionId: "iron_engine", crestUrl: crest("ruhr_swarm"), attackFormationId: "4-2-3-1", defenseFormationId: "4-3-3", keyRoles: ["前腰", "压迫前锋"], skillBias: ["跑动", "速度"], strengths: ["年轻冲击", "前腰串联"], weaknesses: ["压迫出口", "经验波动"], baseStrength: 89 },
  { id: "eternal_legion", name: "永恒竞技", shortName: "永恒", nickname: "军团", heritageFactionId: "azure_fortress", crestUrl: crest("eternal_legion"), attackFormationId: "3-5-2", defenseFormationId: "3-5-2", keyRoles: ["制空中卫", "反击支点"], skillBias: ["防守", "终结"], strengths: ["禁区合围", "支点反击"], weaknesses: ["边路宽度", "翼卫回收"], baseStrength: 88 },
  { id: "emerald_lions", name: "翡翠联队", shortName: "翡翠", nickname: "绿帆", heritageFactionId: "cape_voyagers", crestUrl: crest("emerald_lions"), attackFormationId: "3-5-2", defenseFormationId: "3-5-2", keyRoles: ["往返翼卫", "覆盖中场"], skillBias: ["跑动", "对抗"], strengths: ["翼卫往返", "中路夹击"], weaknesses: ["身后空间", "转换落位"], baseStrength: 87 },
  { id: "violet_comets", name: "紫晶城", shortName: "紫晶", nickname: "彗星", heritageFactionId: "fog_court", crestUrl: crest("violet_comets"), attackFormationId: "4-2-3-1", defenseFormationId: "4-4-2", keyRoles: ["自由前腰", "推进后腰"], skillBias: ["传球", "速度"], strengths: ["前腰移动", "高质量推进"], weaknesses: ["后腰两侧", "高压出球"], baseStrength: 89 },
  { id: "azure_gulf", name: "蔚蓝竞技", shortName: "蔚蓝", nickname: "海湾", heritageFactionId: "azure_fortress", crestUrl: crest("azure_gulf"), attackFormationId: "4-3-3", defenseFormationId: "4-4-2", keyRoles: ["内收边锋", "组织边卫"], skillBias: ["创造", "终结"], strengths: ["左路组织", "禁区外创造"], weaknesses: ["另一侧保护", "回合速度"], baseStrength: 91 },
  { id: "saxon_gale", name: "赤电联队", shortName: "赤电", nickname: "疾风", heritageFactionId: "iron_engine", crestUrl: crest("saxon_gale"), attackFormationId: "4-2-3-1", defenseFormationId: "4-3-3", keyRoles: ["冲击前锋", "前插中场"], skillBias: ["速度", "压迫"], strengths: ["垂直推进", "二次进攻"], weaknesses: ["控球耐心", "压迫出口"], baseStrength: 88 },
];

const fixtureDays: Array<Omit<TournamentFixture, "opponentBlueprintId">> = [
  { id: "r16-1", stage: "round_of_16", leg: 1, day: 18 }, { id: "r16-2", stage: "round_of_16", leg: 2, day: 29 },
  { id: "qf-1", stage: "quarter_final", leg: 1, day: 45 }, { id: "qf-2", stage: "quarter_final", leg: 2, day: 56 },
  { id: "sf-1", stage: "semi_final", leg: 1, day: 72 }, { id: "sf-2", stage: "semi_final", leg: 2, day: 83 },
  { id: "final", stage: "final", leg: 1, day: 99 },
];

export function hashSeed(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function fixtureSeed(campaignSeed: number, fixtureId: string, leg: number) {
  return hashSeed(`${campaignSeed}|${fixtureId}|${leg}`);
}

// 克制 4 循环：counterOf(X) = 克制 X 的阵型（纯函数，攻防阵型都沿用同一条循环）。
function counterOf(formation: FormationId): FormationId {
  if (formation === "3-5-2") return "4-3-3";
  if (formation === "4-3-3") return "4-2-3-1";
  if (formation === "4-4-2") return "3-5-2";
  return "4-4-2"; // 4-2-3-1
}

// home 阵型是否在 4 循环里克制 away 阵型。
export function counters(home: FormationId, away: FormationId): boolean {
  return counterOf(away) === home;
}

// 推荐克制（2×2 交叉）：我攻克彼防、我防克彼攻；防守只取「能由该进攻阵型自然切换」的兼容项，
// 避免推荐一个玩家在 UI 里选不出来的防守阵型。
export function counterFormations(blueprint: Pick<ClubBlueprint, "attackFormationId" | "defenseFormationId">): { attackFormationId: FormationId; defenseFormationId: FormationId } {
  const attackFormationId = counterOf(blueprint.defenseFormationId);
  const idealDefense = counterOf(blueprint.attackFormationId);
  const compatible = compatibleDefenseFormations[attackFormationId];
  const defenseFormationId = compatible.find((defense) => counters(defense, blueprint.attackFormationId))
    ?? compatible.find((defense) => !counters(blueprint.attackFormationId, defense))
    ?? compatible[0];
  return { attackFormationId, defenseFormationId };
}

// 阵型克制强度（对称、零和）：克制对手 +X，被对手克制 -X。攻防两条轴各判一次克制，
// 用对称制避免把「人人必用的推荐阵型」加成抬成全员强队的通胀。
export const COUNTER_STRENGTH = 2.0;

export function tournamentPreparationEffects(args: {
  characters: Character[];
  lineup: Lineup;
  attackFormationId: FormationId;
  defenseFormationId: FormationId;
  opponent: Pick<ClubBlueprint, "attackFormationId" | "defenseFormationId">;
  stage?: TournamentStage;
}): { effects: TeamMatchEffects; layers: string[] } {
  const layers: string[] = [];
  let strength = 0;
  let xg = 0;
  // 进攻轴：我攻 vs 彼防
  const attackWins = counters(args.attackFormationId, args.opponent.defenseFormationId);
  const attackLoses = counters(args.opponent.defenseFormationId, args.attackFormationId);
  if (attackWins) { layers.push("进攻阵型克制"); strength += COUNTER_STRENGTH; xg += .0035; }
  if (attackLoses) { layers.push("进攻阵型被克制"); strength -= COUNTER_STRENGTH; xg -= .0035; }
  // 防守轴：我防 vs 彼攻
  const defenseWins = counters(args.defenseFormationId, args.opponent.attackFormationId);
  const defenseLoses = counters(args.opponent.attackFormationId, args.defenseFormationId);
  if (defenseWins) { layers.push("防守阵型克制"); strength += COUNTER_STRENGTH; xg += .0035; }
  if (defenseLoses) { layers.push("防守阵型被克制"); strength -= COUNTER_STRENGTH; xg -= .0035; }
  const stageScale = args.stage === "round_of_16" ? .72 : args.stage === "quarter_final" ? .75 : args.stage === "semi_final" ? .92 : 1;
  strength *= stageScale;
  xg *= stageScale;
  return { effects: { attack: strength, defense: strength, xg }, layers };
}

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(values: T[], seed: number) {
  const items = [...values];
  const next = random(seed);
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(next() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

export function aiWinner(left: string, right: string, seed: number, round: number, pair: number) {
  if (left === TOURNAMENT_PLAYER_CLUB_ID) return right;
  if (right === TOURNAMENT_PLAYER_CLUB_ID) return left;
  const a = clubBlueprints.find(({ id }) => id === left)!;
  const b = clubBlueprints.find(({ id }) => id === right)!;
  const noise = (random(hashSeed(`${seed}|ai|${round}|${pair}`))() - .5) * 14;
  return a.baseStrength - b.baseStrength + noise >= 0 ? left : right;
}

function arrangeBracketForRoute(drawnBracket: string[], route: string[]) {
  const playerIndex = drawnBracket.indexOf(TOURNAMENT_PLAYER_CLUB_ID);
  const playerR16Match = playerIndex >> 1;
  const playerQuarterFinal = playerIndex >> 2;
  const playerSemiFinal = playerIndex >> 3;
  const fixedSlots = new Map<number, string>([
    [playerIndex ^ 1, route[0]],
    [(playerR16Match ^ 1) * 2, route[1]],
    [(playerQuarterFinal ^ 1) * 4, route[2]],
    [(playerSemiFinal ^ 1) * 8, route[3]],
  ]);
  const reserved = new Set([TOURNAMENT_PLAYER_CLUB_ID, ...route]);
  const remaining = drawnBracket.filter((id) => !reserved.has(id));
  const bracket: Array<string | undefined> = Array.from({ length: drawnBracket.length });
  bracket[playerIndex] = TOURNAMENT_PLAYER_CLUB_ID;
  for (const [slot, id] of fixedSlots) bracket[slot] = id;
  for (let index = 0, remainingIndex = 0; index < bracket.length; index += 1) {
    if (bracket[index] === undefined) bracket[index] = remaining[remainingIndex++];
  }
  return bracket as string[];
}

export function generateTournament(seed: number, captainId: TournamentCaptainId = "saya") {
  const captainRoute = tournamentCaptainRoutes[captainId];
  const drawnBracket = shuffle([TOURNAMENT_PLAYER_CLUB_ID, ...clubBlueprints.map(({ id }) => id)], hashSeed(`${seed}|bracket`));
  const naturalRoute: string[] = [];
  let entrants = drawnBracket;
  for (let round = 0; round < 4; round += 1) {
    const next: string[] = [];
    for (let pair = 0; pair < entrants.length; pair += 2) {
      const left = entrants[pair];
      const right = entrants[pair + 1];
      if (left === TOURNAMENT_PLAYER_CLUB_ID || right === TOURNAMENT_PLAYER_CLUB_ID) {
        naturalRoute.push(left === TOURNAMENT_PLAYER_CLUB_ID ? right : left);
        next.push(TOURNAMENT_PLAYER_CLUB_ID);
      } else next.push(aiWinner(left, right, seed, round, pair / 2));
    }
    entrants = next;
  }
  const earlyOpponents = shuffle(clubBlueprints.map(({ id }) => id).filter((id) => !STORY_OPPONENT_IDS.includes(id as typeof STORY_OPPONENT_IDS[number])), hashSeed(`${seed}|early-route`));
  const storyOpponents = shuffle([...STORY_OPPONENT_IDS], hashSeed(`${seed}|story-route`));
  const route: string[] = [];
  for (const candidate of naturalRoute.slice(0, 2)) {
    route.push(!STORY_OPPONENT_IDS.includes(candidate as typeof STORY_OPPONENT_IDS[number]) && !route.includes(candidate)
      ? candidate
      : earlyOpponents.find((id) => !route.includes(id))!);
  }
  if (captainRoute.semiFinalFounderId) route.push(storyOpponents[0]);
  else route.push(earlyOpponents.find((id) => !route.includes(id))!);
  route.push(storyOpponents.find((id) => !route.includes(id))!);
  const bracket = arrangeBracketForRoute(drawnBracket, route);
  return {
    bracket,
    route,
    fixtures: fixtureDays.map((fixture) => ({ ...fixture, opponentBlueprintId: route[stageOrder.indexOf(fixture.stage)] })),
  };
}

type OpponentPromotionPlan = Record<string, { baseStars: 3 | 4; targetStars: 5 | 6; targetRoleScore: number }>;

function opponentTemplateLineup(
  available: Character[],
  blueprint: ClubBlueprint,
  targets: { fiveStar: number; sixStar: number },
  stage: TournamentStage,
  previouslyUsedIds: Set<string>,
  existingLineup: Lineup = {},
): { lineup: Lineup; promotions: OpponentPromotionPlan } {
  const lineup: Lineup = { ...existingLineup };
  const promotions: OpponentPromotionPlan = {};
  const usedIds = new Set(Object.values(lineup).filter((id): id is string => Boolean(id)));
  const substitutedNativeIds = new Set<string>();
  const slots = attackFormations[blueprint.attackFormationId].slots;
  for (const [stars, target] of [[6, targets.sixStar], [5, targets.fiveStar]] as const) {
    const nativeTarget = stars === 6 ? nativeSixStarTargetForStage(stage, target) : target;
    for (let index = 0; index < target; index += 1) {
      const nativePlacements = available
        .filter((character) => character.stars === stars && !usedIds.has(character.character_id) && !substitutedNativeIds.has(character.character_id))
        .flatMap((character) => slots
          .filter((slot) => !lineup[slot.id] && !(positionFit(character, "GK") === 1 && slot.position !== "GK"))
          .map((slot) => ({
            character,
            slot,
            natural: positionFit(character, slot.position) === 1,
            score: formationAbilityForSlot(character, slot, blueprint.defenseFormationId),
          })))
        .sort((left, right) => {
          if (left.natural !== right.natural) return Number(right.natural) - Number(left.natural);
          return right.score - left.score;
        });
      const baseline = nativePlacements[0];
      const promotionPlacements = available
        .filter((character) => (character.stars === 3 || character.stars === 4) && !usedIds.has(character.character_id))
        .flatMap((character) => slots
          .filter((slot) => !lineup[slot.id] && (!baseline || slot.id === baseline.slot.id) && positionFit(character, slot.position) === 1)
          .map((slot) => ({ character, slot, score: formationAbilityForSlot(character, slot, blueprint.defenseFormationId) })))
        .sort((left, right) => Number(previouslyUsedIds.has(left.character.character_id)) - Number(previouslyUsedIds.has(right.character.character_id))
          || right.character.stars - left.character.stars
          || right.score - left.score);
      const promoted = promotionPlacements[0];
      const reserveNativeSixStar = stars === 6 && index >= nativeTarget;
      const replaceRepeatedNative = stars === 5 || reserveNativeSixStar;
      if (promoted && (reserveNativeSixStar || !baseline || !baseline.natural || (replaceRepeatedNative && previouslyUsedIds.has(baseline.character.character_id)))) {
        const targetRoleScore = baseline
          ? formationAbilityForSlot(applyTournamentProgress(baseline.character, emptyTrainingFocus(), 0), baseline.slot, blueprint.defenseFormationId)
          : promotionTargetRoleScore(stars, promoted.slot, blueprint.defenseFormationId);
        lineup[promoted.slot.id] = promoted.character.character_id;
        usedIds.add(promoted.character.character_id);
        if (baseline) substitutedNativeIds.add(baseline.character.character_id);
        promotions[promoted.character.character_id] = { baseStars: promoted.character.stars as 3 | 4, targetStars: stars, targetRoleScore };
      } else if (baseline) {
        lineup[baseline.slot.id] = baseline.character.character_id;
        usedIds.add(baseline.character.character_id);
      } else break;
    }
  }
  if (!lineup.gk) {
    const goalkeeperSlot = slots.find(({ position }) => position === "GK")!;
    const goalkeeper = available
      .filter((character) => !usedIds.has(character.character_id) && positionFit(character, "GK") === 1 && character.stars <= 4)
      .sort((left, right) => Number(previouslyUsedIds.has(left.character_id)) - Number(previouslyUsedIds.has(right.character_id))
        || formationAbilityForSlot(right, goalkeeperSlot, blueprint.defenseFormationId) - formationAbilityForSlot(left, goalkeeperSlot, blueprint.defenseFormationId))[0]
      ?? available.filter((character) => !usedIds.has(character.character_id) && positionFit(character, "GK") === 1)
        .sort((left, right) => formationAbilityForSlot(right, goalkeeperSlot, blueprint.defenseFormationId) - formationAbilityForSlot(left, goalkeeperSlot, blueprint.defenseFormationId))[0];
    if (!goalkeeper) throw new Error("无法为对手生成天然门将");
    lineup.gk = goalkeeper.character_id;
    usedIds.add(goalkeeper.character_id);
  }
  const candidates = available.filter((character) => (character.stars <= 4 && positionFit(character, "GK") !== 1) || usedIds.has(character.character_id));
  return { lineup: completeLineup(candidates, blueprint.attackFormationId, blueprint.defenseFormationId, lineup), promotions };
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const promotionTargetRoleScoreCache = new Map<string, number>();
const promotionTierOverallCache = new Map<5 | 6, number>();

function promotionTargetRoleScore(targetStars: 5 | 6, slot: (typeof attackFormations)[FormationId]["slots"][number], defenseFormationId: FormationId) {
  const key = `${targetStars}|${slot.position}`;
  const cached = promotionTargetRoleScoreCache.get(key);
  if (cached !== undefined) return cached;
  const target = Math.max(...roster.characters.filter(({ stars }) => stars === targetStars).map((character) => {
    const natural = { ...character, position: slot.position, alternative_positions: [] };
    return formationAbilityForSlot(applyTournamentProgress(natural, emptyTrainingFocus(), 0), slot, defenseFormationId);
  }));
  promotionTargetRoleScoreCache.set(key, target);
  return target;
}

function normalizePromotedOpponent(character: Character, targetStars: 5 | 6, targetRoleScore: number, slot: (typeof attackFormations)[FormationId]["slots"][number], defenseFormationId: FormationId) {
  const currentRoleScore = formationAbilityForSlot(character, slot, defenseFormationId);
  const scale = targetRoleScore / Math.max(currentRoleScore, 1);
  const scaledValue = (value: number) => Math.min(99, Number((value * scale).toFixed(2)));
  const tierOverall = promotionTierOverallCache.get(targetStars)
    ?? median(roster.characters.filter(({ stars }) => stars === targetStars).map(({ attributes }) => attributes.overall));
  promotionTierOverallCache.set(targetStars, tierOverall);
  return {
    ...character,
    attributes: {
      ...character.attributes,
      overall: tierOverall,
      pace: scaledValue(character.attributes.pace),
      shooting: scaledValue(character.attributes.shooting),
      passing: scaledValue(character.attributes.passing),
      dribbling: scaledValue(character.attributes.dribbling),
      defending: scaledValue(character.attributes.defending),
      physical: scaledValue(character.attributes.physical),
      detailed: Object.fromEntries(Object.entries(character.attributes.detailed).map(([key, value]) => [key, scaledValue(value)])),
      goalkeeping: Object.fromEntries(Object.entries(character.attributes.goalkeeping).map(([key, value]) => [key, typeof value === "number" ? scaledValue(value) : value])),
    },
  };
}

export function adaptOpponentForSecondLeg(
  opponent: GeneratedOpponent,
  firstLegContext: Pick<import("./matchSimulator").TournamentMatchContext, "homeAttackFormationId" | "homeDefenseFormationId"> | undefined,
): GeneratedOpponent {
  if (!firstLegContext) return opponent;
  const playerCounteredBothAxes = counters(firstLegContext.homeAttackFormationId, opponent.defenseFormationId)
    && counters(firstLegContext.homeDefenseFormationId, opponent.attackFormationId);
  if (!playerCounteredBothAxes) return opponent;
  const formations = counterFormations({
    attackFormationId: firstLegContext.homeAttackFormationId,
    defenseFormationId: firstLegContext.homeDefenseFormationId,
  });
  return {
    ...opponent,
    ...formations,
    lineup: completeLineup(opponent.characters, formations.attackFormationId, formations.defenseFormationId, {}),
  };
}

export function generateOpponent(
  fixture: TournamentFixture,
  campaignSeed: number,
  registeredIds: string[],
  usedTemplateIds: string[],
  captainId: TournamentCaptainId = "saya",
  opponentRarityBonus: OpponentRarityBonus = tournamentCaptainRoutes[captainId].opponentRarityByStage[fixture.stage],
): GeneratedOpponent {
  const captainRoute = tournamentCaptainRoutes[captainId];
  const blueprint = clubBlueprints.find(({ id }) => id === fixture.opponentBlueprintId)!;
  const blocked = new Set([...registeredIds, ...captainRoute.excludedOpponentFounderIds]);
  const rarityTargets = { ...opponentRarityTargets[fixture.stage] };
  rarityTargets.fiveStar += opponentRarityBonus.fiveStar;
  rarityTargets.sixStar += opponentRarityBonus.sixStar;
  // 已登场模板只降级为后备选择；自然位置低星可临时升星补位，以稳定配额并降低跨轮重复。
  const available = shuffle(roster.characters.filter(({ character_id }) => !blocked.has(character_id)), hashSeed(`${campaignSeed}|opponent|${fixture.stage}`));
  if (!available.some(({ position }) => position === "GK")) {
    const reusableGoalkeeper = shuffle(roster.characters.filter(({ character_id, position }) => position === "GK" && !registeredIds.includes(character_id)), hashSeed(`${campaignSeed}|opponent-keeper|${fixture.stage}`))[0];
    if (reusableGoalkeeper) available.push(reusableGoalkeeper);
  }
  // 锁定该队两名对手专属核心到天然槽位（docs/21 方案）。核心为固定 5/6★ 卡，占掉名额后
  // 剩余高星由共享池 + 同位置升星补位承担，保证总高星数仍等于分轮配额。
  const clubCores = opponentRoster.characters.filter(({ opponent_club_id }) => opponent_club_id === blueprint.id);
  const coreLineup: Lineup = {};
  for (const core of clubCores) {
    const slot = attackFormations[blueprint.attackFormationId].slots.find(({ position }) => position === core.position);
    if (!slot) throw new Error(`对手核心 ${core.character_id} 没有天然首发槽位`);
    coreLineup[slot.id] = core.character_id;
    if (core.stars === 6) rarityTargets.sixStar = Math.max(0, rarityTargets.sixStar - 1);
    else rarityTargets.fiveStar = Math.max(0, rarityTargets.fiveStar - 1);
  }
  const founderId = fixture.stage === "semi_final" ? captainRoute.semiFinalFounderId : fixture.stage === "final" ? captainRoute.finalFounderId : null;
  let founderAssignedPosition: Character["position"] | null = null;
  const lockedLineup: Lineup = { ...coreLineup };
  if (founderId) {
    const founder = founderCharacters.find(({ character_id }) => character_id === founderId)!;
    const slots = attackFormations[blueprint.attackFormationId].slots;
    const preferred = (fixture.stage === "semi_final"
      ? slots.filter(({ position }) => ["RW", "RM", "LW", "LM", "ST", "CAM"].includes(position))
      : slots.filter(({ position }) => ["CAM", "CM", "CDM", "RM", "LM"].includes(position)))
      .filter(({ id }) => !lockedLineup[id]);
    const exactRw = fixture.stage === "semi_final" ? preferred.find(({ position }) => position === "RW") : undefined;
    const targetSlot = (exactRw ? [exactRw] : preferred)
      .sort((left, right) => formationAbilityForSlot(founder, right, blueprint.defenseFormationId) - formationAbilityForSlot(founder, left, blueprint.defenseFormationId))[0];
    if (!targetSlot) throw new Error("赛事核心球员没有可用的首发位置");
    founderAssignedPosition = targetSlot.position;
    lockedLineup[targetSlot.id] = founderId;
    rarityTargets.fiveStar = Math.max(0, rarityTargets.fiveStar - 1);
  }
  const generated = opponentTemplateLineup(available, blueprint, rarityTargets, fixture.stage, new Set(usedTemplateIds), lockedLineup);
  const templateLineup = generated.lineup;
  const templateCharacterIds = Object.values(templateLineup).filter((id): id is string => Boolean(id));
  if (new Set(templateCharacterIds).size !== 11) throw new Error("无法从剩余球员模板生成合法对手首发");
  const characterPool = [...roster.characters, ...founderCharacters, ...opponentRoster.characters];
  const lineupSlots = attackFormations[blueprint.attackFormationId].slots;
  const characters = templateCharacterIds.map((id) => {
    const character = characterPool.find(({ character_id }) => character_id === id)!;
    const promotion = generated.promotions[id];
    const promoted = promotion ? { ...character, stars: promotion.targetStars } : character;
    const scaled = applyTournamentProgress(promoted, emptyTrainingFocus(), 0);
    const slot = lineupSlots.find(({ id: slotId }) => templateLineup[slotId] === id)!;
    const normalized = promotion ? normalizePromotedOpponent(scaled, promotion.targetStars, promotion.targetRoleScore, slot, blueprint.defenseFormationId) : scaled;
    return {
      ...normalized,
      character_id: id,
      alternative_positions: id === founderId && founderAssignedPosition ? [founderAssignedPosition] : normalized.alternative_positions,
      opponentPromotion: promotion ? { baseStars: promotion.baseStars, targetStars: promotion.targetStars } : undefined,
      tournamentOpponentBondFactionId: blueprint.heritageFactionId,
    };
  });
  const maxQualityRank = fixture.stage === "round_of_16" ? skillQualityRank.blue : fixture.stage === "quarter_final" ? skillQualityRank.purple : skillQualityRank.gold;
  const skillLoadouts = Object.fromEntries(characters.map((character, index) => {
    const candidates = configurableSkills.filter((skill) => skillQualityRank[skill.quality] <= maxQualityRank && isSkillCompatible(character, skill));
    const selected = shuffle(candidates, hashSeed(`${campaignSeed}|${fixture.stage}|opponent-skill|${index}`)).sort((a, b) => skillQualityRank[b.quality] - skillQualityRank[a.quality])[0];
    return [character.character_id, selected ? [selected.id] : []];
  }));
  return {
    blueprintId: blueprint.id,
    name: blueprint.name,
    shortName: blueprint.shortName,
    nickname: blueprint.nickname,
    crestUrl: blueprint.crestUrl,
    stage: fixture.stage,
    characters,
    lineup: templateLineup,
    attackFormationId: blueprint.attackFormationId,
    defenseFormationId: blueprint.defenseFormationId,
    templateCharacterIds,
    skillLoadouts,
    seed: hashSeed(`${campaignSeed}|opponent|${fixture.stage}`),
  };
}
