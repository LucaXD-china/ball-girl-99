import { ArrowLeft, Film, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NarrativeAutoPlayToggle, NarrativeText, useNarrativePlayback } from "../components/NarrativePlayback";
import { DAY1_STORY_ASSET_ID, day1StoryBeats, type Day1StoryBeat } from "../data/day1Story";
import { PROLOGUE_ASSET_ID, prologueBeats, type PrologueBeat } from "../data/openingScript";
import {
  end01BeatsFor,
  end02BeatsFor,
  end03Beats,
  end04Beats,
  end05Beats,
  TOURNAMENT_ENDING_ASSET_ID,
  TOURNAMENT_ENDING_V2_ASSET_ID,
  tournamentEndingMeta,
  type EndingBeat,
} from "../data/tournamentEnding";
import { tournamentCaptainRoutes, type TournamentCaptainId } from "../data/tournamentCaptain";
import { resolveAsset } from "../services/assetResolver";
import { opponentStories, opponentStoryText, OPPONENT_STORY_ASSET_ID, type StoryOpponentId } from "../data/opponentStories";
import { generateOpponent, hashSeed, type GeneratedOpponent } from "../data/tournamentJourney";
import { founderStories, founderStoryText, FOUNDER_STORY_ASSET_ID } from "../data/founderStories";
import { paginateNarrativeText } from "../data/scriptPagination";
import { OpponentScoutReport } from "../components/OpponentScoutReport";
import { TimelineTitleCard } from "../components/TimelineTitleCard";
import type { StoryArchiveId, StoryArchiveState } from "../storage/storyArchiveStorage";

type Props = {
  archive: StoryArchiveState;
  nickname: string;
  clubName: string;
  onBackToOffice: () => void;
  onStoryPresentationChange?: (open: boolean) => void;
};

type PlayableStory = {
  id: StoryArchiveId;
  category: "序章记忆" | "主线剧情" | "对手档案" | "生涯结局";
  order: number;
  eyebrow: string;
  title: string;
  summary: string;
  unlockHint: string;
  thumbnailAssetId: string;
  thumbnailFrame: string;
  presentation: "prologue" | "day1" | "founder" | "opponent" | "ending";
  pending?: boolean;
  beats: Array<PrologueBeat | Day1StoryBeat | EndingBeat | { assetId: string; frame: string; text: string }>;
  timelineDay?: number;
  timelineLabel?: string;
};

export function buildStoryArchiveScoutOpponent(opponentId: StoryOpponentId): GeneratedOpponent {
  return generateOpponent(
    { id: `story-archive-${opponentId}`, stage: "semi_final", leg: 1, day: 72, opponentBlueprintId: opponentId },
    hashSeed(`story-archive-scout|${opponentId}`),
    [],
    [],
  );
}

function playableStories(nickname: string, clubName: string, captainSelectionUnlocked: boolean): PlayableStory[] {
  const opening = prologueBeats(nickname, clubName);
  return [
    {
      id: "PROLOGUE-01",
      category: "序章记忆",
      order: 1,
      eyebrow: "序章 · 第一章",
      title: "晴朗的下午",
      summary: "回到最初喜欢上足球的那一天。",
      unlockHint: "完成序章后收录",
      thumbnailAssetId: PROLOGUE_ASSET_ID,
      thumbnailFrame: "p1-04-ball-arc",
      presentation: "prologue",
      beats: opening.filter(({ chapter }) => chapter === 1),
    },
    {
      id: "PROLOGUE-02",
      category: "序章记忆",
      order: 2,
      eyebrow: "序章 · 第二章",
      title: "跑起来",
      summary: "一段并不顺利，却从未敷衍的球员生涯。",
      unlockHint: "完成序章后收录",
      thumbnailAssetId: PROLOGUE_ASSET_ID,
      thumbnailFrame: "p2-07-coach-run-command",
      presentation: "prologue",
      beats: opening.filter(({ chapter }) => chapter === 2),
    },
    {
      id: "PROLOGUE-03",
      category: "序章记忆",
      order: 3,
      eyebrow: "序章 · 第三章",
      title: "新的位置",
      summary: "从病床、录像室，一路走进经理办公室。",
      unlockHint: "完成序章后收录",
      thumbnailAssetId: PROLOGUE_ASSET_ID,
      thumbnailFrame: "p3-06-bob-handover",
      presentation: "prologue",
      beats: opening.filter(({ chapter }) => chapter === 3),
    },
    ...Object.values(opponentStories).map((story, index) => ({
      id: story.id,
      category: "对手档案" as const,
      order: 4 + index,
      eyebrow: "杯赛征程 · 对手档案",
      title: story.title,
      summary: story.summary,
      unlockHint: "在淘汰赛后程遭遇该队时收录",
      thumbnailAssetId: OPPONENT_STORY_ASSET_ID,
      thumbnailFrame: story.thumbnailFrame,
      presentation: "opponent" as const,
      beats: story.beats.map((beat) => ({ assetId: OPPONENT_STORY_ASSET_ID, frame: beat.frame, text: opponentStoryText(beat.text, nickname) })),
    })),
    {
      id: "DAY1-01",
      category: "主线剧情" as const,
      order: 4,
      eyebrow: "主线 · DAY 1",
      title: "冠军联赛重要吗？",
      summary: "重新拿回球队管理权，并在99天的征程开始前完成关键补强。",
      unlockHint: "完成 Day1 剧情后收录",
      thumbnailAssetId: DAY1_STORY_ASSET_ID,
      thumbnailFrame: "d1-09-champions-league-return",
      presentation: "day1" as const,
      beats: day1StoryBeats(nickname, captainSelectionUnlocked),
    },
    ...Object.values(founderStories).map((founder, index) => ({
      id: founder.id,
      category: "主线剧情" as const,
      order: 5 + index,
      eyebrow: `主线 · DAY ${founder.day}`,
      title: founder.title,
      summary: founder.summary,
      unlockHint: `推进至 Day ${founder.day} 后收录`,
      thumbnailAssetId: FOUNDER_STORY_ASSET_ID,
      thumbnailFrame: founder.thumbnailFrame,
      presentation: "founder" as const,
      beats: founder.beats.map((beat) => ({ assetId: FOUNDER_STORY_ASSET_ID, frame: beat.frame, text: founderStoryText(beat.text, clubName) })),
      timelineDay: founder.day,
      timelineLabel: founder.title,
    })),
    {
      id: "END-01",
      category: "生涯结局" as const,
      order: 8,
      eyebrow: "生涯结局 · END-01",
      title: tournamentEndingMeta["END-01"].title,
      summary: "离开一线队以后，在安静的地方继续做热爱的足球工作。",
      unlockHint: "完成一届冠军联赛征程，见证属于你的生涯结局",
      thumbnailAssetId: TOURNAMENT_ENDING_ASSET_ID,
      thumbnailFrame: "end01-04-academy",
      presentation: "ending" as const,
      beats: end01BeatsFor("saya"),
    },
    {
      id: "END-02",
      category: "生涯结局" as const,
      order: 9,
      eyebrow: "生涯结局 · END-02",
      title: tournamentEndingMeta["END-02"].title,
      summary: "当熟悉的伤病再次降临，把曾经收到的善意传下去。",
      unlockHint: "带领球队闯入杯赛后程，争取留下继续执教",
      thumbnailAssetId: TOURNAMENT_ENDING_ASSET_ID,
      thumbnailFrame: "end02-05-saya-coach",
      presentation: "ending" as const,
      beats: end02BeatsFor("saya", clubName),
    },
    {
      id: "END-03",
      category: "生涯结局" as const,
      order: 10,
      eyebrow: "生涯结局 · END-03",
      title: tournamentEndingMeta["END-03"].title,
      summary: "从第一座奖杯到五连冠，与纱夜一同写下俱乐部王朝。",
      unlockHint: "赢得99日冠军联赛，见证最终结局",
      thumbnailAssetId: TOURNAMENT_ENDING_ASSET_ID,
      thumbnailFrame: "end03-03-five-title-celebration",
      presentation: "ending" as const,
      beats: end03Beats(nickname, clubName),
    },
    {
      id: "END-04",
      category: "生涯结局" as const,
      order: 11,
      eyebrow: "生涯结局 · END-04",
      title: tournamentEndingMeta["END-04"].title,
      summary: `纱夜与娜雅成为${clubName}的双子星，把最好的年华留在这里。`,
      unlockHint: "以娜雅为队长赢得冠军联赛",
      thumbnailAssetId: TOURNAMENT_ENDING_V2_ASSET_ID,
      thumbnailFrame: "end04-01-twin-stars",
      presentation: "ending" as const,
      beats: end04Beats(clubName),
    },
    {
      id: "END-05",
      category: "生涯结局" as const,
      order: 12,
      eyebrow: "生涯结局 · END-05",
      title: tournamentEndingMeta["END-05"].title,
      summary: "那支红衣球队完成唯一一次登顶，见证伊蕾娜传奇的诞生。",
      unlockHint: "以伊蕾娜为队长赢得冠军联赛",
      thumbnailAssetId: TOURNAMENT_ENDING_V2_ASSET_ID,
      thumbnailFrame: "end05-05-documentary",
      presentation: "ending" as const,
      beats: end05Beats(clubName),
    },
  ];
}

function StoryArchiveRail({ label, children }: { label: string; children: ReactNode }) {
  const drag = useRef({ pointerId: -1, startX: 0, startY: 0, startScrollLeft: 0, startScrollTop: 0, scrollRoot: null as HTMLElement | null, moved: false });
  const [dragging, setDragging] = useState(false);

  return <div
    className={`story-archive-rail${dragging ? " dragging" : ""}`}
    role="region"
    aria-label={`${label}，按住并上下左右拖动浏览`}
    onPointerDown={(event) => {
      if (event.button !== 0) return;
      const scrollRoot = event.currentTarget.closest<HTMLElement>(".story-archive-screen");
      drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startScrollLeft: event.currentTarget.scrollLeft, startScrollTop: scrollRoot?.scrollTop ?? 0, scrollRoot, moved: false };
    }}
    onPointerMove={(event) => {
      if (drag.current.pointerId !== event.pointerId) return;
      const distanceX = event.clientX - drag.current.startX;
      const distanceY = event.clientY - drag.current.startY;
      if (!drag.current.moved && Math.max(Math.abs(distanceX), Math.abs(distanceY)) > 8) {
        drag.current.moved = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }
      if (!drag.current.moved) return;
      event.preventDefault();
      event.currentTarget.scrollLeft = drag.current.startScrollLeft - distanceX;
      if (drag.current.scrollRoot) drag.current.scrollRoot.scrollTop = drag.current.startScrollTop - distanceY;
    }}
    onPointerUp={(event) => {
      if (drag.current.pointerId !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      drag.current.pointerId = -1;
      setDragging(false);
    }}
    onPointerCancel={(event) => {
      if (drag.current.pointerId !== event.pointerId) return;
      drag.current.pointerId = -1;
      drag.current.moved = false;
      setDragging(false);
    }}
    onClickCapture={(event) => {
      if (!drag.current.moved) return;
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }}
  >{children}</div>;
}

function StoryTimelineCard({ story, unlocked, onActivate }: { story: PlayableStory; unlocked: boolean; onActivate: () => void }) {
  const background = resolveAsset(story.thumbnailAssetId, story.thumbnailFrame);
  const playable = unlocked && story.beats.length > 0;
  const orderLabel = story.presentation === "prologue" ? String(story.order).padStart(2, "0")
      : story.presentation === "day1" ? "D1"
      : story.presentation === "founder" ? `D${story.timelineDay}`
        : story.id.replace("END-", "E");

  if (story.pending) return <button type="button" data-story-order={story.id} className="story-archive-card unlocked pending" disabled aria-label={`${story.title}，剧情制作中`}>
    {background.status === "ready" ? <img className="story-archive-card-background" src={background.url} alt="" aria-hidden="true" /> : null}
    <span className="story-archive-order" aria-hidden="true">{orderLabel}</span>
    <span className="story-archive-copy"><small>{story.eyebrow}</small><strong>{story.title}</strong><p>{story.summary}</p><em>剧情制作中</em></span>
  </button>;

  if (!unlocked) return <button type="button" data-story-order={story.id} className="story-archive-card locked" disabled aria-label="未解锁剧情"><span className="story-archive-locked-label">未解锁剧情</span></button>;

  return <button type="button" data-story-order={story.id} className={`story-archive-card unlocked${!playable ? " pending" : ""}`} disabled={!playable} onClick={onActivate} aria-label={`${story.title}，${playable ? "可回看" : "制作中"}`}>
    {background.status === "ready" ? <img className="story-archive-card-background" src={background.url} alt="" aria-hidden="true" /> : null}
    <span className="story-archive-order" aria-hidden="true">{orderLabel}</span>
    <span className="story-archive-copy"><small>{story.eyebrow}</small><strong>{story.title}</strong><p>{story.summary}</p>{!playable ? <em>剧情制作中</em> : null}</span>
    <i className="story-archive-card-action"><Play aria-hidden="true" /></i>
  </button>;
}

function StoryReplay({ story, onExit }: { story: PlayableStory; onExit: () => void }) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [showScoutReport, setShowScoutReport] = useState(false);
  const [showTitleCard, setShowTitleCard] = useState(Boolean(story.timelineDay));
  const scoutOpponent = useMemo<GeneratedOpponent | null>(() => {
    if (story.presentation !== "opponent") return null;
    const opponentId = story.id.replace("OPPONENT-", "");
    if (!(opponentId in opponentStories)) return null;
    return buildStoryArchiveScoutOpponent(opponentId as StoryOpponentId);
  }, [story]);
  const beat = story.beats[Math.min(beatIndex, story.beats.length - 1)];
  const pages = paginateNarrativeText(beat.text);
  const currentPage = pages[Math.min(page, pages.length - 1)];
  const tone = "tone" in beat ? beat.tone : undefined;
  const beatAssetId = "assetId" in beat ? beat.assetId : undefined;
  const background = resolveAsset(beatAssetId ?? story.thumbnailAssetId, beat.frame);
  const isLast = beatIndex >= story.beats.length - 1 && page >= pages.length - 1;

  function advance() {
    if (page < pages.length - 1) setPage((index) => index + 1);
    else if (isLast) {
      if (scoutOpponent) setShowScoutReport(true);
      else onExit();
    }
    else { setPage(0); setBeatIndex((current) => current + 1); }
  }

  const playback = useNarrativePlayback({
    text: currentPage,
    sequenceKey: `${story.id}:${beatIndex}:${page}`,
    onAdvance: advance,
    paused: showTitleCard || showScoutReport,
  });

  useEffect(() => {
    if (showTitleCard) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      playback.requestAdvance();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playback.requestAdvance, showTitleCard]);

  const screenClass = story.presentation !== "ending"
    ? `prologue-screen story-replay-screen tone-${tone ?? "analysis"}`
    : "ending-screen story-replay-screen";
  const sceneClass = story.presentation !== "ending" ? "prologue-scene" : "ending-scene";
  const dialogueClass = story.presentation !== "ending" ? "prologue-dialogue" : "ending-dialogue";

  if (showTitleCard && story.timelineDay) return <TimelineTitleCard day={story.timelineDay} label={story.timelineLabel ?? story.title} onComplete={() => setShowTitleCard(false)} />;

  return <main className={screenClass} data-story-replay={story.id} data-story-beat={beatIndex} data-narrative-page={page} data-narrative-page-count={pages.length} onClick={playback.requestAdvance}>
    {background.status === "ready" ? <img key={beat.frame} className={sceneClass} src={background.url} alt="" aria-hidden="true" /> : null}
    <button className="story-replay-exit" type="button" data-sfx="none" onClick={(event) => { event.stopPropagation(); onExit(); }}><ArrowLeft aria-hidden="true" />退出回看</button>
    <div className="story-replay-mark"><span>{story.eyebrow}</span><strong>{story.title}</strong></div>
    {!showScoutReport ? <NarrativeAutoPlayToggle playback={playback} /> : null}
    <button className={dialogueClass} type="button" data-sfx="none" aria-label={isLast ? "结束回看" : "继续剧情"} onClick={(event) => { event.stopPropagation(); playback.requestAdvance(); }}>
      <NarrativeText playback={playback} />
    </button>
    {showScoutReport && scoutOpponent ? <OpponentScoutReport opponent={scoutOpponent} fixtureLabel="对手档案回看" showPlayers={false} onClose={onExit} /> : null}
  </main>;
}

export function StoryArchivePage({ archive, nickname, clubName, onBackToOffice, onStoryPresentationChange }: Props) {
  const [selectedId, setSelectedId] = useState<StoryArchiveId | null>(null);
  const [selectedEndingCaptain, setSelectedEndingCaptain] = useState<TournamentCaptainId>("saya");
  const [variantPickerId, setVariantPickerId] = useState<"END-01" | "END-02" | null>(null);
  const stories = useMemo(
    () => playableStories(nickname, clubName, Boolean(archive.unlockedAt["END-03"])).sort((a, b) => a.order - b.order),
    [archive.unlockedAt, clubName, nickname],
  );
  const selectedBase = stories.find(({ id, beats }) => id === selectedId && archive.unlockedAt[id] && beats.length > 0);
  const selected = selectedBase
    ? {
        ...selectedBase,
        beats: selectedBase.id === "END-01"
          ? end01BeatsFor(selectedEndingCaptain)
          : selectedBase.id === "END-02"
            ? end02BeatsFor(selectedEndingCaptain, clubName)
            : selectedBase.beats,
      }
    : undefined;
  const officeBackground = resolveAsset(PROLOGUE_ASSET_ID, "p1-01-twilight-manager-office");
  const prologueStories = stories.filter(({ presentation }) => presentation === "prologue");
  const day1Story = stories.find(({ presentation }) => presentation === "day1")!;
  const founderStoryCards = stories.filter(({ presentation }) => presentation === "founder");
  const opponentStoryCards = stories.filter(({ presentation }) => presentation === "opponent");
  const endingStories = stories.filter(({ presentation }) => presentation === "ending");

  function endingVariants(endingId: "END-01" | "END-02"): TournamentCaptainId[] {
    const stored = archive.endingVariants[endingId] ?? [];
    return stored.length > 0 ? stored : archive.unlockedAt[endingId] ? ["saya"] : [];
  }

  function activateStory(story: PlayableStory) {
    if (story.id !== "END-01" && story.id !== "END-02") {
      setSelectedId(story.id);
      return;
    }
    const variants = endingVariants(story.id);
    if (variants.length > 1) {
      setVariantPickerId(story.id);
      return;
    }
    setSelectedEndingCaptain(variants[0] ?? "saya");
    setSelectedId(story.id);
  }

  useEffect(() => {
    onStoryPresentationChange?.(Boolean(selected));
    return () => onStoryPresentationChange?.(false);
  }, [onStoryPresentationChange, selected]);

  if (selected) return <StoryReplay key={selected.id} story={selected} onExit={() => setSelectedId(null)} />;

  return <div className="story-archive-screen">
    {officeBackground.status === "ready" ? <img className="story-archive-background" src={officeBackground.url} alt="" aria-hidden="true" /> : null}
    <button className="story-archive-back" type="button" onClick={onBackToOffice} aria-label="返回经理办公室"><ArrowLeft aria-hidden="true" /></button>

    {variantPickerId ? <section className="story-ending-variant-picker" role="dialog" aria-modal="true" aria-label="选择队长版本">
      <div className="story-ending-variant-panel">
        <strong>选择回看版本</strong>
        <div>
          {endingVariants(variantPickerId).map((captainId) => <button key={captainId} type="button" onClick={() => {
            setSelectedEndingCaptain(captainId);
            setSelectedId(variantPickerId);
            setVariantPickerId(null);
          }}>{tournamentCaptainRoutes[captainId].name}</button>)}
        </div>
        <button className="story-ending-variant-cancel" type="button" onClick={() => setVariantPickerId(null)}>取消</button>
      </div>
    </section> : null}

    <main className="story-archive-content">
      {stories.length === 0 ? <section className="story-archive-empty"><Film aria-hidden="true" /><h2>剧情档案准备中</h2><p>完成剧情后，相应篇章会自动出现在这里。</p></section> : <div className="story-archive-routes">
        <section className="story-mainline-route" data-story-route="main" aria-label="主线剧情">
          <span className="story-route-label">主线剧情</span>
          <StoryArchiveRail label="主线剧情回看路线"><div className="story-archive-track">
            {prologueStories.map((story) => <div className="story-timeline-step" key={story.id}>
              <StoryTimelineCard story={story} unlocked={Boolean(archive.unlockedAt[story.id])} onActivate={() => activateStory(story)} />
              <span className="story-timeline-connector" aria-hidden="true" />
            </div>)}
            <div className="story-timeline-step">
              <StoryTimelineCard story={day1Story} unlocked={Boolean(archive.unlockedAt[day1Story.id])} onActivate={() => activateStory(day1Story)} />
              <span className="story-timeline-connector" aria-hidden="true" />
            </div>
            {founderStoryCards.map((story) => <div className="story-timeline-step" key={story.id}>
              <StoryTimelineCard story={story} unlocked={Boolean(archive.unlockedAt[story.id])} onActivate={() => activateStory(story)} />
              <span className="story-timeline-connector" aria-hidden="true" />
            </div>)}
            <section className="story-ending-branch" aria-label="生涯结局">
              {endingStories.map((story) => <div className="story-ending-option" key={story.id}>
                <StoryTimelineCard story={story} unlocked={Boolean(archive.unlockedAt[story.id])} onActivate={() => activateStory(story)} />
              </div>)}
            </section>
          </div></StoryArchiveRail>
        </section>
        <section className="story-opponent-route" data-story-route="opponents" aria-label="对手剧情分支">
          <span className="story-route-label">对手剧情分支</span>
          <StoryArchiveRail label="对手剧情分支"><div className="story-archive-track story-opponent-track">
            {opponentStoryCards.map((story, index) => <div className="story-timeline-step" key={story.id}>
              <StoryTimelineCard story={story} unlocked={Boolean(archive.unlockedAt[story.id])} onActivate={() => activateStory(story)} />
              {index < opponentStoryCards.length - 1 ? <span className="story-timeline-connector" aria-hidden="true" /> : null}
            </div>)}
          </div></StoryArchiveRail>
        </section>
      </div>}
    </main>
  </div>;
}
