import { describe, expect, it } from "vitest";
import { playableCharacters } from "../data/gameData";
import { recommendLineup, simulateMatch } from "../data/matchSimulator";
import { fixtureSeed, TOURNAMENT_ROSTER_SIZE } from "../data/tournamentJourney";
import { applyTournamentProgress, buildTournamentCharacters, emptyTrainingFocus } from "../data/tournamentSquad";
import { remainingTournamentPreparationDays } from "../data/tournamentRules";
import type { StorageAdapter } from "./localAccountStore";
import {
  advanceTournamentAfterMatch,
  completeTournamentStory,
  advanceTournamentToMatch,
  confirmTournamentDraw,
  createTournamentSave,
  ensureCurrentTournamentOpponent,
  equipTournamentSkill,
  isTournamentSave,
  isTournamentSquad,
  loadTournamentSave,
  lockTournamentRecruitment,
  lockTournamentRegistration,
  markTournamentScoutReportViewed,
  recordTournamentMatch,
  recordTournamentDecision,
  recordTournamentPackOpening,
  saveTournamentSave,
  selectTournamentCaptain,
  setTournamentRegistration,
  startTournamentJourney,
  studyTournamentSkill,
  toggleTournamentRegistration,
  tournamentSaveKey,
  trainTournamentPlayers,
  unequipTournamentSkill,
} from "./tournamentSaveStorage";

function memoryStorage() {
  const values = new Map<string, string>();
  const storage: StorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
  return { storage, values };
}

function enterPreparation(uid: string, storage: StorageAdapter) {
  let save = startTournamentJourney(uid, 17, storage);
  save = lockTournamentRecruitment(uid, save, storage);
  for (const id of Object.keys(save.squad.collection).slice(0, TOURNAMENT_ROSTER_SIZE)) {
    save = toggleTournamentRegistration(uid, save, id, storage);
  }
  save = lockTournamentRegistration(uid, save, storage);
  return confirmTournamentDraw(uid, save, storage);
}

describe("TournamentSaveV7", () => {
  it("spends ten of the sixty-pull budget on the required opening pack", () => {
    const { storage } = memoryStorage();
    const save = createTournamentSave(13, "recruitment");
    const cards = playableCharacters.slice(0, 10).map((character) => ({ character, isNew: !save.squad.collection[character.character_id], copyNumber: 1 }));
    const next = recordTournamentPackOpening("required-first-ten", save, {
      factionId: "fog_court",
      cards,
      highestStars: 5,
      revealTier: "gold",
      nextProgress: { pullsSinceSixStar: 10, firstTenGuaranteeUsed: true },
    }, storage);

    expect(save.campaign.recruitment).toMatchObject({ pullsMade: 0, budgetRemaining: 60 });
    expect(next.campaign.recruitment).toMatchObject({ pullsMade: 10, budgetRemaining: 50 });
  });

  it("settles duplicate cards from an older save when loading the new automatic rule", () => {
    const { storage, values } = memoryStorage();
    const save = createTournamentSave(17, "recruitment");
    const characterId = Object.keys(save.squad.collection)[0];
    const pending = {
      ...save,
      squad: {
        ...save.squad,
        collection: { ...save.squad.collection, [characterId]: 2 },
      },
    };
    values.set(tournamentSaveKey("automatic-stars"), JSON.stringify(pending));

    const loaded = loadTournamentSave("automatic-stars", storage);

    expect(loaded.squad.characterProgress[characterId].breakthroughRank).toBe(1);
    expect(loaded.squad.collection[characterId]).toBe(2);
  });

  it("bulk-fills the registration selection and validates the roster", () => {
    const { storage } = memoryStorage();
    let save = startTournamentJourney("quick-fill", 31, storage);
    save = lockTournamentRecruitment("quick-fill", save, storage);
    const ownedByOverall = buildTournamentCharacters(playableCharacters, save.squad)
      .sort((a, b) => b.attributes.overall - a.attributes.overall)
      .map((player) => player.character_id);
    expect(ownedByOverall.length).toBeGreaterThanOrEqual(TOURNAMENT_ROSTER_SIZE);
    const top18 = ownedByOverall.slice(0, TOURNAMENT_ROSTER_SIZE);
    save = setTournamentRegistration("quick-fill", save, [...top18.slice(0, 5), ...top18], storage);
    expect(save.campaign.registration.selection).toEqual(top18);
    expect(() => setTournamentRegistration("quick-fill", save, ["not-owned"], storage)).toThrow(/赛事收藏以外/);
    expect(() => setTournamentRegistration("quick-fill", save, [...top18, "not-owned"], storage)).toThrow(/最多/);
  });

  it("uses one new key and ignores both legacy save shapes", () => {
    const { storage, values } = memoryStorage();
    values.set("ball-girl:game-save-v3:manager", JSON.stringify({ schemaVersion: 3, recruitmentTokens: 999 }));
    values.set("ball-girl:tournament-journey-v1:manager", JSON.stringify({ day: 88, actionPoints: 0 }));
    values.set("ball-girl:game-save-v3:manager:tournament-99", JSON.stringify({ schemaVersion: 3, recruitmentTokens: 0 }));
    values.set("ball-girl:tournament-save-v3:manager", JSON.stringify({ schemaVersion: 3, campaign: { phase: "preparation" } }));

    const save = loadTournamentSave("manager", storage);
    for (const [characterId, loadout] of Object.entries(save.squad.skillLoadouts)) {
      expect(isTournamentSquad({ ...save.squad, skillLoadouts: { [characterId]: loadout } }), characterId).toBe(true);
    }
    expect(isTournamentSquad(save.squad)).toBe(true);
    expect(isTournamentSave(save)).toBe(true);
    expect(save.schemaVersion).toBe(7);
    expect(save.campaign.day).toBe(1);
    expect(save.campaign).not.toHaveProperty("actionPoints");
    expect(values.has(tournamentSaveKey("manager"))).toBe(true);
    expect(loadTournamentSave("manager", storage)).toEqual(save);
  });

  it("keeps an already generated opponent when a future-stage rarity bonus changes", () => {
    const { storage } = memoryStorage();
    const prepared = enterPreparation("kept-opponent", storage);
    const first = ensureCurrentTournamentOpponent("kept-opponent", prepared, storage);
    const futureBonus = { fiveStar: 5, sixStar: 3 };

    const second = ensureCurrentTournamentOpponent("kept-opponent", first.save, storage, futureBonus);

    expect(second.save).toBe(first.save);
    expect(second.opponent).toBe(first.opponent);
  });

  it("adds the fixed heritage bond marker to a stored opponent without regenerating it", () => {
    const { storage } = memoryStorage();
    const prepared = enterPreparation("stored-opponent-bond", storage);
    const first = ensureCurrentTournamentOpponent("stored-opponent-bond", prepared, storage);
    const fixture = first.save.campaign.fixtures[first.save.campaign.currentFixtureIndex]!;
    const legacyOpponent = structuredClone(first.opponent);
    legacyOpponent.characters.forEach((character) => delete character.tournamentOpponentBondFactionId);
    const legacySave = {
      ...first.save,
      campaign: {
        ...first.save.campaign,
        generatedOpponents: { ...first.save.campaign.generatedOpponents, [fixture.stage]: legacyOpponent },
      },
    };

    const migrated = ensureCurrentTournamentOpponent("stored-opponent-bond", legacySave, storage);

    expect(migrated.opponent.characters.every(({ tournamentOpponentBondFactionId }) => Boolean(tournamentOpponentBondFactionId))).toBe(true);
    expect(migrated.opponent.characters.map(({ tournamentOpponentBondFactionId: _bond, ...character }) => character))
      .toEqual(legacyOpponent.characters);
    expect(migrated.opponent.lineup).toEqual(legacyOpponent.lineup);
    expect(migrated.opponent.seed).toBe(legacyOpponent.seed);
  });

  it("migrates the v5 key and preserves scouted stages with deterministic v7 defaults", () => {
    const { storage, values } = memoryStorage();
    const base = enterPreparation("v5-manager", storage);
    const fixture = base.campaign.fixtures[0];
    const legacyCampaign: any = structuredClone(base.campaign);
    legacyCampaign.scoutedFixtureIds = [fixture.id];
    delete legacyCampaign.scoutedStageIds;
    delete legacyCampaign.completedStoryIds;
    delete legacyCampaign.shownTimelineCardIds;
    delete legacyCampaign.storyResumeTarget;
    const legacyKey = "ball-girl:tournament-save-v5:v5-manager";
    values.delete(tournamentSaveKey("v5-manager"));
    values.set(legacyKey, JSON.stringify({ ...base, schemaVersion: 5, campaign: legacyCampaign }));

    const migrated = loadTournamentSave("v5-manager", storage);

    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.campaign.captainId).toBe("saya");
    expect(migrated.campaign.scoutedStageIds).toEqual([fixture.stage]);
    expect(migrated.campaign.completedStoryIds).toEqual([]);
    expect(migrated.campaign.shownTimelineCardIds).toEqual([]);
    expect(migrated.campaign.storyResumeTarget).toBeNull();
    expect(values.has(tournamentSaveKey("v5-manager"))).toBe(true);
    expect(values.has(legacyKey)).toBe(false);
  });

  it("restarts a finished cup from a fresh Day 1 instead of the last round checkpoint", () => {
    const { storage } = memoryStorage();
    const previous = enterPreparation("full-restart", storage);
    const finished = {
      ...previous,
      campaign: {
        ...previous.campaign,
        phase: "finished" as const,
        day: 99,
        currentFixtureIndex: previous.campaign.fixtures.length,
        outcome: "eliminated" as const,
      },
    };
    saveTournamentSave("full-restart", finished, storage);

    const restarted = startTournamentJourney("full-restart", 29, storage);

    expect(finished.campaign.currentFixtureIndex).toBeGreaterThan(0);
    expect(restarted.campaign).toMatchObject({ phase: "recruitment", day: 1, currentFixtureIndex: 0, outcome: null });
    expect(restarted.campaign.fixtures).toEqual([]);
    expect(restarted.campaign.results).toEqual([]);
    expect(loadTournamentSave("full-restart", storage)).toEqual(restarted);
  });

  it("rejects malformed V3 data instead of migrating legacy loadouts", () => {
    const { storage, values } = memoryStorage();
    const save = createTournamentSave(19, "preparation");
    const legacyLoadout = ["skill-a", "skill-b", "skill-c", "skill-d"];
    const legacy = {
      ...save,
      squad: {
        ...save.squad,
        skillInventory: Object.fromEntries(legacyLoadout.map((skillId) => [skillId, 1])),
        skillLoadouts: { founder_sakura_link_4: legacyLoadout },
      },
    };
    values.set(tournamentSaveKey("rarity-migration"), JSON.stringify(legacy));

    const loaded = loadTournamentSave("rarity-migration", storage);

    expect(loaded.campaign.campaignSeed).not.toBe(19);
    expect(loaded.squad.skillLoadouts.founder_sakura_link_4).not.toEqual(legacyLoadout);
    expect(JSON.parse(values.get(tournamentSaveKey("rarity-migration"))!).schemaVersion).toBe(7);
  });

  it("migrates a v6 save to the Saya route and removes its legacy key", () => {
    const { storage, values } = memoryStorage();
    const legacy = createTournamentSave(23, "recruitment");
    const campaign = structuredClone(legacy.campaign) as any;
    delete campaign.captainId;
    values.set("ball-girl:tournament-save-v6:legacy-v6", JSON.stringify({ ...legacy, schemaVersion: 6, campaign }));

    const migrated = loadTournamentSave("legacy-v6", storage);

    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.campaign.captainId).toBe("saya");
    expect(values.has("ball-girl:tournament-save-v6:legacy-v6")).toBe(false);
  });

  it("shrinks unused legacy recruitment budget without discarding route progress", () => {
    const { storage, values } = memoryStorage();
    const legacy = createTournamentSave(29, "recruitment", "naya");
    legacy.campaign.recruitment = { ...legacy.campaign.recruitment, pullsMade: 10, budgetRemaining: 50 };
    values.set(tournamentSaveKey("legacy-naya-budget"), JSON.stringify(legacy));

    const migrated = loadTournamentSave("legacy-naya-budget", storage);

    expect(migrated.campaign.captainId).toBe("naya");
    expect(migrated.campaign.recruitment).toMatchObject({ pullsMade: 10, budgetRemaining: 40 });
    expect(migrated.squad.collection).toEqual(legacy.squad.collection);
  });

  it("locks a selected route before recruitment and gives each captain the intended starters", () => {
    const { storage } = memoryStorage();
    const unselected = startTournamentJourney("captain-choice", 37, storage, null);
    expect(unselected.campaign.captainId).toBeNull();
    expect(() => lockTournamentRecruitment("captain-choice", unselected, storage)).toThrow(/队长/);

    const naya = selectTournamentCaptain("captain-choice", unselected, "naya", storage);
    expect(naya.campaign.captainId).toBe("naya");
    expect(naya.campaign.recruitment.budgetRemaining).toBe(50);
    expect(naya.preferences.activeMascotAnchorId).toBe("founder_right");
    expect(naya.squad.collection).toHaveProperty("founder_samba_union_7", 1);
    expect(naya.squad.collection).not.toHaveProperty("silver_luciana_vega");
    expect(Object.keys(naya.squad.collection)).toHaveLength(TOURNAMENT_ROSTER_SIZE);

    const irena = selectTournamentCaptain("captain-choice", unselected, "irena", storage);
    expect(irena.campaign.recruitment.budgetRemaining).toBe(40);
    expect(irena.preferences.activeMascotAnchorId).toBe("founder_center");
    expect(irena.squad.collection).toMatchObject({
      founder_sakura_link_4: 1,
      founder_samba_union_7: 1,
      founder_scarlet_toros_6: 1,
    });
    expect(irena.squad.collection).not.toHaveProperty("silver_luciana_vega");
    expect(irena.squad.collection).not.toHaveProperty("fog_eleanor_hart");
    expect(Object.keys(irena.squad.collection)).toHaveLength(TOURNAMENT_ROSTER_SIZE);
  });

  it("derives the only action budget from the fixture date and spends five training days atomically", () => {
    const { storage } = memoryStorage();
    let save = enterPreparation("dates", storage);
    const fixture = save.campaign.fixtures[0];
    const before = remainingTournamentPreparationDays(save.campaign);
    const ids = save.campaign.registration.registeredIds.slice(0, 3);
    save = trainTournamentPlayers("dates", save, "attack", ids, storage);
    expect(save.campaign.day).toBe(8);
    expect(remainingTournamentPreparationDays(save.campaign)).toBe(before - 5);
    expect(ids.map((id) => save.squad.characterProgress[id].focus)).toEqual([
      { attack: 1, playmaking: 0, defense: 0 },
      { attack: 1, playmaking: 0, defense: 0 },
      { attack: 1, playmaking: 0, defense: 0 },
    ]);

    const tooLate = { ...save, campaign: { ...save.campaign, day: fixture.day - 2 } };
    expect(remainingTournamentPreparationDays(tooLate.campaign)).toBe(2);
    expect(() => trainTournamentPlayers("dates", tooLate, "attack", save.campaign.registration.registeredIds.slice(3, 6), storage)).toThrow(/跨过/);
  });

  it("advances exactly five days per training without auto-skipping to match day", () => {
    const { storage } = memoryStorage();
    const base = enterPreparation("training-remainder", storage);
    const fixture = base.campaign.fixtures[0];
    const ids = base.campaign.registration.registeredIds.slice(0, 3);

    // A synthetic 8-day window: after one training, 3 days remain and are kept (no auto-advance).
    const beforeTraining = { ...base, campaign: { ...base.campaign, day: fixture.day - 8 } };
    const trained = trainTournamentPlayers("training-remainder-8", beforeTraining, "defense", ids, storage);
    expect(trained.campaign.day).toBe(fixture.day - 3);
    expect(remainingTournamentPreparationDays(trained.campaign)).toBe(3);
  });

  it("lets a player train repeatedly up to six focus points, then blocks further sessions", () => {
    const { storage } = memoryStorage();
    let save = enterPreparation("repeat-training", storage);
    const ids = save.campaign.registration.registeredIds.slice(0, 3);
    save = trainTournamentPlayers("repeat-training", save, "attack", ids, storage);
    save = trainTournamentPlayers("repeat-training", save, "attack", ids, storage);
    expect(ids.map((id) => save.squad.characterProgress[id].focus)).toEqual([
      { attack: 2, playmaking: 0, defense: 0 },
      { attack: 2, playmaking: 0, defense: 0 },
      { attack: 2, playmaking: 0, defense: 0 },
    ]);

    const capped = {
      ...save,
      squad: {
        ...save.squad,
        characterProgress: {
          ...save.squad.characterProgress,
          [ids[0]]: { breakthroughRank: 0, focus: { attack: 2, playmaking: 2, defense: 2 } },
        },
      },
    };
    expect(() => trainTournamentPlayers("repeat-training", capped, "attack", ids, storage)).toThrow(/练度已满/);
  });

  it("keeps skill study and loadout operations locked in the prelim build", () => {
    const { storage } = memoryStorage();
    const save = enterPreparation("locked-skills", storage);
    const playerId = save.campaign.registration.registeredIds[0];
    expect(() => studyTournamentSkill("locked-skills", save, "steady_touch", storage)).toThrow(/开发预览/);
    expect(() => equipTournamentSkill("locked-skills", save, playerId, 0, "steady_touch", storage)).toThrow(/开发预览/);
    expect(() => unequipTournamentSkill("locked-skills", save, playerId, 0, storage)).toThrow(/开发预览/);
    expect(save.campaign.day).toBe(3);
  });

  it("does not create configurable skill inventory for starters or new recruits", () => {
    const { storage } = memoryStorage();
    const save = createTournamentSave(23, "recruitment");
    expect(save.squad.skillInventory).toEqual({});
    expect(save.squad.skillLoadouts).toEqual({});
    const recruit = playableCharacters.find((character) => !save.squad.collection[character.character_id] && !character.character_id.startsWith("founder_"))!;
    const next = recordTournamentPackOpening("starter-skills", save, {
      factionId: recruit.faction_id,
      cards: [{ character: recruit, isNew: true, copyNumber: 1 }],
      highestStars: recruit.stars,
      revealTier: recruit.stars === 6 ? "six-star" : recruit.stars >= 5 ? "gold" : "blue",
      nextProgress: { pullsSinceSixStar: recruit.stars === 6 ? 0 : 1, firstTenGuaranteeUsed: false },
    }, storage);
    expect(next.squad.skillInventory).toEqual({});
    expect(next.squad.skillLoadouts).toEqual({});
  });

  it("automatically applies duplicate-card star-ups to the same cup attributes used by the match squad", () => {
    const { storage } = memoryStorage();
    const base = createTournamentSave(31, "recruitment");
    const ownedIds = Object.keys(base.squad.collection);
    const basePlayers = playableCharacters.filter((character) => ownedIds.includes(character.character_id)).map((character) => applyTournamentProgress(character, emptyTrainingFocus(), 0));
    const homeLineup = recommendLineup(basePlayers, "4-2-3-1", "4-4-2");
    const characterId = Object.values(homeLineup).find((id): id is string => Boolean(id))!;
    const raw = playableCharacters.find((character) => character.character_id === characterId)!;
    const opened = (copyNumber: number, pullsSinceSixStar: number) => ({
      factionId: raw.faction_id,
      cards: [{ character: raw, isNew: false, copyNumber }],
      highestStars: raw.stars,
      revealTier: raw.stars === 6 ? "six-star" as const : raw.stars >= 5 ? "gold" as const : "blue" as const,
      nextProgress: { pullsSinceSixStar, firstTenGuaranteeUsed: false },
    });
    const firstStar = recordTournamentPackOpening("stars", base, opened(2, 1), storage);
    const next = recordTournamentPackOpening("stars", firstStar, opened(3, 2), storage);
    const before = applyTournamentProgress(raw, emptyTrainingFocus(), 0);
    const after = applyTournamentProgress(raw, emptyTrainingFocus(), next.squad.characterProgress[characterId].breakthroughRank);
    expect(next.squad.characterProgress[characterId].breakthroughRank).toBe(2);
    expect(next.squad.collection[characterId]).toBe(3);
    expect(after.attributes.overall).toBeGreaterThan(before.attributes.overall);
    expect(after.attributes.pace).toBeGreaterThan(before.attributes.pace);

    const progressedPlayers = basePlayers.map((player) => player.character_id === characterId ? after : player);
    const awayPlayers = playableCharacters.filter((character) => !ownedIds.includes(character.character_id)).slice(0, 24);
    const awayLineup = recommendLineup(awayPlayers, "4-2-3-1", "4-4-2");
    const common = { homeLineup, homeAttackFormationId: "4-2-3-1" as const, homeDefenseFormationId: "4-4-2" as const, awayLineup, awayAttackFormationId: "4-2-3-1" as const, awayDefenseFormationId: "4-4-2" as const, fixtureSeed: 9917 };
    const beforeMatch = simulateMatch({ ...common, characters: [...basePlayers, ...awayPlayers] });
    const afterMatch = simulateMatch({ ...common, characters: [...progressedPlayers, ...awayPlayers] });
    expect(afterMatch.seed).toBe(beforeMatch.seed);
    expect(afterMatch.homeAttack + afterMatch.homeDefense).toBeGreaterThan(beforeMatch.homeAttack + beforeMatch.homeDefense);
  });

  it("keeps elimination terminal: no round checkpoint retry is offered", () => {
    const { storage } = memoryStorage();
    let save = enterPreparation("no-retry", storage);
    save = ensureCurrentTournamentOpponent("no-retry", save, storage).save;
    const fixture = save.campaign.fixtures[0];
    const ids = save.campaign.registration.registeredIds.slice(0, 3);
    const changed = trainTournamentPlayers("no-retry", save, "playmaking", ids, storage);
    const eliminated = {
      ...changed,
      campaign: { ...changed.campaign, phase: "finished" as const, outcome: "eliminated" as const, currentFixtureIndex: 1 },
    };
    saveTournamentSave("no-retry", eliminated, storage);
    const loaded = loadTournamentSave("no-retry", storage);
    expect(loaded.campaign).not.toHaveProperty("roundCheckpoints");
    expect(loaded.campaign.currentFixtureIndex).toBe(1);
    expect(loaded.campaign.outcome).toBe("eliminated");
    expect(loaded.squad.characterProgress[ids[0]].focus).toEqual({ attack: 0, playmaking: 1, defense: 0 });
  });

  it("completes all seven fixtures through the single tournament save", () => {
    const { storage } = memoryStorage();
    let save = enterPreparation("champion-flow", storage);
    while (save.campaign.phase === "preparation") {
      const ensured = ensureCurrentTournamentOpponent("champion-flow", save, storage);
      save = ensured.save;
      const fixture = save.campaign.fixtures[save.campaign.currentFixtureIndex];
      const homePlayers = buildTournamentCharacters(playableCharacters, save.squad).filter((player) => save.campaign.registration.registeredIds.includes(player.character_id));
      const homeLineup = recommendLineup(homePlayers, "4-2-3-1", "4-4-2");
      const result = simulateMatch({
        characters: [...homePlayers, ...ensured.opponent.characters],
        homeLineup,
        homeAttackFormationId: "4-2-3-1",
        homeDefenseFormationId: "4-4-2",
        awayLineup: ensured.opponent.lineup,
        awayAttackFormationId: ensured.opponent.attackFormationId,
        awayDefenseFormationId: ensured.opponent.defenseFormationId,
        fixtureSeed: fixtureSeed(save.campaign.campaignSeed, fixture.id, fixture.leg),
      });
      save = advanceTournamentToMatch("champion-flow", save, storage);
      if (save.campaign.phase === "story") save = completeTournamentStory("champion-flow", save, storage);
      save = recordTournamentMatch("champion-flow", save, { ...result, homeScore: 2, awayScore: 0 }, storage);
      save = advanceTournamentAfterMatch("champion-flow", save, storage);
      if (save.campaign.phase === "story") save = completeTournamentStory("champion-flow", save, storage);
    }
    expect(save.campaign.phase).toBe("finished");
    expect(save.campaign.outcome).toBe("champion");
    expect(save.campaign.results).toHaveLength(7);
    expect(loadTournamentSave("champion-flow", storage)).toEqual(save);
  });

  it("plays each opponent story once per opponent, not once per leg", () => {
    const { storage } = memoryStorage();
    let save = enterPreparation("story-once", storage);
    const storiesSeen: string[] = [];
    const storyDays: number[] = [];
    const completedStoryDays: number[] = [];
    while (save.campaign.phase === "preparation") {
      const ensured = ensureCurrentTournamentOpponent("story-once", save, storage);
      save = ensured.save;
      const fixture = save.campaign.fixtures[save.campaign.currentFixtureIndex];
      const homePlayers = buildTournamentCharacters(playableCharacters, save.squad).filter((player) => save.campaign.registration.registeredIds.includes(player.character_id));
      const homeLineup = recommendLineup(homePlayers, "4-2-3-1", "4-4-2");
      const result = simulateMatch({
        characters: [...homePlayers, ...ensured.opponent.characters],
        homeLineup,
        homeAttackFormationId: "4-2-3-1",
        homeDefenseFormationId: "4-4-2",
        awayLineup: ensured.opponent.lineup,
        awayAttackFormationId: ensured.opponent.attackFormationId,
        awayDefenseFormationId: ensured.opponent.defenseFormationId,
        fixtureSeed: fixtureSeed(save.campaign.campaignSeed, fixture.id, fixture.leg),
      });
      save = advanceTournamentToMatch("story-once", save, storage);
      if (save.campaign.phase === "story") {
        storiesSeen.push(save.campaign.pendingStoryId!);
        storyDays.push(save.campaign.day);
        save = completeTournamentStory("story-once", save, storage);
        completedStoryDays.push(save.campaign.day);
      }
      save = recordTournamentMatch("story-once", save, { ...result, homeScore: 2, awayScore: 0 }, storage);
      save = advanceTournamentAfterMatch("story-once", save, storage);
      if (save.campaign.phase === "story") {
        storiesSeen.push(save.campaign.pendingStoryId!);
        storyDays.push(save.campaign.day);
        save = completeTournamentStory("story-once", save, storage);
        completedStoryDays.push(save.campaign.day);
      }
    }
    expect(save.campaign.phase).toBe("finished");
    expect(save.campaign.outcome).toBe("champion");
    expect(storiesSeen).toHaveLength(5);
    expect(storiesSeen[0]).toBe("SAYA");
    expect(storiesSeen[2]).toBe("NAYA");
    expect(storiesSeen[3]).toBe("IRENA");
    expect(storiesSeen[1]).toMatch(/^OPPONENT-/);
    expect(storiesSeen[4]).toMatch(/^OPPONENT-/);
    expect(storyDays).toEqual([46, 57, 73, 84, 99]);
    expect(completedStoryDays).toEqual(storyDays);
    expect(new Set(storiesSeen).size).toBe(storiesSeen.length);
  });

  it("pauses a tied final for a persisted decider before allowing settlement", () => {
    const { storage } = memoryStorage();
    let save = enterPreparation("final-decider", storage);
    const fixtureIndex = save.campaign.fixtures.findIndex(({ stage }) => stage === "final");
    const fixture = save.campaign.fixtures[fixtureIndex];
    save = { ...save, campaign: { ...save.campaign, currentFixtureIndex: fixtureIndex, day: fixture.day } };
    const homePlayers = buildTournamentCharacters(playableCharacters, save.squad).filter((player) => save.campaign.registration.registeredIds.includes(player.character_id));
    const homeLineup = recommendLineup(homePlayers, "4-2-3-1", "4-4-2");
    const awayPlayers = playableCharacters.filter((character) => !save.campaign.registration.registeredIds.includes(character.character_id));
    const awayLineup = recommendLineup(awayPlayers, "4-2-3-1", "4-4-2");
    const result = simulateMatch({ characters: [...homePlayers, ...awayPlayers], homeLineup, homeAttackFormationId: "4-2-3-1", homeDefenseFormationId: "4-4-2", awayLineup, fixtureSeed: 99 });
    const tied = { ...result, homeScore: 1, awayScore: 1 };

    save = recordTournamentMatch("final-decider", save, tied, storage, { homeLineup, homeAttackFormationId: "4-2-3-1", homeDefenseFormationId: "4-4-2" });
    const pending = save.campaign.results.at(-1)!;
    expect(pending.decision).toMatchObject({ status: "pending", reason: "final-draw", aggregateAt90: { player: 1, opponent: 1 } });
    expect(() => advanceTournamentAfterMatch("final-decider", save, storage)).toThrow(/完整赛果/);

    save = recordTournamentDecision("final-decider", save, { result: tied, advanced: true, extraTime: { player: 1, opponent: 0 }, events: [] }, storage);
    expect(save.campaign.results.at(-1)).toMatchObject({ advanced: true, extraTime: { player: 1, opponent: 0 }, decision: { status: "complete" } });
    expect(advanceTournamentAfterMatch("final-decider", save, storage).campaign.outcome).toBe("champion");
  });

  it("marks the current stage observed once, costs five days, and normalizes legacy saves", () => {
    const { storage, values } = memoryStorage();
    let save = enterPreparation("scout-report", storage);
    const fixture = save.campaign.fixtures[0];

    expect(save.campaign.scoutedStageIds).toEqual([]);
    expect(save.campaign.day).toBe(3);
    save = markTournamentScoutReportViewed("scout-report", save, storage);
    expect(save.campaign.scoutedStageIds).toEqual([fixture.stage]);
    expect(save.campaign.day).toBe(8);
    expect(markTournamentScoutReportViewed("scout-report", save, storage).campaign.scoutedStageIds).toEqual([fixture.stage]);

    // A save persisted before this field existed is accepted and backfilled.
    const legacy = { ...save, campaign: { ...save.campaign, scoutedStageIds: undefined } };
    values.set(tournamentSaveKey("scout-report"), JSON.stringify(legacy));
    expect(loadTournamentSave("scout-report", storage).campaign.scoutedStageIds).toEqual([]);
  });
});
