import { BookOpen, Building2, CalendarDays, ClipboardCheck, Dumbbell, PackageOpen, Shirt, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { SayaCompanion } from "./components/SayaCompanion";
import { TimelineTitleCard } from "./components/TimelineTitleCard";
import { TournamentCaptainProvider } from "./components/TournamentCaptainContext";
import { OpponentScoutReport } from "./components/OpponentScoutReport";
import { adaptOpponentForSecondLeg, fixtureSeed, TOURNAMENT_ROSTER_SIZE } from "./data/tournamentJourney";
import {
  remainingTournamentPreparationDays,
  tournamentFixtureLabel,
  tournamentLockerCharacterIds,
  tournamentOfficeGuide,
  tournamentSectionLock,
} from "./data/tournamentRules";
import { tournamentEndingFor } from "./data/tournamentEnding";
import { difficultyUnlockNoticeForEnding, tournamentCaptainRoutes, type TournamentCaptainId } from "./data/tournamentCaptain";
import { captainOfficeMessages } from "./data/captainGuideCopy";
import { SCOUT_DAY_COST, TRAINING_DAY_COST } from "./data/tournamentSquad";
import { HomePage } from "./pages/HomePage";
import { Day1StoryPage } from "./pages/Day1StoryPage";
import { LockerRoomPage } from "./pages/LockerRoomPage";
import { MatchPage } from "./pages/MatchPage";
import { PackMarketPage } from "./pages/PackMarketPage";
import { SchedulePage } from "./pages/SchedulePage";
import { StoryArchivePage } from "./pages/StoryArchivePage";
import { TournamentStoryPage } from "./pages/TournamentStoryPage";
import { TournamentRegistrationPage } from "./pages/TournamentRegistrationPage";
import { TrainingPage } from "./pages/TrainingPage";
import { appSections, type AppSectionId } from "./navigation";
import type { MusicScene } from "./services/MusicDirector";
import type { PlayerAccount } from "./storage/localAccountStore";
import type { OpeningJourneyState } from "./storage/openingJourneyStorage";
import type { StoryArchiveId, StoryArchiveState } from "./storage/storyArchiveStorage";
import { pendingTimelineNode } from "./data/tournamentTimeline";
import { hasSeenTournamentGuide, OFFICE_SAYA_INTRODUCTION_GUIDE_ID, rememberTournamentGuide } from "./storage/tournamentGuideStorage";
import {
  advanceTournamentAfterMatch,
  completeTournamentStory,
  advanceTournamentToMatch,
  confirmTournamentDraw,
  ensureCurrentTournamentOpponent,
  loadTournamentSave,
  lockTournamentRecruitment,
  lockTournamentRegistration,
  markTournamentScoutReportViewed,
  markTournamentTimelineCardShown,
  recordTournamentMatch,
  recordTournamentDecision,
  recordTournamentPackOpening,
  setTournamentRegistration,
  selectTournamentCaptain,
  startTournamentJourney,
  toggleTournamentRegistration,
  trainTournamentPlayers,
  type TournamentSaveV6,
} from "./storage/tournamentSaveStorage";

const sectionIcons = {
  office: Building2,
  locker: Shirt,
  training: Dumbbell,
  match: Swords,
  schedule: CalendarDays,
  packs: PackageOpen,
  stories: BookOpen,
  registration: ClipboardCheck,
} satisfies Record<AppSectionId, typeof Building2>;

type Props = {
  account: PlayerAccount;
  opening: OpeningJourneyState;
  storyArchive: StoryArchiveState;
  availableCaptainIds?: TournamentCaptainId[];
  onStoryArchiveChange: (archive: StoryArchiveState) => void;
  onUnlockStories: (storyIds: StoryArchiveId[], captainId?: TournamentCaptainId) => Promise<StoryArchiveState>;
  onUpdateNickname: (nickname: string) => Promise<PlayerAccount>;
  onBindAccount: (input: { account: string; password: string; passwordConfirmation: string }) => Promise<PlayerAccount>;
  onLogout: () => Promise<void>;
  onMusicSceneChange?: (scene: MusicScene) => void;
  onDay1StoryReset?: () => void;
  onDay1StoryBeatChange?: (beat: number) => void;
  onDay1StoryComplete?: () => void;
};

export function tournamentMusicScene(activeSection: AppSectionId, opponentStoryOpen: boolean, storyPresentationOpen: boolean, battlePlaying: boolean, timelineCardOpen = false): MusicScene {
  if (opponentStoryOpen || storyPresentationOpen || timelineCardOpen) return "silent";
  return activeSection === "match" && battlePlaying ? "battle" : "quest";
}

export function shouldPresentDay1Story(campaign: Pick<TournamentSaveV6["campaign"], "phase" | "shownTimelineCardIds">, completed: boolean): boolean {
  return campaign.phase === "recruitment" && campaign.shownTimelineCardIds.includes("DAY-1") && !completed;
}

export function shouldStronglyGuideRecruitmentFromOffice(captainId: TournamentCaptainId, firstTenGuaranteeUsed: boolean): boolean {
  return captainId === "saya" && !firstTenGuaranteeUsed;
}

export function TournamentApp({ account, opening, storyArchive, availableCaptainIds = ["saya"], onStoryArchiveChange, onUnlockStories, onUpdateNickname, onBindAccount, onLogout, onMusicSceneChange, onDay1StoryReset, onDay1StoryBeatChange, onDay1StoryComplete }: Props) {
  const [save, setSave] = useState<TournamentSaveV6>(() => loadTournamentSave(account.uid));
  const [activeSection, setActiveSection] = useState<AppSectionId>("office");
  const [notice, setNotice] = useState<string | null>(null);
  const [scoutReportOpen, setScoutReportOpen] = useState(false);
  const [storyPresentationOpen, setStoryPresentationOpen] = useState(false);
  const [battlePlaying, setBattlePlaying] = useState(false);
  const campaign = save.campaign;
  const activeCaptainId = campaign.captainId ?? "saya";
  const captainGuideScope = activeCaptainId === "saya" ? account.uid : `${account.uid}:${activeCaptainId}`;
  const [officeIntroductionPending, setOfficeIntroductionPending] = useState(() => (
    typeof window === "undefined" || !hasSeenTournamentGuide(window.localStorage, captainGuideScope, OFFICE_SAYA_INTRODUCTION_GUIDE_ID)
  ));
  const opponentStoryOpen = campaign.phase === "story" && Boolean(campaign.pendingStoryId);
  // 接受赛程后先展示 Day 1 日期幕；日期幕结束立即播放剧情，再开放补强操作。
  const day1StoryOpen = shouldPresentDay1Story(campaign, opening.day1StoryCompleted);
  const timelineNode = day1StoryOpen ? null : pendingTimelineNode(campaign, activeSection);
  const clubName = opening.clubName;
  const nextFixture = campaign.phase === "preparation" ? campaign.fixtures[campaign.currentFixtureIndex] : undefined;
  const countdownDays = nextFixture ? Math.max(0, nextFixture.day - campaign.day) : campaign.phase === "finished" ? 0 : 15;
  const scoutReportViewed = Boolean(nextFixture && campaign.scoutedStageIds.includes(nextFixture.stage));
  const scoutReportAvailable = Boolean(nextFixture && !scoutReportViewed && countdownDays >= SCOUT_DAY_COST);
  const scoutReportUnavailableReason = nextFixture && !scoutReportViewed && countdownDays < SCOUT_DAY_COST
    ? countdownDays === 0
      ? "比赛日已到，无法观察对手"
      : `仅剩 ${countdownDays} 天，观察对手需要 ${SCOUT_DAY_COST} 天`
    : undefined;
  const firstLegEntry = nextFixture?.leg === 2
    ? campaign.results.find((entry) => campaign.fixtures.find((fixture) => fixture.id === entry.fixtureId)?.stage === nextFixture.stage)
    : undefined;
  const storedScoutOpponent = nextFixture ? campaign.generatedOpponents[nextFixture.stage] : undefined;
  const scoutOpponent = storedScoutOpponent
    ? adaptOpponentForSecondLeg(storedScoutOpponent, firstLegEntry?.matchContext)
    : undefined;
  const scoutFixtureLabel = nextFixture ? tournamentFixtureLabel(nextFixture) : "";
  const scoutAggregateScore = (() => {
    if (!nextFixture) return { player: 0, opponent: 0 };
    const playedThisRound = campaign.results
      .map((entry) => ({ entry, fixture: campaign.fixtures.find((item) => item.id === entry.fixtureId) }))
      .filter(({ fixture }) => fixture && fixture.stage === nextFixture.stage);
    return {
      player: playedThisRound.reduce((total, { entry }) => total + entry.result.homeScore, 0),
      opponent: playedThisRound.reduce((total, { entry }) => total + entry.result.awayScore, 0),
    };
  })();

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setOfficeIntroductionPending(typeof window === "undefined" || !hasSeenTournamentGuide(window.localStorage, captainGuideScope, OFFICE_SAYA_INTRODUCTION_GUIDE_ID));
  }, [captainGuideScope]);

  useEffect(() => {
    onMusicSceneChange?.(tournamentMusicScene(activeSection, opponentStoryOpen, storyPresentationOpen || day1StoryOpen, battlePlaying, Boolean(timelineNode)));
  }, [activeSection, battlePlaying, day1StoryOpen, onMusicSceneChange, opponentStoryOpen, storyPresentationOpen, timelineNode]);

  function adopt(next: TournamentSaveV6) {
    setSave(next);
    return next;
  }

  function completeOfficeIntroduction() {
    rememberTournamentGuide(window.localStorage, captainGuideScope, OFFICE_SAYA_INTRODUCTION_GUIDE_ID);
    setOfficeIntroductionPending(false);
  }

  function selectSection(id: AppSectionId) {
    const locked = tournamentSectionLock(campaign, id);
    if (locked) { setNotice(locked); return; }
    if (campaign.phase === "preparation" && id === "match") { goToMatch(); return; }
    setStoryPresentationOpen(false);
    setNotice(null);
    setBattlePlaying(false);
    setActiveSection(id);
  }

  function goToMatch(confirmUnusedDays = true) {
    if (confirmUnusedDays && nextFixture && countdownDays > 0 && !window.confirm(`还有 ${countdownDays} 天未使用，确定直接开赛吗？`)) return;
    let next = advanceTournamentToMatch(account.uid, save);
    if (next.campaign.phase === "preparation") next = ensureCurrentTournamentOpponent(account.uid, next).save;
    adopt(next);
    setBattlePlaying(false);
    setActiveSection(next.campaign.phase === "story" ? "office" : "match");
    setNotice(next.campaign.phase === "story" ? "决赛对手档案已经送达" : `已推进至 Day ${next.campaign.day}比赛日`);
  }

  function viewScoutReport() {
    if (campaign.phase !== "preparation" || !nextFixture) return;
    if (!scoutReportViewed && countdownDays < SCOUT_DAY_COST) {
      setNotice(scoutReportUnavailableReason ?? "当前无法观察对手");
      return;
    }
    let next = ensureCurrentTournamentOpponent(account.uid, save).save;
    next = markTournamentScoutReportViewed(account.uid, next);
    adopt(next);
    setScoutReportOpen(true);
  }

  function closeScoutReport() {
    setScoutReportOpen(false);
  }

  const officeGuide = tournamentOfficeGuide(campaign);
  const officeGuidePrompt = (() => {
    const captainMessages = activeCaptainId === "saya" ? null : captainOfficeMessages[activeCaptainId];
    const prompt = (title: string, message: string, target = "office-primary", strong = true) => ({ title, message, target, strong });
    if (campaign.phase === "briefing") return prompt("第一次的杯赛旅程", captainMessages?.briefing ?? "经理，别担心，我会一直陪着你。我们先接受任务，从第一步慢慢来吧。");
    if (campaign.phase === "recruitment") return prompt("先补齐我们的队伍", captainMessages?.recruitment ?? "球星卡商店已经准备好了。去看看不同阵营，再选你喜欢的方向开始补强吧。", "office-primary", shouldStronglyGuideRecruitmentFromOffice(activeCaptainId, campaign.recruitment.progress.firstTenGuaranteeUsed));
    if (campaign.phase === "registration") return prompt("一起选出赛事名单", captainMessages?.registration ?? `冠军联赛允许携带${TOURNAMENT_ROSTER_SIZE}名球员参赛，其余球员不随队出征。我们一起选出${TOURNAMENT_ROSTER_SIZE}人名单，好吗？`, "office-primary", false);
    if (campaign.phase === "draw") return prompt("去见第一位对手", captainMessages?.draw ?? "名单已经准备好了。接下来去看看签表，认识我们的第一位对手吧。");
    if (campaign.phase === "story") return prompt("赛事剧情", captainMessages?.story ?? "新的故事已经送达，先读完这一章吧。", "office-primary", false);
    if (campaign.phase === "finished") return prompt("一起回顾这段旅程", captainMessages?.finished ?? "辛苦了，经理。无论结果如何，都值得一起好好看看我们走过的路。", "office-primary", false);
    const fixture = campaign.fixtures[campaign.currentFixtureIndex];
    if (!fixture) return prompt("继续备战", captainMessages?.continue ?? "可以训练、观察对手，也可以直接开赛。", "office-primary", false);
    const scouted = campaign.scoutedStageIds.includes(fixture.stage);
    if (campaign.day >= fixture.day) return prompt("比赛日到了", captainMessages?.matchday ?? "今天就是比赛日啦！进入比赛安排阵型和首发吧。", "office-primary", false);
    if (!scouted && countdownDays >= SCOUT_DAY_COST) return prompt("可以先观察对手", captainMessages?.scout ?? "可以先观察对手，也可以按自己的节奏备赛。观察对手会消耗 5 天，换来对手的阵型情报。", "office-scout-report", false);
    if (countdownDays >= TRAINING_DAY_COST) return prompt("先安排一次训练", captainMessages?.firstTraining ?? "可以训练、观察对手，也可以直接开赛。选一个训练方向，带三位球员完成训练吧。", "office-primary", campaign.results.length === 0);
    return prompt("准备好就前往比赛日", captainMessages?.noTime ?? "可以训练、观察对手，也可以直接开赛。这一轮的时间已经用完，确认后前往比赛日。", "office-advance-match");
  })();

  function confirmDraw() {
    let next = confirmTournamentDraw(account.uid, save);
    next = ensureCurrentTournamentOpponent(account.uid, next).save;
    adopt(next); setActiveSection("office"); setNotice("Day 2抽签已锁定，杯赛备战正式开始");
  }

  function restartTournament() {
    const endingId = campaign.outcome
      ? tournamentEndingFor(campaign.outcome, campaign.results, campaign.fixtures, campaign.captainId ?? "saya")
      : null;
    const unlockNotice = endingId ? difficultyUnlockNoticeForEnding(endingId) : null;
    const next = startTournamentJourney(account.uid, undefined, undefined, unlockNotice || availableCaptainIds.length > 1 ? null : "saya");
    adopt(next); setActiveSection("office");
    setNotice(unlockNotice);
  }

  const matchView = (() => {
    if (campaign.phase !== "preparation") return null;
    const fixture = campaign.fixtures[campaign.currentFixtureIndex];
    const storedOpponent = campaign.generatedOpponents[fixture.stage];
    const firstLegEntry = fixture.leg === 2
      ? campaign.results.find((entry) => campaign.fixtures.find((item) => item.id === entry.fixtureId)?.stage === fixture.stage)
      : undefined;
    const opponent = storedOpponent ? adaptOpponentForSecondLeg(storedOpponent, firstLegEntry?.matchContext) : undefined;
    if (!fixture || !opponent) return null;
    const persisted = campaign.results.find((entry) => entry.fixtureId === fixture.id);
    const firstLegScore = (() => {
      if (fixture.stage === "final" || fixture.leg !== 2) return undefined;
      const firstFixture = campaign.fixtures.find((item) => item.stage === fixture.stage && item.leg === 1);
      const firstResult = firstFixture ? campaign.results.find((entry) => entry.fixtureId === firstFixture.id) : undefined;
      return firstResult ? { home: firstResult.result.homeScore, away: firstResult.result.awayScore } : undefined;
    })();
    return {
      fixture,
      opponent,
      fixtureSeed: fixtureSeed(campaign.campaignSeed, fixture.id, fixture.leg),
      currentDay: campaign.day,
      registeredIds: campaign.registration.registeredIds,
      persistedResult: persisted?.result,
      settlement: persisted,
      firstLegScore,
      onStarted: (result: Parameters<typeof recordTournamentMatch>[2], context: Parameters<typeof recordTournamentMatch>[4]) => {
        const next = adopt(recordTournamentMatch(account.uid, save, result, undefined, context));
        return next.campaign.results.find((entry) => entry.fixtureId === fixture.id)!;
      },
      onDecisionStarted: (simulation: Parameters<typeof recordTournamentDecision>[2]) => {
        const next = adopt(recordTournamentDecision(account.uid, save, simulation));
        return next.campaign.results.find((entry) => entry.fixtureId === fixture.id)!;
      },
      onContinue: () => {
        let next = advanceTournamentAfterMatch(account.uid, save);
        if (next.campaign.phase === "preparation") next = ensureCurrentTournamentOpponent(account.uid, next).save;
        if (next.campaign.phase === "finished" && next.campaign.outcome) {
          void onUnlockStories([tournamentEndingFor(next.campaign.outcome, next.campaign.results, next.campaign.fixtures, next.campaign.captainId ?? "saya")], next.campaign.captainId ?? "saya").then(onStoryArchiveChange);
        }
        adopt(next);
        setActiveSection(next.campaign.phase === "finished" ? "schedule" : "office");
        setNotice(next.campaign.phase === "story" ? "下一轮对手的故事已经准备好" : next.campaign.phase === "finished" ? "本届征程已结束，进入征程报告" : "赛果已锁定，下一场倒计时已经开始");
      },
    };
  })();

  return <TournamentCaptainProvider captainId={campaign.captainId ?? "saya"}><div className="app-shell"><main className="main-content">
    {day1StoryOpen ? <Day1StoryPage
      initialBeat={opening.day1StoryBeat}
      nickname={account.nickname}
      onBeatChange={(beat) => onDay1StoryBeatChange?.(beat)}
      onComplete={() => onDay1StoryComplete?.()}
      availableCaptainIds={availableCaptainIds}
      onCaptainSelect={(captainId) => adopt(selectTournamentCaptain(account.uid, save, captainId))}
    />
      : timelineNode ? <TimelineTitleCard day={timelineNode.day} label={timelineNode.label} onComplete={() => {
        if (timelineNode.id === "DAY-1") onDay1StoryReset?.();
        adopt(markTournamentTimelineCardShown(account.uid, save, timelineNode.id));
      }} />
      : opponentStoryOpen ? <TournamentStoryPage storyId={campaign.pendingStoryId!} nickname={account.nickname} clubName={clubName} onComplete={() => {
        const storyId = campaign.pendingStoryId!;
        const resumeTarget = campaign.storyResumeTarget;
        void onUnlockStories([storyId]).then(onStoryArchiveChange);
        let next = completeTournamentStory(account.uid, save);
        if (resumeTarget === "match") next = ensureCurrentTournamentOpponent(account.uid, next).save;
        adopt(next); setActiveSection(resumeTarget === "match" ? "match" : "office");
        setNotice(resumeTarget === "match" ? "对手档案已收录，进入决赛布阵" : "剧情已收录，下一轮备战开始");
      }} />
      : activeSection === "registration" && campaign.phase === "registration" ? <TournamentRegistrationPage guideScope={account.uid} clubName={clubName} squad={save.squad} selectedIds={campaign.registration.selection} onToggle={(characterId) => adopt(toggleTournamentRegistration(account.uid, save, characterId))} onQuickFill={(characterIds) => adopt(setTournamentRegistration(account.uid, save, characterIds))} onLock={() => { adopt(lockTournamentRegistration(account.uid, save)); setActiveSection("office"); setNotice(`${TOURNAMENT_ROSTER_SIZE}人名单已永久锁定，Day 2抽签已开启`); }} onBack={() => selectSection("office")} />
      : activeSection === "locker" ? <LockerRoomPage squad={save.squad} visibleCharacterIds={tournamentLockerCharacterIds(campaign)} onBackToOffice={() => selectSection("office")} />
      : activeSection === "training" && campaign.phase === "preparation" && nextFixture ? <TrainingPage guideScope={account.uid} managerNickname={account.nickname} squad={save.squad} registeredIds={campaign.registration.registeredIds} day={campaign.day} fixtureDay={nextFixture.day} fixtureName={tournamentFixtureLabel(nextFixture)} remainingDays={remainingTournamentPreparationDays(campaign)} onTrain={(focusId, ids) => adopt(trainTournamentPlayers(account.uid, save, focusId, ids))} onBackToOffice={() => selectSection("office")} onGoToMatch={goToMatch} />
      : activeSection === "match" && matchView ? <MatchPage guideScope={account.uid} managerNickname={account.nickname} clubName={clubName} squad={save.squad} match={matchView} onBackToOffice={() => selectSection("office")} onViewScoutReport={viewScoutReport} scoutReportViewed={matchView ? campaign.scoutedStageIds.includes(matchView.fixture.stage) : false} onBattleMusicChange={setBattlePlaying} />
      : activeSection === "schedule" ? <SchedulePage guideScope={account.uid} managerNickname={account.nickname} clubName={clubName} squad={save.squad} campaign={campaign} onBackToOffice={() => selectSection("office")} onConfirmDraw={confirmDraw} onRestart={restartTournament} onStoryPresentationChange={setStoryPresentationOpen} />
      : activeSection === "stories" ? <StoryArchivePage archive={storyArchive} nickname={account.nickname} clubName={clubName} onBackToOffice={() => selectSection("office")} onStoryPresentationChange={setStoryPresentationOpen} />
      : activeSection === "packs" && campaign.phase === "recruitment" ? <PackMarketPage guideScope={account.uid} save={save} onOpenPack={(opened) => adopt(recordTournamentPackOpening(account.uid, save, opened))} onLock={() => { adopt(lockTournamentRecruitment(account.uid, save)); setActiveSection("office"); setNotice(`Day 1补强已锁定，下一步注册${TOURNAMENT_ROSTER_SIZE}人名单`); }} onBackToOffice={() => selectSection("office")} onGoLocker={() => selectSection("locker")} />
      : <HomePage account={account} clubName={clubName} onUpdateNickname={onUpdateNickname} onBindAccount={onBindAccount} onLogout={onLogout} officeGuidance={officeGuidePrompt} officeIntroduction={{ pending: officeIntroductionPending, onComplete: completeOfficeIntroduction }} tournamentJourney={{
        day: campaign.day, phaseLabel: officeGuide.phaseLabel, guidance: officeGuide.guidance, primaryActionLabel: officeGuide.actionLabel,
        countdownLabel: nextFixture ? countdownDays === 0 ? "今日比赛" : `距${tournamentFixtureLabel(nextFixture)} ${countdownDays}天` : campaign.phase === "finished" ? "征程已结束" : "距16强首回合 15天",
        stage: campaign.phase === "preparation" ? campaign.fixtures[campaign.currentFixtureIndex]?.stage ?? "day1" : campaign.phase === "finished" ? campaign.fixtures[Math.max(0, campaign.currentFixtureIndex - 1)]?.stage ?? "final" : "day1",
        canAdvanceTime: Boolean(campaign.phase === "preparation" && nextFixture && campaign.day < nextFixture.day),
        scoutReportAvailable,
        scoutReportViewed,
        scoutReportUnavailableReason,
        onPrimaryAction: () => { if (officeGuide.target === "start") { adopt(startTournamentJourney(account.uid, undefined, undefined, availableCaptainIds.length > 1 ? null : "saya")); setActiveSection("packs"); setNotice("Day 1开始：赛事补强预算已到账"); } else selectSection(officeGuide.target); },
        onViewScoutReport: viewScoutReport,
        onAdvanceToMatch: goToMatch,
      }} />}
  </main>
  {activeSection !== "office" && !day1StoryOpen && !(campaign.phase === "finished" && activeSection === "schedule") ? <SayaCompanion section={activeSection} scope={account.uid} scheduleJourneyEnded={campaign.phase === "finished"} /> : null}
  {activeSection === "office" && !opponentStoryOpen && !day1StoryOpen ? <nav className="game-dock" aria-label="游戏主菜单">{appSections.map((section) => { const Icon = sectionIcons[section.id]; const lockedReason = tournamentSectionLock(campaign, section.id); return <button key={section.id} type="button" className={activeSection === section.id ? "active" : undefined} aria-current={activeSection === section.id ? "page" : undefined} aria-label={section.label} disabled={officeIntroductionPending || Boolean(lockedReason)} title={officeIntroductionPending ? `请先听完${tournamentCaptainRoutes[activeCaptainId].name}的介绍` : lockedReason ?? undefined} onClick={() => selectSection(section.id)}><span className="dock-icon"><Icon aria-hidden="true" strokeWidth={1.8} /></span><strong>{section.label}</strong><small>{activeSection === section.id ? "当前" : lockedReason ? "待解锁" : "可用"}</small></button>; })}</nav> : null}
  {scoutReportOpen && scoutOpponent ? <OpponentScoutReport opponent={scoutOpponent} fixtureLabel={scoutFixtureLabel} aggregateScore={scoutAggregateScore} onClose={closeScoutReport} /> : null}
  <div className={`game-toast${notice ? " visible" : ""}`} role="status" aria-live="polite">{notice}</div>
  </div></TournamentCaptainProvider>;
}
