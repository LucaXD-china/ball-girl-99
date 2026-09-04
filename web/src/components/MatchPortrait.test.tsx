import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { opponentRoster, roster } from "../data/gameData";
import { Portrait } from "./MatchPortrait";

describe("MatchPortrait", () => {
  it("keeps promoted opponents on their original artwork and visual rarity", () => {
    const base = roster.characters.find(({ stars }) => stars === 4)!;
    const player = { ...base, stars: 6, opponentPromotion: { baseStars: 4 as const, targetStars: 6 as const } };
    const markup = renderToStaticMarkup(<Portrait player={player} preferStandee />);
    expect(markup).toContain("rarity-4");
    expect(markup).not.toContain("rarity-6");
    expect(markup).not.toContain("opponent-promoted");
    expect(markup).not.toContain("对手升星");
    expect(markup).toContain("locker-room-v1");
    expect(markup).not.toContain("six-star-standee-v1");
    expect(markup).toContain("decoding=\"async\"");
  });

  it("uses formal layered cards for every new opponent core", () => {
    for (const player of opponentRoster.characters) {
      const markup = renderToStaticMarkup(<Portrait player={player} preferCompositeCard />);
      expect(markup).toContain(`rarity-${player.stars} card`);
      expect(markup).not.toContain("match-composite-card-frame");
      expect(markup).toContain(`/assets/cards/opponent-card-art-v2/${player.character_id}.webp`);
    }
  });
});
