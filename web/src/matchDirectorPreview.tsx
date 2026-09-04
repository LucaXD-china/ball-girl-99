import { FastForward, RotateCcw, Target } from "lucide-react";
import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { chibiKitFamilyForOpponent } from "./components/ChibiFigure";
import { deriveMatchPresentation, MatchStadiumHud } from "./components/MatchStadiumHud";
import { Portrait } from "./components/MatchPortrait";
import { StandsPitch } from "./components/StandsPitch";
import { playableCharacters } from "./data/gameData";
import { buildMatchTimeline, buildPlayerPositions } from "./data/matchSpatial";
import { recommendLineup, type MatchEvent } from "./data/matchSimulator";
import { generateOpponent, generateTournament, playerClub } from "./data/tournamentJourney";
import { TOURNAMENT_STARTER_CHARACTER_IDS } from "./data/tournamentSquad";
import { directorBeatFor, retimeDirectorTimeline } from "./matchDirectorPreviewModel";
import "./styles.css";
import "./sunny-club.css";
import "./matchDirectorPreview.css";

type PreviewMode = "original" | "directed";

const tournament = generateTournament(9917);
const fixture = tournament.fixtures.find(({ stage }) => stage === "final")!;
const registeredIdSet = new Set<string>(TOURNAMENT_STARTER_CHARACTER_IDS);
const homePlayers = playableCharacters.filter(({ character_id }) => registeredIdSet.has(character_id));
const homeAttackFormationId = "4-2-3-1" as const;
const homeDefenseFormationId = "4-4-2" as const;
const homeLineup = recommendLineup(homePlayers, homeAttackFormationId, homeDefenseFormationId);
const opponent = generateOpponent(fixture, 9917, [...TOURNAMENT_STARTER_CHARACTER_IDS], []);
const characters = [...homePlayers, ...opponent.characters];
const playerMap = new Map(characters.map((character) => [character.character_id, character]));
const playerName = (id: string) => playerMap.get(id)?.name ?? "球员";
const homeBuilderId = homeLineup.ldm!;
const homeCreatorId = homeLineup.cam!;
const homeScorerId = homeLineup.st!;
const awayDefenderId = opponent.lineup.lcb!;
const awayKeeperId = opponent.lineup.gk!;

const events: MatchEvent[] = [
  { id: "director-kickoff", minute: 0, side: "neutral", kind: "kickoff", commentary: "开场哨响！北港晴空从中圈组织进攻。", homeScore: 0, awayScore: 0 },
  { id: "director-build", minute: 66, side: "home", kind: "build-up", commentary: `${playerName(homeBuilderId)}从后场摆脱第一道压迫，进攻开始提速。`, homeScore: 0, awayScore: 0, playerId: homeBuilderId },
  { id: "director-duel", minute: 68, side: "home", kind: "duel", commentary: `${playerName(homeCreatorId)}在中路赢下对抗，把球送进危险区域。`, homeScore: 0, awayScore: 0, playerId: homeCreatorId },
  { id: "director-attack", minute: 70, side: "home", kind: "transition", commentary: `${playerName(homeScorerId)}斜插身后，北港晴空形成绝佳机会！`, homeScore: 0, awayScore: 0, playerId: homeScorerId },
  {
    id: "director-goal",
    minute: 72,
    side: "home",
    kind: "goal",
    commentary: `${playerName(homeCreatorId)}送出直塞，${playerName(homeScorerId)}冷静推射破门！北港晴空取得领先。`,
    homeScore: 1,
    awayScore: 0,
    playerId: homeScorerId,
    scorerId: homeScorerId,
    shooterId: homeScorerId,
    creatorId: homeCreatorId,
    assistId: homeCreatorId,
    defenderId: awayDefenderId,
    keeperId: awayKeeperId,
    xg: .41,
    sourceTags: ["creation", "finishing"],
  },
  { id: "director-aftermath", minute: 73, side: "away", kind: "kickoff", commentary: "全场欢呼仍未散去，对手回到中圈重新开球。", homeScore: 1, awayScore: 0 },
];

const positions = buildPlayerPositions({
  homeLineup,
  awayLineup: opponent.lineup,
  homeAttackFormationId,
  awayAttackFormationId: opponent.attackFormationId,
});
const originalTimeline = buildMatchTimeline(events, positions, 72027);
const directedTimeline = retimeDirectorTimeline(originalTimeline, {
  "director-kickoff": 760,
  "director-build": 820,
  "director-duel": 900,
  "director-attack": 1350,
  "director-goal": 2300,
  "director-aftermath": 2600,
});

function DirectorPreview() {
  const [mode, setMode] = useState<PreviewMode>("directed");
  const [playbackRate, setPlaybackRate] = useState<1 | 2>(1);
  const [runId, setRunId] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);
  const timeline = mode === "directed" ? directedTimeline : originalTimeline;
  const activeEvent = timeline[eventIndex]?.event ?? timeline[0]!.event;
  const presentation = deriveMatchPresentation(timeline.map(({ event }) => event), eventIndex);
  const reveal = presentation.reveal ?? timeline[0]!.event;
  const beat = directorBeatFor(activeEvent);
  const goalPlayer = reveal.kind === "goal" ? playerMap.get(reveal.scorerId ?? "") : null;

  const restart = useCallback(() => {
    setEventIndex(0);
    setRunId((id) => id + 1);
  }, []);

  const selectMode = useCallback((nextMode: PreviewMode) => {
    setMode(nextMode);
    setEventIndex(0);
    setRunId((id) => id + 1);
  }, []);

  return (
    <div className="schedule-screen phase-live director-preview" style={{ position: "fixed", inset: 0 }}>
      <header className="schedule-heading is-empty" />
      <main className="live-match-layout stadium-live-layout">
        <div className={`live-visual-stage match-pitch-stage match-preview-stage director-preview-stage beat-${mode === "directed" ? beat : "original"}`}>
          <StandsPitch
            key={`${mode}-${runId}`}
            timeline={timeline}
            eventIndex={eventIndex}
            playerMap={playerMap}
            homeLineup={homeLineup}
            awayLineup={opponent.lineup}
            homeAttackFormationId={homeAttackFormationId}
            awayAttackFormationId={opponent.attackFormationId}
            seed={72027}
            playbackRate={playbackRate}
            awayKitFamily={chibiKitFamilyForOpponent(opponent.blueprintId)}
            onEventIndexChange={setEventIndex}
            onMatchComplete={restart}
          />
          <MatchStadiumHud homeName="北港晴空" awayName={opponent.name} homeCrestUrl={playerClub.crestUrl} awayCrestUrl={opponent.crestUrl} reveal={reveal} visibleEvents={presentation.visibleEvents} />

          {goalPlayer ? <div className="skill-cut-in goal-cut-in penalty-cut-in" key={reveal.id}><Portrait player={goalPlayer} /><div><span><Target aria-hidden="true" />进球球员</span><h2>GOAL!</h2><strong>{goalPlayer.name}</strong><p>{reveal.commentary}</p></div></div> : null}

          <aside className="director-preview-controls" aria-label="导演节奏预览控制">
            <header><span>DIRECTOR TEST</span><strong>关键事件导演层</strong></header>
            <div role="group" aria-label="比较模式">
              <button type="button" className={mode === "original" ? "active" : undefined} aria-pressed={mode === "original"} onClick={() => selectMode("original")}>原节奏</button>
              <button type="button" className={mode === "directed" ? "active" : undefined} aria-pressed={mode === "directed"} onClick={() => selectMode("directed")}>导演节奏</button>
            </div>
            <div className="director-control-actions">
              <button type="button" className="director-speed" aria-label={`比赛回放速度：${playbackRate}倍`} aria-pressed={playbackRate === 2} onClick={() => setPlaybackRate(playbackRate === 1 ? 2 : 1)}><FastForward aria-hidden="true" />倍速 {playbackRate}×</button>
              <button type="button" className="director-replay" onClick={restart}><RotateCcw aria-hidden="true" />重新播放</button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<DirectorPreview />);
