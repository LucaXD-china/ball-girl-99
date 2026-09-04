import { describe, expect, it } from "vitest";
import type { MatchTimelineEntry } from "./data/matchSpatial";
import type { MatchEvent } from "./data/matchSimulator";
import { directorBeatFor, retimeDirectorTimeline } from "./matchDirectorPreviewModel";

const event = (id: string, kind: MatchEvent["kind"]): MatchEvent => ({
  id,
  kind,
  minute: 1,
  side: "home",
  commentary: id,
  homeScore: kind === "goal" ? 1 : 0,
  awayScore: 0,
});

describe("match director preview model", () => {
  it("adds a director beat only to the shot action", () => {
    expect(directorBeatFor(event("director-goal", "goal"))).toBe("shot");
    expect(directorBeatFor(event("director-build", "build-up"))).toBe("flow");
    expect(directorBeatFor(event("director-aftermath", "kickoff"))).toBe("flow");
  });

  it("retimes entries and their ball segments without changing event order", () => {
    const timeline: MatchTimelineEntry[] = [
      { event: event("flow", "build-up"), startMs: 0, durationMs: 1200, ballPath: [], segmentDurations: [400, 800] },
      { event: event("goal", "goal"), startMs: 1200, durationMs: 1200, ballPath: [], segmentDurations: [300, 300, 600] },
    ];
    const retimed = retimeDirectorTimeline(timeline, { flow: 800, goal: 2400 });
    expect(retimed.map(({ event: item, startMs, durationMs }) => [item.id, startMs, durationMs])).toEqual([
      ["flow", 0, 800],
      ["goal", 800, 2400],
    ]);
    expect(retimed[0].segmentDurations.reduce((sum, duration) => sum + duration, 0)).toBeCloseTo(800);
    expect(retimed[1].segmentDurations.reduce((sum, duration) => sum + duration, 0)).toBeCloseTo(2400);
  });
});
