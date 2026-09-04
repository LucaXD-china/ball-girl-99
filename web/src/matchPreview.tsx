import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { deriveMatchPresentation, MatchStadiumHud } from "./components/MatchStadiumHud";
import { StandsPitch } from "./components/StandsPitch";
import { chibiKitFamilyForOpponent } from "./components/ChibiFigure";
import { playableCharacters } from "./data/gameData";
import { buildMatchTimeline, buildPlayerPositions } from "./data/matchSpatial";
import { recommendLineup, simulateMatch } from "./data/matchSimulator";
import { generateOpponent, generateTournament, playerClub } from "./data/tournamentJourney";
import { TOURNAMENT_STARTER_CHARACTER_IDS } from "./data/tournamentSquad";
import "./styles.css";
import "./sunny-club.css";

const tournament = generateTournament(9917);
const fixture = tournament.fixtures.find(({ stage }) => stage === "final")!;
const registeredIds = [...TOURNAMENT_STARTER_CHARACTER_IDS];
const registeredIdSet = new Set<string>(registeredIds);
const homePlayers = playableCharacters.filter(({ character_id }) => registeredIdSet.has(character_id));
const homeLineup = recommendLineup(homePlayers, "4-2-3-1", "4-4-2");
const homeAttackFormationId = "4-2-3-1" as const;
const homeDefenseFormationId = "4-4-2" as const;
const opponent = generateOpponent(fixture, 9917, registeredIds, []);
const characters = [...homePlayers, ...opponent.characters];
const playerMap = new Map(characters.map((character) => [character.character_id, character]));
const result = simulateMatch({
  characters,
  homeLineup,
  homeAttackFormationId,
  homeDefenseFormationId,
  awayLineup: opponent.lineup,
  awayAttackFormationId: opponent.attackFormationId,
  awayDefenseFormationId: opponent.defenseFormationId,
  homeName: "北港晴空",
  awayName: opponent.name,
  fixtureSeed: 42,
});
const positions = buildPlayerPositions({
  homeLineup,
  awayLineup: opponent.lineup,
  homeAttackFormationId,
  awayAttackFormationId: opponent.attackFormationId,
});
const timeline = buildMatchTimeline(result.events, positions, result.seed);

function LivePreview() {
  const [runId, setRunId] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);
  // 单一时钟：eventIndex 由 StandsPitch 的球 rAF 回调驱动；跑完一轮后重挂载循环回放。
  const handleComplete = useCallback(() => {
    setEventIndex(0);
    setRunId((id) => id + 1);
  }, []);
  const presentation = deriveMatchPresentation(timeline.map(({ event }) => event), eventIndex);
  const reveal = presentation.reveal ?? timeline[0]!.event;
  return (
    <div className="schedule-screen phase-live" style={{ position: "fixed", inset: 0 }}>
      <header className="schedule-heading is-empty" />
      <main className="live-match-layout stadium-live-layout">
        <div className="live-visual-stage match-pitch-stage match-preview-stage">
          <StandsPitch
            key={runId}
            timeline={timeline}
            eventIndex={eventIndex}
            playerMap={playerMap}
            homeLineup={homeLineup}
            awayLineup={opponent.lineup}
            homeAttackFormationId={homeAttackFormationId}
            awayAttackFormationId={opponent.attackFormationId}
            seed={result.seed}
            awayKitFamily={chibiKitFamilyForOpponent(opponent.blueprintId)}
            onEventIndexChange={setEventIndex}
            onMatchComplete={handleComplete}
          />
          <MatchStadiumHud homeName={result.homeName} awayName={result.awayName} homeCrestUrl={playerClub.crestUrl} awayCrestUrl={opponent.crestUrl} reveal={reveal} visibleEvents={presentation.visibleEvents} />
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<LivePreview />);
