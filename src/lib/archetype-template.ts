import type { Archetype, Item, Talent } from "@prisma/client";
import { z } from "zod";
import { ATTRIBUTE_KEYS, SKILL_KEYS } from "./character-rules";

export const archetypeTemplateInclude = {
  startingTalents: { include: { talent: true } },
  equipmentGroups: { orderBy: { position: "asc" as const }, include: { options: { include: { item: true } } } },
} as const;

export type ArchetypeTemplate = Archetype & {
  startingTalents?: { talentId: string; talent: Talent }[];
  equipmentGroups?: { id: string; label: string; quantity: number; options: { itemId: string; item: Item }[] }[];
};

const suggestions = z.array(z.string().trim().min(1).max(2000)).max(50).default([]);
export const archetypeTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  flavorText: z.string().trim().max(20000).default(""),
  firstNameOptions: suggestions,
  lastNameOptions: suggestions,
  motivationOptions: suggestions,
  traumaOptions: suggestions,
  darkSecretOptions: suggestions,
  relationshipOptions: suggestions,
  mainAttribute: z.enum(ATTRIBUTE_KEYS),
  mainSkill: z.enum(SKILL_KEYS),
  startingResourcesMin: z.number().int().min(0).max(10),
  startingResourcesMax: z.number().int().min(0).max(10),
  startingTalentIds: z.array(z.string().uuid()).max(50).default([]),
  equipmentGroups: z.array(z.object({
    label: z.string().trim().min(1).max(100),
    quantity: z.number().int().min(1).max(99),
    itemIds: z.array(z.string().uuid()).min(1).max(50),
  })).max(20).default([]),
}).refine(data => data.startingResourcesMin <= data.startingResourcesMax, {
  message: "Minimum resources cannot exceed maximum resources", path: ["startingResourcesMax"],
});

export function suggestionLines(value: string) {
  return [...new Set(value.split(/\r?\n/).map(line => line.trim()).filter(Boolean))];
}

export function startingTalentsFor(archetype: ArchetypeTemplate | undefined, talents: Talent[]) {
  if (!archetype) return [];
  const configured = archetype.startingTalents ?? [];
  return talents.filter(talent =>
    (talent.type === "GENERAL" || talent.archetypeId === archetype.id) &&
    (!configured.length || configured.some(entry => entry.talentId === talent.id)),
  );
}

export function defaultEquipmentChoices(archetype: ArchetypeTemplate) {
  return Object.fromEntries((archetype.equipmentGroups ?? [])
    .filter(group => group.options.length === 1)
    .map(group => [group.id, group.options[0].itemId]));
}

export function resolveStartingEquipment(archetype: ArchetypeTemplate, choices: Record<string, string>) {
  const groups = archetype.equipmentGroups ?? [];
  if (Object.keys(choices).some(id => !groups.some(group => group.id === id))) throw new Error("Starting equipment has changed. Review your equipment choices.");
  const quantities = new Map<string, number>();
  for (const group of groups) {
    const itemId = choices[group.id] || (group.options.length === 1 ? group.options[0].itemId : "");
    if (!group.options.some(option => option.itemId === itemId && option.item.type !== "MAGIC")) {
      throw new Error(`Choose one item for ${group.label}`);
    }
    quantities.set(itemId, (quantities.get(itemId) ?? 0) + group.quantity);
  }
  return [...quantities].map(([itemId, quantity]) => ({ itemId, quantity }));
}
