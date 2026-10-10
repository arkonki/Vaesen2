import { CARRIED_TYPES } from "./equipment";
import prisma from "./prisma";
import { archetypeTemplateInclude, archetypeTemplateSchema } from "./archetype-template";
import { z } from "zod";

export async function saveArchetypeTemplate(input: unknown, id?: string, expectedRevision?: number) {
  const { startingTalentIds, equipmentGroups, ...fields } = archetypeTemplateSchema.parse(input);
  if (id && !z.number().int().nonnegative().safeParse(expectedRevision).success) throw new Error("Reload the archetype before saving.");
  return prisma.$transaction(async tx => {
    if (id) {
      const updated = await tx.archetype.updateMany({ where: { id, revision: expectedRevision }, data: { ...fields, revision: { increment: 1 } } });
      if (!updated.count) throw new Error("This archetype changed in another tab. Reload before saving.");
    }
    const archetype = id ? await tx.archetype.findUniqueOrThrow({ where: { id } }) : await tx.archetype.create({ data: fields });
    const talentIds = [...new Set(startingTalentIds)];
    const talents = await tx.talent.findMany({ where: { id: { in: talentIds } } });
    if (talents.length !== talentIds.length || talents.some(talent => talent.type !== "GENERAL" && talent.archetypeId !== archetype.id)) {
      throw new Error("Starting talents must be general talents or belong to this archetype.");
    }
    const itemIds = [...new Set(equipmentGroups.flatMap(group => group.itemIds))];
    const items = await tx.item.findMany({ where: { id: { in: itemIds }, type: { in: [...CARRIED_TYPES] } } });
    if (items.length !== itemIds.length) throw new Error("Choose existing carried equipment, not services or references.");

    await tx.archetypeStartingTalent.deleteMany({ where: { archetypeId: archetype.id, talentId: { notIn: talentIds } } });
    if (talentIds.length) await tx.archetypeStartingTalent.createMany({
      data: talentIds.map(talentId => ({ archetypeId: archetype.id, talentId })), skipDuplicates: true,
    });
    const previous = await tx.archetypeEquipmentGroup.findMany({ where: { archetypeId: archetype.id } });
    const groupIds = equipmentGroups.flatMap(group => group.id ? [group.id] : []);
    if (new Set(groupIds).size !== groupIds.length || groupIds.some(id => !previous.some(group => group.id === id))) throw new Error("Equipment groups changed. Reload before saving.");
    await tx.archetypeEquipmentGroup.deleteMany({ where: { archetypeId: archetype.id, id: { notIn: groupIds } } });
    for (const [position, group] of equipmentGroups.entries()) {
      const data = { label: group.label, quantity: group.quantity, position };
      const saved = group.id ? await tx.archetypeEquipmentGroup.update({ where: { id: group.id }, data }) : await tx.archetypeEquipmentGroup.create({ data: { ...data, archetypeId: archetype.id } });
      await tx.archetypeEquipmentOption.deleteMany({ where: { groupId: saved.id, itemId: { notIn: group.itemIds } } });
      await tx.archetypeEquipmentOption.createMany({ data: [...new Set(group.itemIds)].map(itemId => ({ groupId: saved.id, itemId })), skipDuplicates: true });
    }
    return tx.archetype.findUniqueOrThrow({ where: { id: archetype.id }, include: archetypeTemplateInclude });
  });
}

const archiveSchema = z.object({ id: z.string().uuid(), expectedRevision: z.number().int().nonnegative(), confirmationName: z.string().trim().min(1).max(100), archived: z.boolean() }).strict();

export async function setArchetypeArchived(input: unknown) {
  const data = archiveSchema.parse(input);
  return prisma.$transaction(async tx => {
    const record = await tx.archetype.findUniqueOrThrow({ where: { id: data.id } });
    if (data.confirmationName !== record.name) throw new Error("Type the archetype's exact name to confirm.");
    if (Boolean(record.archivedAt) === data.archived) throw new Error("This entry changed. Reload the catalogue.");
    const result = await tx.archetype.updateMany({ where: { id: record.id, revision: data.expectedRevision }, data: { archivedAt: data.archived ? new Date() : null, revision: { increment: 1 } } });
    if (!result.count) throw new Error("This archetype changed in another tab. Reload before continuing.");
    return tx.archetype.findUniqueOrThrow({ where: { id: record.id } });
  });
}
