"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createPlayerCharacter(data: any) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Basic validation
  if (!data.name || !data.archetypeId || !data.ageGroup) {
    throw new Error("Missing required fields");
  }

  // Extract relations
  const { attributes, skills, equipment, talentId, ...baseChar } = data;

  // DB Transaction to ensure atomicity
  const character = await prisma.$transaction(async (tx) => {
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
        equipment: equipment || [], // JSON array
        talents: talentId ? [talentId] : [], // JSON array
      }
    });

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
