import { BookOpen, Building2, CalendarDays, Dumbbell, PackageOpen, Shirt } from "lucide-react";
import { createRoot } from "react-dom/client";
import { TournamentCaptainProvider } from "./components/TournamentCaptainContext";
import { isTournamentCaptainId } from "./data/tournamentCaptain";
import { HomePage } from "./pages/HomePage";
import type { TournamentOfficeStage } from "./scenes/sceneDefinitions";
import "./styles.css";
import "./sunny-club.css";

const requestedStage = new URLSearchParams(window.location.search).get("stage");
const requestedCaptain = new URLSearchParams(window.location.search).get("captain");
const captainId = isTournamentCaptainId(requestedCaptain) ? requestedCaptain : "saya";
const introductionPending = new URLSearchParams(window.location.search).get("intro") === "1";
const stages: TournamentOfficeStage[] = ["day1", "round_of_16", "quarter_final", "semi_final", "final"];
const stage = stages.includes(requestedStage as TournamentOfficeStage) ? requestedStage as TournamentOfficeStage : "day1";
const stageLabels: Record<TournamentOfficeStage, string> = {
  day1: "最终补强",
  round_of_16: "16进8备战",
  quarter_final: "8进4备战",
  semi_final: "半决赛备战",
  final: "冠军之夜",
};
const sections = [
  { label: "经理办公室", icon: Building2 },
  { label: "球员更衣室", icon: Shirt },
  { label: "训练中心", icon: Dumbbell },
  { label: "赛程", icon: CalendarDays },
  { label: "球星卡商店", icon: PackageOpen },
  { label: "剧情回顾", icon: BookOpen },
];

createRoot(document.getElementById("root")!).render(
  <TournamentCaptainProvider captainId={captainId}><div className="app-shell" data-office-preview={stage} data-captain-preview={captainId}>
    <main className="main-content">
      <HomePage
        account={{ uid: "office-preview", account: "preview", nickname: "测试", isGuest: false, createdAt: "2026-08-14T00:00:00.000Z", updatedAt: "2026-08-14T00:00:00.000Z" }}
        clubName="晴空竞技"
        onUpdateNickname={async () => { throw new Error("预览页不保存昵称"); }}
        onBindAccount={async () => { throw new Error("预览页不绑定账号"); }}
        onLogout={async () => undefined}
        officeGuidance={{
          title: stageLabels[stage],
          message: stage === "day1" ? "球星卡商店已经准备好了。去看看不同阵营，再选你喜欢的方向开始补强吧。" : "今天就是比赛日啦！别紧张，我们先看看对手，再一步一步安排阵型和首发。",
          target: "office-primary",
        }}
        officeIntroduction={{ pending: introductionPending, onComplete: () => undefined }}
        tournamentJourney={{
          day: stage === "day1" ? 1 : stage === "final" ? 99 : stage === "semi_final" ? 76 : stage === "quarter_final" ? 48 : 17,
          phaseLabel: stage === "day1" ? "Day 1 · 阵容补强" : stageLabels[stage],
          countdownLabel: stage === "day1" ? "距首回合16天" : "今日比赛",
          guidance: "预览页不执行赛事操作。",
          primaryActionLabel: stage === "day1" ? "前往球星卡商店" : "赛事操作预览",
          stage,
          canAdvanceTime: false,
          scoutReportAvailable: false,
          scoutReportViewed: false,
          onPrimaryAction: () => undefined,
          onViewScoutReport: () => undefined,
          onAdvanceToMatch: () => undefined,
        }}
      />
    </main>
    <nav className="game-dock" aria-label="游戏主菜单">
      {sections.map(({ label, icon: Icon }, index) => (
        <button key={label} type="button" className={index === 0 ? "active" : undefined}>
          <span className="dock-icon"><Icon aria-hidden="true" strokeWidth={1.8} /></span>
          <strong>{label}</strong>
          <small>{index === 0 ? "当前" : "可用"}</small>
        </button>
      ))}
    </nav>
  </div></TournamentCaptainProvider>,
);
