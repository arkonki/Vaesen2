import { z } from "zod";

export const ATTRIBUTE_KEYS = ["physique", "precision", "logic", "empathy"] as const;
export const SKILL_KEYS = ["agility", "closeCombat", "force", "medicine", "rangedCombat", "stealth",
  "investigation", "learning", "vigilance", "inspiration", "manipulation", "observation"] as const;
export const AGE_ALLOWANCES = {
  YOUNG: { attributes: 15, skills: 10 },
  MIDDLE_AGED: { attributes: 14, skills: 12 },
  OLD: { attributes: 13, skills: 14 },
} as const;

export const characterCreationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  archetypeId: z.string().uuid(),
  ageGroup: z.enum(["YOUNG", "MIDDLE_AGED", "OLD"]),
  attributes: z.object({ physique: z.number().int().min(2).max(5), precision: z.number().int().min(2).max(5),
    logic: z.number().int().min(2).max(5), empathy: z.number().int().min(2).max(5) }),
  skills: z.record(z.enum(SKILL_KEYS), z.number().int().min(0).max(3)),
  resources: z.number().int().min(0).max(10),
  talentId: z.string().uuid(),
  motivation: z.string().trim().min(1).max(10000),
  trauma: z.string().trim().min(1).max(10000),
  darkSecret: z.string().trim().min(1).max(10000),
  memento: z.string().trim().max(1000).optional(),
  relationships: z.string().trim().max(50000).default(""),
  equipmentChoices: z.record(z.string().uuid(), z.string().uuid()).default({}),
  equipment: z.array(z.object({ id: z.string().uuid() })).max(50),
});

export function normalizeRuleKey(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function validateCharacterAllocation(data: z.infer<typeof characterCreationSchema>, archetype: {
  mainAttribute: string; mainSkill: string; startingResourcesMin: number; startingResourcesMax: number;
}) {
  const allowance = AGE_ALLOWANCES[data.ageGroup];
  if (Object.values(data.attributes).reduce((a, b) => a + b, 0) !== allowance.attributes) {
    throw new Error("Allocate exactly the attribute points allowed by your age");
  }
  for (const key of ATTRIBUTE_KEYS) {
    const max = normalizeRuleKey(key) === normalizeRuleKey(archetype.mainAttribute) ? 5 : 4;
    if (data.attributes[key] > max) throw new Error("Only your main attribute can reach 5");
  }
  for (const key of SKILL_KEYS) {
    const max = normalizeRuleKey(key) === normalizeRuleKey(archetype.mainSkill) ? 3 : 2;
    if (data.skills[key] > max) throw new Error("Only your main skill can start at 3");
  }
  if (data.resources < archetype.startingResourcesMin || data.resources > archetype.startingResourcesMax) {
    throw new Error("Resources must be within your archetype's range");
  }
  const spent = Object.values(data.skills).reduce((a, b) => a + b, 0) + data.resources - archetype.startingResourcesMin;
  if (spent !== allowance.skills) throw new Error("Allocate exactly the skill and resource points allowed by your age");
}

export function summarizeConditions(physical: unknown, mental: unknown) {
  const p = (physical && typeof physical === "object" ? physical : {}) as Record<string, unknown>;
  const m = (mental && typeof mental === "object" ? mental : {}) as Record<string, unknown>;
  return {
    physical: ["exhausted", "battered", "wounded"].filter((key) => p[key] === true).length,
    mental: ["angry", "frightened", "hopeless"].filter((key) => m[key] === true).length,
    isBroken: p.broken === true || m.broken === true,
  };
}
