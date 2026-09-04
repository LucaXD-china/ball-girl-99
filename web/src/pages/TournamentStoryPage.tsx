import { useEffect, useState } from "react";
import { NarrativeAutoPlayToggle, NarrativeText, useNarrativePlayback } from "../components/NarrativePlayback";
import { founderStories, founderStoryText, FOUNDER_STORY_ASSET_ID } from "../data/founderStories";
import { opponentStories, opponentStoryText, OPPONENT_STORY_ASSET_ID } from "../data/opponentStories";
import { paginateNarrativeText } from "../data/scriptPagination";
import type { TournamentStoryId } from "../data/tournamentStories";
import { resolveAsset } from "../services/assetResolver";

export function TournamentStoryPage({ storyId, nickname, clubName, onComplete }: { storyId: TournamentStoryId; nickname: string; clubName: string; onComplete: () => void }) {
  const founder = founderStories[storyId as keyof typeof founderStories];
  const opponent = Object.values(opponentStories).find(({ id }) => id === storyId);
  const story = founder ?? opponent;
  const [beatIndex, setBeatIndex] = useState(0);
  const [page, setPage] = useState(0);
  if (!story) return null;
  const beat = story.beats[beatIndex];
  const text = founder ? founderStoryText(beat.text, clubName) : opponentStoryText(beat.text, nickname);
  const pages = paginateNarrativeText(text);
  const currentPage = pages[Math.min(page, pages.length - 1)];
  const assetId = founder ? FOUNDER_STORY_ASSET_ID : OPPONENT_STORY_ASSET_ID;
  const background = resolveAsset(assetId, beat.frame);
  const isLast = beatIndex === story.beats.length - 1 && page === pages.length - 1;
  const advance = () => {
    if (page < pages.length - 1) setPage((index) => index + 1);
    else if (beatIndex === story.beats.length - 1) onComplete();
    else { setPage(0); setBeatIndex((index) => index + 1); }
  };
  const playback = useNarrativePlayback({ text: currentPage, sequenceKey: `${story.id}:${beatIndex}:${page}`, onAdvance: advance });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); playback.requestAdvance(); } };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [playback.requestAdvance]);
  return <main className="prologue-screen story-replay-screen tone-analysis" data-tournament-story={storyId} data-opponent-story={opponent?.opponentId} data-story-beat={beatIndex} data-narrative-page={page} data-narrative-page-count={pages.length} onClick={playback.requestAdvance}>
    {background.status === "ready" ? <img key={beat.frame} className="prologue-scene" src={background.url} alt="" aria-hidden="true" /> : null}
    <div className="story-replay-mark"><span>{founder ? `主线 · DAY ${founder.day}` : "对手档案"}</span><strong>{story.title}</strong></div>
    <button className="prologue-skip" type="button" data-sfx="none" onClick={(event) => { event.stopPropagation(); onComplete(); }}>跳过剧情</button>
    <NarrativeAutoPlayToggle playback={playback} />
    <button className="prologue-dialogue" type="button" data-sfx="none" aria-label={isLast ? "结束剧情" : "继续剧情"} onClick={(event) => { event.stopPropagation(); playback.requestAdvance(); }}><NarrativeText playback={playback} /></button>
  </main>;
}
