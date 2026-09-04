import { describe, expect, it } from "vitest";
import { opponentRoster, playableCharacters, roster, type FactionId } from "./gameData";
import { defaultSpecialSkillFor } from "./skillData";
import { applyTrainingFocus, buildTournamentCharacters, TOURNAMENT_STARTER_CHARACTER_IDS } from "./tournamentSquad";
import {
  attackFormations,
  assignLineupPlayer,
  completeLineup,
  compatibleDefenseFormations,
  cupFactionBondEffects,
  cupFactionBondProfiles,
  defenseFormations,
  factionBondStates,
  formationAbilityForSlot,
  positionFit,
  recommendLineup,
  roleScore,
  rankedPenaltyTakers,
  simulateMatch,
  simulateTournamentDecider,
  teamCombatProfile,
  type FormationId,
  type Lineup,
} from "./matchSimulator";

const formationIds: FormationId[] = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2"];
const starterSquad = {
  collection: Object.fromEntries(TOURNAMENT_STARTER_CHARACTER_IDS.map((id) => [id, 1])),
  characterProgress: Object.fromEntries(TOURNAMENT_STARTER_CHARACTER_IDS.map((id) => [id, { focus: { attack: 0, playmaking: 0, defense: 0 }, breakthroughRank: 0 }])),
  skillInventory: {},
  skillLoadouts: {},
};
const tournamentPlayers = (characters = playableCharacters) => buildTournamentCharacters(characters, starterSquad);

describe("web schedule match simulator", () => {
  it("defines 11 unique slots for every formation", () => {
    for (const formationId of formationIds) {
      const slots = attackFormations[formationId].slots;
      expect(slots).toHaveLength(11);
      expect(new Set(slots.map((slot) => slot.id)).size).toBe(11);
    }
  });

  it("offers only explicit defensive transitions for every attacking formation", () => {
    for (const attackFormationId of formationIds) {
      const options = compatibleDefenseFormations[attackFormationId];
      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(options).size).toBe(options.length);
      expect(options.every((formationId) => formationIds.includes(formationId))).toBe(true);
    }
    expect(compatibleDefenseFormations["4-3-3"]).not.toContain("3-5-2");
    expect(compatibleDefenseFormations["3-5-2"]).not.toContain("4-3-3");
  });

  it("shows the 3-5-2 defensive transition as a five-player back line", () => {
    const formation = defenseFormations["3-5-2"];
    const defenderPositions = new Set(["CB", "LB", "RB"]);
    expect(formation.name).toBe("5-3-2");
    expect(formation.slots).toHaveLength(11);
    expect(formation.slots.filter((slot) => defenderPositions.has(slot.position)).length).toBe(5);
  });

  it("fills a legal unique XI from the prologue Box", () => {
    const players = tournamentPlayers();
    const lineup = recommendLineup(players, "4-2-3-1", "4-4-2");
    const ids = Object.values(lineup);
    expect(ids).toHaveLength(11);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(11);
    const goalkeeperId = lineup.gk;
    expect(playableCharacters.find((player) => player.character_id === goalkeeperId)?.position).toBe("GK");
  });

  it("covers every slot in all four formations with an exact primary or secondary position", () => {
    const players = tournamentPlayers();
    for (const formationId of formationIds) {
      const candidateIdsBySlot = attackFormations[formationId].slots
        .map((slot) => players.filter((player) => positionFit(player, slot.position) === 1).map((player) => player.character_id))
        .sort((left, right) => left.length - right.length);
      const canAssign = (slotIndex: number, used: Set<string>): boolean => {
        if (slotIndex === candidateIdsBySlot.length) return true;
        return candidateIdsBySlot[slotIndex].some((characterId) => {
          if (used.has(characterId)) return false;
          used.add(characterId);
          const possible = canAssign(slotIndex + 1, used);
          used.delete(characterId);
          return possible;
        });
      };
      expect(canAssign(0, new Set()), formationId).toBe(true);
    }
  });

  it("calculates slot ability from position fit without formation bonuses", () => {
    const player = roster.characters.find((character) => character.position === "CAM")!;
    const slot = attackFormations["4-2-3-1"].slots.find((candidate) => candidate.id === "cam")!;
    expect(formationAbilityForSlot(player, slot, "4-4-2")).toBeCloseTo(roleScore(player, slot.position), 6);
  });

  it("moves an already selected player and leaves the previous slot empty", () => {
    const moved = assignLineupPlayer({ gk: "player-a", cam: "player-b", st: "player-c" }, "st", "player-a");
    expect(moved).toEqual({ gk: null, cam: "player-b", st: "player-a" });
  });

  it("completes only empty slots without replacing existing choices", () => {
    const players = tournamentPlayers(roster.characters);
    const recommended = recommendLineup(players, "4-2-3-1", "4-4-2");
    const partial: Lineup = Object.fromEntries(attackFormations["4-2-3-1"].slots.map((slot) => [slot.id, null]));
    partial.gk = recommended.gk;
    partial.cam = recommended.cam;
    const completed = completeLineup(players, "4-2-3-1", "4-4-2", partial);
    expect(completed.gk).toBe(partial.gk);
    expect(completed.cam).toBe(partial.cam);
    expect(Object.values(completed).filter(Boolean)).toHaveLength(11);
    expect(new Set(Object.values(completed)).size).toBe(11);
  });

  it("reports pending and active three-player faction bond progress", () => {
    const factionPlayers = roster.characters.filter((player) => player.faction_id === "fog_court");
    expect(factionBondStates(factionPlayers.slice(0, 2))[0]).toMatchObject({ count: 2, layers: 0, target: 3 });
    expect(factionBondStates(factionPlayers.slice(0, 3))[0]).toMatchObject({ count: 3, layers: 1, target: 3 });
    expect(factionBondStates(factionPlayers.slice(0, 6))[0]).toMatchObject({ count: 6, layers: 1, target: 3 });
  });

  it("gives every cup faction one balanced single-ability bond", () => {
    const profiles = Object.values(cupFactionBondProfiles);
    // 大航海团为对手专属阵营，不参与玩家 8 阵营的平衡校验。
    expect(profiles).toHaveLength(9);
    const playableProfiles = Object.entries(cupFactionBondProfiles).filter(([id]) => id !== "cape_voyagers");
    expect(playableProfiles).toHaveLength(8);
    expect(playableProfiles.filter(([, { ability }]) => ability === "attack")).toHaveLength(2);
    expect(playableProfiles.filter(([, { ability }]) => ability === "defense")).toHaveLength(2);
    expect(playableProfiles.filter(([, { ability }]) => ability === "possession")).toHaveLength(2);
    expect(playableProfiles.filter(([, { ability }]) => ability === "xg")).toHaveLength(2);
    expect(cupFactionBondProfiles.cape_voyagers.ability).toBe("possession");

    const sample = roster.characters.slice(0, 3).map((player) => ({ ...player, faction_id: "fog_court" as const }));
    expect(cupFactionBondEffects(sample)).toEqual({ attack: 2.4, defense: 0, possession: 0, xg: 0 });

    const fixedOpponent = sample.map((player) => ({ ...player, tournamentOpponentBondFactionId: "azure_fortress" as const }));
    expect(cupFactionBondEffects(fixedOpponent)).toEqual({ attack: 0, defense: 6, possession: 0, xg: 0 });
  });

  it("applies each simplified bond ability inside the seeded cup simulation", () => {
    const homeLineup = recommendLineup(tournamentPlayers(), "4-2-3-1", "4-4-2");
    const homeIds = Object.values(homeLineup).filter((id): id is string => Boolean(id));
    const neutralFactions: FactionId[] = ["gaul_iris", "iron_engine", "scarlet_toros", "samba_union", "pampas_silver", "sakura_link", "azure_fortress"];
    const charactersWithBond = (factionId?: FactionId) => playableCharacters.map((player) => {
      const index = homeIds.indexOf(player.character_id);
      if (index < 0) return player;
      return { ...player, faction_id: factionId && index < 3 ? factionId : neutralFactions[index % neutralFactions.length] };
    });
    const match = (factionId?: FactionId) => simulateMatch({
      characters: charactersWithBond(factionId),
      homeLineup,
      homeAttackFormationId: "4-2-3-1",
      homeDefenseFormationId: "4-4-2",
      fixtureSeed: 4217,
    });
    const baseline = match();

    expect(match("fog_court").homeCombatProfile!.creation).toBeCloseTo(baseline.homeCombatProfile!.creation + 2.4, 5);
    expect(match("iron_engine").homeCombatProfile!.prevention).toBeCloseTo(baseline.homeCombatProfile!.prevention + 6, 5);
    expect(match("scarlet_toros").homeCombatProfile!.creation).toBeCloseTo(baseline.homeCombatProfile!.creation + 2.7, 5);
    expect(match("samba_union").homeCombatProfile!.finishing).toBeCloseTo(baseline.homeCombatProfile!.finishing + 5, 5);
  });

  it("maps all three training directions into distinct V2 combat channels", () => {
    const players = tournamentPlayers();
    const lineup = recommendLineup(players, "4-2-3-1", "4-4-2");
    const profile = (focus: { attack: number; playmaking: number; defense: number }) => {
      const trained = players.map((player) => ({ ...player, ...applyTrainingFocus(player, focus) }));
      return teamCombatProfile(lineup, "4-2-3-1", new Map(trained.map((player) => [player.character_id, player])));
    };
    const base = profile({ attack: 0, playmaking: 0, defense: 0 });
    expect(profile({ attack: 1, playmaking: 0, defense: 0 }).finishing).toBeGreaterThan(base.finishing);
    expect(profile({ attack: 0, playmaking: 1, defense: 0 }).creation).toBeGreaterThan(base.creation);
    const defended = profile({ attack: 0, playmaking: 0, defense: 1 });
    expect(defended.prevention).toBeGreaterThan(base.prevention);
    expect(defended.goalkeeping).toBeGreaterThan(base.goalkeeping);
  });

  it("replays the same lineup and tactics deterministically", () => {
    const lineup = recommendLineup(tournamentPlayers(), "4-2-3-1", "4-4-2");
    const args = {
      characters: playableCharacters,
      homeLineup: lineup,
      homeAttackFormationId: "4-2-3-1" as const,
      homeDefenseFormationId: "4-4-2" as const,
      homeName: "测试联队",
    };
    const first = simulateMatch(args);
    const second = simulateMatch(args);
    expect(second).toEqual(first);
    expect(first.events[0].kind).toBe("kickoff");
    expect(first.events.at(-1)?.kind).toBe("fulltime");
    expect(first.ratings).toHaveLength(22);
    expect(first.ratings.some((rating) => rating.characterId === first.mvpId)).toBe(true);
    expect(first.homeShots + first.awayShots).toBeGreaterThanOrEqual(6);
    expect(first.homeShots + first.awayShots).toBeLessThanOrEqual(20);
    expect(first.homeCombatProfile).toEqual(expect.objectContaining({ creation: expect.any(Number), finishing: expect.any(Number), prevention: expect.any(Number), goalkeeping: expect.any(Number) }));
    expect(first.events.filter(({ kind }) => ["goal", "save", "miss"].includes(kind)).every(({ sourceTags }) => Boolean(sourceTags?.length))).toBe(true);
    const ordinaryKinds = new Set(["build-up", "duel", "transition"]);
    const ordinaryEvents = first.events.filter((event) => ordinaryKinds.has(event.kind));
    expect(ordinaryEvents.length).toBeGreaterThanOrEqual(22);
    expect(ordinaryEvents.every((event) => !event.skillId && event.xg === undefined)).toBe(true);
    expect(new Set(ordinaryEvents.map((event) => event.playerId))).toEqual(new Set(first.ratings.map((rating) => rating.characterId)));
    expect(first.ratings.every((rating) => rating.ordinaryEvents >= 1)).toBe(true);
  });

  it("uses the same predicted away XI shown during pre-match scouting", () => {
    const homePlayers = tournamentPlayers();
    const homeIds = new Set(homePlayers.map((player) => player.character_id));
    const awayPlayers = roster.characters.filter((player) => !homeIds.has(player.character_id));
    const homeLineup = recommendLineup(homePlayers, "4-2-3-1", "4-4-2");
    const awayLineup = recommendLineup(awayPlayers, "4-2-3-1", "4-4-2");
    const result = simulateMatch({
      characters: playableCharacters,
      homeLineup,
      homeAttackFormationId: "4-2-3-1",
      homeDefenseFormationId: "4-4-2",
      awayLineup,
    });
    const awayRatingIds = new Set(result.ratings.filter((rating) => rating.team === "away").map((rating) => rating.characterId));
    expect(awayRatingIds).toEqual(new Set(Object.values(awayLineup)));
  });

  it("identifies the scorer as the primary player for every goal event", () => {
    const homePlayers = tournamentPlayers();
    const homeLineup = recommendLineup(homePlayers, "4-2-3-1", "4-4-2");
    const results = Array.from({ length: 100 }, (_, index) => simulateMatch({
      characters: playableCharacters,
      homeLineup,
      homeAttackFormationId: "4-2-3-1",
      homeDefenseFormationId: "4-4-2",
      fixtureSeed: index + 1,
    }));
    const goalEvents = results.flatMap((result) => result.events
      .filter((event) => event.kind === "goal")
      .map((event) => ({ event, result })));

    expect(goalEvents.length).toBeGreaterThan(0);
    expect(goalEvents.every(({ event, result }) => result.ratings
      .some((rating) => rating.characterId === event.scorerId && rating.goals > 0))).toBe(true);
  });

  it("ignores legacy loadout fields and triggers only fixed high-star skills", () => {
    const players = tournamentPlayers();
    const lineup = recommendLineup(players, "4-2-3-1", "4-4-2");
    const baseArgs = {
      characters: playableCharacters,
      homeLineup: lineup,
      homeAttackFormationId: "4-2-3-1" as const,
      homeDefenseFormationId: "4-4-2" as const,
      homeName: "技能测试联队",
    };
    const baseline = simulateMatch({ ...baseArgs, fixtureSeed: 9917 });
    const homeSkillLoadouts = Object.fromEntries(Object.values(lineup).filter(Boolean).map((characterId) => [characterId, ["box_predator"]]));
    expect(simulateMatch({ ...baseArgs, fixtureSeed: 9917, homeSkillLoadouts, homeSkillLevels: { box_predator: 5 } })).toEqual(baseline);

    const resultWithFixedTrigger = Array.from({ length: 100 }, (_, index) => simulateMatch({ ...baseArgs, fixtureSeed: index + 1 }))
      .find((result) => result.events.some((event) => event.skillSource === "fixed"));
    const fixedEvent = resultWithFixedTrigger?.events.find((event) => event.skillSource === "fixed");
    const triggerPlayer = playableCharacters.find((player) => player.character_id === fixedEvent?.playerId);
    expect(fixedEvent).toBeDefined();
    expect(triggerPlayer).toBeDefined();
    expect(defaultSpecialSkillFor(triggerPlayer!)?.id).toBe(fixedEvent?.skillId);
  });

  it("lets back-line build-up players trigger their innate skills", () => {
    const targetIds = ["opp_blue_moon_lab_cb", "opp_violet_comets_cdm"];
    const targets = targetIds.map((characterId) => opponentRoster.characters.find((player) => player.character_id === characterId)!);
    const homeLineup = recommendLineup(tournamentPlayers(), "4-2-3-1", "4-4-2");
    homeLineup.lcb = targetIds[0];
    homeLineup.ldm = targetIds[1];
    const characters = [...playableCharacters, ...targets];
    const triggered = new Set<string>();
    for (let seed = 1; seed <= 400 && triggered.size < targetIds.length; seed += 1) {
      const result = simulateMatch({ characters, homeLineup, homeAttackFormationId: "4-2-3-1", homeDefenseFormationId: "4-4-2", fixtureSeed: seed });
      result.events.filter(({ skillSource }) => skillSource === "innate").forEach(({ playerId }) => {
        if (playerId && targetIds.includes(playerId)) triggered.add(playerId);
      });
    }
    expect(triggered).toEqual(new Set(targetIds));
  });

  it("reuses the match event engine for a seeded extra-time decider", () => {
    const homePlayers = tournamentPlayers();
    const homeIds = new Set(homePlayers.map((player) => player.character_id));
    const awayPlayers = playableCharacters.filter((player) => !homeIds.has(player.character_id));
    const homeLineup = recommendLineup(homePlayers, "4-2-3-1", "4-4-2");
    const awayLineup = recommendLineup(awayPlayers, "4-2-3-1", "4-4-2");
    const regulation = simulateMatch({ characters: playableCharacters, homeLineup, homeAttackFormationId: "4-2-3-1", homeDefenseFormationId: "4-4-2", awayLineup, fixtureSeed: 37 });
    const tiedRegulation = { ...regulation, homeScore: 1, awayScore: 1 };
    const args = {
      characters: playableCharacters,
      context: { homeLineup, homeAttackFormationId: "4-2-3-1" as const, homeDefenseFormationId: "4-4-2" as const },
      awayLineup,
      awayAttackFormationId: "4-2-3-1" as const,
      awayDefenseFormationId: "4-4-2" as const,
      homeName: "测试联队",
      awayName: "决胜对手",
      regulation: tiedRegulation,
      aggregateAt90: { player: 3, opponent: 3 },
    };
    const first = simulateTournamentDecider(args);
    const second = simulateTournamentDecider(args);

    expect(second).toEqual(first);
    expect(first.events[0].kind).toBe("extra-time-start");
    expect(first.events.some(({ kind }) => kind === "extra-time-break")).toBe(true);
    expect(first.events.some(({ kind }) => kind === "extra-time-end")).toBe(true);
    const extraTimeShots = first.result.homeShots + first.result.awayShots - tiedRegulation.homeShots - tiedRegulation.awayShots;
    expect(extraTimeShots).toBeGreaterThanOrEqual(2);
    expect(extraTimeShots).toBeLessThanOrEqual(8);
    expect(first.events.filter(({ phase, kind }) => phase === "extra-time" && ["goal", "save", "miss"].includes(kind)).every(({ playerId }) => Boolean(playerId))).toBe(true);
  });

  it("orders penalty takers by penalty skill and focuses portraits on the taker or keeper", () => {
    const homePlayers = tournamentPlayers();
    const homeIds = new Set(homePlayers.map((player) => player.character_id));
    const awayPlayers = playableCharacters.filter((player) => !homeIds.has(player.character_id));
    const homeLineup = recommendLineup(homePlayers, "4-2-3-1", "4-4-2");
    const awayLineup = recommendLineup(awayPlayers, "4-2-3-1", "4-4-2");
    const lineupCharacters = Object.values(homeLineup).map((id) => playableCharacters.find((player) => player.character_id === id)!);
    const expectedOrder = rankedPenaltyTakers(lineupCharacters).map(({ character_id }) => character_id);
    let decision;
    for (let seed = 1; seed <= 200 && !decision?.penalties; seed += 1) {
      const regulation = simulateMatch({ characters: playableCharacters, homeLineup, homeAttackFormationId: "4-2-3-1", homeDefenseFormationId: "4-4-2", awayLineup, fixtureSeed: seed });
      decision = simulateTournamentDecider({
        characters: playableCharacters,
        context: { homeLineup, homeAttackFormationId: "4-2-3-1", homeDefenseFormationId: "4-4-2" },
        awayLineup,
        awayAttackFormationId: "4-2-3-1",
        awayDefenseFormationId: "4-4-2",
        homeName: "测试联队",
        awayName: "决胜对手",
        regulation: { ...regulation, homeScore: 1, awayScore: 1 },
        aggregateAt90: { player: 2, opponent: 2 },
      });
    }

    expect(decision?.penalties).toBeDefined();
    const kicks = decision!.events.filter(({ takerId }) => Boolean(takerId));
    const homeKicks = kicks.filter(({ side }) => side === "home");
    expect(homeKicks.map(({ takerId }) => takerId)).toEqual(expectedOrder.slice(0, homeKicks.length));
    expect(kicks.every((event) => event.playerId === (event.penaltyOutcome === "goal" ? event.takerId : event.keeperId))).toBe(true);
  });
});
