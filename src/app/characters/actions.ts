"use server";

import prisma from "@/lib/prisma";
import { getAppSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { characterCreationSchema, validateCharacterAllocation } from "@/lib/character-rules";
import { z } from "zod";

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
    if (raw[key] !== undefined && typeof raw[key] !== "boolean") throw new Error("Invalid condition value");
    normalized[key] = raw[key] === true;
  }

  return normalized;
}

export async function createPlayerCharacter(input: unknown) {
  const session = await requireSession();
  const data = characterCreationSchema.parse(input);

  // Extract relations
  const { attributes, skills, equipment, talentId, ...baseChar } = data;

  // DB Transaction to ensure atomicity
  const character = await prisma.$transaction(async (tx) => {
    const archetype = await tx.archetype.findUniqueOrThrow({ where: { id: data.archetypeId } });
    validateCharacterAllocation(data, archetype);
    const talent = await tx.talent.findUniqueOrThrow({ where: { id: data.talentId } });
    if (talent.type !== "GENERAL" && talent.archetypeId !== archetype.id) {
      throw new Error("This talent is not available to your archetype");
    }
    const itemIds = Array.from(new Set(equipment.map((item) => item.id)));
    const items = await tx.item.findMany({ where: { id: { in: itemIds }, type: { not: "MAGIC" } } });
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
        resources: baseChar.resources || 0,
        equipment: items.map(({ id, name, type }) => ({ id, name, type })),
        talents: talentId ? [talentId] : [], // JSON array
      }
    });

    if (items.length) {
      await tx.characterInventory.createMany({
        data: items.map((item) => ({ characterId: char.id, itemId: item.id, quantity: 1 })),
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
  await requireCharacterAccess(characterId);

  const physicalConditions = normalizeConditionMap(data.physicalConditions, PHYSICAL_CONDITION_KEYS);
  const mentalConditions = normalizeConditionMap(data.mentalConditions, MENTAL_CONDITION_KEYS);

  const character = await prisma.character.update({
    where: { id: characterId },
    data: {
      ...(data.physicalConditions !== undefined ? { physicalConditions } : {}),
      ...(data.mentalConditions !== undefined ? { mentalConditions } : {}),
    },
    select: { id: true },
  });

  revalidatePath(`/characters/${character.id}`);
  return character;
}

export async function updateCharacterExperience(characterId: string, experiencePoints: number) {
  await requireCharacterAccess(characterId);

  const normalizedXp = z.number().int().min(0).max(9999).parse(experiencePoints);

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
  const journal = z.object({ notes: z.string().max(50000).optional(), relationships: z.string().max(50000).optional() }).parse(data);

  const character = await prisma.character.update({
    where: { id: characterId },
    data: {
      ...journal,
    },
    select: { id: true, notes: true, relationships: true },
  });

  revalidatePath(`/characters/${character.id}`);
  return character;
}
