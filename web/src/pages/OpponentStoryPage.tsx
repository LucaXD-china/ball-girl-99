import { useState } from "react";
import { NarrativeAutoPlayToggle, NarrativeText, useNarrativePlayback } from "../components/NarrativePlayback";
import { opponentStories, opponentStoryText, OPPONENT_STORY_ASSET_ID, type OpponentStoryId } from "../data/opponentStories";
import { paginateNarrativeText } from "../data/scriptPagination";
import { resolveAsset } from "../services/assetResolver";

export function OpponentStoryPage({ storyId, nickname, onComplete }: { storyId: OpponentStoryId; nickname: string; onComplete: () => void }) {
  const story = Object.values(opponentStories).find(({ id }) => id === storyId);
  const [beatIndex, setBeatIndex] = useState(0);
  const [page, setPage] = useState(0);
  if (!story) return null;
  const beat = story.beats[beatIndex];
  const pages = paginateNarrativeText(opponentStoryText(beat.text, nickname));
  const currentPage = pages[Math.min(page, pages.length - 1)];
  const background = resolveAsset(OPPONENT_STORY_ASSET_ID, beat.frame);
  const isLast = beatIndex === story.beats.length - 1 && page === pages.length - 1;
  function advance() {
    if (page < pages.length - 1) setPage((index) => index + 1);
    else if (isLast) onComplete();
    else { setPage(0); setBeatIndex((index) => index + 1); }
  }
  const playback = useNarrativePlayback({ text: currentPage, sequenceKey: `${story.id}:${beatIndex}:${page}`, onAdvance: advance });
  return <main className="prologue-screen story-replay-screen tone-analysis" data-opponent-story={story.opponentId} data-story-beat={beatIndex} data-narrative-page={page} data-narrative-page-count={pages.length} onClick={playback.requestAdvance}>
    {background.status === "ready" ? <img key={beat.frame} className="prologue-scene" src={background.url} alt="" aria-hidden="true" /> : null}
    <div className="story-replay-mark"><span>对手档案</span><strong>{story.title}</strong></div>
    <button className="prologue-skip" type="button" data-sfx="none" onClick={(event) => { event.stopPropagation(); onComplete(); }}>跳过剧情</button>
    <NarrativeAutoPlayToggle playback={playback} />
    <button className="prologue-dialogue" type="button" data-sfx="none" aria-label={isLast ? "结束赛前剧情" : "继续赛前剧情"} onClick={(event) => { event.stopPropagation(); playback.requestAdvance(); }}><NarrativeText playback={playback} /></button>
  </main>;
}
