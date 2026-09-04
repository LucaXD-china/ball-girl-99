import { describe, expect, it } from "vitest";
import { CHIBI_SAYA_ID } from "./ChibiFigure";
import { activeRoleFor, ballZIndexFor, chibiActionFor, chibiActionForPlayer, goalNetSideAt, isGoalShotCinematic, isLineupGoalkeeper, playbackElapsedMs, readableBallScaleFor, SHOT_ACTION_LEAD_MS, shotPhaseAt, usesChibiSpriteInsteadOfArtwork } from "./StandsPitch";

describe("比赛回放倍率", () => {
  it("只按倍率推进展示时钟", () => {
    expect(playbackElapsedMs(1_000, 1_600, 1)).toBe(600);
    expect(playbackElapsedMs(1_000, 1_600, 2)).toBe(1_200);
  });
});

describe("chibi 动作映射（按射门阶段）", () => {
  it("传球阶段：传球者出脚，射手/门将/防守者等待", () => {
    expect(chibiActionFor("passer", false)).toBe("pass");
    expect(chibiActionFor("shooter", false)).toBe("idle");
    expect(chibiActionFor("keeper", false)).toBe("idle");
    expect(chibiActionFor("defender", false)).toBe("idle");
  });

  it("射门阶段：射手/门将/防守者动作，传球者收势", () => {
    expect(chibiActionFor("shooter", true)).toBe("shoot");
    expect(chibiActionFor("keeper", true)).toBe("save");
    expect(chibiActionFor("defender", true)).toBe("tackle");
    expect(chibiActionFor("passer", true)).toBe("idle");
  });

  it("技能与其他无角色球员保持站立", () => {
    expect(chibiActionFor("skill", true)).toBe("idle");
    expect(chibiActionFor(undefined, false)).toBe("idle");
  });

  it("门将同时发动技能时仍在射门阶段使用扑救动作", () => {
    const event = { id: "keeper-skill", minute: 32, side: "away" as const, kind: "save" as const, commentary: "", homeScore: 0, awayScore: 0, playerId: "away-gk", keeperId: "away-gk", skillId: "keeper-instinct" };
    expect(chibiActionForPlayer("skill", true, "away-gk", event)).toBe("save");
    expect(chibiActionForPlayer("skill", false, "away-gk", event)).toBe("idle");
  });

  it("射手发动技能时仍在射门阶段使用射门动作", () => {
    const event = { id: "shooter-skill", minute: 48, side: "home" as const, kind: "goal" as const, commentary: "", homeScore: 1, awayScore: 0, playerId: "home-st", shooterId: "home-st", scorerId: "home-st", skillId: "power-shot" };
    expect(chibiActionForPlayer("skill", false, "home-st", event)).toBe("idle");
    expect(chibiActionForPlayer("skill", true, "home-st", event)).toBe("shoot");
  });
});

describe("高亮相位", () => {
  it("射门阶段高亮射手/门将/防守者，传球阶段高亮传球者", () => {
    expect(activeRoleFor("shooter", true)).toBe("shooter");
    expect(activeRoleFor("shooter", false)).toBeUndefined();
    expect(activeRoleFor("passer", false)).toBe("passer");
    expect(activeRoleFor("passer", true)).toBeUndefined();
    expect(activeRoleFor("skill", false)).toBe("skill");
  });
});

describe("射门动作与纵深图层", () => {
  const event = { id: "shot", minute: 32, side: "home" as const, kind: "goal" as const, commentary: "", homeScore: 1, awayScore: 0 };
  const timeline = [{
    event,
    startMs: 100,
    durationMs: 1500,
    ballPath: [{ x: 50, y: 16, mode: "travel" as const }, { x: 50, y: -3.5, mode: "goal" as const }],
    segmentDurations: [600, 650],
  }];

  it("在球离开射手前提前切入射门动作", () => {
    expect(shotPhaseAt(timeline, 700 - SHOT_ACTION_LEAD_MS - 1)).toBe(false);
    expect(shotPhaseAt(timeline, 700 - SHOT_ACTION_LEAD_MS)).toBe(true);
  });

  it("只在进球事件的射门动作段启用镜头效果", () => {
    expect(isGoalShotCinematic(event, false)).toBe(false);
    expect(isGoalShotCinematic(event, true)).toBe(true);
    expect(isGoalShotCinematic({ ...event, kind: "penalty-goal" }, true)).toBe(true);
    expect(isGoalShotCinematic({ ...event, kind: "save" }, true)).toBe(false);
    expect(isGoalShotCinematic({ ...event, kind: "miss" }, true)).toBe(false);
  });

  it("远处的球在近处人物之后，同深度触球时位于人物之前", () => {
    expect(ballZIndexFor(0.3)).toBeLessThan(Math.round(0.7 * 1000));
    expect(ballZIndexFor(0.5)).toBeGreaterThan(Math.round(0.5 * 1000));
    expect(ballZIndexFor(0.5)).toBeLessThan(3001);
  });

  it("足球与 chibi 共用同一条纵深缩放曲线", () => {
    expect(readableBallScaleFor(0)).toBeCloseTo(0.59);
    expect(readableBallScaleFor(0.5)).toBeCloseTo(0.795);
    expect(readableBallScaleFor(1)).toBe(1);
  });
});

describe("进球网兜反馈", () => {
  it("只在落网停顿段震动被攻破一侧的球网", () => {
    const event = { id: "goal", minute: 18, side: "home" as const, kind: "goal" as const, commentary: "", homeScore: 1, awayScore: 0 };
    const timeline = [{
      event,
      startMs: 100,
      durationMs: 900,
      ballPath: [
        { x: 50, y: 12, mode: "travel" as const },
        { x: 50, y: -3.5, mode: "goal" as const },
        { x: 50, y: -3.5, mode: "goal" as const, teleport: true, pauseMs: 300 },
      ],
      segmentDurations: [300, 300, 300],
    }];
    expect(goalNetSideAt(timeline, 650)).toBeNull();
    expect(goalNetSideAt(timeline, 750)).toBe("away");
    expect(goalNetSideAt(timeline, 1000)).toBeNull();
  });
});

describe("专属 chibi 小人覆盖", () => {
  it("御三家与六星都跳过静态正式立绘，改用专属 chibi", () => {
    expect(usesChibiSpriteInsteadOfArtwork(CHIBI_SAYA_ID)).toBe(true);
    expect(usesChibiSpriteInsteadOfArtwork("founder_scarlet_toros_6")).toBe(true);
    expect(usesChibiSpriteInsteadOfArtwork("founder_samba_union_7")).toBe(true);
    expect(usesChibiSpriteInsteadOfArtwork("azure_giulia_bellini")).toBe(true);
    expect(usesChibiSpriteInsteadOfArtwork("fog_harriet_wren")).toBe(true);
    expect(usesChibiSpriteInsteadOfArtwork("some_other_player")).toBe(false);
  });

  it("按实际首发 GK 槽识别门将，而不是依赖球员的自然位置", () => {
    expect(isLineupGoalkeeper("away-out-of-position-gk", {}, { gk: "away-out-of-position-gk" })).toBe(true);
    expect(isLineupGoalkeeper("natural-gk-on-bench", {}, {})).toBe(false);
  });
});
