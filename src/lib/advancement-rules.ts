import { z } from "zod";
import { SKILL_KEYS } from "./character-rules";

export const ADVANCE_XP_COST = 5;
export const MAX_SKILL_RANK = 5;
export const skillLabel = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, value => value.toUpperCase());
const shared = { requestId: z.string().uuid(), expectedVersion: z.number().int().min(0) };
export const advancementSchema = z.discriminatedUnion("kind", [
  z.object({ ...shared, kind: z.literal("SKILL"), target: z.enum(SKILL_KEYS), expectedRank: z.number().int().min(0).max(4) }).strict(),
  z.object({ ...shared, kind: z.literal("TALENT"), target: z.string().uuid() }).strict(),
]);
export type AdvancementInput = z.infer<typeof advancementSchema>;
export type AdvancementEntry = {
  id: string; kind: "SKILL" | "TALENT"; targetName: string; previousValue: number | null;
  newValue: number | null; xpCost: number; xpBefore: number; xpAfter: number;
  actorName: string; createdAt: string;
};

export function ownedTalentIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(entry => typeof entry !== "string")) {
    throw new Error("This character has legacy talent data that needs review before learning a talent.");
  }
  return [...new Set(value)];
}
