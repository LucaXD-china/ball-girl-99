import type { MatchTimelineEntry } from "./data/matchSpatial";
import type { MatchEvent } from "./data/matchSimulator";

export type DirectorBeat = "flow" | "shot";

export function directorBeatFor(activeEvent: MatchEvent): DirectorBeat {
  if (activeEvent.kind === "goal") return "shot";
  return "flow";
}

export function retimeDirectorTimeline(
  timeline: MatchTimelineEntry[],
  durations: Readonly<Record<string, number>>,
): MatchTimelineEntry[] {
  let startMs = 0;
  return timeline.map((entry) => {
    const durationMs = durations[entry.event.id] ?? entry.durationMs;
    const segmentTotal = entry.segmentDurations.reduce((total, duration) => total + duration, 0);
    const scale = segmentTotal > 0 ? durationMs / segmentTotal : 1;
    const retimed = {
      ...entry,
      startMs,
      durationMs,
      segmentDurations: entry.segmentDurations.map((duration) => duration * scale),
    };
    startMs += durationMs;
    return retimed;
  });
}
