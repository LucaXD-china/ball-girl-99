import type { AppSectionId } from "../navigation";
import type { TournamentCampaignState } from "../storage/tournamentSaveStorage";
import { stageMeta, TOURNAMENT_ROSTER_SIZE, type TournamentFixture } from "./tournamentJourney";
import { TRAINING_DAY_COST } from "./tournamentSquad";

export function tournamentSectionLock(campaign: TournamentCampaignState, id: AppSectionId) {
  if (id === "office" || id === "locker" || id === "stories") return null;
  if (campaign.phase === "preparation" && id === "match") {
    const fixture = campaign.fixtures[campaign.currentFixtureIndex];
    if (fixture && campaign.day < fixture.day) return `比赛系统将在 Day ${fixture.day} 比赛日开放`;
  }
  const allowed: Record<TournamentCampaignState["phase"], AppSectionId[]> = {
    briefing: ["office", "locker", "stories"],
    recruitment: ["office", "locker", "packs", "stories"],
    registration: ["office", "locker", "registration", "stories"],
    draw: ["office", "locker", "schedule", "stories"],
    story: ["office", "stories"],
    preparation: ["office", "locker", "training", "match", "schedule", "stories"],
    finished: ["office", "locker", "schedule", "stories"],
  };
  if (allowed[campaign.phase].includes(id)) return null;
  if (id === "packs" && campaign.recruitment.locked) return "Day 1补强已经锁定";
  if (campaign.phase === "briefing") return "请先接受董事会的99日杯赛任务";
  if (campaign.phase === "recruitment") return "请先完成Day 1补强";
  if (campaign.phase === "registration") return `请先锁定${TOURNAMENT_ROSTER_SIZE}人名单`;
  if (campaign.phase === "draw") return "请先完成Day 2抽签";
  return "该系统当前不可用";
}

export function tournamentLockerCharacterIds(campaign: TournamentCampaignState) {
  return campaign.registration.locked ? campaign.registration.registeredIds : undefined;
}

export function tournamentFixtureLabel(fixture: TournamentFixture) {
  return fixture.stage === "final" ? "决赛" : `${stageMeta[fixture.stage].name}第${fixture.leg}回合`;
}

export function remainingTournamentPreparationDays(campaign: Pick<TournamentCampaignState, "day" | "phase" | "currentFixtureIndex" | "fixtures">) {
  if (campaign.phase !== "preparation") return 0;
  const fixture = campaign.fixtures[campaign.currentFixtureIndex];
  return fixture ? Math.max(0, fixture.day - campaign.day) : 0;
}

export function tournamentOfficeGuide(campaign: TournamentCampaignState) {
  if (campaign.phase === "briefing") return { phaseLabel: "董事会特别任务", guidance: "接受99日杯赛任务，领取Day 1补强预算。", actionLabel: "接受任务并前往补强", target: "start" as const };
  if (campaign.phase === "recruitment") {
    const recruitmentBudget = campaign.recruitment.pullsMade + campaign.recruitment.budgetRemaining;
    return { phaseLabel: "Day 1 · 阵容补强", guidance: `已完成${campaign.recruitment.pullsMade}/${recruitmentBudget}抽；获得至少${TOURNAMENT_ROSTER_SIZE}名不同球员后锁定补强。`, actionLabel: "前往球星卡商店", target: "packs" as const };
  }
  if (campaign.phase === "registration") return { phaseLabel: "Day 1 · 赛事注册", guidance: `可先在更衣室查看全部持有球员，再确认${TOURNAMENT_ROSTER_SIZE}人名单。`, actionLabel: "前往名单注册", target: "registration" as const };
  if (campaign.phase === "draw") return { phaseLabel: "Day 2 · 16强抽签", guidance: `${TOURNAMENT_ROSTER_SIZE}人名单已封存，请进入抽签仪式。`, actionLabel: "参加16强抽签", target: "schedule" as const };
  if (campaign.phase === "story") return { phaseLabel: "对手档案", guidance: "下一轮的对手故事已经送达，请先阅读这份赛前档案。", actionLabel: "阅读对手档案", target: "office" as const };
  if (campaign.phase === "finished") return { phaseLabel: campaign.outcome === "champion" ? "Day 99 · 冠军归来" : "本届征程结束", guidance: "赛果已锁定，直接查看征程报告与生涯结局。", actionLabel: "查看征程报告", target: "schedule" as const };
  const fixture = campaign.fixtures[campaign.currentFixtureIndex];
  const countdownDays = Math.max(0, fixture.day - campaign.day);
  const label = tournamentFixtureLabel(fixture);
  if (campaign.day >= fixture.day) return { phaseLabel: `Day ${campaign.day} · ${label}`, guidance: "比赛日已到，确认阵型、职责与首发后开始比赛。", actionLabel: "进入本场比赛", target: "match" as const };
  if (countdownDays >= TRAINING_DAY_COST) return { phaseLabel: `${label} · 训练计划`, guidance: `距比赛${countdownDays}天。可以训练、观察对手，也可以直接开赛。`, actionLabel: "前往训练中心", target: "training" as const };
  return { phaseLabel: `${label} · 赛前准备`, guidance: `距比赛${countdownDays}天。可以训练、观察对手，也可以直接开赛。`, actionLabel: "直接开赛", target: "match" as const };
}
