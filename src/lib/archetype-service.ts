import prisma from "./prisma";
import { archetypeTemplateInclude, archetypeTemplateSchema } from "./archetype-template";

export async function saveArchetypeTemplate(input: unknown, id?: string) {
  const { startingTalentIds, equipmentGroups, ...fields } = archetypeTemplateSchema.parse(input);
  return prisma.$transaction(async tx => {
    const archetype = id
      ? await tx.archetype.update({ where: { id }, data: fields })
      : await tx.archetype.create({ data: fields });
    const talentIds = [...new Set(startingTalentIds)];
    const talents = await tx.talent.findMany({ where: { id: { in: talentIds } } });
    if (talents.length !== talentIds.length || talents.some(talent => talent.type !== "GENERAL" && talent.archetypeId !== archetype.id)) {
      throw new Error("Starting talents must be general talents or belong to this archetype.");
    }
    const itemIds = [...new Set(equipmentGroups.flatMap(group => group.itemIds))];
    const items = await tx.item.findMany({ where: { id: { in: itemIds }, type: { not: "MAGIC" } } });
    if (items.length !== itemIds.length) throw new Error("Choose existing, non-magical starting equipment.");

    await tx.archetypeStartingTalent.deleteMany({ where: { archetypeId: archetype.id } });
    if (talentIds.length) await tx.archetypeStartingTalent.createMany({
      data: talentIds.map(talentId => ({ archetypeId: archetype.id, talentId })),
    });
    await tx.archetypeEquipmentGroup.deleteMany({ where: { archetypeId: archetype.id } });
    for (const [position, group] of equipmentGroups.entries()) {
      await tx.archetypeEquipmentGroup.create({ data: {
        archetypeId: archetype.id, label: group.label, quantity: group.quantity, position,
        options: { create: [...new Set(group.itemIds)].map(itemId => ({ itemId })) },
      } });
    }
    return tx.archetype.findUniqueOrThrow({ where: { id: archetype.id }, include: archetypeTemplateInclude });
  });
}
