import type { Character } from "./gameData";
import {
  configurableSkills,
  isSkillCompatible,
  skillQualityRank,
  skillSlotCaps,
  skillsById,
  type ConfigurableSkill,
} from "./skillData";
export type SkillLoadoutState = {
  skillInventory: Record<string, number>;
  skillLoadouts: Record<string, string[]>;
};

function assignedCount(save: SkillLoadoutState, skillId: string, except: { characterId: string; slotIndex: number }) {
  let count = 0;
  for (const [characterId, loadout] of Object.entries(save.skillLoadouts)) {
    loadout.forEach((equippedId, slotIndex) => {
      if (equippedId === skillId && (characterId !== except.characterId || slotIndex !== except.slotIndex)) count += 1;
    });
  }
  return count;
}

export function availableSkillsForSlot(
  character: Pick<Character, "character_id" | "position" | "alternative_positions" | "stars">,
  save: SkillLoadoutState,
  slotIndex: number,
): ConfigurableSkill[] {
  const cap = skillSlotCaps(character.stars)[slotIndex];
  if (!cap) return [];
  const loadout = save.skillLoadouts[character.character_id] ?? [];
  const occupiedCategories = new Set(
    loadout.flatMap((skillId, index) => index === slotIndex ? [] : [skillsById.get(skillId)?.category]).filter(Boolean),
  );

  return configurableSkills
    .filter((skill) =>
      isSkillCompatible(character, skill) &&
      skillQualityRank[skill.quality] <= skillQualityRank[cap] &&
      !occupiedCategories.has(skill.category) &&
      assignedCount(save, skill.id, { characterId: character.character_id, slotIndex }) < (save.skillInventory[skill.id] ?? 0)
    )
    .sort((left, right) => skillQualityRank[right.quality] - skillQualityRank[left.quality] || left.name.localeCompare(right.name, "zh-CN"));
}

export function skillSlotsNeedingAttention(
  character: Pick<Character, "character_id" | "position" | "alternative_positions" | "stars">,
  save: SkillLoadoutState,
) {
  const loadout = save.skillLoadouts[character.character_id] ?? [];
  return skillSlotCaps(character.stars).map((_, slotIndex) => {
    const equipped = skillsById.get(loadout[slotIndex] ?? "");
    const available = availableSkillsForSlot(character, save, slotIndex);
    if (!equipped) return available.length > 0;
    return available.some((skill) => skillQualityRank[skill.quality] > skillQualityRank[equipped.quality]);
  });
}
