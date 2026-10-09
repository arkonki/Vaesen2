import type { Item, ItemUsage } from "@prisma/client";
import { z } from "zod";
import { SKILL_KEYS } from "./character-rules";

export const EQUIPMENT_TYPES = ["GEAR", "WEAPON", "ARMOR", "MAGIC", "SERVICE", "COVER", "ATTACK"] as const;
export const CARRIED_TYPES = ["GEAR", "WEAPON", "ARMOR", "MAGIC"] as const;
export const equipmentInclude = { usages: { orderBy: { position: "asc" as const } } };
export type EquipmentItem = Item & { usages?: ItemUsage[] };
export const skillName = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, value => value.toUpperCase());
export const typeName = (type: string) => ({ GEAR: "Equipment", WEAPON: "Weapon", ARMOR: "Armor", MAGIC: "Magic item", SERVICE: "Service / establishment", COVER: "Cover", ATTACK: "Attack reference" }[type] ?? type);
export const canCarryItem = (item: { type: string }) => (CARRIED_TYPES as readonly string[]).includes(item.type);
const nullableNumber = (max: number) => z.number().int().min(0).max(max).nullable().default(null);
const usageSchema = z.object({
  label: z.string().trim().min(1).max(100), kind: z.enum(["TOOL", "ATTACK", "NARRATIVE"]),
  skills: z.array(z.enum(SKILL_KEYS)).max(12).refine(keys => new Set(keys).size === keys.length, "Do not repeat skills"),
  bonus: z.number().int().min(-20).max(20), effect: z.string().trim().min(1).max(10000),
  requirements: z.string().trim().max(5000).default(""), damage: nullableNumber(30), rangeMin: nullableNumber(20), rangeMax: nullableNumber(20),
}).strict().superRefine((usage, ctx) => {
  if (usage.kind === "ATTACK" && (!usage.skills.length || usage.damage === null || usage.damage < 1 || usage.rangeMin === null || usage.rangeMax === null || usage.rangeMin > usage.rangeMax)) {
    ctx.addIssue({ code: "custom", message: "Attacks need skills, positive damage, and a valid minimum/maximum zone range" });
  }
  if (usage.kind !== "ATTACK" && [usage.damage, usage.rangeMin, usage.rangeMax].some(value => value !== null)) ctx.addIssue({ code: "custom", message: "Only attack profiles have damage and range" });
  if (usage.kind === "NARRATIVE" && usage.bonus !== 0) ctx.addIssue({ code: "custom", message: "Narrative effects are not dice bonuses" });
  if (usage.kind === "TOOL" && usage.bonus !== 0 && !usage.skills.length) ctx.addIssue({ code: "custom", message: "Choose the skills supported by this bonus" });
});
export const equipmentSchema = z.object({
  name: z.string().trim().min(1).max(150), type: z.enum(EQUIPMENT_TYPES), description: z.string().trim().max(20000).default(""),
  bonus: z.number().int().min(-20).max(20).default(0),
  availability: z.number().int().min(0).max(5), sourceBook: z.string().trim().max(200).nullable().default(null), sourcePage: nullableNumber(9999),
  protection: nullableNumber(30), agilityPenalty: nullableNumber(20), doses: nullableNumber(9999), toxicity: nullableNumber(30),
  usages: z.array(usageSchema).max(20),
}).strict().superRefine((item, ctx) => {
  const error = (message: string) => ctx.addIssue({ code: "custom", message });
  if (["COVER", "ATTACK"].includes(item.type) && item.availability !== 0) error("Cover and attack references are not purchased independently; availability must be 0");
  if (item.sourcePage !== null && item.sourcePage < 1) error("Source page must be positive");
  if (canCarryItem(item) && item.availability < 1 && (!["GEAR","MAGIC"].includes(item.type) || !item.usages.length || item.usages.some(u=>u.kind !== "NARRATIVE"))) error("Availability 0 is only for unpriced narrative starting gear; ordinary carried equipment needs availability 1-5");
  if (item.type === "SERVICE" && (item.availability < 1 || !item.usages.length || item.usages.some(u => u.kind !== "NARRATIVE"))) error("Services need availability 1-5 and narrative party effects");
  if (["WEAPON", "ATTACK"].includes(item.type) && !item.usages.some(u => u.kind === "ATTACK")) error("Weapons and attack references need an attack profile");
  if (["ARMOR", "COVER"].includes(item.type) && (item.protection === null || item.protection < 1)) error("Armor and cover need a positive Protection value");
  if (item.type === "ARMOR" && item.agilityPenalty === null) error("Armor needs an Agility penalty (0 if none)");
  if (!["ARMOR", "COVER"].includes(item.type) && item.protection !== null) error("Protection belongs to armor or cover");
  if (item.type !== "ARMOR" && item.agilityPenalty !== null) error("Only armor has an Agility penalty");
  if (["SERVICE", "COVER", "ATTACK"].includes(item.type) && (item.doses !== null || item.toxicity !== null)) error("Only carried equipment has doses or toxicity");
  if (item.doses !== null && item.doses < 1) error("Doses per purchase must be positive");
  if (item.toxicity !== null && (!item.doses || item.toxicity < 1)) error("Poison needs positive toxicity and doses per purchase");
  if (["ARMOR", "COVER"].includes(item.type) && item.usages.some(u => u.kind !== "NARRATIVE")) error("Protection is not an attack or skill bonus");
});
export type EquipmentInput = z.infer<typeof equipmentSchema>;

export function legacyEquipmentFields(item: EquipmentInput) {
  const first = item.usages.find(u => u.kind === (item.type === "WEAPON" || item.type === "ATTACK" ? "ATTACK" : "TOOL"));
  const attack = item.usages.find(u => u.kind === "ATTACK");
  return { bonus: item.bonus, skill: first?.skills.map(skillName).join(", ") || null,
    damage: attack?.damage ?? null, range: attack ? `${attack.rangeMin}${attack.rangeMin === attack.rangeMax ? "" : `-${attack.rangeMax}`}` : null };
}

export function profilesFor(item: EquipmentItem) {
  if (item.usages?.length) return item.usages;
  if (!canCarryItem(item) || item.type === "ARMOR") return [];
  const skills = SKILL_KEYS.filter(key => (item.skill ?? "").replace(/[^a-z]/gi, "").toLowerCase().includes(key.toLowerCase()));
  return [{ id: `legacy-${item.id}`, itemId: item.id, label: "Legacy use (GM review)", kind: item.type === "WEAPON" ? "ATTACK" as const : "TOOL" as const,
    skills, bonus: item.bonus, effect: item.description || "The GM confirms when this equipment applies.", requirements: "Legacy entry; review its usage profiles in Admin.",
    damage: item.damage, rangeMin: null, rangeMax: null, position: 0 }];
}

export function equipmentBonusLabel(item: EquipmentItem) {
  const profiles = profilesFor(item).filter(profile => profile.kind !== "NARRATIVE");
  if (!profiles.length) return "Special effect";
  return [...new Set(profiles.map(profile => `${profile.bonus >= 0 ? "+" : ""}${profile.bonus}`))].join(" / ");
}
