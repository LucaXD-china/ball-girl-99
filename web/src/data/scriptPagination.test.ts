import { describe, expect, it } from "vitest";
import { formatNarrativeDisplayText, paginateNarrativeText } from "./scriptPagination";

describe("narrative display pagination", () => {
  it("preserves every approved character while splitting a dense page at sentence boundaries", () => {
    const text = "第一句很短。第二句也很短。第三句需要换页展示。";
    const pages = paginateNarrativeText(text, 18);
    expect(pages).toEqual(["第一句很短。第二句也很短。", "第三句需要换页展示。"]);
    expect(pages.join("")).toBe(text);
  });

  it("uses clause boundaries before a hard split for one unusually long sentence", () => {
    const text = "这一句很长，先说明第一个重点，然后说明第二个重点，最后说明第三个重点。";
    const pages = paginateNarrativeText(text, 14);
    expect(pages.join("")).toBe(text);
    expect(pages).toEqual(["这一句很长，", "先说明第一个重点，", "然后说明第二个重点，", "最后说明第三个重点。"]);
  });

  it("formats two display lines at a sentence boundary without changing the approved text", () => {
    const text = "就这样，通过俱乐部会员大会的支持，我们重新拿回了球队的管理权。康拉德也同意退居幕后，球队也逐渐回归正轨。";
    const displayText = formatNarrativeDisplayText(text);
    expect(displayText).toBe("就这样，通过俱乐部会员大会的支持，我们重新拿回了球队的管理权。\n康拉德也同意退居幕后，球队也逐渐回归正轨。");
    expect(displayText.replace("\n", "")).toBe(text);
  });
});
