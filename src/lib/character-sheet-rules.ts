import { ATTRIBUTE_KEYS, SKILL_KEYS, summarizeConditions } from "./character-rules";
import { profilesFor, skillName, type EquipmentItem } from "./equipment";

export type SheetSkillKey = typeof SKILL_KEYS[number];
export type SheetAttributeKey = typeof ATTRIBUTE_KEYS[number];
export const SHEET_SKILLS = SKILL_KEYS.map((key, index) => ({
  key, label: skillName(key), attribute: ATTRIBUTE_KEYS[Math.floor(index / 3)],
  domain: index < 6 ? "physical" as const : "mental" as const,
}));
export type SheetInventoryEntry = { id: string; quantity: number; notes: string | null; item: EquipmentItem };

export function isTemporaryGear(entry: SheetInventoryEntry) {
  return /\b(?:temp(?:orary)?|borrowed|loan)\b/i.test(entry.notes ?? "");
}

export function applicableGear(inventory: SheetInventoryEntry[], skill: SheetSkillKey) {
  return inventory.filter(entry => entry.quantity > 0).flatMap(entry => profilesFor(entry.item)
    .filter(profile => profile.kind !== "NARRATIVE" && profile.skills.includes(skill))
    .map(profile => ({ key: `${entry.id}:${profile.id}`, name: `${entry.item.name}: ${profile.label}`, profile })));
}

export function rollModifier(value: number) {
  return Number.isFinite(value) ? Math.min(20, Math.max(-20, Math.trunc(value))) : 0;
}

export function sheetPool(input: {
  skill: SheetSkillKey; attributes: Record<SheetAttributeKey, number>; skills: Record<SheetSkillKey, number>;
  physical: unknown; mental: unknown; itemBonus: number; advantages: number; armor?: EquipmentItem;
}) {
  const definition = SHEET_SKILLS.find(entry => entry.key === input.skill)!;
  const conditions = summarizeConditions(input.physical, input.mental)[definition.domain];
  const armorPenalty = input.skill === "agility" && input.armor?.type === "ARMOR" ? input.armor.agilityPenalty ?? 0 : 0;
  const attribute = input.attributes[definition.attribute], skill = input.skills[input.skill];
  const raw = attribute + skill + rollModifier(input.itemBonus) + rollModifier(input.advantages) - conditions - armorPenalty;
  return { attribute, skill, conditions, armorPenalty, raw, dice: Math.min(50, Math.max(0, raw)) };
}
