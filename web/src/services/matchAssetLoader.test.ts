import { describe, expect, it, vi } from "vitest";
import type { Lineup } from "../data/matchSimulator";
import {
  MATCH_BALL_URL,
  MATCH_STADIUM_URL,
  matchAssetUrlsForLineups,
  preloadMatchAssets,
} from "./matchAssetLoader";

const lineup = (players: Partial<Lineup>): Lineup => ({
  gk: null, lb: null, lcb: null, rcb: null, rb: null,
  ldm: null, rdm: null, cam: null, lw: null, st: null, rw: null,
  ...players,
});

describe("match asset loader", () => {
  it("deduplicates exact Chibi families and includes stadium, ball and crests", () => {
    const urls = matchAssetUrlsForLineups({
      homeLineup: lineup({ gk: "home-gk", st: "founder_sakura_link_4", rw: "home-player" }),
      awayLineup: lineup({ gk: "away-gk", st: "away-player", rw: "another-away-player" }),
      awayKitFamily: "field-blue",
      extraUrls: ["/home.svg", "/away.svg", "/home.svg"],
    });

    expect(urls).toContain(MATCH_STADIUM_URL);
    expect(urls).toContain(MATCH_BALL_URL);
    expect(urls).toContain("/assets/characters/match-chibi-v3/saya-shoot.webp");
    expect(urls).toContain("/assets/characters/match-chibi-v3/keeper-save.webp");
    expect(urls).toContain("/assets/characters/match-chibi-v3/field-blue-tackle.webp");
    expect(urls.filter((url) => url === "/assets/characters/match-chibi-v3/field-blue-idle.webp")).toHaveLength(1);
    expect(urls.filter((url) => url === "/home.svg")).toHaveLength(1);
  });

  it("reports progress and failed URLs without rejecting the whole preload", async () => {
    const progress = vi.fn();
    const failed = await preloadMatchAssets(
      ["/ready-a.webp", "/failed.webp", "/ready-b.webp"],
      progress,
      async (url) => url !== "/failed.webp",
    );

    expect(failed).toEqual(["/failed.webp"]);
    expect(progress).toHaveBeenCalledTimes(3);
    expect(progress).toHaveBeenLastCalledWith(3, 3);
  });
});
