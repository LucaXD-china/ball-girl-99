import { describe, expect, it } from "vitest";
import { buildMatchTimeline, deriveEventFrame, GOAL_NET_DEPTH, GOAL_NET_HOLD_MS, MIN_SHOT_FLIGHT_MS, PENALTY_PLACE_PAUSE_MS, RESTART_PAUSE_MS, segmentArcFactor, type PitchPoint } from "./matchSpatial";
import type { MatchEvent } from "./matchSimulator";

describe("球路弧线系数", () => {
  it("短传贴地、长传高弧（按屏幕距离，近不起球）", () => {
    expect(segmentArcFactor("travel", 5)).toBe(0);
    expect(segmentArcFactor("travel", 14)).toBe(0);
    expect(segmentArcFactor("travel", 28)).toBeCloseTo(0.5, 5);
    expect(segmentArcFactor("travel", 42)).toBe(1);
  });

  it("射门近距离贴地、远射起弧线", () => {
    expect(segmentArcFactor("shot", 8)).toBe(0);
    expect(segmentArcFactor("goal", 19)).toBeCloseTo(0.25, 5);
    expect(segmentArcFactor("shot", 30)).toBeCloseTo(0.5, 5);
  });

  it("静止 / 开球等非飞行段不抬升", () => {
    expect(segmentArcFactor("idle", 80)).toBe(0);
  });
});

describe("无球跑位", () => {
  const positions = new Map<string, PitchPoint>([
    ["home_gk", { x: 50, y: 90 }],
    ["home_st", { x: 50, y: 14 }],
  ]);
  const homeIds = new Set(["home_gk", "home_st"]);
  const event: MatchEvent = {
    id: "evt-1",
    minute: 1,
    side: "home",
    kind: "build-up",
    commentary: "",
    homeScore: 0,
    awayScore: 0,
    playerId: "home_st",
  };

  it("同 Seed 同事件可复现", () => {
    const a = deriveEventFrame(event, positions, 42, { homeIds });
    const b = deriveEventFrame(event, positions, 42, { homeIds });
    expect(a.players.get("home_gk")).toEqual(b.players.get("home_gk"));
    expect(a.players.get("home_st")).toEqual(b.players.get("home_st"));
  });

  it("持球方无球球员离开固定站位、朝球接应", () => {
    const frame = deriveEventFrame(event, positions, 42, { homeIds });
    const gk = frame.players.get("home_gk")!;
    // 门将（非事件球员）不再钉死在 y=90 的站位上，被接应拉扯朝球（y 变小）。
    expect(gk.y).toBeLessThan(90);
    expect(gk.y).toBeGreaterThan(60);
    expect(gk.x).toBeGreaterThanOrEqual(2);
    expect(gk.x).toBeLessThanOrEqual(98);
  });
});

describe("进球后的重新开球", () => {
  const positions = new Map<string, PitchPoint>([
    ["home_st", { x: 50, y: 14 }],
    ["home_gk", { x: 50, y: 90 }],
  ]);
  const events: MatchEvent[] = [
    { id: "g1", minute: 1, side: "home", kind: "goal", commentary: "", homeScore: 1, awayScore: 0 },
    { id: "e2", minute: 2, side: "home", kind: "build-up", commentary: "", homeScore: 1, awayScore: 0, playerId: "home_st" },
  ];

  it("进球后下一事件瞬移回中圈，而不是贴地飞回", () => {
    const timeline = buildMatchTimeline(events, positions, 42);
    const restart = timeline[1];
    expect(restart.ballPath[0]).toMatchObject({ x: 50, y: 50, mode: "idle", teleport: true });
    expect(restart.ballPath[0].pauseMs).toBe(RESTART_PAUSE_MS);
    // 瞬移段有正时长（停顿），球在球门处停顿而非飞行。
    expect(restart.segmentDurations[0]).toBeGreaterThan(0);
  });
});

describe("射门贴近球门", () => {
  it("射手从深位被贴到球门前合理距离再射", () => {
    const positions = new Map<string, PitchPoint>([
      ["shooter", { x: 50, y: 49 }],
      ["keeper", { x: 50, y: 3 }],
    ]);
    const shot: MatchEvent = {
      id: "shot-1",
      minute: 10,
      side: "home",
      kind: "goal",
      commentary: "",
      homeScore: 1,
      awayScore: 0,
      shooterId: "shooter",
      keeperId: "keeper",
    };
    const frame = deriveEventFrame(shot, positions, 42, { homeIds: new Set(["shooter", "keeper"]) });
    const shooter = frame.players.get("shooter")!;
    expect(shooter.active).toBe("shooter");
    // 从 y=49 的深位被贴到 y∈[12,18) 的合理射门距离。
    expect(shooter.y).toBeGreaterThanOrEqual(12);
    expect(shooter.y).toBeLessThan(18);
  });

  it("进球时门将也朝来球扑出（不卧底）", () => {
    const positions = new Map<string, PitchPoint>([
      ["shooter", { x: 50, y: 20 }],
      ["keeper", { x: 50, y: 10 }],
    ]);
    const goal: MatchEvent = {
      id: "goal-2",
      minute: 10,
      side: "home",
      kind: "goal",
      commentary: "",
      homeScore: 1,
      awayScore: 0,
      shooterId: "shooter",
      keeperId: "keeper",
    };
    const frame = deriveEventFrame(goal, positions, 42, { homeIds: new Set(["shooter", "keeper"]) });
    const keeper = frame.players.get("keeper")!;
    expect(keeper.active).toBe("keeper");
    // 门将从 y=10 的站位朝球门（y=3）扑出，但没完全到位（球入网）。
    expect(keeper.y).toBeGreaterThan(3);
    expect(keeper.y).toBeLessThan(10);
  });

  it("进球、扑救与射偏分别落在网内、门将位置和门框外", () => {
    const positions = new Map<string, PitchPoint>([
      ["shooter", { x: 50, y: 20 }],
      ["keeper", { x: 50, y: 3 }],
    ]);
    const base = { minute: 22, side: "home" as const, commentary: "", homeScore: 0, awayScore: 0, shooterId: "shooter", keeperId: "keeper" };
    const goal = deriveEventFrame({ ...base, id: "target-goal", kind: "goal", homeScore: 1 }, positions, 42).ballPath.at(-1)!;
    const save = deriveEventFrame({ ...base, id: "target-save", kind: "save" }, positions, 42).ballPath.at(-1)!;
    const miss = deriveEventFrame({ ...base, id: "target-miss", kind: "miss" }, positions, 42).ballPath.at(-1)!;
    expect(goal.y).toBe(-GOAL_NET_DEPTH);
    expect(goal.teleport).toBe(true);
    expect(goal.pauseMs).toBe(GOAL_NET_HOLD_MS);
    expect(Math.abs(goal.x - 50)).toBeLessThan(9);
    expect(save.y).toBe(3);
    expect(Math.abs(save.x - 50)).toBeLessThan(9);
    expect(Math.abs(miss.x - 50)).toBeGreaterThan(9);
  });

  it("射门与进球段至少保留角色动作可读所需的飞行时长", () => {
    const positions = new Map<string, PitchPoint>([
      ["shooter", { x: 50, y: 20 }],
      ["keeper", { x: 50, y: 3 }],
    ]);
    const event: MatchEvent = { id: "slow-shot", minute: 22, side: "home", kind: "goal", commentary: "", homeScore: 1, awayScore: 0, shooterId: "shooter", keeperId: "keeper" };
    const entry = buildMatchTimeline([event], positions, 42)[0];
    const shotIndex = entry.ballPath.findIndex(({ mode }) => mode === "shot" || mode === "goal");
    expect(shotIndex).toBeGreaterThanOrEqual(0);
    expect(entry.segmentDurations[shotIndex]).toBeGreaterThanOrEqual(MIN_SHOT_FLIGHT_MS);
  });
});

describe("点球与加时", () => {
  it("点球前球瞬移到点球点（不沿地面滚到点球点）", () => {
    const positions = new Map<string, PitchPoint>([
      ["taker", { x: 50, y: 50 }],
      ["keeper", { x: 50, y: 3 }],
    ]);
    const penalty: MatchEvent = {
      id: "pen-1",
      minute: 120,
      side: "home",
      kind: "penalty-goal",
      commentary: "",
      homeScore: 1,
      awayScore: 1,
      takerId: "taker",
      keeperId: "keeper",
    };
    const frame = deriveEventFrame(penalty, positions, 42, { homeIds: new Set(["taker", "keeper"]) });
    expect(frame.ballPath[0]).toMatchObject({ x: 50, y: 12, mode: "travel", teleport: true });
    expect(frame.ballPath[0].pauseMs).toBe(PENALTY_PLACE_PAUSE_MS);
    expect(frame.ballPath.at(-1)).toMatchObject({ y: -GOAL_NET_DEPTH, mode: "goal", teleport: true, pauseMs: GOAL_NET_HOLD_MS });
  });
});
