import { Shield } from "lucide-react";
import type { RefObject } from "react";
import type { MatchEvent } from "../data/matchSimulator";
import "./MatchStadiumHud.css";

export function deriveMatchPresentation(events: MatchEvent[], eventIndex: number): {
  reveal: MatchEvent | null;
  visibleEvents: MatchEvent[];
} {
  if (!events.length) return { reveal: null, visibleEvents: [] };
  const safeIndex = Math.min(Math.max(0, eventIndex), events.length - 1);
  const revealIndex = Math.max(0, safeIndex - 1);
  const source = events[revealIndex];
  let homeScore = events[0].homeScore;
  let awayScore = events[0].awayScore;
  let aggregateHomeScore = events[0].aggregateHomeScore;
  let aggregateAwayScore = events[0].aggregateAwayScore;
  let homePenaltyScore = events[0].homePenaltyScore;
  let awayPenaltyScore = events[0].awayPenaltyScore;
  for (let index = 1; index <= revealIndex; index += 1) {
    const event = events[index];
    if (event.kind === "goal") {
      if (event.side === "home") {
        homeScore += 1;
        if (typeof aggregateHomeScore === "number") aggregateHomeScore += 1;
      } else if (event.side === "away") {
        awayScore += 1;
        if (typeof aggregateAwayScore === "number") aggregateAwayScore += 1;
      }
    }
    if (typeof event.homePenaltyScore === "number") homePenaltyScore = event.homePenaltyScore;
    if (typeof event.awayPenaltyScore === "number") awayPenaltyScore = event.awayPenaltyScore;
  }
  const reveal: MatchEvent = {
    ...source,
    homeScore,
    awayScore,
    aggregateHomeScore,
    aggregateAwayScore,
    homePenaltyScore,
    awayPenaltyScore,
  };
  const visibleCount = safeIndex >= events.length - 1 ? events.length : Math.max(1, safeIndex);
  return { reveal, visibleEvents: events.slice(0, visibleCount) };
}

export function matchEventMark(event: MatchEvent): string {
  if (event.kind === "goal") return "GOAL";
  if (event.kind === "penalty-goal") return "PEN";
  if (event.kind === "penalty-save") return "SAVE";
  if (event.kind === "penalty-miss") return "MISS";
  if (event.kind === "extra-time-start") return "ET";
  if (event.kind === "extra-time-break") return "ET HT";
  if (event.kind === "extra-time-end") return "ET FT";
  if (event.kind === "penalty-start" || event.kind === "penalty-end") return "PEN";
  if (event.skillId) return "SKILL";
  if (event.kind === "save") return "SAVE";
  if (event.kind === "build-up") return "BUILD";
  if (event.kind === "duel") return "DUEL";
  if (event.kind === "transition") return "MOVE";
  if (event.kind === "halftime") return "HT";
  if (event.kind === "fulltime") return "FT";
  return "●";
}

const sourceTagLabels = {
  creation: "组织创造",
  finishing: "进攻终结",
  prevention: "防守干扰",
  goalkeeping: "门将化解",
} as const;

export type PenaltyAttempt = {
  id: string;
  round: number;
  scored: boolean;
};

export type PenaltyShootout = {
  home: { score: number; attempts: PenaltyAttempt[] };
  away: { score: number; attempts: PenaltyAttempt[] };
};

export function derivePenaltyShootout(visibleEvents: MatchEvent[]): PenaltyShootout | null {
  if (!visibleEvents.some((event) => event.kind === "penalty-start")) return null;
  const shootout: PenaltyShootout = {
    home: { score: 0, attempts: [] },
    away: { score: 0, attempts: [] },
  };
  for (const event of visibleEvents) {
    if (event.kind !== "penalty-goal" && event.kind !== "penalty-save" && event.kind !== "penalty-miss") continue;
    if (event.side !== "home" && event.side !== "away") continue;
    const attempt = { id: event.id, round: event.penaltyRound ?? shootout[event.side].attempts.length + 1, scored: event.kind === "penalty-goal" };
    shootout[event.side].attempts.push(attempt);
    if (attempt.scored) shootout[event.side].score += 1;
  }
  return shootout;
}

type Props = {
  homeName: string;
  awayName: string;
  homeCrestUrl: string;
  awayCrestUrl?: string;
  reveal: MatchEvent;
  visibleEvents: MatchEvent[];
  feedEndRef?: RefObject<HTMLDivElement | null>;
};

export function MatchStadiumHud({ homeName, awayName, homeCrestUrl, awayCrestUrl, reveal, visibleEvents, feedEndRef }: Props) {
  const recentEvents = visibleEvents.slice(-4);
  const currentId = recentEvents.at(-1)?.id;
  const minute = reveal.minuteLabel ?? (reveal.minute === 0 ? "开场" : `${reveal.minute}'`);
  const shootout = derivePenaltyShootout(visibleEvents);
  return (
    <>
      <section className="live-scoreboard stadium-hud-scoreboard" aria-label={`${minute}，${homeName} ${reveal.homeScore}比${reveal.awayScore} ${awayName}`}>
        <div className="scoreboard-club home">
          <img src={homeCrestUrl} alt={`${homeName}队徽`} />
          <span>主队</span>
          <strong>{homeName}</strong>
        </div>
        <div className="live-score">
          <small>{minute} · LIVE</small>
          <strong>{reveal.homeScore}<i>:</i>{reveal.awayScore}</strong>
          {typeof reveal.homePenaltyScore === "number"
            ? <em>点球 {reveal.homePenaltyScore}:{reveal.awayPenaltyScore}</em>
            : typeof reveal.aggregateHomeScore === "number"
              ? <em>总比分 {reveal.aggregateHomeScore}:{reveal.aggregateAwayScore}</em>
              : <em>CHAMPIONS LEAGUE</em>}
        </div>
        <div className="scoreboard-club away">
          {awayCrestUrl ? <img src={awayCrestUrl} alt={`${awayName}队徽`} /> : <Shield aria-hidden="true" />}
          <span>客队</span>
          <strong>{awayName}</strong>
        </div>
      </section>

      {shootout ? <section className="stadium-penalty-scoreboard" aria-live="polite" aria-label={`点球大战实时比分，${homeName} ${shootout.home.score}比${shootout.away.score} ${awayName}`}>
        <header><span>PENALTY SHOOTOUT</span><strong>{shootout.home.score}<i>:</i>{shootout.away.score}</strong></header>
        {(["home", "away"] as const).map((side) => {
          const name = side === "home" ? homeName : awayName;
          const row = shootout[side];
          return <div className={`penalty-score-row ${side}`} key={side}>
            <span title={name}>{name}</span>
            <strong>{row.score}</strong>
            <div className="penalty-attempts">
              {row.attempts.map((attempt, index) => <i
                key={attempt.id}
                className={attempt.scored ? "is-goal" : "is-failed"}
                role="img"
                aria-label={`${name}第 ${index + 1} 次点球${attempt.scored ? "命中" : "未进"}`}
                title={`第 ${attempt.round} 轮 · ${attempt.scored ? "命中" : "未进"}`}
              >{attempt.scored ? "✓" : "×"}</i>)}
            </div>
          </div>;
        })}
      </section> : null}

      <section className="match-feed-panel stadium-hud-feed" aria-label="比赛文字直播">
        <header><div><span className="live-dot" />比赛文字直播</div><small>LIVE</small></header>
        <div className="match-event-feed">
          {recentEvents.map((event) => (
            <article key={event.id} className={`${event.kind}${event.skillId ? " skill" : ""}${event.id === currentId ? " is-current" : ""}`}>
              <time>{event.minuteLabel ?? (event.minute === 0 ? "开场" : `${event.minute}'`)}</time>
              <span className="event-mark">{matchEventMark(event)}</span>
              <p>{event.commentary}{event.sourceTags?.length ? <small>{event.sourceTags.map((tag) => sourceTagLabels[tag]).join(" · ")}</small> : typeof event.xg === "number" ? <small>xG {event.xg.toFixed(2)}</small> : null}</p>
            </article>
          ))}
          <div ref={feedEndRef} />
        </div>
        <footer>赛果已即时记录</footer>
      </section>
    </>
  );
}
