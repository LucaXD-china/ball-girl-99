import { useEffect, useMemo, useState } from "react";
import { NarrativeAutoPlayToggle, NarrativeText, useNarrativePlayback } from "../components/NarrativePlayback";
import { DAY1_STORY_ASSET_ID, day1StoryBeats } from "../data/day1Story";
import { paginateNarrativeText } from "../data/scriptPagination";
import { tournamentCaptainRoutes, type TournamentCaptainId } from "../data/tournamentCaptain";
import { resolveAsset } from "../services/assetResolver";

type Props = {
  initialBeat: number;
  nickname: string;
  onBeatChange: (beat: number) => void;
  onComplete: () => void;
  availableCaptainIds: TournamentCaptainId[];
  onCaptainSelect: (captainId: TournamentCaptainId) => void;
};

export function shouldOpenCaptainSelection(beat: number, beatCount: number, captainCount: number) {
  return captainCount > 1 && beat >= beatCount - 1;
}

export function Day1StoryPage({ initialBeat, nickname, onBeatChange, onComplete, availableCaptainIds, onCaptainSelect }: Props) {
  const [beat, setBeat] = useState(initialBeat);
  const [page, setPage] = useState(0);
  const [selectingCaptain, setSelectingCaptain] = useState(false);
  const beats = useMemo(() => day1StoryBeats(nickname, availableCaptainIds.length > 1), [availableCaptainIds.length, nickname]);
  const current = beats[Math.min(beat, beats.length - 1)];
  const pages = paginateNarrativeText(current.text);
  const currentPage = pages[Math.min(page, pages.length - 1)];
  const background = resolveAsset(DAY1_STORY_ASSET_ID, current.frame);
  const prefetchFrame = beats[beat + 1]?.frame;
  const prefetchBackground = prefetchFrame ? resolveAsset(DAY1_STORY_ASSET_ID, prefetchFrame) : null;
  const prefetchUrl = prefetchBackground?.status === "ready" ? prefetchBackground.url : null;

  useEffect(() => {
    if (!prefetchUrl) return;
    const image = new window.Image();
    image.src = prefetchUrl;
  }, [prefetchUrl]);

  function advance() {
    if (page < pages.length - 1) {
      setPage((currentPageIndex) => currentPageIndex + 1);
      return;
    }
    if (shouldOpenCaptainSelection(beat, beats.length, availableCaptainIds.length)) {
      setSelectingCaptain(true);
      return;
    }
    if (beat >= beats.length - 1) {
      onComplete();
      return;
    }
    const nextBeat = beat + 1;
    setPage(0);
    setBeat(nextBeat);
    onBeatChange(nextBeat);
  }

  const playback = useNarrativePlayback({ text: currentPage, sequenceKey: `${beat}:${page}`, onAdvance: advance, paused: selectingCaptain });

  function selectCaptain(captainId: TournamentCaptainId) {
    onCaptainSelect(captainId);
    setSelectingCaptain(false);
    onComplete();
  }

  return <main
    className={`prologue-screen day1-story-screen tone-${current.tone}`}
    data-day1-story-beat={beat}
    data-day1-story-frame={current.frame}
    data-narrative-page={page}
    data-narrative-page-count={pages.length}
    onClick={selectingCaptain ? undefined : playback.requestAdvance}
  >
    {background.status === "ready" ? <img key={current.frame} className="prologue-scene" src={background.url} alt="" aria-hidden="true" /> : null}
    <div className="day1-story-mark"><span>DAY 1</span><strong>冠军联赛重要吗？</strong></div>
    {!selectingCaptain ? <button className="prologue-skip" type="button" data-sfx="none" onClick={(event) => { event.stopPropagation(); if (availableCaptainIds.length > 1) setSelectingCaptain(true); else onComplete(); }}>跳过剧情</button> : null}
    {!selectingCaptain ? <NarrativeAutoPlayToggle playback={playback} /> : null}
    {selectingCaptain ? <section className="captain-selection" role="dialog" aria-modal="true" aria-labelledby="captain-selection-title" aria-describedby="captain-selection-description">
      <div className="captain-selection-copy">
        <small>CAPTAIN ROUTE</small>
        <h2 id="captain-selection-title">选择一位队长</h2>
        <p id="captain-selection-description">开启不同故事线</p>
      </div>
      <div className="captain-selection-grid">{availableCaptainIds.map((captainId) => {
        const route = tournamentCaptainRoutes[captainId];
        const portrait = resolveAsset(`character.founder.${route.characterId.replace("founder_", "")}`, "standee");
        return <button key={captainId} type="button" data-captain={captainId} data-sfx="team-select" onClick={() => selectCaptain(captainId)} aria-label={`选择${route.name}作为队长`}>
          {portrait.status === "ready" ? <img src={portrait.url} alt="" aria-hidden="true" /> : null}
          <span><strong>{route.name}</strong><small>难度：{route.difficultyLabel}</small></span>
        </button>;
      })}</div>
    </section> : <button className="prologue-dialogue" type="button" data-sfx="none" aria-label={page < pages.length - 1 ? "继续本页剧情" : beat >= beats.length - 1 ? "选择赛事队长" : "继续剧情"} onClick={(event) => { event.stopPropagation(); playback.requestAdvance(); }}>
      <NarrativeText playback={playback} />
    </button>}
  </main>;
}
