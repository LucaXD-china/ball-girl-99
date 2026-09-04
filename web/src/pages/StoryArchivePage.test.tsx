import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OpponentScoutReport } from "../components/OpponentScoutReport";
import type { StoryArchiveState } from "../storage/storyArchiveStorage";
import { buildStoryArchiveScoutOpponent, StoryArchivePage } from "./StoryArchivePage";

describe("StoryArchivePage", () => {
  it("builds a stable opponent report for the hidden end-of-replay reward", () => {
    const first = buildStoryArchiveScoutOpponent("lumiere_crown");
    const second = buildStoryArchiveScoutOpponent("lumiere_crown");
    const html = renderToStaticMarkup(<OpponentScoutReport opponent={first} fixtureLabel="对手档案回看" showPlayers={false} onClose={() => undefined} />);

    expect(first.name).toBe("流光竞技");
    expect(first.attackFormationId).toBe("4-3-3");
    expect(Object.values(first.lineup).filter(Boolean)).toHaveLength(11);
    expect(first.lineup).toEqual(second.lineup);
    expect(html).toContain('aria-label="流光竞技球探报告"');
    expect(html).toContain("预计有球结构");
    expect(html).toContain("档案线索");
    expect(html).toContain("仅展示阵型，不固定球员");
    expect(html).toContain('data-lineup-display="formation-only"');
    expect(html).toContain("GK");
    for (const player of first.characters) expect(html).not.toContain(player.name);
    expect(html).not.toContain("当前总比分");

    const liveHtml = renderToStaticMarkup(<OpponentScoutReport opponent={first} fixtureLabel="比赛前情报" onClose={() => undefined} />);
    expect(liveHtml).toContain('data-lineup-display="players"');
    expect(liveHtml).toContain(first.characters[0].name);
    expect(liveHtml.match(/aria-label="打开[^"]+球员卡详情"/g)).toHaveLength(11);
    expect(liveHtml).toContain(".webp");
    expect(liveHtml).not.toContain("-locker.png");
    expect(liveHtml).not.toContain("-standee.png");
    expect(html).not.toContain("球员卡详情");
  });

  it("offers an unlocked END-03 as a playable replay instead of a pending story", () => {
    const archive: StoryArchiveState = {
      schemaVersion: 2,
      updatedAt: "2026-08-15T00:00:00.000Z",
      unlockedAt: { "DAY1-01": "2026-08-15T00:00:00.000Z", "END-03": "2026-08-15T00:00:00.000Z" },
      endingVariants: {},
    };

    const html = renderToStaticMarkup(
      <StoryArchivePage
        archive={archive}
        nickname="阿澈"
        clubName="晴空竞技"
        onBackToOffice={() => undefined}
      />,
    );

    expect(html).toContain("大庆典，可回看");
    expect(html).toContain("从第一座奖杯到五连冠");
    expect(html).not.toContain("大庆典，已解锁，制作中");
    expect(html).not.toContain("已解锁 · 点击回看");
    expect(html).not.toContain("根据征程进入其中一个结局");
    expect(html).not.toContain("剧情回顾");
    expect(html).not.toContain("完整故事线");
    expect(html).not.toContain("MEMORY ARCHIVE");
    expect(html).toContain("story-archive-back");
    expect(html).not.toContain("<h2>序章记忆</h2>");
    expect(html).not.toContain("<h2>生涯结局</h2>");
    const mainline = html.slice(html.indexOf('data-story-route="main"'), html.indexOf('data-story-route="opponents"'));
    const opponents = html.slice(html.indexOf('data-story-route="opponents"'));
    expect(mainline).toMatch(/data-story-order="PROLOGUE-01"[\s\S]*data-story-order="PROLOGUE-03"[\s\S]*data-story-order="DAY1-01"[\s\S]*data-story-order="SAYA"[\s\S]*data-story-order="NAYA"[\s\S]*data-story-order="IRENA"[\s\S]*aria-label="生涯结局"[\s\S]*data-story-order="END-01"[\s\S]*data-story-order="END-05"/);
    expect(mainline).not.toContain("OPPONENT-");
    expect(opponents).toMatch(/data-story-order="OPPONENT-lumiere_crown"[\s\S]*data-story-order="OPPONENT-azure_gulf"/);
    expect(html).toContain("冠军联赛重要吗？，可回看");
    expect(html).not.toContain("MAIN-PENDING");
    expect(html).toContain("story-timeline-connector");
    expect(html).toContain("story-archive-card-background");
  });

  it("keeps locked stories disabled without the prelim-review early unlock mode", () => {
    const archive: StoryArchiveState = {
      schemaVersion: 2,
      updatedAt: "2026-08-15T00:00:00.000Z",
      unlockedAt: {},
      endingVariants: {},
    };

    const html = renderToStaticMarkup(
      <StoryArchivePage
        archive={archive}
        nickname="阿澈"
        clubName="晴空竞技"
        onBackToOffice={() => undefined}
      />,
    );

    const lockedCards = html.match(/<button[^>]*class="story-archive-card locked"[^>]*disabled=""[^>]*><span class="story-archive-locked-label">未解锁剧情<\/span><\/button>/g) ?? [];
    expect(lockedCards).toHaveLength(16);
    expect(html).not.toContain("可提前观看");
    expect(html).not.toContain("初赛评审便捷模式");
    expect(html).not.toContain("是否提前观看");
    expect(html).not.toContain("完成一届冠军联赛征程");
    expect(html).not.toContain("赢得99日冠军联赛");
    expect(html).not.toContain("大庆典");
    expect(html).not.toContain("从第一座奖杯到五连冠");
  });
});
