import { describe, expect, it } from "vitest";
import { availableSkillsForSlot, skillSlotsNeedingAttention } from "./skillGuidance";

const keeper = {
  character_id: "keeper",
  position: "GK",
  alternative_positions: [],
  stars: 5,
};

describe("skill guidance", () => {
  it("guides an empty slot only when a compatible idle skill exists", () => {
    const save = {
      skillInventory: { basic_handling: 1, set_reaction: 1 },
      skillLoadouts: { keeper: ["basic_handling", ""] },
    };
    expect(skillSlotsNeedingAttention(keeper, save)).toEqual([true, true, true]);
    expect(availableSkillsForSlot(keeper, save, 1).map((skill) => skill.id)).toContain("set_reaction");
  });

  it("does not guide a skill card already assigned to another player", () => {
    const save = {
      skillInventory: { basic_handling: 1 },
      skillLoadouts: { keeper: [""], other_keeper: ["basic_handling"] },
    };
    expect(availableSkillsForSlot(keeper, save, 0)).toEqual([]);
    expect(skillSlotsNeedingAttention(keeper, save)[0]).toBe(false);
  });

  it("guides when an idle higher-quality replacement is legal", () => {
    const save = {
      skillInventory: { set_reaction: 1, reflex_chain: 1 },
      skillLoadouts: { keeper: ["set_reaction"] },
    };
    expect(skillSlotsNeedingAttention(keeper, save)[0]).toBe(true);
  });
});
