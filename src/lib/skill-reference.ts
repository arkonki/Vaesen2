import { z } from "zod";
import { SKILL_KEYS } from "./character-rules";
export const SKILL_ATTRIBUTES = {
  agility: "physique", closeCombat: "physique", force: "physique",
  medicine: "precision", rangedCombat: "precision", stealth: "precision",
  investigation: "logic", learning: "logic", vigilance: "logic",
  inspiration: "empathy", manipulation: "empathy", observation: "empathy",
} as const;
const lines = z.array(z.string().trim().min(1).max(3000)).max(30);
export const skillReferenceSchema = z.object({
  key: z.enum(SKILL_KEYS), description: z.string().trim().min(1).max(20000),
  extraSuccesses: lines, guidance: lines,
  sourceBook: z.string().trim().max(200).nullable(),
  sourcePages: z.array(z.number().int().min(1).max(9999)).max(20),
}).strict();
