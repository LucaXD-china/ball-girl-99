import { describe, expect, it } from "vitest";
import { buildStandsField, buildStandsGoal, projectToStands, STANDS_RIG } from "./pitchPerspective";

describe("看台视角投影", () => {
  it("把主队球门（y=100）投到屏幕左侧、对手球门（y=0）投到右侧", () => {
    expect(projectToStands(50, 100).left).toBeLessThan(50);
    expect(projectToStands(50, 0).left).toBeGreaterThan(50);
  });

  it("近侧边线（x=100）比远侧边线（x=0）更大、更靠下", () => {
    const far = projectToStands(0, 50);
    const near = projectToStands(100, 50);
    expect(near.scale).toBeGreaterThan(far.scale);
    expect(near.top).toBeGreaterThan(far.top);
    expect(far.scale).toBe(STANDS_RIG.farScale);
    expect(near.scale).toBe(1);
  });

  it("球场中心点落在屏幕中部", () => {
    const center = projectToStands(50, 50);
    expect(center.left).toBeCloseTo(STANDS_RIG.centerX, 5);
    expect(center.top).toBeGreaterThan(STANDS_RIG.horizon);
    expect(center.top).toBeLessThan(STANDS_RIG.nearBottom);
  });

  it("投影是确定性的纯函数", () => {
    expect(projectToStands(37, 61)).toEqual(projectToStands(37, 61));
  });

  it("生成完整看台球场几何（外框 / 中线 / 两个禁区 / 两个球门）", () => {
    const field = buildStandsField();
    expect(field.outline.split(" ")).toHaveLength(4);
    expect(field.penaltyAreas).toHaveLength(2);
    expect(field.goals).toHaveLength(2);
    expect(field.goalFrames).toHaveLength(2);
    expect(field.centerCircle.rx).toBeGreaterThan(0);
    expect(field.centerCircle.ry).toBeGreaterThan(0);
  });

  it("球门后网向场外延伸，门框高度随纵深单调缩放", () => {
    const home = buildStandsGoal("home");
    const away = buildStandsGoal("away");
    expect(home.backFar.left).toBeLessThan(home.frontFar.left);
    expect(away.backFar.left).toBeGreaterThan(away.frontFar.left);
    expect(home.nearPostHeight).toBeGreaterThan(home.farPostHeight);
    expect(away.nearPostHeight).toBeGreaterThan(away.farPostHeight);
  });

  it("V3 投影在全纵深连续增大，四角仍落在画布内", () => {
    const samples = [0, 25, 50, 75, 100].map((depth) => projectToStands(depth, 50));
    expect(samples.map(({ scale }) => scale)).toEqual([...samples].map(({ scale }) => scale).sort((a, b) => a - b));
    const field = buildStandsField();
    const corners = field.outline.split(" ").flatMap((point) => point.split(",").map(Number));
    expect(corners.every((value) => value >= 0 && value <= 100)).toBe(true);
  });
});
