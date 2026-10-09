import { canCarryItem } from "./equipment";
import type { Item, Talent } from "@prisma/client";
import { z } from "zod";
import { ATTRIBUTE_KEYS, SKILL_KEYS, AGE_ALLOWANCES, normalizeRuleKey } from "./character-rules";
import { resolveStartingEquipment, startingTalentsFor, type ArchetypeTemplate } from "./archetype-template";

export type WizardState = {
  name: string;
  archetypeId: string;
  mainAttribute: string;
  mainSkill: string;
  minResources: number;
  maxResources: number;

  ageGroup: "YOUNG" | "MIDDLE_AGED" | "OLD" | "";
  attributeAllowance: number;
  skillAllowance: number;

  attributes: {
    physique: number;
    precision: number;
    logic: number;
    empathy: number;
  };

  skills: Record<string, number>;
  resources: number;

  talentId: string;
  motivation: string;
  trauma: string;
  darkSecret: string;
  memento: string;
  relationships: string;
  equipmentChoices: Record<string, string>;

  equipment: Item[];
};

export const initialState: WizardState = {
  name: "",
  archetypeId: "",
  mainAttribute: "",
  mainSkill: "",
  minResources: 0,
  maxResources: 0,
  ageGroup: "",
  attributeAllowance: 0,
  skillAllowance: 0,
  attributes: { physique: 2, precision: 2, logic: 2, empathy: 2 },
  skills: {
    agility: 0, closeCombat: 0, force: 0, medicine: 0, rangedCombat: 0, stealth: 0,
    investigation: 0, learning: 0, vigilance: 0, inspiration: 0, manipulation: 0, observation: 0
  },
  resources: 0,
  talentId: "",
  motivation: "",
  trauma: "",
  darkSecret: "",
  memento: "",
  relationships: "",
  equipmentChoices: {},
  equipment: []
};

const draftSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]), step: z.number().int().min(1).max(8),
  data: z.object({
    name: z.string().max(100), archetypeId: z.string(), ageGroup: z.enum(["", "YOUNG", "MIDDLE_AGED", "OLD"]),
    attributes: z.object({ physique: z.number().int().min(2).max(5), precision: z.number().int().min(2).max(5), logic: z.number().int().min(2).max(5), empathy: z.number().int().min(2).max(5) }),
    skills: z.record(z.enum(SKILL_KEYS), z.number().int().min(0).max(3)), resources: z.number().int().min(0).max(10),
    talentId: z.string(), motivation: z.string().max(10000), trauma: z.string().max(10000), darkSecret: z.string().max(10000), memento: z.string().max(1000),
    equipment: z.array(z.object({ id: z.string() })).max(50),
    relationships: z.string().max(50000).default(""),
    equipmentChoices: z.record(z.string(), z.string()).default({}),
  }),
});

export function firstIncompleteStep(data: WizardState, archetype?: ArchetypeTemplate) {
  if (!data.archetypeId) return 1;
  if (!data.ageGroup) return 2;
  if (!data.name.trim()) return 3;
  if (Object.values(data.attributes).reduce((a,b) => a+b,0) !== data.attributeAllowance || ATTRIBUTE_KEYS.some(key => data.attributes[key] > (normalizeRuleKey(key) === normalizeRuleKey(data.mainAttribute) ? 5 : 4))) return 4;
  if (Object.values(data.skills).reduce((a,b) => a+b,0) + data.resources - data.minResources !== data.skillAllowance || data.resources < data.minResources || data.resources > data.maxResources || SKILL_KEYS.some(key => data.skills[key] > (normalizeRuleKey(key) === normalizeRuleKey(data.mainSkill) ? 3 : 2))) return 5;
  if (!data.talentId || !data.motivation.trim() || !data.trauma.trim() || !data.darkSecret.trim()) return 6;
  if (archetype?.equipmentGroups?.length) {
    try { resolveStartingEquipment(archetype, data.equipmentChoices); } catch { return 7; }
  }
  return 8;
}

export function restoreCharacterDraft(raw: string, archetypes: ArchetypeTemplate[], talents: Talent[], items: Item[]) {
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return null; }
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return null;
  const saved = parsed.data;
  const arch = archetypes.find(a => a.id === saved.data.archetypeId);
  const age = saved.data.ageGroup;
  const allowance = age ? AGE_ALLOWANCES[age] : null;
  const data: WizardState = {
    ...initialState, ...saved.data,
    archetypeId: arch?.id || "", mainAttribute: arch?.mainAttribute || "", mainSkill: arch?.mainSkill || "",
    minResources: arch?.startingResourcesMin ?? 0, maxResources: arch?.startingResourcesMax ?? 0,
    attributeAllowance: allowance?.attributes ?? 0, skillAllowance: allowance?.skills ?? 0,
    talentId: startingTalentsFor(arch, talents).some(t => t.id === saved.data.talentId) ? saved.data.talentId : "",
    equipmentChoices: Object.fromEntries((arch?.equipmentGroups ?? []).flatMap(group => {
      const itemId = saved.data.equipmentChoices[group.id] || (group.options.length === 1 ? group.options[0].itemId : "");
      return group.options.some(option => option.itemId === itemId && canCarryItem(option.item)) ? [[group.id, itemId]] : [];
    })),
    equipment: items.filter(item => item.type !== "MAGIC" && canCarryItem(item) && saved.data.equipment.some(e => e.id === item.id)),
  };
  const migratedStep = saved.version === 1 && saved.step >= 3 ? saved.step + 1 : saved.step;
  return { data, step: Math.min(migratedStep, firstIncompleteStep(data, arch)) };
}
