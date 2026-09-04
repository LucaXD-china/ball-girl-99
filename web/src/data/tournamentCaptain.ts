import type { FactionId } from "./gameData";
import type { FounderStoryId } from "./founderStories";
import type { TrainingFocusId } from "./tournamentSquad";
import type { TournamentStage } from "./tournamentJourney";

export type TournamentCaptainId = "saya" | "naya" | "irena";
export type OpponentRarityBonus = { fiveStar: number; sixStar: number };
export type StageOpponentRarityPlan = Record<TournamentStage, OpponentRarityBonus>;

export const zeroOpponentRarityBonus: OpponentRarityBonus = { fiveStar: 0, sixStar: 0 };

export type TournamentCaptainRoute = {
  id: TournamentCaptainId;
  name: string;
  positionLabel: "后卫" | "前锋" | "中场";
  difficultyLabel: "普通" | "困难" | "极难";
  characterId: string;
  mascotAnchorId: "founder_left" | "founder_right" | "founder_center";
  guideAssetId: string;
  factionId: FactionId;
  trainingFocusId: TrainingFocusId;
  starterAdditions: string[];
  starterExclusions: string[];
  recruitmentBudget: 40 | 50 | 60;
  recruitmentStarCap: 4 | 5 | 6;
  championEndingId: "END-03" | "END-04" | "END-05";
  founderStoryIds: FounderStoryId[];
  semiFinalFounderId: string | null;
  finalFounderId: string | null;
  excludedOpponentFounderIds: string[];
  opponentRarityByStage: StageOpponentRarityPlan;
};

export const founderCharacterIds = [
  "founder_sakura_link_4",
  "founder_samba_union_7",
  "founder_scarlet_toros_6",
] as const;

export const tournamentCaptainRoutes: Record<TournamentCaptainId, TournamentCaptainRoute> = {
  saya: {
    id: "saya",
    name: "纱夜",
    positionLabel: "后卫",
    difficultyLabel: "普通",
    characterId: "founder_sakura_link_4",
    mascotAnchorId: "founder_left",
    guideAssetId: "character.guide.saya_chibi",
    factionId: "sakura_link",
    trainingFocusId: "defense",
    starterAdditions: [],
    starterExclusions: [],
    recruitmentBudget: 60,
    recruitmentStarCap: 6,
    championEndingId: "END-03",
    founderStoryIds: ["SAYA", "NAYA", "IRENA"],
    semiFinalFounderId: "founder_samba_union_7",
    finalFounderId: "founder_scarlet_toros_6",
    excludedOpponentFounderIds: [],
    opponentRarityByStage: {
      round_of_16: { fiveStar: 3, sixStar: 3 }, quarter_final: { fiveStar: 3, sixStar: 2 },
      semi_final: { fiveStar: 3, sixStar: 3 }, final: { fiveStar: 3, sixStar: 1 },
    },
  },
  naya: {
    id: "naya",
    name: "娜雅",
    positionLabel: "前锋",
    difficultyLabel: "困难",
    characterId: "founder_samba_union_7",
    mascotAnchorId: "founder_right",
    guideAssetId: "character.guide.naya_chibi",
    factionId: "samba_union",
    trainingFocusId: "attack",
    starterAdditions: ["founder_samba_union_7"],
    starterExclusions: ["silver_luciana_vega"],
    recruitmentBudget: 50,
    recruitmentStarCap: 5,
    championEndingId: "END-04",
    founderStoryIds: ["IRENA"],
    semiFinalFounderId: null,
    finalFounderId: "founder_scarlet_toros_6",
    excludedOpponentFounderIds: ["founder_sakura_link_4", "founder_samba_union_7"],
    opponentRarityByStage: {
      round_of_16: { fiveStar: 2, sixStar: 2 }, quarter_final: { fiveStar: 2, sixStar: 2 },
      semi_final: { fiveStar: 2, sixStar: 2 }, final: { fiveStar: 4, sixStar: 1 },
    },
  },
  irena: {
    id: "irena",
    name: "伊蕾娜",
    positionLabel: "中场",
    difficultyLabel: "极难",
    characterId: "founder_scarlet_toros_6",
    mascotAnchorId: "founder_center",
    guideAssetId: "character.guide.irena_chibi",
    factionId: "scarlet_toros",
    trainingFocusId: "playmaking",
    starterAdditions: ["founder_samba_union_7", "founder_scarlet_toros_6"],
    starterExclusions: ["silver_luciana_vega", "fog_eleanor_hart"],
    recruitmentBudget: 40,
    recruitmentStarCap: 4,
    championEndingId: "END-05",
    founderStoryIds: [],
    semiFinalFounderId: null,
    finalFounderId: null,
    excludedOpponentFounderIds: [...founderCharacterIds],
    opponentRarityByStage: {
      round_of_16: { fiveStar: 2, sixStar: 1 }, quarter_final: { fiveStar: 2, sixStar: 1 },
      semi_final: { fiveStar: 0, sixStar: 1 }, final: { fiveStar: 1, sixStar: 0 },
    },
  },
};

export const tournamentCaptainIds = Object.keys(tournamentCaptainRoutes) as TournamentCaptainId[];

export function isTournamentCaptainId(value: unknown): value is TournamentCaptainId {
  return typeof value === "string" && tournamentCaptainIds.includes(value as TournamentCaptainId);
}

export function unlockedTournamentCaptainIds(unlockedAt: Record<string, string | undefined>): TournamentCaptainId[] {
  if (unlockedAt["END-04"]) return ["saya", "naya", "irena"];
  if (unlockedAt["END-03"]) return ["saya", "naya"];
  return ["saya"];
}

export function difficultyUnlockNoticeForEnding(endingId: string): string | null {
  if (endingId === "END-03") return "已解锁新难度：困难";
  if (endingId === "END-04") return "已解锁新难度：极难";
  return null;
}
