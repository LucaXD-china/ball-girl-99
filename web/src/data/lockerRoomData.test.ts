import { describe, expect, it } from "vitest";
import { playableCharacters, roster } from "./gameData";
import { formatPlayerPositions, skillMeta, traitMeta } from "./lockerRoomData";
import { defaultSpecialSkillFor, defaultSpecialSkillIds, isSkillCompatible } from "./skillData";
import { buildTournamentCharacters, TOURNAMENT_MAX_FOCUS, TOURNAMENT_STARTER_CHARACTER_IDS, trainingFocusTotal } from "./tournamentSquad";

const zeroFocus = { attack: 0, playmaking: 0, defense: 0 };

const initialSquad = {
  collection: Object.fromEntries(TOURNAMENT_STARTER_CHARACTER_IDS.map((id) => [id, 1])),
  characterProgress: Object.fromEntries(TOURNAMENT_STARTER_CHARACTER_IDS.map((id) => [id, { focus: zeroFocus, breakthroughRank: 0 }])),
  skillInventory: {},
  skillLoadouts: {},
};

describe("player locker room data", () => {
  it("builds the fixed tournament starter squad from the public roster", () => {
    const players = buildTournamentCharacters(roster.characters, initialSquad);
    expect(players).toHaveLength(18);
    expect(new Set(players.map((player) => player.character_id)).size).toBe(18);
    expect(players.every((player) => trainingFocusTotal(player.focus) === 0 && trainingFocusTotal(player.focus) <= TOURNAMENT_MAX_FOCUS)).toBe(true);
    expect(players.every((player) => !("experiencePercent" in player) && !("isInLineup" in player))).toBe(true);
    expect(players.every((player) => player.copies === 1)).toBe(true);
    expect(players.map((player) => player.character_id)).toContain("founder_sakura_link_4");
    expect(players.map((player) => player.character_id)).not.toContain("silver_sofia_acosta");
    const primaryGroups = {
      keepers: players.filter((player) => player.position === "GK").length,
      defenders: players.filter((player) => ["CB", "LB", "RB"].includes(player.position)).length,
      centralMidfielders: players.filter((player) => ["CDM", "CM", "CAM"].includes(player.position)).length,
      widePlayers: players.filter((player) => ["LM", "RM", "LW", "RW"].includes(player.position)).length,
      strikers: players.filter((player) => player.position === "ST").length,
    };
    expect(primaryGroups).toEqual({ keepers: 2, defenders: 6, centralMidfielders: 4, widePlayers: 4, strikers: 2 });
  });

  it("keeps duplicate copy counts and gives new recruits level one progress", () => {
    const existing = roster.characters.find((player) => player.character_id === "fog_eleanor_hart");
    const recruit = roster.characters.find((player) => player.faction_id === "fog_court" && player.character_id !== "fog_eleanor_hart");
    expect(existing).toBeDefined();
    expect(recruit).toBeDefined();
    const players = buildTournamentCharacters(roster.characters, {
      collection: { fog_eleanor_hart: 3, [recruit!.character_id]: 1 },
      characterProgress: {
        fog_eleanor_hart: { focus: zeroFocus, breakthroughRank: 0 },
        [recruit!.character_id]: { focus: zeroFocus, breakthroughRank: 0 },
      },
      skillInventory: {},
      skillLoadouts: {},
    });
    expect(players.find((player) => player.character_id === "fog_eleanor_hart")?.copies).toBe(3);
    expect(players.find((player) => player.character_id === recruit!.character_id)).toMatchObject({ focus: zeroFocus, breakthroughRank: 0, copies: 1 });
  });

  it("provides player-facing copy for every public trait and skill", () => {
    expect(TOURNAMENT_STARTER_CHARACTER_IDS.every((characterId) => playableCharacters.some((player) => player.character_id === characterId))).toBe(true);
    expect(roster.characters.every((player) => traitMeta[player.base_trait_id])).toBe(true);
    expect(roster.characters.every((player) => skillMeta[player.signature_skill_id])).toBe(true);
  });

  it("assigns one compatible fixed skill only to five- and six-star players", () => {
    const assignments = playableCharacters.map((player) => ({ player, skill: defaultSpecialSkillFor(player) }));
    expect(Object.keys(defaultSpecialSkillIds)).toHaveLength(27);
    expect(assignments.filter(({ player }) => player.stars <= 4).every(({ skill }) => skill === null)).toBe(true);
    expect(assignments.filter(({ player }) => player.stars >= 5).every(({ player, skill }) => Boolean(skill) && isSkillCompatible(player, skill!))).toBe(true);
    expect(assignments.filter(({ player }) => player.stars === 5).every(({ skill }) => skill?.quality === "purple" || skill?.quality === "gold")).toBe(true);
    expect(assignments.filter(({ player }) => player.stars === 6).every(({ skill }) => skill?.quality === "rainbow")).toBe(true);
  });

  it("formats main and alternative positions without duplicates", () => {
    expect(formatPlayerPositions({ position: "RW", alternative_positions: ["ST", "RM", "RW"] })).toBe("右边锋 / 中锋 / 右中场");
  });
});
