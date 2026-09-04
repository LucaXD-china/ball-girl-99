import { describe, expect, it } from "vitest";
import type { TournamentFixture } from "./tournamentJourney";
import type { TournamentSummaryEntry } from "./tournamentSummary";
import { end01Beats, end01BeatsFor, end02Beats, end02BeatsFor, end03Beats, end04Beats, end05Beats, tournamentEndingFor, tournamentEndingMeta } from "./tournamentEnding";

const fixtures = [
  { id: "r16-2", stage: "round_of_16" },
  { id: "qf-2", stage: "quarter_final" },
  { id: "sf-2", stage: "semi_final" },
  { id: "final", stage: "final" },
] as TournamentFixture[];

function result(fixtureId: string): TournamentSummaryEntry {
  return { fixtureId, result: {} as TournamentSummaryEntry["result"], advanced: false };
}

describe("tournament endings", () => {
  it("routes early elimination, late elimination, and the championship to the three ending lines", () => {
    expect(tournamentEndingFor("eliminated", [result("r16-2")], fixtures)).toBe("END-01");
    expect(tournamentEndingFor("eliminated", [result("qf-2")], fixtures)).toBe("END-01");
    expect(tournamentEndingFor("eliminated", [result("sf-2")], fixtures)).toBe("END-02");
    expect(tournamentEndingFor("eliminated", [result("final")], fixtures)).toBe("END-02");
    expect(tournamentEndingFor("champion", [result("final")], fixtures)).toBe("END-03");
    expect(tournamentEndingFor("champion", [result("final")], fixtures, "naya")).toBe("END-04");
    expect(tournamentEndingFor("champion", [result("final")], fixtures, "irena")).toBe("END-05");
  });

  it("keeps captain-specific failure scripts and both approved new endings", () => {
    expect(end01BeatsFor("naya").some(({ text }) => text.includes("每天来这里把你喊出来"))).toBe(true);
    expect(end01BeatsFor("irena").some(({ text }) => text.includes("已经发生的一组数据"))).toBe(true);
    expect(end02BeatsFor("naya", "晴空竞技").some(({ text }) => text.includes("街头足球带进训练场"))).toBe(true);
    expect(end02BeatsFor("irena", "晴空竞技").some(({ text }) => text.includes("拆解成所有人都能理解的语言"))).toBe(true);

    const end04 = end04Beats("晴空竞技");
    expect(tournamentEndingMeta["END-04"].title).toBe("双星长明");
    expect(end04.some(({ text }) => text === "签下大合同以后，娜雅依然开着那辆不起眼的 Mini Cooper。")).toBe(true);
    expect(end04.some(({ text }) => text === "后来，她把陪伴自己多年的旧车寄回家乡，又买了一辆新的 Mini Cooper。")).toBe(true);

    const end05 = end05Beats("晴空竞技");
    expect(tournamentEndingMeta["END-05"].title).toBe("传奇诞生");
    expect(end05[0].text).toBe("足球的历史从不缺少奇迹，谁说蚂蚁不能掀翻大象？");
    expect(end05.some(({ text }) => text.includes("队史唯一一次冠军联赛冠军"))).toBe(true);
    expect(end05.some(({ text }) => text === "大家谈笑甚欢，好像又回到了那段一起为冠军联赛努力的日子。")).toBe(true);
  });

  it("keeps the frozen END-01 script and its four scene changes intact", () => {
    expect(end01Beats[0].text).toBe("果然，失败是人生的常态……");
    expect(end01Beats.some(({ text }) => text.includes("离开了心爱的一线队"))).toBe(true);
    expect(end01Beats.at(-1)?.text).toBe("The End.");
    expect(new Set(end01Beats.map(({ frame }) => frame)).size).toBe(4);
  });

  it("keeps the frozen END-02 script, club-name substitution, and five scene changes intact", () => {
    const beats = end02Beats("晴空竞技");
    expect(beats[0].text).toBe("就这样，我在晴空竞技的首次冠军联赛之旅结束了。");
    expect(beats.some(({ text }) => text === "我终于下定决心，问出那个问题：“我们球队需要一位技术分析员，你能胜任吗？”")).toBe(true);
    expect(beats.some(({ text }) => text === "天啊，神奇的足球！")).toBe(true);
    expect(beats.at(-1)?.text).toBe("The End.");
    expect(new Set(beats.map(({ frame }) => frame)).size).toBe(5);
  });

  it("plays END-03 with the saved manager and club names", () => {
    const beats = end03Beats("阿澈", "晴空竞技");
    expect(tournamentEndingMeta["END-03"].status).toBe("ready");
    expect(beats.some(({ text }) => text.includes("晴空竞技能连续五年夺冠"))).toBe(true);
    expect(beats.some(({ text }) => text.includes("阿澈和纱夜"))).toBe(true);
    expect(beats.some(({ text }) => text === "“原来是居民家电视里纱夜拿着金球奖杯指着经理的最佳教练奖杯打趣道……”")).toBe(true);
    expect(beats.some(({ text }) => text === "“你比我还少一个哟！”")).toBe(true);
    expect(beats.some(({ text }) => text === "Win it all")).toBe(true);
    expect(beats.at(-1)?.text).toBe("The End.");
    expect(new Set(beats.map(({ frame }) => frame))).toEqual(new Set([
      "end03-01-first-crown",
      "end03-02-dynasty-road",
      "end03-03-five-title-celebration",
      "end03-04-bob-seaside",
      "end03-05-bob-tv-cheer",
    ]));
  });
});
