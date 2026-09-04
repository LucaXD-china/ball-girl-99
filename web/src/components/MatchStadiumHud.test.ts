import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../data/matchSimulator";
import { deriveMatchPresentation, derivePenaltyShootout, MatchStadiumHud } from "./MatchStadiumHud";

const events: MatchEvent[] = [
  { id: "kickoff", minute: 0, side: "home", kind: "kickoff", commentary: "开球", homeScore: 0, awayScore: 0 },
  { id: "goal", minute: 18, side: "home", kind: "goal", commentary: "进球", homeScore: 1, awayScore: 0 },
  { id: "save", minute: 24, side: "away", kind: "save", commentary: "扑救", homeScore: 1, awayScore: 0 },
  { id: "fulltime", minute: 90, side: "home", kind: "fulltime", commentary: "终场", homeScore: 1, awayScore: 0 },
];

describe("球场屏幕揭示节奏", () => {
  it("比分与文字比足球事件延迟一拍", () => {
    const presentation = deriveMatchPresentation(events, 2);
    expect(presentation.reveal?.id).toBe("goal");
    expect([presentation.reveal?.homeScore, presentation.reveal?.awayScore]).toEqual([1, 0]);
    expect(presentation.visibleEvents.map(({ id }) => id)).toEqual(["kickoff", "goal"]);
  });

  it("不信任事件携带的未来比分快照，只累计已揭示进球", () => {
    const contaminated = events.map((event, index) => index === 0 ? event : { ...event, homeScore: 4, awayScore: 3 });
    const presentation = deriveMatchPresentation(contaminated, 2);
    expect([presentation.reveal?.homeScore, presentation.reveal?.awayScore]).toEqual([1, 0]);
  });

  it("最后一条事件立即揭示，确保终场与点球结束可见", () => {
    const presentation = deriveMatchPresentation(events, events.length - 1);
    expect(presentation.visibleEvents).toHaveLength(events.length);
  });
});

const penaltyEvent = (id: string, side: "home" | "away", kind: "penalty-goal" | "penalty-save" | "penalty-miss", round: number): MatchEvent => ({
  id,
  minute: 120 + round,
  minuteLabel: `点球·第${round}轮`,
  side,
  kind,
  phase: "penalties",
  penaltyRound: round,
  commentary: id,
  homeScore: 1,
  awayScore: 1,
});

describe("点球大战实时记分", () => {
  const start: MatchEvent = { id: "penalty-start", minute: 120, side: "neutral", kind: "penalty-start", phase: "penalties", commentary: "点球开始", homeScore: 1, awayScore: 1 };

  it("从 0:0 开始，按各队实际主罚顺序记录命中和失败", () => {
    expect(derivePenaltyShootout([start])).toEqual({ home: { score: 0, attempts: [] }, away: { score: 0, attempts: [] } });

    const shootout = derivePenaltyShootout([
      start,
      penaltyEvent("away-1", "away", "penalty-goal", 1),
      penaltyEvent("home-1", "home", "penalty-save", 1),
      penaltyEvent("away-2", "away", "penalty-miss", 2),
      penaltyEvent("home-2", "home", "penalty-goal", 2),
    ]);

    expect(shootout).toEqual({
      home: { score: 1, attempts: [{ id: "home-1", round: 1, scored: false }, { id: "home-2", round: 2, scored: true }] },
      away: { score: 1, attempts: [{ id: "away-1", round: 1, scored: true }, { id: "away-2", round: 2, scored: false }] },
    });
  });

  it("保留第六轮后的突然死亡轨迹，也支持前五轮提前结束", () => {
    const earlyFinish = [start, ...[1, 2, 3].flatMap((round) => [
      penaltyEvent(`home-${round}`, "home", "penalty-goal", round),
      penaltyEvent(`away-${round}`, "away", "penalty-miss", round),
    ])];
    expect(derivePenaltyShootout(earlyFinish)?.home.attempts).toHaveLength(3);
    expect(derivePenaltyShootout(earlyFinish)?.away.score).toBe(0);

    const suddenDeath = [start, ...Array.from({ length: 6 }, (_, index) => index + 1).flatMap((round) => [
      penaltyEvent(`away-${round}`, "away", "penalty-goal", round),
      penaltyEvent(`home-${round}`, "home", round === 6 ? "penalty-save" : "penalty-goal", round),
    ])];
    expect(derivePenaltyShootout(suddenDeath)?.home.attempts.at(-1)).toEqual({ id: "home-6", round: 6, scored: false });
    expect(derivePenaltyShootout(suddenDeath)?.away.attempts).toHaveLength(6);
  });

  it("只消费传入的已揭示事件，不信任事件携带的未来最终比分", () => {
    const revealed = { ...penaltyEvent("home-1", "home", "penalty-goal", 1), homePenaltyScore: 5, awayPenaltyScore: 4 };
    expect(derivePenaltyShootout([start, revealed])).toMatchObject({ home: { score: 1 }, away: { score: 0 } });
    expect(derivePenaltyShootout(events)).toBeNull();
  });

  it("渲染可读的实时比分和每一脚结果", () => {
    const visibleEvents = [
      start,
      penaltyEvent("away-1", "away", "penalty-goal", 1),
      penaltyEvent("home-1", "home", "penalty-save", 1),
    ];
    const markup = renderToStaticMarkup(createElement(MatchStadiumHud, {
      homeName: "北港晴空",
      awayName: "流光竞技",
      homeCrestUrl: "/home.png",
      reveal: visibleEvents.at(-1)!,
      visibleEvents,
    }));

    expect(markup).toContain("点球大战实时比分，北港晴空 0比1 流光竞技");
    expect(markup).toContain("北港晴空第 1 次点球未进");
    expect(markup).toContain("流光竞技第 1 次点球命中");
    expect(markup).toContain("✓");
    expect(markup).toContain("×");
  });
});
