/* eslint-disable @typescript-eslint/no-require-imports -- Shared by Prisma bootstrap and the content CLI. */
const academic = require("./academic.json");

const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sameNames = (left, right) => equal([...left].sort(), [...right].sort());

async function uniqueByName(model, name) {
  const matches = await model.findMany({ where: { name: { equals: name, mode: "insensitive" } } });
  if (matches.length > 1) throw new Error(`Multiple records named ${name}; resolve duplicates in Admin before importing.`);
  return matches[0];
}

function conflict(name) {
  throw new Error(`Custom content conflicts with ${name}. No changes were made; review it in Admin instead of overwriting it.`);
}

/** Custom content requires an explicit replacement request; characters are never rewritten. */
async function installAcademicTemplate(prisma, { apply = false, replace = false } = {}) {
  return prisma.$transaction(async tx => {
    if (apply) await tx.$queryRaw`SELECT pg_advisory_xact_lock(73904243)::text`;
    const existing = await uniqueByName(tx.archetype, academic.archetype.name);
    const changes = [];
    const fields = academic.archetype;
    const update = {};
    if (existing) {
      if (!replace && (existing.mainAttribute.toLowerCase() !== fields.mainAttribute || existing.mainSkill.toLowerCase() !== fields.mainSkill)) conflict("Academic main attribute/skill");
      const range = [existing.startingResourcesMin, existing.startingResourcesMax];
      if (!replace && !equal(range, [1, 3]) && !equal(range, [4, 6])) conflict("Academic resources");
      for (const [key, value] of Object.entries(fields)) {
        if (["name", "mainAttribute", "mainSkill", "startingResourcesMin", "startingResourcesMax"].includes(key)) continue;
        if (!replace && existing[key]?.length && !equal(existing[key], value)) conflict(`Academic ${key}`);
      }
      for (const [key, value] of Object.entries(fields)) if (!equal(existing[key], value)) update[key] = value;
      if (Object.keys(update).length) changes.push("Complete Academic suggestions and set Resources 4-6");
    } else changes.push("Create Academic reference template");

    const talents = [];
    for (const data of academic.talents) {
      const record = await uniqueByName(tx.talent, data.name);
      const needsUpdate = record && (record.description !== data.description || record.type !== "ARCHETYPE" || record.archetypeId !== existing?.id);
      if (needsUpdate && !replace) conflict(data.name);
      if (needsUpdate && ((record.archetypeId && record.archetypeId !== existing?.id) || await tx.archetypeStartingTalent.count({ where: { talentId: record.id, archetypeId: { not: existing?.id || "" } } }))) {
        throw new Error(`Cannot replace ${data.name}: it belongs to or is offered by another archetype. Resolve that reference in Admin first.`);
      }
      if (needsUpdate) changes.push(`Update talent rules: ${data.name}`);
      if (!record) changes.push(`Create talent: ${data.name}`);
      talents.push({ data, record, needsUpdate });
    }
    const items = [];
    for (const data of academic.items) {
      const record = await uniqueByName(tx.item, data.name);
      const needsUpdate = record && Object.entries(data).some(([key, value]) => record[key] !== value);
      if (needsUpdate && !replace) conflict(data.name);
      if (record && record.type !== "GEAR") throw new Error(`Cannot reclassify ${data.name}; resolve the conflicting item type in Admin first.`);
      if (needsUpdate) changes.push(`Update equipment rules: ${data.name}`);
      if (!record) changes.push(`Create equipment: ${data.name}`);
      items.push({ data, record, needsUpdate });
    }
    let links = [];
    let groups = [];
    if (existing) {
      links = await tx.archetypeStartingTalent.findMany({ where: { archetypeId: existing.id }, include: { talent: true } });
      groups = await tx.archetypeEquipmentGroup.findMany({ where: { archetypeId: existing.id }, orderBy: { position: "asc" }, include: { options: { include: { item: true } } } });
    }
    const replaceLinks = links.length > 0 && !sameNames(links.map(link => link.talent.name), academic.talents.map(talent => talent.name));
    const replaceGroups = groups.length > 0 && (groups.length !== academic.equipmentGroups.length || groups.some((group, position) => {
      const expected = academic.equipmentGroups[position];
      return group.position !== position || group.label !== expected.label || group.quantity !== expected.quantity || !sameNames(group.options.map(option => option.item.name), expected.items);
    }));
    if (!replace && replaceLinks) conflict("Academic starting talents");
    if (!replace && replaceGroups) conflict("Academic equipment groups");
    if (!links.length || replaceLinks) changes.push("Link the three Academic starting talents");
    if (!groups.length || replaceGroups) changes.push("Configure fixed gear and two equipment alternatives");
    if (!apply || !changes.length) return { applied: false, archetypeId: existing?.id, changes };

    const archetype = existing
      ? Object.keys(update).length ? await tx.archetype.update({ where: { id: existing.id }, data: update }) : existing
      : await tx.archetype.create({ data: fields });
    const talentIds = [];
    for (const { data, record, needsUpdate } of talents) {
      if (needsUpdate) await tx.talent.update({ where: { id: record.id }, data: { ...data, type: "ARCHETYPE", archetypeId: archetype.id } });
      talentIds.push(record?.id || (await tx.talent.create({ data: { ...data, type: "ARCHETYPE", archetypeId: archetype.id } })).id);
    }
    const itemIds = new Map();
    for (const { data, record, needsUpdate } of items) {
      if (needsUpdate) await tx.item.update({ where: { id: record.id }, data });
      itemIds.set(data.name, record?.id || (await tx.item.create({ data })).id);
    }
    if (replaceLinks) await tx.archetypeStartingTalent.deleteMany({ where: { archetypeId: archetype.id } });
    if (!links.length || replaceLinks) await tx.archetypeStartingTalent.createMany({ data: talentIds.map(talentId => ({ archetypeId: archetype.id, talentId })) });
    if (replaceGroups) await tx.archetypeEquipmentGroup.deleteMany({ where: { archetypeId: archetype.id } });
    if (!groups.length || replaceGroups) for (const [position, group] of academic.equipmentGroups.entries()) {
      await tx.archetypeEquipmentGroup.create({ data: {
        archetypeId: archetype.id, label: group.label, quantity: group.quantity, position,
        options: { create: group.items.map(name => ({ itemId: itemIds.get(name) })) },
      } });
    }
    return { applied: true, archetypeId: archetype.id, changes };
  }, { isolationLevel: "Serializable" });
}

module.exports = { academic, installAcademicTemplate };
