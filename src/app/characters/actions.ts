"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type ConditionMap = Record<string, boolean>;

const PHYSICAL_CONDITION_KEYS = ["exhausted", "battered", "wounded", "broken"] as const;
const MENTAL_CONDITION_KEYS = ["angry", "frightened", "hopeless", "broken"] as const;

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireCharacterAccess(characterId: string) {
  const session = await requireSession();

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, userId: true },
  });

  if (!character) {
    throw new Error("Character not found");
  }

  if (session.user.role === "ADMIN" || character.userId === session.user.id) {
    return { session, character };
  }

  if (session.user.role === "GM") {
    const gmMembership = await prisma.partyMember.findFirst({
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
    normalized[key] = Boolean(raw[key]);
  }

  return normalized;
}

export async function createPlayerCharacter(data: any) {
  const session = await requireSession();

  // Basic validation
  if (!data.name || !data.archetypeId || !data.ageGroup) {
    throw new Error("Missing required fields");
  }

  // Extract relations
  const { attributes, skills, equipment, talentId, ...baseChar } = data;

  // DB Transaction to ensure atomicity
  const character = await prisma.$transaction(async (tx) => {
    const normalizedEquipment = Array.isArray(equipment) ? equipment : [];

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
        resources: baseChar.resources || 0,
        equipment: normalizedEquipment, // legacy JSON storage for backward compatibility
        talents: talentId ? [talentId] : [], // JSON array
      }
    });

    const requestedItemIds = Array.from(
      new Set(
        normalizedEquipment
          .map((item: unknown) =>
            item && typeof item === "object" && "id" in item ? String((item as { id: string }).id) : null
          )
          .filter((id): id is string => Boolean(id))
      )
    );

    if (requestedItemIds.length > 0) {
      const existingItems = await tx.item.findMany({
        where: { id: { in: requestedItemIds } },
        select: { id: true },
      });

      if (existingItems.length > 0) {
        await tx.characterInventory.createMany({
          data: existingItems.map((item) => ({
            characterId: char.id,
            itemId: item.id,
            quantity: 1,
          })),
        });
      }
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

  return character.id;
}

export async function updateCharacterConditions(
  characterId: string,
  data: { physicalConditions?: unknown; mentalConditions?: unknown }
) {
  await requireCharacterAccess(characterId);

  const physicalConditions = normalizeConditionMap(data.physicalConditions, PHYSICAL_CONDITION_KEYS);
  const mentalConditions = normalizeConditionMap(data.mentalConditions, MENTAL_CONDITION_KEYS);

  const character = await prisma.character.update({
    where: { id: characterId },
    data: {
      physicalConditions,
      mentalConditions,
    },
    select: { id: true },
  });

  revalidatePath(`/characters/${character.id}`);
  return character;
}

export async function updateCharacterExperience(characterId: string, experiencePoints: number) {
  await requireCharacterAccess(characterId);

  const normalizedXp = Number.isFinite(experiencePoints)
    ? Math.min(10, Math.max(0, Math.trunc(experiencePoints)))
    : 0;

  const character = await prisma.character.update({
    where: { id: characterId },
    data: { experiencePoints: normalizedXp },
    select: { id: true, experiencePoints: true },
  });

  revalidatePath(`/characters/${character.id}`);
  return character;
}

export async function updateCharacterJournal(
  characterId: string,
  data: { notes?: string; relationships?: string }
) {
  await requireCharacterAccess(characterId);

  const character = await prisma.character.update({
    where: { id: characterId },
    data: {
      notes: data.notes ?? "",
      relationships: data.relationships ?? "",
    },
    select: { id: true, notes: true, relationships: true },
  });

  revalidatePath(`/characters/${character.id}`);
  return character;
}
