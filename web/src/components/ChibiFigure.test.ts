import { describe, expect, it } from "vitest";
import {
  CHIBI_SAYA_ID,
  chibiKitFamilyForOpponent,
  chibiSpriteAction,
  chibiSpriteFamily,
  chibiSpriteUrl,
  expressionForAction,
} from "./ChibiFigure";

describe("chibi 表情映射", () => {
  it("铲断 / 扑救用「闭眼努力」", () => {
    expect(expressionForAction("tackle")).toBe("effort");
    expect(expressionForAction("save")).toBe("effort");
  });

  it("站立 / 传球 / 射门用「坚定冷静」", () => {
    expect(expressionForAction("idle")).toBe("calm");
    expect(expressionForAction("pass")).toBe("calm");
    expect(expressionForAction("shoot")).toBe("calm");
  });
});

describe("chibi V3 资源解析", () => {
  it("纱夜和主客队占位球员使用对应素材组", () => {
    expect(chibiSpriteFamily("home", CHIBI_SAYA_ID)).toBe("saya");
    expect(chibiSpriteFamily("home", "home-player")).toBe("field-home");
    expect(chibiSpriteFamily("away", "away-player")).toBe("field-away");
    expect(chibiSpriteFamily("away", "away-keeper", true)).toBe("keeper");
  });

  it("门将只使用 idle/save，场上球员不会请求 save 素材", () => {
    expect(chibiSpriteAction("pass", true)).toBe("idle");
    expect(chibiSpriteAction("save", true)).toBe("save");
    expect(chibiSpriteAction("save", false)).toBe("idle");
  });

  it("六星门将保留专属素材，普通门将使用通用门将素材", () => {
    expect(chibiSpriteFamily("home", "azure_giulia_bellini", true)).toBe("giulia");
    expect(chibiSpriteUrl("home", "azure_giulia_bellini", "save", true)).toBe(
      "/assets/characters/match-chibi-v3/giulia-save.webp",
    );
    expect(chibiSpriteFamily("away", "ordinary-opponent-gk", true, "field-skyblue")).toBe("keeper");
    expect(chibiSpriteUrl("away", "ordinary-opponent-gk", "save", true, "field-skyblue")).toBe("/assets/characters/match-chibi-v3/keeper-save.webp");
  });

  it("对手俱乐部映射到对应球衣色组（红色冲突→白色）", () => {
    expect(chibiKitFamilyForOpponent("lumiere_crown")).toBe("field-blue"); // PSG
    expect(chibiKitFamilyForOpponent("blue_moon_lab")).toBe("field-skyblue"); // Man City
    expect(chibiKitFamilyForOpponent("ruhr_swarm")).toBe("field-yellow"); // Dortmund
    expect(chibiKitFamilyForOpponent("emerald_lions")).toBe("field-green"); // Sporting
    expect(chibiKitFamilyForOpponent("north_foundry")).toBe("field-away"); // Arsenal 红→白
    expect(chibiKitFamilyForOpponent("unknown_club")).toBe("field-away");
  });

  it("客队通用场员按对手色组解析素材 URL", () => {
    expect(chibiSpriteUrl("away", "opponent-player", "shoot", false, "field-blue")).toBe(
      "/assets/characters/match-chibi-v3/field-blue-shoot.webp",
    );
    expect(chibiSpriteFamily("away", "opponent-player", false, "field-green")).toBe("field-green");
  });

  it("生成稳定的版本化公开路径", () => {
    expect(chibiSpriteUrl("away", "away-player", "shoot")).toBe(
      "/assets/characters/match-chibi-v3/field-away-shoot.webp",
    );
    expect(chibiSpriteUrl("home", "home-keeper", "pass", true)).toBe(
      "/assets/characters/match-chibi-v3/keeper-idle.webp",
    );
  });
});
