import { describe, expect, it } from "vitest";
import recruitmentContract from "../generated/tournament-recruitment-v1.json";
import { roster } from "./gameData";
import {
  BASE_RATES,
  NON_RECRUITABLE_CHARACTER_PREFIXES,
  SIX_STAR_HARD_PITY,
  TOURNAMENT_PACK_SIZE,
  isRecruitableCharacter,
  openTournamentRecruitment,
  rarityRates,
  rollRarity,
  sixStarRate,
} from "./tournamentRecruitment";

function sequence(values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0.7;
}

describe("tournament recruitment rules", () => {
  it("uses the versioned recruitment contract exposed to the Web client", () => {
    expect(TOURNAMENT_PACK_SIZE).toBe(recruitmentContract.pack.size);
    expect(SIX_STAR_HARD_PITY).toBe(recruitmentContract.rarity.six_star_hard_pity.guaranteed_within_pulls);
    expect(recruitmentContract.budget.total_pulls).toBe(60);
    expect(BASE_RATES).toEqual({ 3: 0.4, 4: 0.5, 5: 0.08, 6: 0.02 });
    expect(NON_RECRUITABLE_CHARACTER_PREFIXES).toContain("founder_");
  });
  it("uses the published 40/50/8/2 base rarity boundaries", () => {
    expect(rollRarity(0.0199, 0)).toBe(6);
    expect(rollRarity(0.02, 0)).toBe(5);
    expect(rollRarity(0.0999, 0)).toBe(5);
    expect(rollRarity(0.1, 0)).toBe(4);
    expect(rollRarity(0.5999, 0)).toBe(4);
    expect(rollRarity(0.6, 0)).toBe(3);
  });

  it("raises the six-star rate after fifty misses and resets on a six star", () => {
    expect(sixStarRate(49)).toBe(0.02);
    expect(sixStarRate(50)).toBe(0.04);
    expect(sixStarRate(51)).toBe(0.06);
    expect(rarityRates(50)).toEqual({ 3: 0.38, 4: 0.5, 5: 0.08, 6: 0.04 });

    const opened = openTournamentRecruitment(
      roster.characters,
      "fog_court",
      {},
      { pullsSinceSixStar: 0, firstTenGuaranteeUsed: true },
      sequence([0.01, 0, ...Array(18).fill(0.7)]),
    );
    expect(opened.cards[0].character.stars).toBe(6);
    expect(opened.nextProgress.pullsSinceSixStar).toBe(9);
  });

  it("guarantees a six star on the fiftieth cup pull", () => {
    const tournament = openTournamentRecruitment(
      roster.characters,
      "fog_court",
      {},
      { pullsSinceSixStar: 49, firstTenGuaranteeUsed: true },
      sequence([0]),
      1,
    );
    const fullCounter = openTournamentRecruitment(
      roster.characters,
      "fog_court",
      {},
      { pullsSinceSixStar: 50, firstTenGuaranteeUsed: true },
      sequence([0]),
      1,
    );

    expect(tournament.cards[0].character.stars).toBe(6);
    expect(tournament.nextProgress.pullsSinceSixStar).toBe(0);
    expect(fullCounter.cards[0].character.stars).toBe(6);
    expect(fullCounter.nextProgress.pullsSinceSixStar).toBe(0);
  });

  it("applies tournament hard pity at the correct position inside a ten-pull", () => {
    const opened = openTournamentRecruitment(
      roster.characters,
      "fog_court",
      {},
      { pullsSinceSixStar: 45, firstTenGuaranteeUsed: true },
      sequence(Array(19).fill(0.7)),
      TOURNAMENT_PACK_SIZE,
    );

    expect(opened.cards.map(({ character }) => character.stars)).toEqual([3, 3, 3, 3, 6, 3, 3, 3, 3, 3]);
    expect(opened.nextProgress.pullsSinceSixStar).toBe(5);
  });

  it("guarantees five stars or better in the first ten and records duplicates", () => {
    const opened = openTournamentRecruitment(
      roster.characters,
      "fog_court",
      {},
      { pullsSinceSixStar: 0, firstTenGuaranteeUsed: false },
      sequence(Array(21).fill(0.7)),
    );
    expect(opened.cards).toHaveLength(10);
    expect(opened.cards.slice(0, 9).every(({ character }) => character.stars === 3)).toBe(true);
    expect(opened.cards[9].character.stars).toBe(5);
    expect(opened.highestStars).toBe(5);
    expect(opened.revealTier).toBe("gold");
    expect(opened.cards.some((card) => card.copyNumber > 1)).toBe(true);
    expect(opened.nextProgress.firstTenGuaranteeUsed).toBe(true);
  });

  it("keeps the first ten-pull outside the fifty-pull six-star pity counter", () => {
    const firstTen = openTournamentRecruitment(
      roster.characters,
      "fog_court",
      {},
      { pullsSinceSixStar: 0, firstTenGuaranteeUsed: false },
      sequence(Array(21).fill(0.7)),
    );
    expect(firstTen.nextProgress.pullsSinceSixStar).toBe(0);

    const laterSingle = openTournamentRecruitment(
      roster.characters,
      "fog_court",
      {},
      { pullsSinceSixStar: 0, firstTenGuaranteeUsed: true },
      sequence([0.7, 0]),
      1,
    );
    expect(laterSingle.cards[0].character.stars).toBe(3);
    expect(laterSingle.nextProgress.pullsSinceSixStar).toBe(1);
  });

  it("supports a single pull without consuming the first-ten guarantee", () => {
    const opened = openTournamentRecruitment(
      roster.characters,
      "fog_court",
      {},
      { pullsSinceSixStar: 0, firstTenGuaranteeUsed: false },
      sequence([0.7, 0]),
      1,
    );
    expect(opened.cards).toHaveLength(1);
    expect(opened.cards[0].character.stars).toBe(3);
    expect(opened.nextProgress.firstTenGuaranteeUsed).toBe(false);
  });

  it("does not grant the red-bull faction a special first-pull six star", () => {
    const ordinary = openTournamentRecruitment(roster.characters, "scarlet_toros", {}, { pullsSinceSixStar: 0, firstTenGuaranteeUsed: false }, sequence([0.7, 0]), 1);
    const naturalSix = openTournamentRecruitment(roster.characters, "scarlet_toros", {}, { pullsSinceSixStar: 0, firstTenGuaranteeUsed: false }, sequence([0.019, 0]), 1);
    expect(ordinary.cards[0].character.stars).toBe(3);
    expect(naturalSix.cards[0].character.stars).toBe(6);
    expect(ordinary.nextProgress.firstTenGuaranteeUsed).toBe(false);
  });

  it("keeps the unique founders outside every recruitment pool", () => {
    const founder = {
      ...roster.characters.find((character) => character.faction_id === "sakura_link" && character.stars === 5)!,
      character_id: "founder_sakura_link_4",
      name: "纱夜",
    };
    expect(isRecruitableCharacter(founder)).toBe(false);

    const opened = openTournamentRecruitment(
      [...roster.characters, founder],
      "sakura_link",
      {},
      { pullsSinceSixStar: 0, firstTenGuaranteeUsed: false },
      sequence(Array(30).fill(0.7)),
    );
    expect(opened.cards.every(({ character }) => !character.character_id.startsWith("founder_"))).toBe(true);
  });
});
