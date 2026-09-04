import { describe, expect, it } from "vitest";
import { captainFormationGuidePages, captainGuideIdentity, captainOfficeIntroductions } from "./captainGuideCopy";
import { tournamentCaptainIds } from "./tournamentCaptain";

describe("captain-specific guides", () => {
  it("keeps Naya energetic and Irena calm and precise", () => {
    expect(captainGuideIdentity.naya.introductionMessage).toContain("马上出发");
    expect(captainGuideIdentity.irena.introductionTitle).toBe("最终的挑战");
    expect(captainGuideIdentity.irena.introductionMessage).toContain("完成高亮位置的操作即可继续");
    expect(captainOfficeIntroductions.naya[0]).toContain("本轮难度：困难");
    expect(captainOfficeIntroductions.naya[0]).toContain("最高只能招募5星球员");
    expect(captainOfficeIntroductions.irena[0]).toContain("本轮难度：极难");
    expect(captainOfficeIntroductions.irena[0]).toContain("最高只能招募4星球员");
    expect(captainOfficeIntroductions.naya).toHaveLength(3);
    expect(captainOfficeIntroductions.irena).toHaveLength(3);
  });

  it("teaches attack, defense, and the complete soft-counter cycle in every captain voice", () => {
    const counterPairs = ["4-3-3 克 3-5-2", "3-5-2 克 4-4-2", "4-4-2 克 4-2-3-1", "4-2-3-1 克 4-3-3"];
    for (const captainId of tournamentCaptainIds) {
      const pages = captainFormationGuidePages[captainId];
      expect(pages).toHaveLength(3);
      expect(pages[0].message).toContain("进攻阵型");
      expect(pages[1].message).toContain("防守阵型");
      expect(pages[1].message).toContain("自然切换");
      expect(pages[2].message).toContain("我方进攻");
      expect(pages[2].message).toContain("我方防守");
      for (const pair of counterPairs) expect(pages[2].message).toContain(pair);
      expect(pages[2].message).toMatch(/小幅优势|多一点优势/);
      expect(pages[2].message).toMatch(/不.*必胜|不代表一定获胜/);
    }
    expect(new Set(tournamentCaptainIds.map((captainId) => captainFormationGuidePages[captainId][0].title)).size).toBe(3);
  });
});
