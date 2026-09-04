import { factionMeta, playableCharacters, type FactionId } from "./gameData";
import {
  attackFormations,
  compatibleDefenseFormations,
  cupFactionBondProfiles,
  factionBondStates,
  formationAbilityForSlot,
  recommendLineup,
  simulateMatch,
  simulateTournamentDecider,
  TEAM_FINISHING_CONVERSION,
  teamCombatProfile,
  type FormationId,
} from "./matchSimulator";
import {
  counterFormations,
  adaptOpponentForSecondLeg,
  fixtureSeed,
  hashSeed,
  stageOrder,
  tournamentPreparationEffects,
  type GeneratedOpponent,
  type TournamentStage,
} from "./tournamentJourney";
import { tournamentCaptainRoutes, type StageOpponentRarityPlan, type TournamentCaptainId } from "./tournamentCaptain";
import {
  isRecruitableCharacter,
  openTournamentRecruitment,
  rarityRates,
  TOURNAMENT_PACK_SIZE,
} from "./tournamentRecruitment";
import {
  buildTournamentCharacters,
  applyTournamentProgress,
  applyTrainingFocus,
  emptyTrainingFocus,
  isGoalkeeper,
  TOURNAMENT_MAX_FOCUS,
  TRAINING_DAY_COST,
  trainingFocusTotal,
  type TrainingFocusId,
  type TournamentCharacter,
} from "./tournamentSquad";
import {
  advanceTournamentAfterMatch,
  advanceTournamentToMatch,
  completeTournamentStory,
  confirmTournamentDraw,
  ensureCurrentTournamentOpponent,
  lockTournamentRecruitment,
  lockTournamentRegistration,
  recordTournamentMatch,
  recordTournamentDecision,
  recordTournamentPackOpening,
  startTournamentJourney,
  toggleTournamentRegistration,
  trainTournamentPlayers,
  type TournamentSaveV6,
} from "../storage/tournamentSaveStorage";

export type RecruitmentStrategy = "expert" | "focused" | "random";
export type TrainingStrategy = "expert" | "none";
export type BreakthroughStrategy = "auto" | "none";

export type TournamentFlowOptions = {
  seed: number;
  captainId?: TournamentCaptainId;
  recruitmentStrategy?: RecruitmentStrategy;
  focusedFactionId?: FactionId;
  trainingStrategy?: TrainingStrategy;
  breakthroughStrategy?: BreakthroughStrategy;
  /** Calibration-only override. Runtime play always uses the centralized captain route values. */
  opponentRarityByStage?: StageOpponentRarityPlan;
};

export type TournamentFlowMatch = {
  fixtureId: string;
  stage: TournamentStage;
  leg: 1 | 2;
  day: number;
  opponent: string;
  attackFormationId: FormationId;
  defenseFormationId: FormationId;
  score: [number, number];
  extraTime?: [number, number];
  penalties?: [number, number];
  advanced?: boolean;
  homeXg: number;
  awayXg: number;
  homeShots: number;
  awayShots: number;
  homePossession: number;
  activeFactionBonds: FactionId[];
  trainedPlayers: number;
  trainingFocusSessions: Record<TrainingFocusId, number>;
};

export type TournamentFlowRun = {
  seed: number;
  captainId: TournamentCaptainId;
  outcome: "champion" | "eliminated";
  eliminatedStage: TournamentStage | null;
  recruitment: {
    packFactions: FactionId[];
    rarityCounts: Record<3 | 4 | 5 | 6, number>;
    uniquePlayers: number;
    duplicateCards: number;
    breakthroughs: number;
  };
  registeredIds: string[];
  matches: TournamentFlowMatch[];
};

export type TournamentBatchReport = {
  options: Omit<TournamentFlowOptions, "seed">;
  runs: number;
  seedStart: number;
  championRate: number;
  outcomes: Record<TournamentStage | "champion", number>;
  stageAdvanceRates: Record<TournamentStage, number | null>;
  averages: {
    matches: number;
    goalsFor: number;
    goalsAgainst: number;
    xgFor: number;
    xgAgainst: number;
    shotsFor: number;
    shotsAgainst: number;
    possession: number;
    uniquePlayers: number;
    breakthroughs: number;
    sixStarCards: number;
  };
  zeroSixStarRate: number;
  factionPackCounts: Record<FactionId, number>;
  factionBondMatchCounts: Record<FactionId, number>;
  trainingFocusSessions: Record<TrainingFocusId, number>;
  samples: TournamentFlowRun[];
};

const factionIds = Object.keys(factionMeta) as FactionId[];
const playerFactionIds = factionIds.filter((factionId) => playableCharacters.some((character) => character.faction_id === factionId && isRecruitableCharacter(character)));
const formationIds = Object.keys(attackFormations) as FormationId[];

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

function recruitmentPlayerValue(player: TournamentCharacter | ReturnType<typeof applyTournamentProgress>) {
  return Math.max(...formationIds.flatMap((attackFormationId) => {
    const defenseFormationId = compatibleDefenseFormations[attackFormationId][0];
    return attackFormations[attackFormationId].slots.map((slot) => formationAbilityForSlot(player, slot, defenseFormationId));
  }));
}

function expertRegistrationSnapshot(save: TournamentSaveV6) {
  const players = buildTournamentCharacters(playableCharacters, save.squad);
  const ranked = players.map((player) => ({ player, value: recruitmentPlayerValue(player) }))
    .sort((left, right) => right.value - left.value || right.player.stars - left.player.stars || left.player.character_id.localeCompare(right.player.character_id));
  const selected = ranked.filter(({ player }) => isGoalkeeper(player)).slice(0, 2);
  for (const entry of ranked) {
    if (selected.some(({ player }) => player.character_id === entry.player.character_id)) continue;
    selected.push(entry);
    if (selected.length === 18) break;
  }
  return {
    byId: new Map(ranked.map((entry) => [entry.player.character_id, entry])),
    selectedIds: new Set(selected.map(({ player }) => player.character_id)),
    cutoff: Math.min(...selected.map(({ value }) => value)),
    factionCounts: selected.reduce((counts, { player }) => counts.set(player.faction_id, (counts.get(player.faction_id) ?? 0) + 1), new Map<FactionId, number>()),
  };
}

export function expertRecruitmentFactionChoice(save: TournamentSaveV6, maximumStars: 4 | 5 | 6) {
  const rates = rarityRates(save.campaign.recruitment.progress.pullsSinceSixStar, maximumStars);
  const snapshot = expertRegistrationSnapshot(save);
  return [...playerFactionIds].map((factionId) => {
    const pool = playableCharacters.filter((character) => character.faction_id === factionId && isRecruitableCharacter(character) && character.stars <= maximumStars);
    const expectedGain = ([3, 4, 5, 6] as const).reduce((total, stars) => {
      if (stars > maximumStars || rates[stars] === 0) return total;
      const tier = pool.filter((character) => character.stars === stars);
      const tierGain = tier.reduce((sum, character) => {
        const current = snapshot.byId.get(character.character_id);
        const progress = save.squad.characterProgress[character.character_id] ?? { focus: emptyTrainingFocus(), breakthroughRank: 0 };
        const nextRank = current ? Math.min(5, progress.breakthroughRank + 1) : 0;
        const next = applyTournamentProgress(character, progress.focus, nextRank);
        const nextValue = recruitmentPlayerValue(next);
        const entersRegistration = snapshot.selectedIds.has(character.character_id) || nextValue > snapshot.cutoff;
        const rosterGain = snapshot.selectedIds.has(character.character_id)
          ? Math.max(0, nextValue - (current?.value ?? nextValue))
          : Math.max(0, nextValue - snapshot.cutoff);
        const bond = cupFactionBondProfiles[factionId];
        const bondGain = entersRegistration && !snapshot.selectedIds.has(character.character_id) && snapshot.factionCounts.get(factionId) === 2
          ? bond.ability === "possession" ? bond.bonus * .6 : bond.ability === "xg" ? bond.bonus * 100 : bond.bonus
          : 0;
        return sum + rosterGain + bondGain;
      }, 0) / tier.length;
      return total + rates[stars] * tierGain;
    }, 0);
    return { factionId, expectedGain };
  }).sort((left, right) => right.expectedGain - left.expectedGain || playerFactionIds.indexOf(left.factionId) - playerFactionIds.indexOf(right.factionId))[0].factionId;
}

function choosePackFaction(
  strategy: RecruitmentStrategy,
  save: TournamentSaveV6,
  random: () => number,
  focusedFactionId: FactionId,
  maximumStars: 4 | 5 | 6,
) {
  if (strategy === "focused") return focusedFactionId;
  if (strategy === "random") return playerFactionIds[Math.floor(random() * playerFactionIds.length)];
  return expertRecruitmentFactionChoice(save, maximumStars);
}

export function selectTournamentRegistration(players: TournamentCharacter[]) {
  const appearances = new Map<string, number>();
  for (const attackFormationId of formationIds) {
    const defenseFormationId = compatibleDefenseFormations[attackFormationId][0];
    const lineup = recommendLineup(players, attackFormationId, defenseFormationId);
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
  if (selected.length !== 18) throw new Error("自动注册无法选出18名球员");
  return selected.map(({ character_id }) => character_id);
}

function countAutomaticBreakthroughs(initialSave: TournamentSaveV6) {
  const breakthroughs = Object.values(initialSave.squad.characterProgress)
    .reduce((total, progress) => total + progress.breakthroughRank, 0);
  return breakthroughs;
}

function lineupRoleScore(players: TournamentCharacter[], lineup: Record<string, string | null>, attackFormationId: FormationId, defenseFormationId: FormationId) {
  const byId = new Map(players.map((player) => [player.character_id, player]));
  return attackFormations[attackFormationId].slots.reduce((total, slot) => {
    const player = byId.get(lineup[slot.id] ?? "");
    return total + (player ? formationAbilityForSlot(player, slot, defenseFormationId) : 0);
  }, 0);
}

function factionCombos(count: number): FactionId[][] {
  const combos: FactionId[][] = [];
  const walk = (start: number, current: FactionId[]) => {
    if (current.length === count) { combos.push(current); return; }
    for (let index = start; index < playerFactionIds.length; index += 1) walk(index + 1, [...current, playerFactionIds[index]]);
  };
  walk(0, []);
  return combos;
}

// 从一键首发出发，生成恰好满足 bondCount 个阵营三人门槛的候选；最终由下一场预期净胜球统一比较
// 0/1/2/3 羁绊，不再要求一次凑满三羁绊，也不再使用固定 5.5 位置能力保护线。
function lineupWithBonds(
  players: TournamentCharacter[],
  attackFormationId: FormationId,
  defenseFormationId: FormationId,
  bondCount: number,
  opponent?: Pick<GeneratedOpponent, "characters" | "lineup" | "attackFormationId">,
) {
  const base = recommendLineup(players, attackFormationId, defenseFormationId);
  const byId = new Map(players.map((player) => [player.character_id, player]));
  let best: Record<string, string | null> | null = null;
  let bestScore = -Infinity;
  const tryCombo = (factions: FactionId[]) => {
    let lineup = { ...base };
    for (const factionId of factions) {
      while (Object.values(lineup).filter((id) => byId.get(id ?? "")?.faction_id === factionId).length < 3) {
        const used = new Set(Object.values(lineup).filter((id): id is string => Boolean(id)));
        const candidates = players.filter((player) => player.faction_id === factionId && !used.has(player.character_id));
        const replacements = attackFormations[attackFormationId].slots.flatMap((slot) => {
          const current = byId.get(lineup[slot.id] ?? "");
          if (!current || factions.includes(current.faction_id)) return [];
          return candidates.map((candidate) => ({
            slot,
            candidate,
            delta: formationAbilityForSlot(candidate, slot, defenseFormationId) - formationAbilityForSlot(current, slot, defenseFormationId),
          }));
        }).sort((left, right) => right.delta - left.delta);
        if (!replacements.length) return;
        lineup[replacements[0].slot.id] = replacements[0].candidate.character_id;
      }
    }
    const activeBonds = factionBondStates(players.filter((player) => Object.values(lineup).includes(player.character_id))).filter(({ layers }) => layers > 0);
    if (activeBonds.length < bondCount) return;
    const score = expertLineupScore(players, lineup, attackFormationId, opponent);
    if (score > bestScore) { best = lineup; bestScore = score; }
  };
  for (const combo of factionCombos(bondCount)) {
    tryCombo(combo);
    tryCombo([...combo].reverse());
  }
  return best;
}

function expertLineupScore(
  players: TournamentCharacter[],
  lineup: Record<string, string | null>,
  attackFormationId: FormationId,
  opponent?: Pick<GeneratedOpponent, "characters" | "lineup" | "attackFormationId">,
) {
  const home = teamCombatProfile(lineup, attackFormationId, new Map(players.map((player) => [player.character_id, player])));
  if (!opponent) return home.creation + home.finishing + home.prevention + home.goalkeeping * .25;
  const away = teamCombatProfile(opponent.lineup, opponent.attackFormationId, new Map(opponent.characters.map((player) => [player.character_id, player])));
  return combatMatchupScore(home, away);
}

export function selectExpertLineup(
  players: TournamentCharacter[],
  attackFormationId: FormationId,
  defenseFormationId: FormationId,
  opponent?: Pick<GeneratedOpponent, "characters" | "lineup" | "attackFormationId">,
) {
  const base = recommendLineup(players, attackFormationId, defenseFormationId);
  const candidates = [base];
  for (const bondCount of [1, 2, 3]) {
    const candidate = lineupWithBonds(players, attackFormationId, defenseFormationId, bondCount, opponent);
    if (candidate) candidates.push(candidate);
  }
  return candidates.sort((left, right) =>
    expertLineupScore(players, right, attackFormationId, opponent) - expertLineupScore(players, left, attackFormationId, opponent)
    || lineupRoleScore(players, right, attackFormationId, defenseFormationId) - lineupRoleScore(players, left, attackFormationId, defenseFormationId))[0];
}

const expertTrainingFocusIds: TrainingFocusId[] = ["attack", "playmaking", "defense"];

function expectedGoalsProxy(
  attack: ReturnType<typeof teamCombatProfile>,
  defense: ReturnType<typeof teamCombatProfile>,
) {
  const creationDelta = attack.creation - defense.prevention;
  const shots = Math.min(10, Math.max(3, 6.5 + creationDelta * .11));
  const chance = Math.min(.62, Math.max(.02,
    .15 * Math.min(2.05, Math.max(.35, Math.exp(creationDelta / 18)))
    + (attack.finishing - defense.goalkeeping) * TEAM_FINISHING_CONVERSION));
  return shots * chance;
}

export function combatMatchupScore(
  home: ReturnType<typeof teamCombatProfile>,
  away: ReturnType<typeof teamCombatProfile>,
) {
  return expectedGoalsProxy(home, away) - expectedGoalsProxy(away, home);
}

export function expertTrainingChoice(
  players: TournamentCharacter[],
  lineup: Record<string, string | null>,
  attackFormationId: FormationId,
  opponent?: Pick<GeneratedOpponent, "characters" | "lineup" | "attackFormationId">,
) {
  const eligible = players.filter((player) => trainingFocusTotal(player.focus) < TOURNAMENT_MAX_FOCUS);
  if (eligible.length < 3) return null;
  const baseMap = new Map(players.map((player) => [player.character_id, player]));
  const awayProfile = opponent
    ? teamCombatProfile(opponent.lineup, opponent.attackFormationId, new Map(opponent.characters.map((player) => [player.character_id, player])))
    : null;
  const score = (profile: ReturnType<typeof teamCombatProfile>) => awayProfile
    ? combatMatchupScore(profile, awayProfile)
    : profile.creation + profile.finishing + profile.prevention + profile.goalkeeping * .25;
  const baseScore = score(teamCombatProfile(lineup, attackFormationId, baseMap));
  const cases = expertTrainingFocusIds.map((focusId) => {
    const ranked = eligible.map((player) => {
      const focus = { attack: 0, playmaking: 0, defense: 0, [focusId]: 1 };
      const trained = applyTrainingFocus(player, focus);
      const nextMap = new Map(baseMap);
      nextMap.set(player.character_id, { ...player, ...trained });
      return { player, gain: score(teamCombatProfile(lineup, attackFormationId, nextMap)) - baseScore };
    }).sort((left, right) => right.gain - left.gain || right.player.attributes.overall - left.player.attributes.overall || left.player.character_id.localeCompare(right.player.character_id));
    const group = ranked.slice(0, 3).map(({ player }) => player);
    const groupMap = new Map(baseMap);
    for (const player of group) {
      const focus = { attack: 0, playmaking: 0, defense: 0, [focusId]: 1 };
      groupMap.set(player.character_id, { ...player, ...applyTrainingFocus(player, focus) });
    }
    return { focusId, group, gain: score(teamCombatProfile(lineup, attackFormationId, groupMap)) - baseScore };
  });
  return cases.sort((left, right) => right.gain - left.gain || expertTrainingFocusIds.indexOf(left.focusId) - expertTrainingFocusIds.indexOf(right.focusId))[0];
}

function trainForCurrentFixture(uid: string, initialSave: TournamentSaveV6, attackFormationId: FormationId, defenseFormationId: FormationId, strategy: TrainingStrategy, opponent: GeneratedOpponent) {
  let save = initialSave;
  const fixture = save.campaign.fixtures[save.campaign.currentFixtureIndex];
  const focusSessions: Record<TrainingFocusId, number> = { attack: 0, playmaking: 0, defense: 0 };
  if (!fixture) return { save, count: 0, focusSessions };
  const trainedIds = new Set<string>();
  while (strategy === "expert" && fixture.day - save.campaign.day >= TRAINING_DAY_COST) {
    const players = buildTournamentCharacters(playableCharacters, save.squad)
      .filter((player) => save.campaign.registration.registeredIds.includes(player.character_id));
    const lineup = selectExpertLineup(players, attackFormationId, defenseFormationId, opponent);
    const choice = expertTrainingChoice(players, lineup, attackFormationId, opponent);
    if (!choice) break;
    save = trainTournamentPlayers(uid, save, choice.focusId, choice.group.map(({ character_id }) => character_id), null);
    choice.group.forEach(({ character_id }) => trainedIds.add(character_id));
    focusSessions[choice.focusId] += 1;
  }
  return { save, count: trainedIds.size, focusSessions };
}

export function simulateTournamentFlow(options: TournamentFlowOptions): TournamentFlowRun {
  const seed = options.seed >>> 0;
  const captainId = options.captainId ?? "saya";
  const captainRoute = tournamentCaptainRoutes[captainId];
  const recruitmentStrategy = options.recruitmentStrategy ?? "expert";
  const focusedFactionId = options.focusedFactionId ?? captainRoute.factionId;
  const trainingStrategy = options.trainingStrategy ?? "expert";
  const breakthroughStrategy = options.breakthroughStrategy ?? "auto";
  const uid = `simulation-${seed}`;
  const random = seededRandom(hashSeed(`${seed}|recruitment`));
  let save = startTournamentJourney(uid, seed, null, captainId);
  const initialCollectionSize = Object.keys(save.squad.collection).length;
  const rarityCounts: Record<3 | 4 | 5 | 6, number> = { 3: 0, 4: 0, 5: 0, 6: 0 };
  const packFactions: FactionId[] = [];

  for (let packIndex = 0; packIndex < captainRoute.recruitmentBudget / TOURNAMENT_PACK_SIZE; packIndex += 1) {
    const factionId = choosePackFaction(recruitmentStrategy, save, random, focusedFactionId, captainRoute.recruitmentStarCap);
    const opened = openTournamentRecruitment(
      playableCharacters,
      factionId,
      save.squad.collection,
      save.campaign.recruitment.progress,
      random,
      TOURNAMENT_PACK_SIZE,
      captainRoute.recruitmentStarCap,
    );
    for (const { character } of opened.cards) rarityCounts[character.stars as 3 | 4 | 5 | 6] += 1;
    packFactions.push(factionId);
    save = recordTournamentPackOpening(uid, save, opened, null);
  }

  const breakthroughs = breakthroughStrategy === "auto" ? countAutomaticBreakthroughs(save) : 0;
  save = lockTournamentRecruitment(uid, save, null);
  const registeredIds = selectTournamentRegistration(buildTournamentCharacters(playableCharacters, save.squad));
  for (const id of registeredIds) save = toggleTournamentRegistration(uid, save, id, null);
  save = lockTournamentRegistration(uid, save, null);
  save = confirmTournamentDraw(uid, save, null);

  const matches: TournamentFlowMatch[] = [];
  while (save.campaign.phase === "preparation") {
    const fixture = save.campaign.fixtures[save.campaign.currentFixtureIndex];
    if (!fixture) throw new Error("杯赛准备阶段缺少赛程");
    const ensured = ensureCurrentTournamentOpponent(uid, save, null, options.opponentRarityByStage?.[fixture.stage]);
    save = ensured.save;
    const firstLegEntry = fixture.leg === 2
      ? save.campaign.results.find((entry) => entry.fixtureId === save.campaign.fixtures.find((item) => item.stage === fixture.stage && item.leg === 1)?.id)
      : undefined;
    const opponent = adaptOpponentForSecondLeg(ensured.opponent, firstLegEntry?.matchContext);
    // Expert 代表可复盘并掌握公开对手信息的强玩家：选择克制阵型，但不读取比赛 Seed。
    const formations = counterFormations(opponent);
    const training = trainingStrategy !== "none"
      ? trainForCurrentFixture(uid, save, formations.attackFormationId, formations.defenseFormationId, trainingStrategy, opponent)
      : { save, count: 0, focusSessions: { attack: 0, playmaking: 0, defense: 0 } };
    save = advanceTournamentToMatch(uid, training.save, null);
    if (save.campaign.phase === "story") save = completeTournamentStory(uid, save, null);
    const players = buildTournamentCharacters(playableCharacters, save.squad)
      .filter((player) => save.campaign.registration.registeredIds.includes(player.character_id));
    const lineup = selectExpertLineup(players, formations.attackFormationId, formations.defenseFormationId, opponent);
    const preparation = tournamentPreparationEffects({
      characters: players,
      lineup,
      attackFormationId: formations.attackFormationId,
      defenseFormationId: formations.defenseFormationId,
      opponent,
      stage: fixture.stage,
    });
    const result = simulateMatch({
      characters: [...players, ...opponent.characters],
      homeLineup: lineup,
      homeAttackFormationId: formations.attackFormationId,
      homeDefenseFormationId: formations.defenseFormationId,
      homeSkillLoadouts: save.squad.skillLoadouts,
      homeSkillLevels: save.campaign.skillLevels,
      homeName: "测试球队",
      awayName: opponent.name,
      awayLineup: opponent.lineup,
      awayAttackFormationId: opponent.attackFormationId,
      awayDefenseFormationId: opponent.defenseFormationId,
      awaySkillLoadouts: opponent.skillLoadouts,
      fixtureSeed: fixtureSeed(seed, fixture.id, fixture.leg),
      homeMatchEffects: preparation.effects,
    });
    const matchContext = { homeLineup: lineup, homeAttackFormationId: formations.attackFormationId, homeDefenseFormationId: formations.defenseFormationId, homeMatchEffects: preparation.effects };
    save = recordTournamentMatch(uid, save, result, null, matchContext);
    let settled = save.campaign.results.at(-1);
    if (!settled) throw new Error("比赛结算未写入结果");
    if (settled.decision?.status === "pending") {
      const decision = simulateTournamentDecider({
        characters: [...players, ...opponent.characters],
        context: matchContext,
        awayLineup: opponent.lineup,
        awayAttackFormationId: opponent.attackFormationId,
        awayDefenseFormationId: opponent.defenseFormationId,
        homeName: "测试球队",
        awayName: opponent.name,
        regulation: result,
        aggregateAt90: settled.decision.aggregateAt90,
      });
      save = recordTournamentDecision(uid, save, decision, null);
      settled = save.campaign.results.at(-1)!;
    }
    const starterIds = new Set(Object.values(lineup).filter((id): id is string => Boolean(id)));
    const starters = players.filter((player) => starterIds.has(player.character_id));
    matches.push({
      fixtureId: fixture.id,
      stage: fixture.stage,
      leg: fixture.leg,
      day: fixture.day,
      opponent: opponent.name,
      attackFormationId: formations.attackFormationId,
      defenseFormationId: formations.defenseFormationId,
      score: [result.homeScore, result.awayScore],
      extraTime: settled.extraTime ? [settled.extraTime.player, settled.extraTime.opponent] : undefined,
      penalties: settled.penalties ? [settled.penalties.player, settled.penalties.opponent] : undefined,
      advanced: settled.advanced,
      homeXg: settled.result.homeXg,
      awayXg: settled.result.awayXg,
      homeShots: settled.result.homeShots,
      awayShots: settled.result.awayShots,
      homePossession: result.homePossession,
      activeFactionBonds: factionBondStates(starters).filter(({ layers }) => layers > 0).map(({ factionId }) => factionId),
      trainedPlayers: training.count,
      trainingFocusSessions: training.focusSessions,
    });
    save = advanceTournamentAfterMatch(uid, save, null);
    if (save.campaign.phase === "story") save = completeTournamentStory(uid, save, null);
  }

  if (save.campaign.phase !== "finished" || !save.campaign.outcome) throw new Error("杯赛模拟没有进入结束状态");
  const uniquePlayers = Object.keys(save.squad.collection).length;
  return {
    seed,
    captainId,
    outcome: save.campaign.outcome,
    eliminatedStage: save.campaign.outcome === "eliminated" ? matches.at(-1)?.stage ?? null : null,
    recruitment: {
      packFactions,
      rarityCounts,
      uniquePlayers,
      duplicateCards: captainRoute.recruitmentBudget + initialCollectionSize - uniquePlayers,
      breakthroughs,
    },
    registeredIds,
    matches,
  };
}

function average(total: number, count: number) {
  return count ? total / count : 0;
}

export function simulateTournamentBatch(args: Omit<TournamentFlowOptions, "seed"> & { runs: number; seedStart?: number; sampleCount?: number }): TournamentBatchReport {
  const runs = Math.max(1, Math.floor(args.runs));
  const seedStart = (args.seedStart ?? 1) >>> 0;
  const results = Array.from({ length: runs }, (_, index) => simulateTournamentFlow({ ...args, seed: seedStart + index }));
  const outcomes: Record<TournamentStage | "champion", number> = { round_of_16: 0, quarter_final: 0, semi_final: 0, final: 0, champion: 0 };
  const decisions = Object.fromEntries(stageOrder.map((stage) => [stage, { total: 0, advanced: 0 }])) as Record<TournamentStage, { total: number; advanced: number }>;
  const factionPackCounts = Object.fromEntries(factionIds.map((id) => [id, 0])) as Record<FactionId, number>;
  const factionBondMatchCounts = Object.fromEntries(factionIds.map((id) => [id, 0])) as Record<FactionId, number>;
  const trainingFocusSessions: Record<TrainingFocusId, number> = { attack: 0, playmaking: 0, defense: 0 };
  let matchCount = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let xgFor = 0;
  let xgAgainst = 0;
  let shotsFor = 0;
  let shotsAgainst = 0;
  let possession = 0;
  for (const run of results) {
    outcomes[run.outcome === "champion" ? "champion" : run.eliminatedStage ?? "round_of_16"] += 1;
    for (const factionId of run.recruitment.packFactions) factionPackCounts[factionId] += 1;
    for (const match of run.matches) {
      matchCount += 1;
      goalsFor += match.score[0];
      goalsAgainst += match.score[1];
      xgFor += match.homeXg;
      xgAgainst += match.awayXg;
      shotsFor += match.homeShots;
      shotsAgainst += match.awayShots;
      possession += match.homePossession;
      for (const factionId of match.activeFactionBonds) factionBondMatchCounts[factionId] += 1;
      for (const focusId of expertTrainingFocusIds) trainingFocusSessions[focusId] += match.trainingFocusSessions[focusId];
      if (match.advanced !== undefined) {
        decisions[match.stage].total += 1;
        decisions[match.stage].advanced += Number(match.advanced);
      }
    }
  }
  const sum = (selector: (run: TournamentFlowRun) => number) => results.reduce((total, run) => total + selector(run), 0);
  return {
    options: {
      captainId: args.captainId ?? "saya",
      recruitmentStrategy: args.recruitmentStrategy ?? "expert",
      focusedFactionId: args.focusedFactionId,
      trainingStrategy: args.trainingStrategy ?? "expert",
      breakthroughStrategy: args.breakthroughStrategy ?? "auto",
      opponentRarityByStage: args.opponentRarityByStage,
    },
    runs,
    seedStart,
    championRate: outcomes.champion / runs,
    outcomes,
    stageAdvanceRates: Object.fromEntries(stageOrder.map((stage) => [stage, decisions[stage].total ? decisions[stage].advanced / decisions[stage].total : null])) as Record<TournamentStage, number | null>,
    averages: {
      matches: average(matchCount, runs),
      goalsFor: average(goalsFor, matchCount),
      goalsAgainst: average(goalsAgainst, matchCount),
      xgFor: average(xgFor, matchCount),
      xgAgainst: average(xgAgainst, matchCount),
      shotsFor: average(shotsFor, matchCount),
      shotsAgainst: average(shotsAgainst, matchCount),
      possession: average(possession, matchCount),
      uniquePlayers: average(sum((run) => run.recruitment.uniquePlayers), runs),
      breakthroughs: average(sum((run) => run.recruitment.breakthroughs), runs),
      sixStarCards: average(sum((run) => run.recruitment.rarityCounts[6]), runs),
    },
    zeroSixStarRate: results.filter((run) => run.recruitment.rarityCounts[6] === 0).length / runs,
    factionPackCounts,
    factionBondMatchCounts,
    trainingFocusSessions,
    samples: results.slice(0, Math.max(0, Math.floor(args.sampleCount ?? 3))),
  };
}
