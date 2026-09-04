import { describe, expect, it } from "vitest";
import { createTournamentSave } from "../storage/tournamentSaveStorage";
import { pendingTimelineNode, tournamentTimelineNodes } from "./tournamentTimeline";

describe("99-day timeline title cards", () => {
  it("keeps all thirteen nodes in the approved order and calculates remaining days", () => {
    expect(tournamentTimelineNodes.map(({ day, label }) => [day, label])).toEqual([
      [1, "最后的补强"], [2, "十六强抽签"], [18, "十六强首回合"], [29, "十六强次回合"], [45, "八强首回合"],
      [46, "纱夜"], [56, "八强次回合"], [57, "半决赛对手"], [72, "半决赛首回合"], [73, "娜雅"],
      [83, "半决赛次回合"], [84, "伊蕾娜"], [99, "决赛日"],
    ]);
    expect(tournamentTimelineNodes.slice(0, -1).map(({ day }) => 99 - day)).toEqual([98, 97, 81, 70, 54, 53, 43, 42, 27, 26, 16, 15]);
  });

  it("does not offer a node twice in one tournament", () => {
    const save = createTournamentSave(1, "recruitment");
    expect(pendingTimelineNode(save.campaign, "office")?.id).toBe("DAY-1");
    save.campaign.shownTimelineCardIds.push("DAY-1");
    expect(pendingTimelineNode(save.campaign, "office")).toBeNull();
  });
});
