import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PackResultFooter, canBeginPackTear, formatRecruitmentRate, isFirstTenRecruitmentRequired, packMarketGuidePrompt, recruitmentFactionIds, recruitmentFirstTenText, recruitmentSixStarPityText, recruitmentTopTierLabel, recruitmentTopTierPositions, shouldPlayLotteryResult } from "./PackMarketPage";

describe("pack reveal sound boundaries", () => {
  it("starts the tear sound only from a sealed pack", () => {
    expect(canBeginPackTear("sealed")).toBe(true);
    expect(canBeginPackTear("glow")).toBe(false);
    expect(canBeginPackTear("count")).toBe(false);
  });

  it("plays the result sound only when the pack-count result appears", () => {
    expect(shouldPlayLotteryResult("glow")).toBe(false);
    expect(shouldPlayLotteryResult("count")).toBe(true);
    expect(shouldPlayLotteryResult("cards")).toBe(false);
    expect(shouldPlayLotteryResult("summary")).toBe(false);
  });
});

describe("pack market onboarding", () => {
  it("only lists factions that belong to the player recruitment roster", () => {
    expect(recruitmentFactionIds).toHaveLength(8);
    expect(recruitmentFactionIds).not.toContain("cape_voyagers");
  });

  it("formats redistributed rates without floating-point artifacts", () => {
    expect(formatRecruitmentRate(0.55)).toBe("55%");
    expect(formatRecruitmentRate(1 / 3)).toBe("33.33%");
  });

  it("keeps returning to the shop as the only result-screen action", () => {
    const markup = renderToStaticMarkup(createElement(PackResultFooter, { onBackToShop: () => undefined }));
    expect(markup).toContain("返回球星卡商店");
    expect(markup).toContain("都已进入更衣室");
    expect(markup).not.toContain("前往更衣室");
    expect(markup.match(/<button/g)).toHaveLength(1);
  });

  it("first requires switching from the default pack to Sakura Link", () => {
    expect(packMarketGuidePrompt({ pullsMade: 0, firstTenGuaranteeUsed: false, canLock: true, selectedFaction: "fog_court", recruitmentBudget: 60 })).toMatchObject({
      guideId: "recruitment-faction-sakura",
      target: "recruitment-faction-sakura_link",
      required: true,
    });
  });

  it("then introduces Sakura Link and requires the first ten-pull", () => {
    expect(packMarketGuidePrompt({ pullsMade: 0, firstTenGuaranteeUsed: false, canLock: true, selectedFaction: "sakura_link", recruitmentBudget: 60 })).toMatchObject({
      guideId: "recruitment-first-ten",
      target: "recruitment-ten-pull",
      relatedTarget: "recruitment-faction-dossier",
      required: true,
    });
    expect(packMarketGuidePrompt({ pullsMade: 0, firstTenGuaranteeUsed: false, canLock: true, selectedFaction: "sakura_link", recruitmentBudget: 60 })?.message).toContain("重复卡会自动帮你升星");
  });

  it("keeps recruitment hints optional on the Naya and Irena routes", () => {
    expect(packMarketGuidePrompt({ pullsMade: 0, firstTenGuaranteeUsed: false, canLock: true, selectedFaction: "samba_union", recruitmentBudget: 50, captainId: "naya" })).toMatchObject({ required: false });
    expect(packMarketGuidePrompt({ pullsMade: 0, firstTenGuaranteeUsed: false, canLock: true, selectedFaction: "scarlet_toros", recruitmentBudget: 40, captainId: "irena" })).toMatchObject({ required: false });
    expect(isFirstTenRecruitmentRequired("naya", 0, false)).toBe(false);
    expect(isFirstTenRecruitmentRequired("irena", 0, false)).toBe(false);
    expect(isFirstTenRecruitmentRequired("saya", 0, false)).toBe(true);
  });

  it("shows the recruitable top-tier positions for each captain route", () => {
    expect([6, 5, 4].map((stars) => recruitmentTopTierLabel(stars as 4 | 5 | 6))).toEqual(["六星位置", "五星位置", "四星位置"]);
    expect(recruitmentTopTierPositions("sakura_link", 6)).toBe("中前卫");
    expect(recruitmentTopTierPositions("samba_union", 5)).toBe("中前卫、中后卫");
    expect(recruitmentTopTierPositions("scarlet_toros", 4)).toBe("中前卫、中后卫、中锋");
  });

  it("replaces six-star pity progress when the route cannot recruit six stars", () => {
    expect(recruitmentSixStarPityText(6, 17)).toBe("17 / 50");
    expect(recruitmentSixStarPityText(5, 17)).toBe("本难度不会抽取六星");
    expect(recruitmentSixStarPityText(4, 17)).toBe("本难度不会抽取六星");
    expect(recruitmentFirstTenText(6, false)).toBe("必得 5★+");
    expect(recruitmentFirstTenText(5, false)).toBe("必得 5★");
    expect(recruitmentFirstTenText(4, false)).toBe("必得 4★");
  });

  it("releases guidance after the required ten-pull instead of pointing to the locker", () => {
    expect(packMarketGuidePrompt({ pullsMade: 10, firstTenGuaranteeUsed: true, canLock: true, selectedFaction: "sakura_link", recruitmentBudget: 60 })).toBeNull();
  });

  it("keeps Saya hidden while any recruitment pulls remain", () => {
    expect(packMarketGuidePrompt({ pullsMade: 11, firstTenGuaranteeUsed: true, canLock: true, selectedFaction: "sakura_link", recruitmentBudget: 60 })).toBeNull();
    expect(packMarketGuidePrompt({ pullsMade: 59, firstTenGuaranteeUsed: true, canLock: true, selectedFaction: "sakura_link", recruitmentBudget: 60 })).toBeNull();
  });

  it("strongly guides roster locking only after all recruitment pulls are spent", () => {
    expect(packMarketGuidePrompt({ pullsMade: 60, firstTenGuaranteeUsed: true, canLock: true, selectedFaction: "sakura_link", recruitmentBudget: 60 })).toMatchObject({
      guideId: "recruitment-finish",
      target: "recruitment-lock",
      required: true,
    });
  });
});
