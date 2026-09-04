import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { roster } from "../data/gameData";
import { PlayerCardInspector } from "./PlayerCardInspector";

describe("PlayerCardInspector", () => {
  it("reuses the recruitment card detail fields for an outfield player", () => {
    const player = roster.characters.find(({ position }) => position === "ST")!;
    const html = renderToStaticMarkup(<PlayerCardInspector player={player} eyebrow="球探报告" onClose={() => undefined} />);

    expect(html).toContain(`${player.name}球员卡详情`);
    expect(html).toContain(`${player.name}球员卡`);
    expect(html).toContain("卡面基础 OVR");
    expect(html).toContain("速度");
    expect(html).toContain("射门");
    expect(html).not.toContain("NEW · 首次加入收藏");
  });

  it("shows goalkeeper attributes when the scouted player can play goalkeeper", () => {
    const player = roster.characters.find(({ position }) => position === "GK")!;
    const html = renderToStaticMarkup(<PlayerCardInspector player={player} eyebrow="球探报告" onClose={() => undefined} />);

    expect(html).toContain("扑救");
    expect(html).toContain("手控");
    expect(html).toContain("反应");
    expect(html).not.toContain("射门");
  });
});
