import type { Character, FactionId } from "./gameData";
import recruitmentContractJson from "../generated/tournament-recruitment-v1.json";

export type TournamentRecruitmentProgress = {
  pullsSinceSixStar: number;
  firstTenGuaranteeUsed: boolean;
};

type TournamentRecruitmentContract = {
  budget: { total_pulls: number; allowed_draw_counts: number[] };
  pack: { size: number };
  pool: { excluded_character_id_prefixes: string[] };
  rarity: {
    base_rates: Record<"3" | "4" | "5" | "6", number>;
    six_star_soft_pity: { increase_starts_after_misses: number; increase_per_pull: number };
    six_star_hard_pity: { guaranteed_within_pulls: number };
  };
};

const recruitmentContract = recruitmentContractJson as TournamentRecruitmentContract;
export const TOURNAMENT_RECRUITMENT_BUDGET = recruitmentContract.budget.total_pulls;
export const TOURNAMENT_PACK_SIZE = recruitmentContract.pack.size;
export const BASE_RATES = {
  3: recruitmentContract.rarity.base_rates["3"],
  4: recruitmentContract.rarity.base_rates["4"],
  5: recruitmentContract.rarity.base_rates["5"],
  6: recruitmentContract.rarity.base_rates["6"],
} as const;
export const NON_RECRUITABLE_CHARACTER_PREFIXES = recruitmentContract.pool.excluded_character_id_prefixes;
const SIX_STAR_PITY_START = recruitmentContract.rarity.six_star_soft_pity.increase_starts_after_misses;
const SIX_STAR_PITY_STEP = recruitmentContract.rarity.six_star_soft_pity.increase_per_pull;
export const SIX_STAR_HARD_PITY = recruitmentContract.rarity.six_star_hard_pity.guaranteed_within_pulls;

export type PackRevealTier = "blue" | "gold" | "six-star";

export type TournamentPulledCard = {
  character: Character;
  isNew: boolean;
  copyNumber: number;
};

export type TournamentRecruitmentResult = {
  factionId: FactionId;
  cards: TournamentPulledCard[];
  highestStars: number;
  revealTier: PackRevealTier;
  nextProgress: TournamentRecruitmentProgress;
};

export function sixStarRate(pullsSinceSixStar: number) {
  return Math.min(1, BASE_RATES[6] + Math.max(0, pullsSinceSixStar - SIX_STAR_PITY_START + 1) * SIX_STAR_PITY_STEP);
}

export function rarityRates(pullsSinceSixStar: number, maximumStars: 4 | 5 | 6 = 6) {
  const six = sixStarRate(pullsSinceSixStar);
  const five = BASE_RATES[5];
  const three = Math.max(0, BASE_RATES[3] - Math.max(0, six - BASE_RATES[6]));
  const four = Math.max(0, 1 - six - five - three);
  const rates = { 3: three, 4: four, 5: five, 6: six };
  const allowed = ([3, 4, 5, 6] as const).filter((stars) => stars <= maximumStars);
  const blocked = ([3, 4, 5, 6] as const).filter((stars) => stars > maximumStars);
  const redistributed = blocked.reduce((total, stars) => total + rates[stars], 0) / allowed.length;
  for (const stars of blocked) rates[stars] = 0;
  for (const stars of allowed) {
    rates[stars] += redistributed;
  }
  return rates;
}

export function rollRarity(randomValue: number, pullsSinceSixStar: number, maximumStars: 4 | 5 | 6 = 6): 3 | 4 | 5 | 6 {
  const value = Math.min(0.999999999, Math.max(0, randomValue));
  const rates = rarityRates(pullsSinceSixStar, maximumStars);
  if (value < rates[6]) return 6;
  if (value < rates[6] + rates[5]) return 5;
  if (value < rates[6] + rates[5] + rates[4]) return 4;
  return 3;
}

function pickCharacter(pool: Character[], random: () => number) {
  if (!pool.length) throw new Error("所选阵营缺少对应星级角色");
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length));
  return pool[index];
}

export function isRecruitableCharacter(character: Character) {
  return !NON_RECRUITABLE_CHARACTER_PREFIXES.some((prefix) => character.character_id.startsWith(prefix));
}

export function openTournamentRecruitment(
  characters: Character[],
  factionId: FactionId,
  collection: Record<string, number>,
  progress: TournamentRecruitmentProgress,
  random: () => number = Math.random,
  drawCount: 1 | typeof TOURNAMENT_PACK_SIZE = TOURNAMENT_PACK_SIZE,
  maximumStars: 4 | 5 | 6 = 6,
): TournamentRecruitmentResult {
  const factionPool = characters.filter(
    (character) => character.faction_id === factionId && isRecruitableCharacter(character),
  );
  const workingCollection = { ...collection };
  const cards: TournamentPulledCard[] = [];
  let pullsSinceSixStar = progress.pullsSinceSixStar;
  let hasTopTier = false;
  const isFirstTen = drawCount === TOURNAMENT_PACK_SIZE && !progress.firstTenGuaranteeUsed;

  for (let index = 0; index < drawCount; index += 1) {
    const isGuaranteedTopTier = pullsSinceSixStar >= SIX_STAR_HARD_PITY - 1;
    const isGuaranteedTenth: boolean = drawCount === TOURNAMENT_PACK_SIZE && !progress.firstTenGuaranteeUsed && index === TOURNAMENT_PACK_SIZE - 1 && !hasTopTier;
    const stars: 3 | 4 | 5 | 6 = isGuaranteedTopTier
      ? maximumStars
      : isGuaranteedTenth
      ? maximumStars === 6
        ? (random() < BASE_RATES[6] / (BASE_RATES[5] + BASE_RATES[6]) ? 6 : 5)
        : maximumStars
      : rollRarity(random(), pullsSinceSixStar, maximumStars);
    const character = pickCharacter(
      factionPool.filter((candidate) => candidate.stars === stars),
      random,
    );
    const previousCopies = workingCollection[character.character_id] ?? 0;
    workingCollection[character.character_id] = previousCopies + 1;
    cards.push({ character, isNew: previousCopies === 0, copyNumber: previousCopies + 1 });
    hasTopTier ||= stars >= Math.min(5, maximumStars);
    // 首个十连保本路线最高可用档；不推进硬保底进度，抽中顶档照常重置。
    pullsSinceSixStar = stars === maximumStars ? 0 : isFirstTen ? pullsSinceSixStar : pullsSinceSixStar + 1;
  }

  const highestStars = Math.max(...cards.map(({ character }) => character.stars));
  return {
    factionId,
    cards,
    highestStars,
    revealTier: highestStars >= 6 ? "six-star" : highestStars >= 5 ? "gold" : "blue",
    nextProgress: {
      pullsSinceSixStar,
      firstTenGuaranteeUsed: progress.firstTenGuaranteeUsed || drawCount === TOURNAMENT_PACK_SIZE,
    },
  };
}
