import { useEffect, useMemo, useRef, useState } from "react";
import type { Character } from "../data/gameData";
import { buildPlayerPositions, deriveEventFrame, type BallWaypoint, type MatchTimelineEntry } from "../data/matchSpatial";
import type { FormationId, Lineup } from "../data/matchSimulator";

type BallState = BallWaypoint & { transitionMs: number };

type Props = {
  timeline: MatchTimelineEntry[];
  eventIndex: number;
  playerMap: Map<string, Character>;
  homeLineup: Lineup;
  awayLineup: Lineup;
  homeAttackFormationId: FormationId;
  awayAttackFormationId: FormationId;
  seed: number;
};

export function MatchPitch({ timeline, eventIndex, playerMap, homeLineup, awayLineup, homeAttackFormationId, awayAttackFormationId, seed }: Props) {
  const positions = useMemo(
    () => buildPlayerPositions({ homeLineup, awayLineup, homeAttackFormationId, awayAttackFormationId }),
    [homeLineup, awayLineup, homeAttackFormationId, awayAttackFormationId],
  );
  const homeIds = useMemo(() => new Set(Object.values(homeLineup).filter((id): id is string => Boolean(id))), [homeLineup]);

  const currentEntry = timeline[eventIndex] ?? timeline[timeline.length - 1];
  const frame = useMemo(
    () => (currentEntry ? deriveEventFrame(currentEntry.event, positions, seed, { kicker: currentEntry.kickoff, homeIds }) : null),
    [currentEntry, positions, seed, homeIds],
  );

  const [ball, setBall] = useState<BallState>({ x: 50, y: 50, mode: "idle", transitionMs: 320 });
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    let cumulative = 0;
    let first = true;
    for (const entry of timeline) {
      entry.ballPath.forEach((waypoint, index) => {
        const flightMs = entry.segmentDurations[index];
        cumulative += flightMs;
        const target: BallState = { ...waypoint, transitionMs: flightMs };
        if (first) {
          setBall(target);
          first = false;
        } else {
          timersRef.current.push(window.setTimeout(() => setBall(target), cumulative));
        }
      });
    }
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, [timeline]);

  return (
    <div className="match-pitch" role="img" aria-label="比赛实时球场">
      <div className="match-pitch-markings" aria-hidden="true">
        <span className="mp-center-circle" />
        <i className="mp-penalty-area top" />
        <i className="mp-penalty-area bottom" />
        <b className="mp-direction" aria-hidden="true">↑</b>
      </div>
      <i className="mp-goal-mouth top" aria-hidden="true" />
      <i className="mp-goal-mouth bottom" aria-hidden="true" />
      {frame ? [...frame.players.entries()].map(([playerId, state]) => {
        const player = playerMap.get(playerId);
        const isHome = homeIds.has(playerId);
        return (
          <span
            key={playerId}
            className={`match-pitch-player ${isHome ? "home" : "away"}${state.active ? ` is-active-${state.active}` : ""}`}
            style={{ left: `${state.x}%`, top: `${state.y}%` }}
            title={player?.name}
            aria-hidden="true"
          >
            <b>{player?.name.slice(0, 1) ?? "?"}</b>
          </span>
        );
      }) : null}
      <span
        className={`match-pitch-ball is-${ball.mode}`}
        style={{ left: `${ball.x}%`, top: `${ball.y}%`, transitionDuration: `${ball.transitionMs}ms` }}
        aria-hidden="true"
      />
    </div>
  );
}
