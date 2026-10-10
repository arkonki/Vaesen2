"use server";

import { CARRIED_TYPES } from "@/lib/equipment";
import prisma from "@/lib/prisma";
import { getAppSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { characterCreationSchema, validateCharacterAllocation } from "@/lib/character-rules";
import { z } from "zod";
import { archetypeTemplateInclude, resolveStartingEquipment, startingTalentsFor } from "@/lib/archetype-template";
import type { Prisma } from "@prisma/client";
import { ADVANCE_XP_COST, MAX_SKILL_RANK, advancementSchema, ownedTalentIds, skillLabel } from "@/lib/advancement-rules";
import { setCharacterArchived } from "@/lib/character-lifecycle";

type ConditionMap = Record<string, boolean>;

const PHYSICAL_CONDITION_KEYS = ["exhausted", "battered", "wounded", "broken"] as const;
const MENTAL_CONDITION_KEYS = ["angry", "frightened", "hopeless", "broken"] as const;

async function requireSession() {
  const session = await getAppSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireCharacterAccess(characterId: string, db: Prisma.TransactionClient = prisma, actor?: Awaited<ReturnType<typeof requireSession>>) {
  const session = actor ?? await requireSession();
  if (db !== prisma) await db.$queryRaw`SELECT id FROM "Character" WHERE id = ${characterId} FOR UPDATE`;

  const character = await db.character.findUnique({
    where: { id: characterId },
    select: { id: true, userId: true, archivedAt: true },
  });

  if (!character) {
    throw new Error("Character not found");
  }
  if (character.archivedAt) throw new Error("This character is archived. Restore it before editing.");

  if (session.user.role === "ADMIN" || character.userId === session.user.id) {
    return { session, character };
  }

  if (session.user.role === "GM") {
    const gmMembership = await db.partyMember.findFirst({
      where: {
        characterId,
        party: { gmId: session.user.id },
      },
      select: { id: true },
    });

    if (gmMembership) {
      return { session, character };
    }
  }

  throw new Error("Forbidden");
}

function normalizeConditionMap(input: unknown, keys: readonly string[]): ConditionMap {
  const raw = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const normalized: ConditionMap = {};

  for (const key of keys) {
    if (raw[key] !== undefined && typeof raw[key] !== "boolean") throw new Error("Invalid condition value");
    normalized[key] = raw[key] === true;
  }

  return normalized;
}

export async function createPlayerCharacter(input: unknown) {
  const session = await requireSession();
  const data = characterCreationSchema.parse(input);

  // Extract relations
  const { attributes, skills, equipment, equipmentChoices, talentId, ...baseChar } = data;

  // DB Transaction to ensure atomicity
  const character = await prisma.$transaction(async (tx) => {
    // Serialize creation against template edits/removal; never create from an archived entry.
    await tx.$queryRaw`SELECT id FROM "Archetype" WHERE id = ${data.archetypeId} FOR SHARE`;
    const archetype = await tx.archetype.findUniqueOrThrow({ where: { id: data.archetypeId }, include: archetypeTemplateInclude });
    if (archetype.archivedAt) throw new Error("This archetype was removed from the catalogue. Choose another archetype.");
    validateCharacterAllocation(data, archetype);
    const talent = await tx.talent.findUniqueOrThrow({ where: { id: data.talentId } });
    if (!startingTalentsFor(archetype, [talent]).length) {
      throw new Error("This talent is not available to your archetype");
    }
    const inventory = archetype.equipmentGroups.length
      ? resolveStartingEquipment(archetype, equipmentChoices)
      : Array.from(new Set(equipment.map(item => item.id))).map(itemId => ({ itemId, quantity: 1 }));
    if (!archetype.equipmentGroups.length && Object.keys(equipmentChoices).length) throw new Error("Starting equipment has changed. Review your equipment choices.");
    const itemIds = inventory.map(entry => entry.itemId);
    const items = await tx.item.findMany({ where: { id: { in: itemIds }, type: { in: archetype.equipmentGroups.length ? [...CARRIED_TYPES] : CARRIED_TYPES.filter(type => type !== "MAGIC") } } });
    if (items.length !== itemIds.length) throw new Error("Invalid starting equipment selection");

    // 1. Create Character base
    const char = await tx.character.create({
      data: {
        userId: session.user.id,
        name: baseChar.name,
        archetypeId: baseChar.archetypeId,
        ageGroup: baseChar.ageGroup,
        motivation: baseChar.motivation || "",
        trauma: baseChar.trauma || "",
        darkSecret: baseChar.darkSecret || "",
        memento: baseChar.memento || "",
        relationships: baseChar.relationships,
        resources: baseChar.resources || 0,
        equipment: items.map(({ id, name, type }) => ({ id, name, type })),
        talents: talentId ? [talentId] : [], // JSON array
      }
    });

    if (items.length) {
      await tx.characterInventory.createMany({
        data: inventory.map(entry => ({ characterId: char.id, ...entry })),
      });
    }

    // 2. Create Attributes
    await tx.characterAttribute.create({
      data: {
        characterId: char.id,
        physique: attributes.physique,
        precision: attributes.precision,
        logic: attributes.logic,
        empathy: attributes.empathy,
      }
    });

    // 3. Create Skills
    await tx.characterSkill.create({
      data: {
        characterId: char.id,
        agility: skills.agility || 0,
        closeCombat: skills.closeCombat || 0,
        force: skills.force || 0,
        medicine: skills.medicine || 0,
        rangedCombat: skills.rangedCombat || 0,
        stealth: skills.stealth || 0,
        investigation: skills.investigation || 0,
        learning: skills.learning || 0,
        vigilance: skills.vigilance || 0,
        inspiration: skills.inspiration || 0,
        manipulation: skills.manipulation || 0,
        observation: skills.observation || 0,
      }
    });

    return char;
  });

  revalidatePath("/");
  revalidatePath("/characters");
  return character.id;
}

export async function updateCharacterConditions(
  characterId: string,
  data: { physicalConditions?: unknown; mentalConditions?: unknown }
) {
  const physicalConditions = normalizeConditionMap(data.physicalConditions, PHYSICAL_CONDITION_KEYS);
  const mentalConditions = normalizeConditionMap(data.mentalConditions, MENTAL_CONDITION_KEYS);

  const session = await requireSession();
  const character = await prisma.$transaction(async tx => {
    await requireCharacterAccess(characterId, tx, session);
    return tx.character.update({
    where: { id: characterId },
    data: {
      ...(data.physicalConditions !== undefined ? { physicalConditions } : {}),
      ...(data.mentalConditions !== undefined ? { mentalConditions } : {}),
    },
    select: { id: true },
    });
  });

  revalidatePath(`/characters/${character.id}`);
  return character;
}

export async function updateCharacterExperience(characterId: string, experiencePoints: number, expectedVersion: number) {
  const session = await requireSession();
  const normalizedXp = z.number().int().min(0).max(9999).parse(experiencePoints);
  const version = z.number().int().min(0).parse(expectedVersion);
  const character = await prisma.$transaction(async tx => {
    await requireCharacterAccess(characterId, tx, session);
    const changed = await tx.character.updateMany({ where: { id: characterId, experienceVersion: version },
      data: { experiencePoints: normalizedXp, experienceVersion: { increment: 1 } } });
    if (changed.count !== 1) throw new Error("Experience changed in another action. Refresh the sheet before editing XP.");
    return tx.character.findUniqueOrThrow({ where: { id: characterId }, select: { id: true, experiencePoints: true, experienceVersion: true } });
  });
  revalidatePath(`/characters/${character.id}`);
  revalidatePath("/"); revalidatePath("/characters");
  return character;
}

function advancementEntry(entry: { id: string; kind: "SKILL" | "TALENT"; targetName: string; previousValue: number | null; newValue: number | null; xpCost: number; xpBefore: number; xpAfter: number; actorName: string; createdAt: Date }) {
  return { id: entry.id, kind: entry.kind, targetName: entry.targetName, previousValue: entry.previousValue,
    newValue: entry.newValue, xpCost: entry.xpCost, xpBefore: entry.xpBefore, xpAfter: entry.xpAfter,
    actorName: entry.actorName, createdAt: entry.createdAt.toISOString() };
}

export async function purchaseCharacterAdvancement(characterId: string, input: unknown) {
  const id = z.string().uuid().parse(characterId);
  const data = advancementSchema.parse(input);
  const session = await requireSession();
  const result = await prisma.$transaction(async tx => {
    // Serialize purchases, XP edits and automatic awards on this character's row.
    await tx.$queryRaw`SELECT "id" FROM "Character" WHERE "id" = ${id} FOR UPDATE`;
    await requireCharacterAccess(id, tx, session);
    const character = await tx.character.findUniqueOrThrow({ where: { id }, select: {
      experiencePoints: true, experienceVersion: true, talents: true, skill: true,
    } });
    const previous = await tx.characterAdvancement.findUnique({ where: { characterId_requestId: { characterId: id, requestId: data.requestId } } });
    if (previous) {
      if (previous.kind !== data.kind || previous.targetKey !== data.target || (data.kind === "SKILL" && previous.previousValue !== data.expectedRank)) {
        throw new Error("This request was already used for another advancement.");
      }
      return { entry: advancementEntry(previous), experiencePoints: character.experiencePoints, experienceVersion: character.experienceVersion };
    }
    if (character.experienceVersion !== data.expectedVersion) throw new Error("This sheet has changed. Refresh before spending XP.");
    if (character.experiencePoints < ADVANCE_XP_COST) throw new Error("You need 5 unspent XP for an Advance.");
    let targetName: string;
    let previousValue: number | null = null;
    let newValue: number | null = null;
    if (data.kind === "SKILL") {
      if (!character.skill) throw new Error("This character has no skill record. Ask an administrator to repair the sheet.");
      previousValue = character.skill[data.target];
      if (previousValue < 0 || previousValue >= MAX_SKILL_RANK) throw new Error("Skills cannot advance beyond 5.");
      if (previousValue !== data.expectedRank) throw new Error("This skill has changed. Refresh before advancing it.");
      newValue = previousValue + 1;
      targetName = skillLabel(data.target);
      await tx.characterSkill.update({ where: { characterId: id }, data: { [data.target]: newValue } });
    } else {
      const talent = await tx.talent.findUnique({ where: { id: data.target } });
      if (!talent) throw new Error("This talent no longer exists. Refresh the available talents.");
      const talents = ownedTalentIds(character.talents);
      if (talents.includes(talent.id)) throw new Error("You already know this talent.");
      targetName = talent.name;
      await tx.character.update({ where: { id }, data: { talents: [...talents, talent.id] } });
    }
    const xpAfter = character.experiencePoints - ADVANCE_XP_COST;
    const updated = await tx.character.update({ where: { id }, data: { experiencePoints: xpAfter, experienceVersion: { increment: 1 } },
      select: { experiencePoints: true, experienceVersion: true } });
    const entry = await tx.characterAdvancement.create({ data: {
      characterId: id, actorId: session.user.id, actorName: session.user.name || session.user.role,
      requestId: data.requestId, kind: data.kind, targetKey: data.target, targetName,
      previousValue, newValue, xpCost: ADVANCE_XP_COST, xpBefore: character.experiencePoints, xpAfter,
    } });
    return { entry: advancementEntry(entry), ...updated };
  });
  revalidatePath(`/characters/${id}`); revalidatePath("/"); revalidatePath("/characters");
  return result;
}

export async function getCharacterAdvancements(characterId: string, cursor?: string) {
  const id = z.string().uuid().parse(characterId);
  await requireCharacterAccess(id);
  if (cursor) {
    z.string().uuid().parse(cursor);
    if (!await prisma.characterAdvancement.findFirst({ where: { id: cursor, characterId: id }, select: { id: true } })) throw new Error("Invalid history cursor.");
  }
  const entries = await prisma.characterAdvancement.findMany({ where: { characterId: id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  return { entries: entries.slice(0, 20).map(advancementEntry), hasMore: entries.length > 20 };
}

export async function tryPurchaseCharacterAdvancement(characterId: string, input: unknown) {
  try { return { ok: true as const, ...await purchaseCharacterAdvancement(characterId, input) }; }
  catch (error) {
    const safeMessages = ["Unauthorized", "Forbidden", "Character not found", "This request was already used for another advancement.",
      "This sheet has changed. Refresh before spending XP.", "You need 5 unspent XP for an Advance.", "Skills cannot advance beyond 5.",
      "This character has no skill record. Ask an administrator to repair the sheet.", "This skill has changed. Refresh before advancing it.",
      "This talent no longer exists. Refresh the available talents.", "You already know this talent.",
      "This character has legacy talent data that needs review before learning a talent.", "This character is archived. Restore it before editing."];
    return { ok: false as const, error: error instanceof z.ZodError ? "Invalid advancement request." : error instanceof Error && safeMessages.includes(error.message)
      ? error.message : "The Advance could not be confirmed. Retry the same choice or refresh the sheet." };
  }
}

export async function updateCharacterJournal(
  characterId: string,
  data: { notes?: string; relationships?: string }
) {
  const journal = z.object({ notes: z.string().max(50000).optional(), relationships: z.string().max(50000).optional() }).parse(data);
  const session = await requireSession();
  const character = await prisma.$transaction(async tx => {
    await requireCharacterAccess(characterId, tx, session);
    return tx.character.update({
    where: { id: characterId },
    data: {
      ...journal,
    },
    select: { id: true, notes: true, relationships: true },
    });
  });

  revalidatePath(`/characters/${character.id}`);
  return character;
}

export async function archiveCharacter(input: unknown) {
  const result = await setCharacterArchived(input);
  revalidatePath("/");
  revalidatePath("/characters");
  revalidatePath(`/characters/${result.id}`);
  revalidatePath("/parties");
  for (const id of result.partyIds) revalidatePath(`/parties/${id}`, "layout");
  return { id: result.id };
}
