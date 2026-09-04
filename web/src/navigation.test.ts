import { describe, expect, it } from "vitest";
import { appSections } from "./navigation";

describe("game navigation", () => {
  it("keeps the six implemented sections in order", () => {
    expect(appSections.map((item) => item.label)).toEqual([
      "经理办公室",
      "球员更衣室",
      "训练中心",
      "赛程",
      "球星卡商店",
      "剧情回顾",
    ]);
  });

  it("contains labels only and delegates availability to tournament rules", () => {
    expect(appSections.every((item) => Object.keys(item).sort().join(",") === "id,label")).toBe(true);
  });
});
