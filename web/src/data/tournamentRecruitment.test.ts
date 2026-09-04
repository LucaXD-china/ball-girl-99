import { describe, expect, it } from "vitest";
import { playableCharacters } from "./gameData";
import { openTournamentRecruitment, rarityRates, rollRarity, SIX_STAR_HARD_PITY } from "./tournamentRecruitment";

describe("captain-route recruitment caps", () => {
  it("spreads probability above the route cap evenly across every allowed tier", () => {
    const six = rarityRates(0, 6);
    const five = rarityRates(0, 5);
    const four = rarityRates(0, 4);
    expect(five[6]).toBe(0);
    expect(five[3]).toBeCloseTo(six[3] + six[6] / 3);
    expect(five[4]).toBeCloseTo(six[4] + six[6] / 3);
    expect(five[5]).toBeCloseTo(six[5] + six[6] / 3);
    expect(four[6]).toBe(0);
    expect(four[5]).toBe(0);
    expect(four[3]).toBeCloseTo(six[3] + (six[5] + six[6]) / 2);
    expect(four[4]).toBeCloseTo(six[4] + (six[5] + six[6]) / 2);
    expect(Object.values(five).reduce((sum, rate) => sum + rate, 0)).toBeCloseTo(1);
    expect(Object.values(four).reduce((sum, rate) => sum + rate, 0)).toBeCloseTo(1);
  });

  it("also spreads capped soft-pity mass instead of concentrating it at the cap", () => {
    const uncapped = rarityRates(SIX_STAR_HARD_PITY - 2, 6);
    const capped = rarityRates(SIX_STAR_HARD_PITY - 2, 5);
    const share = uncapped[6] / 3;
    expect(capped).toMatchObject({ 6: 0 });
    expect(capped[3]).toBeCloseTo(uncapped[3] + share);
    expect(capped[4]).toBeCloseTo(uncapped[4] + share);
    expect(capped[5]).toBeCloseTo(uncapped[5] + share);
  });

  it("never rolls or guarantees a card above the route cap", () => {
    for (const cap of [4, 5] as const) {
      for (let index = 0; index < 1_000; index += 1) expect(rollRarity(index / 1_000, index, cap)).toBeLessThanOrEqual(cap);
      expect(rollRarity(0.999, SIX_STAR_HARD_PITY, cap)).toBeLessThanOrEqual(cap);
      const result = openTournamentRecruitment(
        playableCharacters,
        "sakura_link",
        {},
        { pullsSinceSixStar: SIX_STAR_HARD_PITY - 1, firstTenGuaranteeUsed: false },
        () => 0.999,
        10,
        cap,
      );
      expect(result.cards).toHaveLength(10);
      expect(Math.max(...result.cards.map(({ character }) => character.stars))).toBe(cap);
    }
  });
});
