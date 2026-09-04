import { describe, expect, it } from "vitest";
import { founderCharacters, matchContract, playableCharacters, roster, rosterStats } from "./gameData";

const expectedPositionCounts = {
  GK: 8,
  CB: 18,
  LB: 7,
  RB: 6,
  CDM: 9,
  CM: 11,
  CAM: 4,
  LM: 4,
  RM: 7,
  LW: 1,
  RW: 3,
  ST: 10,
};

describe("public game data", () => {
  it("loads the complete expanded roster", () => {
    expect(roster.character_data_version).toBe("expanded-roster-v1");
    expect(rosterStats.characters).toBe(88);
    expect(rosterStats.factions).toBe(8);
  });

  it("contains only player-facing character fields", () => {
    const serialized = JSON.stringify(roster);
    expect(serialized).not.toContain("prototype_player_name");
    expect(serialized).not.toContain("source_player_id");
    expect(serialized).not.toContain("source_database_version");
    expect(serialized).not.toContain("market_value_eur_m");
    expect(serialized).not.toContain("market-value-v1");
    const serializedFounders = JSON.stringify(founderCharacters);
    expect(serializedFounders).not.toContain("source_player_id");
    expect(serializedFounders).not.toContain("market_value_eur_m");
  });

  it("keeps founders playable without adding them to the recruitable 88-player pool", () => {
    expect(roster.characters).toHaveLength(88);
    expect(founderCharacters).toHaveLength(3);
    expect(playableCharacters).toHaveLength(91);
    expect(playableCharacters.find((character) => character.character_id === "founder_sakura_link_4")).toMatchObject({ name: "纱夜", position: "CB", stars: 5 });
  });

  it("keeps primary positions balanced for the four supported formations", () => {
    const counts = Object.fromEntries(Object.keys(expectedPositionCounts).map((position) => [
      position,
      roster.characters.filter((character) => character.position === position).length,
    ]));
    expect(counts).toEqual(expectedPositionCounts);
  });

  it("keeps secondary positions visible and distinct from the main position", () => {
    expect(roster.characters.every((character) => (
      new Set(character.alternative_positions).size === character.alternative_positions.length &&
      !character.alternative_positions.includes(character.position)
    ))).toBe(true);
    expect(roster.characters.some((character) => character.alternative_positions.length > 0)).toBe(true);
  });

  it("uses the cup snapshot positions for Elodie and Luz", () => {
    expect(roster.characters.find((character) => character.character_id === "rose_elodie_beaumont")).toMatchObject({
      position: "LW",
      alternative_positions: ["ST", "LM"],
    });
    expect(roster.characters.find((character) => character.character_id === "gold_vitoria_luz")).toMatchObject({
      position: "RW",
      alternative_positions: ["ST", "RM"],
    });
  });

  it("exposes all three deterministic match modes", () => {
    expect(matchContract.cases.map((item) => item.match_mode_id)).toEqual([
      "three_player_training",
      "five_a_side",
      "eleven_a_side",
    ]);
  });
});
