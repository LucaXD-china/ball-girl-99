import { playableCharacters } from "../data/gameData";
import { isMascotId, type MascotId } from "../data/founderMascotData";
import { isTournamentCaptainId, tournamentCaptainRoutes, type OpponentRarityBonus, type TournamentCaptainId } from "../data/tournamentCaptain";
import type { MatchEvent, MatchResult, TournamentDecisionSimulation, TournamentMatchContext } from "../data/matchSimulator";
import {
  TOURNAMENT_RECRUITMENT_BUDGET,
  type TournamentRecruitmentProgress,
  type TournamentRecruitmentResult,
} from "../data/tournamentRecruitment";
import {
  isSkillCompatible,
  skillQualityRank,
  skillSlotCaps,
  skillsById,
} from "../data/skillData";
import {
  fixtureSeed,
  generateOpponent,
  generateTournament,
  clubBlueprints,
  TOURNAMENT_PREPARATION_START_DAY,
  TOURNAMENT_ROSTER_SIZE,
  type GeneratedOpponent,
  type TournamentFixture,
} from "../data/tournamentJourney";
import { opponentStoryFor } from "../data/opponentStories";
import { isTournamentStoryId, type TournamentStoryId } from "../data/tournamentStories";
import type { TimelineCardId } from "../data/tournamentTimeline";
import {
  emptyTrainingFocus,
  SCOUT_DAY_COST,
  TOURNAMENT_MAX_FOCUS,
  TOURNAMENT_STARTER_CHARACTER_IDS,
  TRAINING_DAY_COST,
  trainingFocusTotal,
  type TrainingFocusId,
  type TournamentSquadState,
} from "../data/tournamentSquad";
import type { StorageAdapter } from "./localAccountStore";

export const TOURNAMENT_SAVE_SCHEMA_VERSION = 7;
export const TOURNAMENT_SAVE_KEY_PREFIX = "ball-girl:tournament-save-v7:";
const LEGACY_TOURNAMENT_SAVE_KEY_PREFIXES = ["ball-girl:tournament-save-v6:", "ball-girl:tournament-save-v5:"];
export type { TournamentSquadState } from "../data/tournamentSquad";

export type TournamentPhase = "briefing" | "recruitment" | "registration" | "draw" | "story" | "preparation" | "finished";

export type TournamentResult = {
  fixtureId: string;
  result: MatchResult;
  advanced?: boolean;
  extraTime?: { player: number; opponent: number };
  penalties?: { player: number; opponent: number };
  matchContext?: TournamentMatchContext;
  decision?: {
    status: "pending" | "complete";
    reason: "final-draw" | "aggregate-draw";
    aggregateAt90: { player: number; opponent: number };
    events: MatchEvent[];
  };
};

export type TournamentCampaignState = {
  captainId: TournamentCaptainId | null;
  campaignSeed: number;
  phase: TournamentPhase;
  day: number;
  recruitment: {
    budgetRemaining: number;
    pullsMade: number;
    progress: TournamentRecruitmentProgress;
    locked: boolean;
  };
  registration: {
    selection: string[];
    registeredIds: string[];
    locked: boolean;
  };
  skillLevels: Record<string, number>;
  bracketLocked: boolean;
  bracket: string[];
  route: string[];
  fixtures: TournamentFixture[];
  currentFixtureIndex: number;
  generatedOpponents: Partial<Record<string, GeneratedOpponent>>;
  usedOpponentTemplateIds: string[];
  // 已观察对手的阶段（按阶段计：同一对手两回合共享情报，一阶段观察一次即可）。
  scoutedStageIds: string[];
  results: TournamentResult[];
  outcome: "champion" | "eliminated" | null;
  skillStudiesByFixture: Record<string, string[]>;
  rainbowSkillsStudied: number;
  pendingStoryId: TournamentStoryId | null;
  completedStoryIds: TournamentStoryId[];
  shownTimelineCardIds: TimelineCardId[];
  storyResumeTarget: "preparation" | "match" | null;
};

export type TournamentSaveV6 = {
  schemaVersion: typeof TOURNAMENT_SAVE_SCHEMA_VERSION;
  campaign: TournamentCampaignState;
  squad: TournamentSquadState;
  preferences: { activeMascotAnchorId: MascotId };
  updatedAt: string;
};

const charactersById = new Map(playableCharacters.map((character) => [character.character_id, character]));

function browserStorage(): StorageAdapter | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function tournamentSaveKey(uid: string) {
  return `${TOURNAMENT_SAVE_KEY_PREFIX}${uid}`;
}

function initialTournamentSquad(captainId: TournamentCaptainId | null = "saya"): TournamentSquadState {
  const route = captainId ? tournamentCaptainRoutes[captainId] : null;
  const starters = TOURNAMENT_STARTER_CHARACTER_IDS.filter((id) => !route?.starterExclusions.includes(id));
  return addCharacters({ collection: {}, characterProgress: {}, skillInventory: {}, skillLoadouts: {} }, [...starters, ...(route?.starterAdditions ?? [])]);
}

function recruitmentBudgetFor(captainId: TournamentCaptainId | null) {
  return captainId ? tournamentCaptainRoutes[captainId].recruitmentBudget : TOURNAMENT_RECRUITMENT_BUDGET;
}

export function createTournamentSave(
  seed = Math.floor(Math.random() * 0xFFFFFFFF),
  phase: TournamentPhase = "briefing",
  captainId: TournamentCaptainId | null = "saya",
): TournamentSaveV6 {
  return {
    schemaVersion: TOURNAMENT_SAVE_SCHEMA_VERSION,
    campaign: {
      captainId,
      campaignSeed: seed >>> 0,
      phase,
      day: 1,
      recruitment: {
        budgetRemaining: recruitmentBudgetFor(captainId),
        pullsMade: 0,
        progress: { pullsSinceSixStar: 0, firstTenGuaranteeUsed: false },
        locked: false,
      },
      registration: { selection: [], registeredIds: [], locked: false },
      skillLevels: {},
      bracketLocked: false,
      bracket: [],
      route: [],
      fixtures: [],
      currentFixtureIndex: 0,
      generatedOpponents: {},
      usedOpponentTemplateIds: [],
      scoutedStageIds: [],
      results: [],
      outcome: null,
      skillStudiesByFixture: {},
      rainbowSkillsStudied: 0,
      pendingStoryId: null,
      completedStoryIds: [],
      shownTimelineCardIds: [],
      storyResumeTarget: null,
    },
    squad: initialTournamentSquad(captainId),
    preferences: { activeMascotAnchorId: captainId ? tournamentCaptainRoutes[captainId].mascotAnchorId : "founder_left" },
    updatedAt: new Date(0).toISOString(),
  };
}

function isCountRecord(value: unknown) {
  return Boolean(value) && typeof value === "object" && Object.entries(value as Record<string, unknown>)
    .every(([id, count]) => Boolean(id) && Number.isInteger(count) && Number(count) >= 0);
}

function hasOnlyKeys(value: object, keys: string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStringArrayRecord(value: unknown) {
  return Boolean(value) && typeof value === "object" && Object.entries(value as Record<string, unknown>)
    .every(([id, items]) => Boolean(id) && isStringArray(items));
}

function isCharacterProgressRecord(value: unknown) {
  return Boolean(value) && typeof value === "object" && Object.entries(value as Record<string, unknown>).every(([characterId, progress]) => {
    if (!charactersById.has(characterId) || !progress || typeof progress !== "object") return false;
    const entry = progress as Record<string, unknown>;
    if (!hasOnlyKeys(entry, ["focus", "breakthroughRank"])) return false;
    const focus = entry.focus;
    if (!focus || typeof focus !== "object") return false;
    const focusRecord = focus as Record<string, unknown>;
    if (!hasOnlyKeys(focusRecord, ["attack", "playmaking", "defense"])) return false;
    if (!Number.isInteger(focusRecord.attack) || Number(focusRecord.attack) < 0) return false;
    if (!Number.isInteger(focusRecord.playmaking) || Number(focusRecord.playmaking) < 0) return false;
    if (!Number.isInteger(focusRecord.defense) || Number(focusRecord.defense) < 0) return false;
    if (Number(focusRecord.attack) + Number(focusRecord.playmaking) + Number(focusRecord.defense) > TOURNAMENT_MAX_FOCUS) return false;
    return Number.isInteger(entry.breakthroughRank) && Number(entry.breakthroughRank) >= 0 && Number(entry.breakthroughRank) <= 5;
  });
}

export function isTournamentSquad(value: unknown): value is TournamentSquadState {
  if (!value || typeof value !== "object") return false;
  const squad = value as Partial<TournamentSquadState>;
  if (!hasOnlyKeys(value, ["collection", "characterProgress", "skillInventory", "skillLoadouts"]) ||
    !isCountRecord(squad.collection) || !isCharacterProgressRecord(squad.characterProgress) ||
    !isCountRecord(squad.skillInventory) || !isStringArrayRecord(squad.skillLoadouts)) return false;
  const collectionIds = Object.keys(squad.collection!);
  if (collectionIds.some((id) => !charactersById.has(id) || Number(squad.collection![id]) < 1 || !squad.characterProgress![id])) return false;
  if (Object.keys(squad.characterProgress!).some((id) => !squad.collection![id])) return false;
  if (Object.keys(squad.skillInventory!).some((id) => !skillsById.has(id) || Number(squad.skillInventory![id]) < 1)) return false;
  if (Object.entries(squad.skillLoadouts!).some(([characterId, ids]) => {
    const character = charactersById.get(characterId);
    if (!character || !squad.collection![characterId] || ids.length > skillSlotCaps(character.stars).length) return true;
    const categories = new Set<string>();
    return ids.some((id, slotIndex) => {
      if (!id) return false;
      const skill = skillsById.get(id);
      const cap = skillSlotCaps(character.stars)[slotIndex];
      if (!skill || !cap || !squad.skillInventory![id] || !isSkillCompatible(character, skill) || skillQualityRank[skill.quality] > skillQualityRank[cap] || categories.has(skill.category)) return true;
      categories.add(skill.category);
      return false;
    });
  })) return false;
  for (const [skillId, count] of Object.entries(squad.skillInventory!)) {
    const assigned = Object.values(squad.skillLoadouts!).flat().filter((id) => id === skillId).length;
    if (assigned > count) return false;
  }
  return true;
}

export function isTournamentSave(value: unknown): value is TournamentSaveV6 {
  if (!value || typeof value !== "object") return false;
  const save = value as Partial<TournamentSaveV6>;
  const campaign = save.campaign as Partial<TournamentCampaignState> | undefined;
  const recruitment = campaign?.recruitment;
  const registration = campaign?.registration;
  return save.schemaVersion === TOURNAMENT_SAVE_SCHEMA_VERSION && Boolean(campaign) && isTournamentSquad(save.squad) &&
    hasOnlyKeys(campaign!, ["captainId", "campaignSeed", "phase", "day", "recruitment", "registration", "skillLevels", "bracketLocked", "bracket", "route", "fixtures", "currentFixtureIndex", "generatedOpponents", "usedOpponentTemplateIds", "scoutedStageIds", "results", "outcome", "skillStudiesByFixture", "rainbowSkillsStudied", "pendingStoryId", "completedStoryIds", "shownTimelineCardIds", "storyResumeTarget"]) &&
    (campaign?.captainId === null || isTournamentCaptainId(campaign?.captainId)) &&
    Number.isInteger(campaign?.campaignSeed) && Number.isInteger(campaign?.day) && Number(campaign?.day) >= 1 && Number(campaign?.day) <= 99 &&
    ["briefing", "recruitment", "registration", "draw", "story", "preparation", "finished"].includes(String(campaign?.phase)) &&
    Boolean(recruitment) && Number.isInteger(recruitment?.budgetRemaining) && Number(recruitment?.budgetRemaining) >= 0 && Number(recruitment?.budgetRemaining) <= recruitmentBudgetFor(campaign?.captainId ?? null) &&
    Number.isInteger(recruitment?.pullsMade) && Number(recruitment?.pullsMade) >= 0 && Number(recruitment?.pullsMade) <= TOURNAMENT_RECRUITMENT_BUDGET &&
    Number(recruitment?.budgetRemaining) + Number(recruitment?.pullsMade) === Math.max(recruitmentBudgetFor(campaign?.captainId ?? null), Number(recruitment?.pullsMade)) &&
    Boolean(recruitment?.progress) && Number.isInteger(recruitment?.progress?.pullsSinceSixStar) && Number(recruitment?.progress?.pullsSinceSixStar) >= 0 && typeof recruitment?.progress?.firstTenGuaranteeUsed === "boolean" && typeof recruitment?.locked === "boolean" &&
    Boolean(registration) && isStringArray(registration?.selection) && isStringArray(registration?.registeredIds) && typeof registration?.locked === "boolean" &&
    registration!.selection.length <= TOURNAMENT_ROSTER_SIZE && new Set(registration!.selection).size === registration!.selection.length &&
    registration!.registeredIds.length <= TOURNAMENT_ROSTER_SIZE && new Set(registration!.registeredIds).size === registration!.registeredIds.length &&
    [...registration!.selection, ...registration!.registeredIds].every((id) => Boolean(save.squad!.collection[id])) &&
    (!registration!.locked || registration!.registeredIds.length === TOURNAMENT_ROSTER_SIZE) &&
    isCountRecord(campaign?.skillLevels) && Object.entries(campaign?.skillLevels ?? {}).every(([id, level]) => skillsById.has(id) && Number(level) >= 1 && Number(level) <= 5) &&
    typeof campaign?.bracketLocked === "boolean" && isStringArray(campaign?.bracket) && isStringArray(campaign?.route) &&
    Array.isArray(campaign?.fixtures) && Number.isInteger(campaign?.currentFixtureIndex) && Number(campaign?.currentFixtureIndex) >= 0 && Number(campaign?.currentFixtureIndex) <= campaign!.fixtures!.length &&
    Boolean(campaign?.generatedOpponents) && isStringArray(campaign?.usedOpponentTemplateIds) && isStringArray(campaign?.scoutedStageIds) && Array.isArray(campaign?.results) &&
    [null, "champion", "eliminated"].includes(campaign?.outcome ?? null) && isStringArrayRecord(campaign?.skillStudiesByFixture) &&
    Number.isInteger(campaign?.rainbowSkillsStudied) && Number(campaign?.rainbowSkillsStudied) >= 0 && Number(campaign?.rainbowSkillsStudied) <= 1 &&
    (campaign?.pendingStoryId === null || isTournamentStoryId(campaign?.pendingStoryId)) &&
    Array.isArray(campaign?.completedStoryIds) && campaign!.completedStoryIds!.every(isTournamentStoryId) &&
    Array.isArray(campaign?.shownTimelineCardIds) && campaign!.shownTimelineCardIds!.every((id) => typeof id === "string" && /^DAY-(1|2|18|29|45|46|56|57|72|73|83|84|99)$/.test(id)) &&
    [null, "preparation", "match"].includes(campaign?.storyResumeTarget ?? null) &&
    Boolean(save.preferences) && isMascotId(save.preferences?.activeMascotAnchorId) && typeof save.updatedAt === "string";
}

function settleAutomaticDuplicateStarUps(save: TournamentSaveV6) {
  const characterProgress = { ...save.squad.characterProgress };
  let changed = false;
  for (const [characterId, copies] of Object.entries(save.squad.collection)) {
    const current = characterProgress[characterId];
    const targetRank = Math.min(5, Math.max(0, copies - 1));
    if (current && current.breakthroughRank < targetRank) {
      characterProgress[characterId] = { ...current, breakthroughRank: targetRank };
      changed = true;
    }
  }
  return changed ? { ...save, squad: { ...save.squad, characterProgress } } : save;
}

function writeTournamentSave(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null) {
  const next = { ...save, updatedAt: new Date().toISOString() };
  if (!isTournamentSave(next)) throw new Error("杯赛存档状态无效");
  try { storage?.setItem(tournamentSaveKey(uid), JSON.stringify(next)); } catch { /* Keep the game usable when storage is unavailable. */ }
  return next;
}

function migrateTournamentSave(value: unknown): TournamentSaveV6 | null {
  if (!value || typeof value !== "object") return null;
  const legacy = value as Record<string, any>;
  if (![5, 6, TOURNAMENT_SAVE_SCHEMA_VERSION].includes(legacy.schemaVersion) || !legacy.campaign) return null;
  const { scoutedFixtureIds, ...legacyCampaign } = legacy.campaign;
  const scoutedFixtureIdSet = new Set(Array.isArray(scoutedFixtureIds) ? scoutedFixtureIds : []);
  const scoutedStageIds = Array.from(new Set(
    (Array.isArray(legacyCampaign.fixtures) ? legacyCampaign.fixtures : [])
      .filter((fixture: TournamentFixture) => scoutedFixtureIdSet.has(fixture.id))
      .map((fixture: TournamentFixture) => fixture.stage),
  ));
  const pendingStoryId = isTournamentStoryId(legacy.campaign.pendingStoryId) ? legacy.campaign.pendingStoryId : null;
  const captainId = isTournamentCaptainId(legacyCampaign.captainId) ? legacyCampaign.captainId : "saya";
  const pullsMade = Number.isInteger(legacyCampaign.recruitment?.pullsMade) ? legacyCampaign.recruitment.pullsMade : 0;
  const migrated = {
    ...legacy,
    schemaVersion: TOURNAMENT_SAVE_SCHEMA_VERSION,
    campaign: {
      ...legacyCampaign,
      captainId,
      recruitment: {
        ...legacyCampaign.recruitment,
        pullsMade,
        budgetRemaining: Math.max(0, recruitmentBudgetFor(captainId) - pullsMade),
      },
      scoutedStageIds: Array.isArray(legacyCampaign.scoutedStageIds) ? legacyCampaign.scoutedStageIds : scoutedStageIds,
      pendingStoryId,
      completedStoryIds: Array.isArray(legacyCampaign.completedStoryIds) ? legacyCampaign.completedStoryIds : [],
      shownTimelineCardIds: Array.isArray(legacyCampaign.shownTimelineCardIds) ? legacyCampaign.shownTimelineCardIds : [],
      storyResumeTarget: ["preparation", "match"].includes(legacyCampaign.storyResumeTarget) ? legacyCampaign.storyResumeTarget : pendingStoryId ? "preparation" : null,
    },
  };
  return isTournamentSave(migrated) ? migrated : null;
}

export function loadTournamentSave(uid: string, storage: StorageAdapter | null = browserStorage()): TournamentSaveV6 {
  if (storage) {
    try {
      const raw = storage.getItem(tournamentSaveKey(uid)) ?? LEGACY_TOURNAMENT_SAVE_KEY_PREFIXES.map((prefix) => storage.getItem(`${prefix}${uid}`)).find(Boolean);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isTournamentSave(parsed)) {
          const settled = settleAutomaticDuplicateStarUps(parsed);
          return settled === parsed ? parsed : writeTournamentSave(uid, settled, storage);
        }
        const migrated = migrateTournamentSave(parsed);
        if (migrated) {
          const next = writeTournamentSave(uid, settleAutomaticDuplicateStarUps(migrated), storage);
          for (const prefix of LEGACY_TOURNAMENT_SAVE_KEY_PREFIXES) storage.removeItem(`${prefix}${uid}`);
          return next;
        }
      }
    } catch { /* Fall through to a fresh tournament-only save. */ }
  }
  return writeTournamentSave(uid, createTournamentSave(), storage);
}

export function saveTournamentSave(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null = browserStorage()) {
  return writeTournamentSave(uid, save, storage);
}

export function startTournamentJourney(uid: string, seed?: number, storage: StorageAdapter | null = browserStorage(), captainId: TournamentCaptainId | null = "saya") {
  return writeTournamentSave(uid, createTournamentSave(seed, "recruitment", captainId), storage);
}

export function selectTournamentCaptain(uid: string, save: TournamentSaveV6, captainId: TournamentCaptainId, storage: StorageAdapter | null = browserStorage()) {
  if (save.campaign.phase !== "recruitment" || save.campaign.recruitment.pullsMade !== 0 || save.campaign.recruitment.locked) throw new Error("本届赛事队长已经锁定");
  const route = tournamentCaptainRoutes[captainId];
  return writeTournamentSave(uid, {
    ...save,
    campaign: {
      ...save.campaign,
      captainId,
      recruitment: { ...save.campaign.recruitment, budgetRemaining: route.recruitmentBudget },
    },
    squad: initialTournamentSquad(captainId),
    preferences: { ...save.preferences, activeMascotAnchorId: route.mascotAnchorId },
  }, storage);
}

function addCharacters(squad: TournamentSquadState, characterIds: string[], autoStarDuplicates = false) {
  const next = {
    ...squad,
    collection: { ...squad.collection },
    characterProgress: { ...squad.characterProgress },
  };
  for (const characterId of characterIds) {
    const previousCopies = next.collection[characterId] ?? 0;
    next.collection[characterId] = previousCopies + 1;
    const current = next.characterProgress[characterId] ?? { focus: emptyTrainingFocus(), breakthroughRank: 0 };
    next.characterProgress[characterId] = autoStarDuplicates && previousCopies > 0 && current.breakthroughRank < 5
      ? { ...current, breakthroughRank: current.breakthroughRank + 1 }
      : current;
  }
  return next;
}

export function recordTournamentPackOpening(
  uid: string,
  save: TournamentSaveV6,
  opened: TournamentRecruitmentResult,
  storage: StorageAdapter | null = browserStorage(),
) {
  const count = opened.cards.length;
  const campaign = save.campaign;
  if (!campaign.captainId) throw new Error("请先选择本届赛事队长");
  const maximumStars = tournamentCaptainRoutes[campaign.captainId].recruitmentStarCap;
  const recruitmentBudget = tournamentCaptainRoutes[campaign.captainId].recruitmentBudget;
  if (opened.cards.some(({ character }) => character.stars > maximumStars)) throw new Error(`本路线最高只能招募${maximumStars}星球员`);
  if (campaign.phase !== "recruitment" || campaign.recruitment.locked) throw new Error("Day 1补强已经锁定");
  if (count !== 1 && count !== 10) throw new Error("杯赛仅支持单抽或十连");
  if (campaign.recruitment.pullsMade + count > recruitmentBudget) throw new Error(`本届赛事最多进行${recruitmentBudget}抽`);
  if (campaign.recruitment.budgetRemaining < count) throw new Error("赛事补强预算不足");
  const squad = addCharacters(save.squad, opened.cards.map(({ character }) => character.character_id), true);
  const pullsMade = campaign.recruitment.pullsMade + count;
  return writeTournamentSave(uid, {
    ...save,
    squad,
    campaign: {
      ...campaign,
      recruitment: {
        ...campaign.recruitment,
        budgetRemaining: campaign.recruitment.budgetRemaining - count,
        pullsMade,
        progress: opened.nextProgress,
      },
    },
  }, storage);
}

export function lockTournamentRecruitment(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null = browserStorage()) {
  if (save.campaign.phase !== "recruitment" || save.campaign.recruitment.locked) throw new Error("Day 1补强已经锁定");
  if (!save.campaign.captainId) throw new Error("请先选择本届赛事队长");
  if (Object.keys(save.squad.collection).length < TOURNAMENT_ROSTER_SIZE) throw new Error(`至少获得${TOURNAMENT_ROSTER_SIZE}名不同球员后才能锁定补强结果`);
  return writeTournamentSave(uid, {
    ...save,
    campaign: {
      ...save.campaign,
      phase: "registration",
      recruitment: { ...save.campaign.recruitment, locked: true },
      registration: { ...save.campaign.registration, selection: [] },
    },
  }, storage);
}

export function toggleTournamentRegistration(uid: string, save: TournamentSaveV6, characterId: string, storage: StorageAdapter | null = browserStorage()) {
  const registration = save.campaign.registration;
  if (save.campaign.phase !== "registration" || registration.locked) throw new Error(`${TOURNAMENT_ROSTER_SIZE}人名单已经锁定`);
  if (!save.squad.collection[characterId]) throw new Error("名单中包含赛事收藏以外的球员");
  const selection = registration.selection.includes(characterId)
    ? registration.selection.filter((id) => id !== characterId)
    : registration.selection.length >= TOURNAMENT_ROSTER_SIZE ? registration.selection : [...registration.selection, characterId];
  return writeTournamentSave(uid, { ...save, campaign: { ...save.campaign, registration: { ...registration, selection } } }, storage);
}

export function setTournamentRegistration(uid: string, save: TournamentSaveV6, characterIds: string[], storage: StorageAdapter | null = browserStorage()) {
  const registration = save.campaign.registration;
  if (save.campaign.phase !== "registration" || registration.locked) throw new Error(`${TOURNAMENT_ROSTER_SIZE}人名单已经锁定`);
  const selection = [...new Set(characterIds)];
  if (selection.length > TOURNAMENT_ROSTER_SIZE) throw new Error(`名单最多选择${TOURNAMENT_ROSTER_SIZE}人`);
  if (selection.some((id) => !save.squad.collection[id])) throw new Error("名单中包含赛事收藏以外的球员");
  return writeTournamentSave(uid, { ...save, campaign: { ...save.campaign, registration: { ...registration, selection } } }, storage);
}

export function lockTournamentRegistration(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null = browserStorage()) {
  const registration = save.campaign.registration;
  if (save.campaign.phase !== "registration" || registration.locked) throw new Error(`${TOURNAMENT_ROSTER_SIZE}人名单已经锁定`);
  if (registration.selection.length !== TOURNAMENT_ROSTER_SIZE || new Set(registration.selection).size !== TOURNAMENT_ROSTER_SIZE) throw new Error(`必须选择${TOURNAMENT_ROSTER_SIZE}名不同球员`);
  if (registration.selection.some((id) => !save.squad.collection[id])) throw new Error("名单中包含赛事收藏以外的球员");
  if (!save.campaign.captainId) throw new Error("请先选择本届赛事队长");
  const tournament = generateTournament(save.campaign.campaignSeed, save.campaign.captainId);
  return writeTournamentSave(uid, {
    ...save,
    campaign: {
      ...save.campaign,
      phase: "draw",
      day: 2,
      registration: { selection: [...registration.selection], registeredIds: [...registration.selection], locked: true },
      bracketLocked: true,
      bracket: tournament.bracket,
      route: tournament.route,
      fixtures: tournament.fixtures,
    },
  }, storage);
}

export function confirmTournamentDraw(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null = browserStorage()) {
  if (save.campaign.phase !== "draw" || !save.campaign.bracketLocked) throw new Error("签表尚未生成");
  return writeTournamentSave(uid, { ...save, campaign: { ...save.campaign, phase: "preparation", day: TOURNAMENT_PREPARATION_START_DAY } }, storage);
}

export function ensureCurrentTournamentOpponent(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null = browserStorage(), opponentRarityBonus?: OpponentRarityBonus) {
  const campaign = save.campaign;
  const fixture = campaign.fixtures[campaign.currentFixtureIndex];
  if (!fixture) throw new Error("当前没有待进行的淘汰赛");
  const existing = campaign.generatedOpponents[fixture.stage];
  if (existing) {
    const heritageFactionId = clubBlueprints.find(({ id }) => id === existing.blueprintId)?.heritageFactionId;
    const needsBondMarker = heritageFactionId && existing.characters.some(({ tournamentOpponentBondFactionId }) => tournamentOpponentBondFactionId !== heritageFactionId);
    if (!needsBondMarker) return { save, opponent: existing };
    // 旧存档只补充固定队史羁绊标记；阵容、星级、技能和随机种子全部保持原样。
    const opponent = {
      ...existing,
      characters: existing.characters.map((character) => ({ ...character, tournamentOpponentBondFactionId: heritageFactionId })),
    };
    const next = writeTournamentSave(uid, {
      ...save,
      campaign: {
        ...campaign,
        generatedOpponents: { ...campaign.generatedOpponents, [fixture.stage]: opponent },
      },
    }, storage);
    return { save: next, opponent };
  }
  if (!campaign.captainId) throw new Error("本届赛事缺少队长");
  const opponent = generateOpponent(fixture, campaign.campaignSeed, campaign.registration.registeredIds, campaign.usedOpponentTemplateIds, campaign.captainId, opponentRarityBonus);
  const next = writeTournamentSave(uid, {
    ...save,
    campaign: {
      ...campaign,
      generatedOpponents: { ...campaign.generatedOpponents, [fixture.stage]: opponent },
      usedOpponentTemplateIds: [...campaign.usedOpponentTemplateIds, ...opponent.templateCharacterIds],
    },
  }, storage);
  return { save: next, opponent };
}

export function markTournamentScoutReportViewed(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null = browserStorage()) {
  const campaign = save.campaign;
  const fixture = campaign.fixtures[campaign.currentFixtureIndex];
  if (!fixture || campaign.phase !== "preparation") throw new Error("当前没有可观察的对手");
  if (campaign.scoutedStageIds.includes(fixture.stage)) return save;
  const day = spendPreparationDays(campaign, SCOUT_DAY_COST);
  return writeTournamentSave(uid, {
    ...save,
    campaign: {
      ...campaign,
      day,
      scoutedStageIds: [...campaign.scoutedStageIds, fixture.stage],
    },
  }, storage);
}

function spendPreparationDays(campaign: TournamentCampaignState, days: number) {
  const fixture = campaign.fixtures[campaign.currentFixtureIndex];
  if (!fixture || campaign.day + days > fixture.day) throw new Error(`行动会跨过 Day ${fixture?.day ?? 99} 比赛日`);
  return campaign.day + days;
}

export function advanceTournamentDay(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null = browserStorage()) {
  const fixture = save.campaign.fixtures[save.campaign.currentFixtureIndex];
  if (save.campaign.phase !== "preparation" || !fixture) throw new Error("完成当前引导后才能推进日期");
  if (save.campaign.day >= fixture.day) throw new Error(`Day ${fixture.day} 是比赛日，请先完成比赛`);
  return writeTournamentSave(uid, { ...save, campaign: { ...save.campaign, day: save.campaign.day + 1 } }, storage);
}

export function advanceTournamentToMatch(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null = browserStorage()) {
  const fixture = save.campaign.fixtures[save.campaign.currentFixtureIndex];
  if (save.campaign.phase !== "preparation" || !fixture) throw new Error("完成当前引导后才能推进至比赛日");
  const day = Math.max(save.campaign.day, fixture.day);
  if (fixture.stage === "final") {
    const finalStory = opponentStoryFor(fixture.opponentBlueprintId);
    if (finalStory && !save.campaign.completedStoryIds.includes(finalStory.id)) return writeTournamentSave(uid, {
      ...save,
      campaign: { ...save.campaign, day, phase: "story", pendingStoryId: finalStory.id, storyResumeTarget: "match" },
    }, storage);
  }
  if (day === save.campaign.day) return save;
  return writeTournamentSave(uid, { ...save, campaign: { ...save.campaign, day } }, storage);
}

export function trainTournamentPlayers(uid: string, save: TournamentSaveV6, focusId: TrainingFocusId, characterIds: string[], storage: StorageAdapter | null = browserStorage()) {
  const campaign = save.campaign;
  const fixture = campaign.fixtures[campaign.currentFixtureIndex];
  if (!fixture || campaign.phase !== "preparation") throw new Error("当前不在赛前训练窗口");
  if (characterIds.length !== 3 || new Set(characterIds).size !== 3) throw new Error("专项训练必须选择3名不同球员");
  if (characterIds.some((id) => !campaign.registration.registeredIds.includes(id))) throw new Error("只能训练已注册球员");
  if (characterIds.some((id) => trainingFocusTotal(save.squad.characterProgress[id]?.focus ?? emptyTrainingFocus()) >= TOURNAMENT_MAX_FOCUS)) throw new Error("球员本届练度已满，无法继续训练");
  const day = spendPreparationDays(campaign, TRAINING_DAY_COST);
  const characterProgress = { ...save.squad.characterProgress };
  for (const characterId of characterIds) {
    const current = characterProgress[characterId] ?? { focus: emptyTrainingFocus(), breakthroughRank: 0 };
    characterProgress[characterId] = { ...current, focus: { ...current.focus, [focusId]: current.focus[focusId] + 1 } };
  }
  return writeTournamentSave(uid, {
    ...save,
    squad: { ...save.squad, characterProgress },
    campaign: { ...campaign, day },
  }, storage);
}

export function studyTournamentSkill(uid: string, save: TournamentSaveV6, skillId: string, storage: StorageAdapter | null = browserStorage()) {
  void uid; void save; void skillId; void storage;
  throw new Error("技能研习在初赛版本中仅作开发预览");
}

export function equipTournamentSkill(uid: string, save: TournamentSaveV6, characterId: string, slotIndex: number, skillId: string, storage: StorageAdapter | null = browserStorage()) {
  void uid; void save; void characterId; void slotIndex; void skillId; void storage;
  throw new Error("技能装配在初赛版本中仅作开发预览");
}

export function unequipTournamentSkill(uid: string, save: TournamentSaveV6, characterId: string, slotIndex: number, storage: StorageAdapter | null = browserStorage()) {
  void uid; void save; void characterId; void slotIndex; void storage;
  throw new Error("技能装配在初赛版本中仅作开发预览");
}

export function recordTournamentMatch(
  uid: string,
  save: TournamentSaveV6,
  result: MatchResult,
  storage: StorageAdapter | null = browserStorage(),
  matchContext?: TournamentMatchContext,
) {
  const campaign = save.campaign;
  const fixture = campaign.fixtures[campaign.currentFixtureIndex];
  if (!fixture || campaign.phase !== "preparation") throw new Error("当前没有可结算的赛事");
  if (campaign.results.some((entry) => entry.fixtureId === fixture.id)) return save;
  let advanced: boolean | undefined;
  let decision: TournamentResult["decision"];
  if (fixture.stage === "final") {
    if (result.homeScore === result.awayScore) {
      if (!matchContext) throw new Error("决胜准备缺少本场首发与阵型");
      decision = { status: "pending", reason: "final-draw", aggregateAt90: { player: result.homeScore, opponent: result.awayScore }, events: [] };
    } else advanced = result.homeScore > result.awayScore;
  } else if (fixture.leg === 2) {
    const first = campaign.results.find((entry) => campaign.fixtures.find((item) => item.id === entry.fixtureId)?.stage === fixture.stage);
    const playerAggregate = (first?.result.homeScore ?? 0) + result.homeScore;
    const opponentAggregate = (first?.result.awayScore ?? 0) + result.awayScore;
    if (playerAggregate === opponentAggregate) {
      if (!matchContext) throw new Error("决胜准备缺少本场首发与阵型");
      decision = { status: "pending", reason: "aggregate-draw", aggregateAt90: { player: playerAggregate, opponent: opponentAggregate }, events: [] };
    } else advanced = playerAggregate > opponentAggregate;
  }
  const entry: TournamentResult = { fixtureId: fixture.id, result, advanced, matchContext, decision };
  return writeTournamentSave(uid, { ...save, campaign: { ...campaign, day: fixture.day, results: [...campaign.results, entry] } }, storage);
}

export function recordTournamentDecision(
  uid: string,
  save: TournamentSaveV6,
  simulation: TournamentDecisionSimulation,
  storage: StorageAdapter | null = browserStorage(),
) {
  const campaign = save.campaign;
  const fixture = campaign.fixtures[campaign.currentFixtureIndex];
  const index = fixture ? campaign.results.findIndex((entry) => entry.fixtureId === fixture.id) : -1;
  const current = index >= 0 ? campaign.results[index] : null;
  if (!fixture || !current?.decision || current.decision.status !== "pending") throw new Error("当前没有等待开始的决胜阶段");
  const completed: TournamentResult = {
    ...current,
    result: simulation.result,
    advanced: simulation.advanced,
    extraTime: simulation.extraTime,
    penalties: simulation.penalties,
    decision: { ...current.decision, status: "complete", events: simulation.events },
  };
  const results = [...campaign.results];
  results[index] = completed;
  return writeTournamentSave(uid, { ...save, campaign: { ...campaign, results } }, storage);
}

export function advanceTournamentAfterMatch(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null = browserStorage()) {
  const campaign = save.campaign;
  const fixture = campaign.fixtures[campaign.currentFixtureIndex];
  const entry = fixture ? campaign.results.find((result) => result.fixtureId === fixture.id) : null;
  if (!fixture || !entry || entry.decision?.status === "pending") throw new Error("本场完整赛果尚未持久化");
  const finished = entry.advanced === false || (fixture.stage === "final" && entry.advanced === true);
  const nextFixture = campaign.fixtures[campaign.currentFixtureIndex + 1];
  const founderStoryIds = campaign.captainId ? tournamentCaptainRoutes[campaign.captainId].founderStoryIds : [];
  const founderStoryId: "SAYA" | "NAYA" | "IRENA" | null = fixture.id === "qf-1" ? "SAYA" : fixture.id === "sf-1" ? "NAYA" : fixture.id === "sf-2" ? "IRENA" : null;
  const nextStory = founderStoryId && founderStoryIds.includes(founderStoryId)
    ? { id: founderStoryId }
    : fixture.id === "qf-2" && nextFixture ? opponentStoryFor(nextFixture.opponentBlueprintId) : undefined;
  return writeTournamentSave(uid, {
    ...save,
    campaign: {
      ...campaign,
      // 比赛日不再兼作下一段备战日：晋级后从比赛日次日（fixture.day + 1）开始下一段备战。
      day: finished ? campaign.day : fixture.day + 1,
      currentFixtureIndex: campaign.currentFixtureIndex + 1,
      phase: finished ? "finished" : nextStory ? "story" : "preparation",
      pendingStoryId: nextStory?.id ?? null,
      storyResumeTarget: nextStory ? "preparation" : null,
      outcome: fixture.stage === "final" && entry.advanced ? "champion" : entry.advanced === false ? "eliminated" : null,
    },
  }, storage);
}

export function completeTournamentStory(uid: string, save: TournamentSaveV6, storage: StorageAdapter | null = browserStorage()) {
  if (save.campaign.phase !== "story" || !save.campaign.pendingStoryId) throw new Error("当前没有待播放的赛事剧情");
  const storyId = save.campaign.pendingStoryId;
  return writeTournamentSave(uid, { ...save, campaign: {
    ...save.campaign,
    phase: "preparation",
    pendingStoryId: null,
    completedStoryIds: save.campaign.completedStoryIds.includes(storyId) ? save.campaign.completedStoryIds : [...save.campaign.completedStoryIds, storyId],
    storyResumeTarget: null,
  } }, storage);
}

export function markTournamentTimelineCardShown(uid: string, save: TournamentSaveV6, cardId: TimelineCardId, storage: StorageAdapter | null = browserStorage()) {
  if (save.campaign.shownTimelineCardIds.includes(cardId)) return save;
  return writeTournamentSave(uid, { ...save, campaign: { ...save.campaign, shownTimelineCardIds: [...save.campaign.shownTimelineCardIds, cardId] } }, storage);
}
