import { describe, expect, it } from "vitest";
import { guidePlacementForTarget, guideSpotlightStyle, sayaChibiIntroduction } from "./SayaGuide";
import { clampGuidePosition } from "./sayaGuidePosition";

describe("Saya guide drag position", () => {
  it("keeps a dragged guide inside the viewport", () => {
    expect(clampGuidePosition({ x: -80, y: 900 }, { width: 320, height: 150 }, { width: 390, height: 844 })).toEqual({ x: 8, y: 686 });
  });

  it("keeps oversized guide dimensions pinned to the safe edge", () => {
    expect(clampGuidePosition({ x: 120, y: -20 }, { width: 420, height: 180 }, { width: 390, height: 844 })).toEqual({ x: 8, y: 8 });
  });

  it("introduces the chibi guide and explains how to move her", () => {
    expect(sayaChibiIntroduction.title).toBe("以后也请多关照");
    expect(sayaChibiIntroduction.message).toContain("拖动我就好");
    expect(sayaChibiIntroduction.message.length).toBeLessThanOrEqual(44);
  });

  it("keeps both open and collapsed guide boxes inside the viewport", () => {
    const open = clampGuidePosition({ x: 980, y: 680 }, { width: 390, height: 176 }, { width: 1280, height: 720 });
    const collapsed = clampGuidePosition(open, { width: 390, height: 176 }, { width: 1280, height: 720 });
    expect(collapsed).toEqual(open);
    expect(open).toEqual({ x: 882, y: 536 });
  });

  it("expands the spotlight around the complete required target", () => {
    expect(guideSpotlightStyle({ left: 40, top: 120, width: 180, height: 60 })).toEqual({
      left: 33,
      top: 113,
      width: 194,
      height: 74,
    });
  });

  it("moves the guide to the opposite safe corner from a bottom-right target", () => {
    expect(guidePlacementForTarget(
      { left: 1070, top: 599, width: 190, height: 50 },
      { width: 1280, height: 720 },
    )).toEqual({ horizontal: "left", vertical: "top" });
  });

  it("retains an explicit bottom-left placement", () => {
    expect(guidePlacementForTarget(
      { left: 1070, top: 599, width: 190, height: 50 },
      { width: 1280, height: 720 },
      "bottom-left",
    )).toEqual({ horizontal: "left", vertical: "bottom" });
  });
});
