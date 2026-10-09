import prisma from "./prisma";
import { equipmentInclude, equipmentSchema, legacyEquipmentFields, canCarryItem } from "./equipment";

export async function saveEquipment(input: unknown, id?: string) {
  const item = equipmentSchema.parse(input);
  const { usages, ...fields } = item;
  return prisma.$transaction(async tx => {
    if (id && !canCarryItem(item)) {
      const references = await Promise.all([tx.characterInventory.count({ where: { itemId: id } }), tx.partyStashItem.count({ where: { itemId: id } }),
        tx.castlePreparedItem.count({ where: { itemId: id } }), tx.archetypeEquipmentOption.count({ where: { itemId: id } })]);
      if (references.some(Boolean)) throw new Error("This item is used as carried equipment. Remove its inventory and starting-equipment links before making it a service or reference.");
    }
    const duplicates = await tx.item.count({ where: { name: { equals: fields.name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) } });
    const record = id ? await tx.item.update({ where: { id }, data: { ...fields, ...legacyEquipmentFields(item) } })
      : await tx.item.create({ data: { ...fields, ...legacyEquipmentFields(item) } });
    await tx.itemUsage.deleteMany({ where: { itemId: record.id } });
    if (usages.length) await tx.itemUsage.createMany({ data: usages.map((usage, position) => ({ ...usage, position, itemId: record.id })) });
    return { item: await tx.item.findUniqueOrThrow({ where: { id: record.id }, include: equipmentInclude }), duplicateName: duplicates > 0 };
  });
}
