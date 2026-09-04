import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage, officeSayaIntroductionSteps, officeTournamentStageLabels } from "./HomePage";

const homeProps: ComponentProps<typeof HomePage> = {
  account: { uid: "manager", account: "manager", nickname: "测试", isGuest: false, createdAt: "2026-08-16T00:00:00.000Z", updatedAt: "2026-08-16T00:00:00.000Z" },
  clubName: "晴空少女",
  onUpdateNickname: async () => { throw new Error("not used"); },
  onBindAccount: async () => { throw new Error("not used"); },
  onLogout: async () => undefined,
  officeGuidance: {
    title: "第一次的杯赛旅程",
    message: "经理，别担心，我会一直陪着你。我们先接受任务，从第一步慢慢来吧。",
    target: "office-primary",
  },
  officeIntroduction: { pending: false, onComplete: () => undefined },
  tournamentJourney: {
    day: 1,
    phaseLabel: "董事会特别任务",
    countdownLabel: "距16强首回合 16天",
    guidance: "接受任务并前往补强",
    primaryActionLabel: "接受任务并前往补强",
    stage: "day1",
    canAdvanceTime: false,
    scoutReportAvailable: false,
    scoutReportViewed: false,
    onPrimaryAction: () => undefined,
    onViewScoutReport: () => undefined,
    onAdvanceToMatch: () => undefined,
  },
};

describe("tournament home mascot", () => {
  it("uses the full-size Saya for contextual office guidance without the fixed slogan", () => {
    const markup = renderToStaticMarkup(createElement(HomePage, homeProps));

    expect(markup).toContain("纱夜");
    expect(markup).toContain("mascot-dialogue-speaker");
    expect(markup).toContain("经理，别担心，我会一直陪着你");
    expect(markup).not.toContain("“经理，别担心，我会一直陪着你");
    expect(markup).not.toContain("第一步慢慢来吧。”");
    expect(markup).not.toContain("第一次的杯赛旅程");
    expect(markup).not.toContain("队长引导");
    expect(markup).not.toContain("放心向前吧");
    expect(markup).not.toContain("saya-guide-shell");
    expect(markup).toContain("office-guidance-scrim");
    expect(markup).toContain("mascot-dialogue is-guidance");
    expect(markup).toContain("office-primary-action saya-guide-target saya-guide-forced-target");
    expect(markup).toContain("接受任务并前往补强");
    expect(markup).not.toContain("董事会特别任务");
    expect(markup).not.toContain("完成当前步骤后才能推进日期");
    expect(markup).not.toContain("mascot-switch");
    expect(markup).not.toContain("切换看板娘");
  });

  it("uses the approved Chinese knockout labels on the tournament ticket", () => {
    expect(officeTournamentStageLabels).toEqual({
      day1: "16进8",
      round_of_16: "16进8",
      quarter_final: "8进4",
      semi_final: "半决赛",
      final: "决赛",
    });

    const markup = renderToStaticMarkup(createElement(HomePage, homeProps));
    expect(markup).toContain("99日冠军征程");
    expect(markup).toContain("DAY</span><strong>01</strong><i>/ 99</i>");
    expect(markup).toContain(">16进8</em>");
    expect(markup).not.toContain("R16");
  });

  it("keeps the locker room available while suggesting roster registration", () => {
    const markup = renderToStaticMarkup(createElement(HomePage, {
      ...homeProps,
      officeGuidance: {
        title: "一起选出赛事名单",
        message: "先看看球员详情，再一起选出赛事名单。",
        target: "office-primary",
        strong: false,
      },
      tournamentJourney: {
        ...homeProps.tournamentJourney,
        phaseLabel: "Day 1 · 赛事注册",
        primaryActionLabel: "前往名单注册",
      },
    }));

    expect(markup).toContain("前往名单注册");
    expect(markup).not.toContain("office-guidance-scrim");
    expect(markup).not.toContain("saya-guide-forced-target");
  });

  it("does not force the training-room suggestion after the first match", () => {
    const markup = renderToStaticMarkup(createElement(HomePage, {
      ...homeProps,
      officeGuidance: {
        title: "先安排一次训练",
        message: "比赛前还有时间。先带三位球员完成专项训练吧。",
        target: "office-primary",
        strong: false,
      },
      tournamentJourney: {
        ...homeProps.tournamentJourney,
        phaseLabel: "16强第2回合 · 训练计划",
        primaryActionLabel: "前往训练中心",
      },
    }));

    expect(markup).toContain("前往训练中心");
    expect(markup).not.toContain("office-guidance-scrim");
    expect(markup).not.toContain("saya-guide-forced-target");
  });

  it("does not force the tournament settlement action", () => {
    const markup = renderToStaticMarkup(createElement(HomePage, {
      ...homeProps,
      officeGuidance: {
        title: "一起回顾这段旅程",
        message: "辛苦了，经理。无论结果如何，都值得一起好好看看我们走过的路。",
        target: "office-primary",
        strong: false,
      },
      tournamentJourney: {
        ...homeProps.tournamentJourney,
        day: 99,
        phaseLabel: "Day 99 · 冠军归来",
        primaryActionLabel: "查看赛事结算",
      },
    }));

    expect(markup).toContain("查看赛事结算");
    expect(markup).not.toContain("office-guidance-scrim");
    expect(markup).not.toContain("saya-guide-forced-target");
  });

  it("starts with Saya's required introduction, covers the bottom navigation, and locks office actions", () => {
    const markup = renderToStaticMarkup(createElement(HomePage, {
      ...homeProps,
      officeIntroduction: { pending: true, onComplete: () => undefined },
    }));

    expect(officeSayaIntroductionSteps).toHaveLength(4);
    expect(officeSayaIntroductionSteps[1].message).toContain("前三轮比赛为主客场双赛");
    expect(officeSayaIntroductionSteps[1].message).toContain("决赛则是单场决胜");
    expect(officeSayaIntroductionSteps[2]).toEqual({
      message: expect.stringContaining("下方是球队的常用入口"),
      target: "dock",
    });
    expect(officeSayaIntroductionSteps[2].message).toContain("更衣室");
    expect(officeSayaIntroductionSteps[2].message).toContain("训练中心");
    expect(officeSayaIntroductionSteps[2].message).toContain("赛程");
    expect(officeSayaIntroductionSteps[2].message).toContain("球星卡商店");
    expect(officeSayaIntroductionSteps[2].message).toContain("剧情回顾");
    expect(officeSayaIntroductionSteps[3].message).toContain("一起去球星卡商店看看吧~");
    expect(markup).toContain("初次见面，经理");
    expect(markup).not.toContain("队长介绍");
    expect(markup).not.toContain("1 / 3");
    expect(markup).not.toContain("<strong>初次见面，经理</strong>");
    expect(markup).toContain("office-introduction-scrim");
    expect(markup).not.toContain("office-guidance-scrim");
    expect(markup).toContain(">继续</button>");
    expect(markup).toContain("disabled");
    expect(markup).not.toContain("office-primary-action saya-guide-target saya-guide-forced-target");
  });
});
