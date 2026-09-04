import { ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { NarrativeAutoPlayToggle, NarrativeText, useNarrativePlayback } from "../components/NarrativePlayback";
import {
  end01BeatsFor,
  end02BeatsFor,
  end03Beats,
  end04Beats,
  end05Beats,
  TOURNAMENT_ENDING_ASSET_ID,
  tournamentEndingMeta,
  type EndingBeat,
  type TournamentEndingId,
} from "../data/tournamentEnding";
import type { TournamentCaptainId } from "../data/tournamentCaptain";
import { resolveAsset } from "../services/assetResolver";

type Props = {
  endingId: TournamentEndingId;
  managerNickname: string;
  clubName: string;
  captainId: TournamentCaptainId;
  onBackToOffice: () => void;
  onRestart: () => void;
};

export function nextEndingBeatIndex(current: number, beatCount: number) {
  return current < beatCount - 1 ? current + 1 : null;
}

function EndingActions({ onBackToOffice, onRestart }: Pick<Props, "onBackToOffice" | "onRestart">) {
  return <div className="ending-actions">
    <button type="button" onClick={onBackToOffice}><ArrowLeft aria-hidden="true" />返回办公室</button>
    <button type="button" data-sfx="confirm" onClick={onRestart}><RotateCcw aria-hidden="true" />重新开始整届赛事</button>
  </div>;
}

function EndingStoryPage({ endingId, beats, onBackToOffice, onRestart }: Pick<Props, "endingId" | "onBackToOffice" | "onRestart"> & { beats: EndingBeat[] }) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const beat = beats[Math.min(beatIndex, beats.length - 1)];
  const background = resolveAsset(beat.assetId ?? TOURNAMENT_ENDING_ASSET_ID, beat.frame);
  const nextBeat = beats[beatIndex + 1];
  const nextBackground = nextBeat ? resolveAsset(nextBeat.assetId ?? TOURNAMENT_ENDING_ASSET_ID, nextBeat.frame) : null;
  const nextUrl = nextBackground?.status === "ready" ? nextBackground.url : null;

  useEffect(() => {
    if (!nextUrl) return;
    const image = new window.Image();
    image.src = nextUrl;
  }, [nextUrl]);

  function advance() {
    const nextIndex = nextEndingBeatIndex(beatIndex, beats.length);
    if (nextIndex === null) setComplete(true);
    else setBeatIndex(nextIndex);
  }

  const playback = useNarrativePlayback({ text: beat.text, sequenceKey: `${endingId}:${beatIndex}`, onAdvance: advance, paused: complete });

  return <main className={`ending-screen${complete ? " is-complete" : ""}`} data-ending-id={endingId} data-ending-beat={beatIndex} data-ending-frame={beat.frame} onClick={complete ? undefined : playback.requestAdvance}>
    {background.status === "ready" ? <img key={beat.frame} className="ending-scene" src={background.url} alt="" aria-hidden="true" /> : null}
    {complete ? <section className="ending-complete-card">
      <small>{endingId}</small>
      <h1>{tournamentEndingMeta[endingId].title}</h1>
      <p>The End.</p>
      <EndingActions onBackToOffice={onBackToOffice} onRestart={onRestart} />
    </section> : <>
      <button className="ending-skip" type="button" onClick={(event) => { event.stopPropagation(); setComplete(true); }}>跳过剧情</button>
      <NarrativeAutoPlayToggle playback={playback} />
      <button className="ending-dialogue" type="button" aria-label="继续结局剧情" onClick={(event) => { event.stopPropagation(); playback.requestAdvance(); }}>
        <NarrativeText playback={playback} />
      </button>
    </>}
  </main>;
}

export function TournamentEndingPage({ endingId, managerNickname, clubName, captainId, onBackToOffice, onRestart }: Props) {
  if (endingId === "END-01") return <EndingStoryPage endingId={endingId} beats={end01BeatsFor(captainId)} onBackToOffice={onBackToOffice} onRestart={onRestart} />;
  if (endingId === "END-02") return <EndingStoryPage endingId={endingId} beats={end02BeatsFor(captainId, clubName)} onBackToOffice={onBackToOffice} onRestart={onRestart} />;
  if (endingId === "END-03") return <EndingStoryPage endingId={endingId} beats={end03Beats(managerNickname, clubName)} onBackToOffice={onBackToOffice} onRestart={onRestart} />;
  if (endingId === "END-04") return <EndingStoryPage endingId={endingId} beats={end04Beats(clubName)} onBackToOffice={onBackToOffice} onRestart={onRestart} />;
  return <EndingStoryPage endingId={endingId} beats={end05Beats(clubName)} onBackToOffice={onBackToOffice} onRestart={onRestart} />;
}
