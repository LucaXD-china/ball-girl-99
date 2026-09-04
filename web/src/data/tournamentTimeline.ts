import type { AppSectionId } from "../navigation";
import type { TournamentCampaignState } from "../storage/tournamentSaveStorage";

export type TimelineCardId = "DAY-1" | "DAY-2" | "DAY-18" | "DAY-29" | "DAY-45" | "DAY-46" | "DAY-56" | "DAY-57" | "DAY-72" | "DAY-73" | "DAY-83" | "DAY-84" | "DAY-99";
export type TimelineNode = { id: TimelineCardId; day: number; label: string };

export const tournamentTimelineNodes: TimelineNode[] = [
  { id: "DAY-1", day: 1, label: "最后的补强" }, { id: "DAY-2", day: 2, label: "十六强抽签" },
  { id: "DAY-18", day: 18, label: "十六强首回合" }, { id: "DAY-29", day: 29, label: "十六强次回合" },
  { id: "DAY-45", day: 45, label: "八强首回合" }, { id: "DAY-46", day: 46, label: "纱夜" },
  { id: "DAY-56", day: 56, label: "八强次回合" }, { id: "DAY-57", day: 57, label: "半决赛对手" },
  { id: "DAY-72", day: 72, label: "半决赛首回合" }, { id: "DAY-73", day: 73, label: "娜雅" },
  { id: "DAY-83", day: 83, label: "半决赛次回合" }, { id: "DAY-84", day: 84, label: "伊蕾娜" },
  { id: "DAY-99", day: 99, label: "决赛日" },
];

export function pendingTimelineNode(campaign: TournamentCampaignState, activeSection: AppSectionId): TimelineNode | null {
  let day: number | null = null;
  if (campaign.phase === "recruitment") day = 1;
  else if (campaign.phase === "draw") day = 2;
  else if (campaign.phase === "story") day = campaign.day;
  else if (campaign.phase === "preparation" && activeSection === "match") {
    const fixture = campaign.fixtures[campaign.currentFixtureIndex];
    if (fixture && campaign.day === fixture.day) day = fixture.day;
  }
  const node = tournamentTimelineNodes.find((candidate) => candidate.day === day) ?? null;
  return node && !campaign.shownTimelineCardIds.includes(node.id) ? node : null;
}
