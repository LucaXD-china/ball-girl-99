import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OpponentStoryPage } from "./OpponentStoryPage";
import { TournamentStoryPage } from "./TournamentStoryPage";

describe("tournament story skip controls", () => {
  it("keeps a visible skip action on the main tournament story", () => {
    const markup = renderToStaticMarkup(<TournamentStoryPage storyId="SAYA" nickname="测试" clubName="晴空竞技" onComplete={() => undefined} />);

    expect(markup).toContain('class="prologue-skip"');
    expect(markup).toContain(">跳过剧情</button>");
  });

  it("keeps a visible skip action on the standalone opponent story", () => {
    const markup = renderToStaticMarkup(<OpponentStoryPage storyId="OPPONENT-lumiere_crown" nickname="测试" onComplete={() => undefined} />);

    expect(markup).toContain('class="prologue-skip"');
    expect(markup).toContain(">跳过剧情</button>");
  });
});
