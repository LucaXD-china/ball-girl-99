import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { roster } from "../data/gameData";
import { applyTournamentProgress, buildTournamentCharacters, calculateTournamentCurrentOverall, emptyTrainingFocus, sortTournamentPlayers, STAR_ATTRIBUTE_SCALE } from "../data/tournamentSquad";
import { createTournamentSave } from "../storage/tournamentSaveStorage";
import { filterRegistrationPlayers, TournamentRegistrationPage } from "./TournamentRegistrationPage";

const players = buildTournamentCharacters(roster.characters, {
  collection: Object.fromEntries(roster.characters.map(({ character_id }) => [character_id, 1])),
  characterProgress: Object.fromEntries(roster.characters.map(({ character_id }) => [character_id, { focus: { attack: 0, playmaking: 0, defense: 0 }, breakthroughRank: 0 }])),
  skillInventory: {},
  skillLoadouts: {},
});

describe("tournament registration roster tools", () => {
  it("derives current OVR from every star tier and preserves the breakthrough bonus once", () => {
    for (const stars of [3, 4, 5, 6]) {
      const character = roster.characters.find((player) => player.stars === stars)!;
      expect(calculateTournamentCurrentOverall(character, emptyTrainingFocus(), 0)).toBe(Math.round(Math.min(99, character.attributes.overall * STAR_ATTRIBUTE_SCALE[stars])));
    }

    const fourStar = roster.characters.find((player) => player.character_id === "fog_amelia_sterling")!;
    expect(calculateTournamentCurrentOverall(fourStar, emptyTrainingFocus(), 2)).toBe(Math.round(Math.min(99, fourStar.attributes.overall * STAR_ATTRIBUTE_SCALE[4] + 1)));
    expect(applyTournamentProgress(fourStar, emptyTrainingFocus(), 2).attributes.overall).toBe(fourStar.attributes.overall + 1);
  });

  it("derives current OVR at runtime without changing the save shape", () => {
    const save = createTournamentSave(7);
    const built = buildTournamentCharacters(roster.characters, save.squad);

    expect(built.every((player) => Number.isInteger(player.currentOverall))).toBe(true);
    expect(JSON.stringify(save)).not.toContain("currentOverall");
  });

  it("recalculates current OVR from primary-position training and caps it at 99", () => {
    const cases = [
      { position: "ST", focus: { attack: 1, playmaking: 0, defense: 0 } },
      { position: "CM", focus: { attack: 0, playmaking: 1, defense: 0 } },
      { position: "CB", focus: { attack: 0, playmaking: 0, defense: 1 } },
      { position: "GK", focus: { attack: 0, playmaking: 0, defense: 1 } },
    ] as const;
    for (const testCase of cases) {
      const character = roster.characters
        .filter((player) => player.position.split("/")[0] === testCase.position)
        .sort((left, right) => left.attributes.overall - right.attributes.overall)[0]!;
      expect(calculateTournamentCurrentOverall(character, testCase.focus, 0)).toBeGreaterThan(calculateTournamentCurrentOverall(character, emptyTrainingFocus(), 0));
    }

    const striker = roster.characters.filter((player) => player.position === "ST").sort((left, right) => left.attributes.overall - right.attributes.overall)[0]!;
    const centreForward = { ...striker, position: "CF" };
    expect(calculateTournamentCurrentOverall(centreForward, { attack: 1, playmaking: 0, defense: 0 }, 0)).toBeGreaterThan(calculateTournamentCurrentOverall(centreForward, emptyTrainingFocus(), 0));

    const sixStar = roster.characters.find((player) => player.stars === 6)!;
    expect(calculateTournamentCurrentOverall(sixStar, { attack: 6, playmaking: 0, defense: 0 }, 5)).toBe(99);
  });

  it("sorts by the same focus, overall and rarity priorities as the locker room", () => {
    for (const sortMode of ["focus", "overall", "rarity"] as const) {
      const registrationOrder = filterRegistrationPlayers(players, { query: "", positionGroup: "all", stars: 0, factionId: "all", sortMode });
      expect(registrationOrder.map(({ character_id }) => character_id)).toEqual(sortTournamentPlayers(players, sortMode).map(({ character_id }) => character_id));
    }
    const [left, right] = players;
    expect(sortTournamentPlayers([{ ...left, currentOverall: 1 }, { ...right, currentOverall: 99 }], "overall").map(({ character_id }) => character_id)).toEqual([right.character_id, left.character_id]);
  });

  it("filters by search, position, stars and faction", () => {
    const target = players[0];
    const searched = filterRegistrationPlayers(players, { query: target.name, positionGroup: "all", stars: target.stars, factionId: target.faction_id, sortMode: "focus" });
    expect(searched.map(({ character_id }) => character_id)).toContain(target.character_id);
    const keepers = filterRegistrationPlayers(players, { query: "", positionGroup: "keeper", stars: 0, factionId: "all", sortMode: "focus" });
    expect(keepers.length).toBeGreaterThan(0);
    expect(keepers.every((player) => player.position === "GK" || player.alternative_positions.includes("GK"))).toBe(true);
  });

  it("finds players by an alternative position", () => {
    const acosta = roster.characters.find((player) => player.character_id === "silver_sofia_acosta");
    expect(acosta?.position).toBe("CAM");
    expect(acosta?.alternative_positions).toContain("RW");
    const searched = filterRegistrationPlayers(players, { query: "右边锋", positionGroup: "all", stars: 0, factionId: "all", sortMode: "focus" });
    expect(searched.map(({ character_id }) => character_id)).toContain("silver_sofia_acosta");
  });

  it("uses team-select for roster toggles and confirm for locking", () => {
    const markup = renderToStaticMarkup(createElement(TournamentRegistrationPage, {
      guideScope: "registration-test",
      clubName: "北港晴空",
      squad: {
        collection: Object.fromEntries(roster.characters.slice(0, 18).map(({ character_id }) => [character_id, 1])),
        characterProgress: {},
        skillInventory: {},
        skillLoadouts: {},
      },
      selectedIds: [],
      onToggle: () => undefined,
      onQuickFill: () => undefined,
      onLock: () => undefined,
      onBack: () => undefined,
    }));
    expect(markup).toContain('data-sfx="team-select"');
    expect(markup).toContain('data-sfx="confirm"');
  });
});
