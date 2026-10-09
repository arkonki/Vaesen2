import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { createPrismaClient } from "../prisma/client.js";
import { archetypeTemplateInclude, resolveStartingEquipment, startingTalentsFor } from "../src/lib/archetype-template";

const { academic, installAcademicTemplate } = createRequire(import.meta.url)("../prisma/content/academic.js");
const url = process.env.CONTENT_TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith("_test")) throw new Error("Academic content tests require their own isolated database ending in _test");
const prisma = url ? createPrismaClient(url) : undefined;

describe.skipIf(!prisma)("Academic reference content in an isolated catalogue", () => {
  beforeAll(async () => {
    const counts = await Promise.all([prisma!.user.count(), prisma!.archetype.count(), prisma!.talent.count(), prisma!.item.count()]);
    if (counts.some(count => count !== 0)) throw new Error("Content tests require a fresh, empty catalogue; refusing to modify an existing test database");
  });
  afterAll(async () => { await prisma?.$disconnect(); });
  it("previews without adding any records", async () => {
    expect(await prisma!.archetype.count()).toBe(0);
    const report = await installAcademicTemplate(prisma);
    expect(report.applied).toBe(false);
    expect(report.changes).toHaveLength(11);
    expect(await prisma!.archetype.count()).toBe(0);
    expect(await prisma!.item.count()).toBe(0);
  });
  it("upgrades the legacy Academic and preserves its character and existing talent", async () => {
    const archetype = await prisma!.archetype.create({ data: { name: "Academic", mainAttribute: "logic", mainSkill: "learning", startingResourcesMin: 1, startingResourcesMax: 3 } });
    const legacyTalent = await prisma!.talent.create({ data: { name: "Research Network", description: "Legacy custom effect", type: "ARCHETYPE", archetypeId: archetype.id } });
    const user = await prisma!.user.create({ data: { email: "academic-content@test.local" } });
    const character = await prisma!.character.create({ data: { userId: user.id, archetypeId: archetype.id, name: "Existing hunter", ageGroup: "OLD", motivation: "Truth", trauma: "Sight", darkSecret: "Private", resources: 2, notes: "Keep my notes", talents: [legacyTalent.id] } });
    const before = await prisma!.character.findUnique({ where: { id: character.id }, include: { inventory: true } });
    const report = await installAcademicTemplate(prisma, { apply: true });
    expect(report.applied).toBe(true);
    expect(report.archetypeId).toBe(archetype.id);
    expect(await prisma!.character.findUnique({ where: { id: character.id }, include: { inventory: true } })).toEqual(before);
    const template = await prisma!.archetype.findUniqueOrThrow({ where: { id: archetype.id }, include: archetypeTemplateInclude });
    expect(template.startingResourcesMin).toBe(4); expect(template.startingResourcesMax).toBe(6);
    expect(template.firstNameOptions).toEqual(academic.archetype.firstNameOptions);
    expect(template.startingTalents).toHaveLength(3);
    expect(template.equipmentGroups).toHaveLength(3);
    expect(startingTalentsFor(template, await prisma!.talent.findMany()).map(t => t.name).sort()).toEqual(academic.talents.map((t: { name: string }) => t.name).sort());
    const choices = Object.fromEntries(template.equipmentGroups.filter(g => g.options.length > 1).map(g => [g.id, g.options[0].itemId]));
    expect(resolveStartingEquipment(template, choices).map(row => row.quantity)).toEqual([1, 1, 1]);
  });
  it("repeats without changing relation IDs or creating duplicates", async () => {
    const before = await prisma!.archetype.findFirstOrThrow({ include: archetypeTemplateInclude });
    expect(await installAcademicTemplate(prisma, { apply: true })).toMatchObject({ applied: false, changes: [] });
    expect(await prisma!.archetype.findFirstOrThrow({ include: archetypeTemplateInclude })).toEqual(before);
    expect(await prisma!.item.count()).toBe(5);
    expect(await prisma!.talent.count()).toBe(4);
  });
  it("refuses custom template edits atomically", async () => {
    const archetype = await prisma!.archetype.findFirstOrThrow();
    await prisma!.archetype.update({ where: { id: archetype.id }, data: { motivationOptions: ["My custom motivation"] } });
    await expect(installAcademicTemplate(prisma, { apply: true })).rejects.toThrow("Custom content conflicts");
    expect((await prisma!.archetype.findUniqueOrThrow({ where: { id: archetype.id } })).motivationOptions).toEqual(["My custom motivation"]);
    await prisma!.archetype.update({ where: { id: archetype.id }, data: { motivationOptions: academic.archetype.motivationOptions } });
  });
  it("refuses conflicting equipment mechanics without overwriting them", async () => {
    const item = await prisma!.item.findFirstOrThrow({ where: { name: "Map book" } });
    await prisma!.item.update({ where: { id: item.id }, data: { bonus: 3 } });
    await expect(installAcademicTemplate(prisma, { apply: true })).rejects.toThrow("Custom content conflicts with Map book");
    expect((await prisma!.item.findUniqueOrThrow({ where: { id: item.id } })).bonus).toBe(3);
    await prisma!.item.update({ where: { id: item.id }, data: { bonus: 1 } });
  });
  it("refuses duplicate names instead of picking an arbitrary item", async () => {
    const duplicate = await prisma!.item.create({ data: { name: "map BOOK", type: "GEAR" } });
    await expect(installAcademicTemplate(prisma, { apply: true })).rejects.toThrow("Multiple records named Map book");
    await prisma!.item.delete({ where: { id: duplicate.id } });
  });
  it("records conditional bonuses and correct book talent effects", () => {
    expect(academic.items.every((item: { bonus: number }) => item.bonus === 1)).toBe(true);
    expect(academic.talents[0].description).toContain("+2");
    expect(academic.talents[1].description).toContain("cannot establish facts about vaesen");
    expect(academic.talents[2].description).toContain("Condition penalties");
  });
  it("requires explicit replacement and preserves shared catalogue and inventory IDs", async () => {
    const archetype = await prisma!.archetype.findFirstOrThrow();
    const item = await prisma!.item.findFirstOrThrow({ where: { name: "Map book" } });
    const character = await prisma!.character.findFirstOrThrow();
    const inventory = await prisma!.characterInventory.create({ data: { characterId: character.id, itemId: item.id, quantity: 2, notes: "My old maps" } });
    await prisma!.item.update({ where: { id: item.id }, data: { bonus: 3, description: "Custom maps" } });
    await prisma!.archetype.update({ where: { id: archetype.id }, data: { flavorText: "Custom prose" } });
    const preview = await installAcademicTemplate(prisma, { replace: true });
    expect(preview.applied).toBe(false);
    expect((await prisma!.item.findUniqueOrThrow({ where: { id: item.id } })).bonus).toBe(3);
    expect((await installAcademicTemplate(prisma, { apply: true, replace: true })).applied).toBe(true);
    expect(await prisma!.characterInventory.findUnique({ where: { id: inventory.id } })).toEqual(inventory);
    expect((await prisma!.item.findUniqueOrThrow({ where: { id: item.id } })).bonus).toBe(1);
    expect((await prisma!.archetype.findUniqueOrThrow({ where: { id: archetype.id } })).flavorText).toBe(academic.archetype.flavorText);
  });
  it("does not reclassify an item or steal another archetype's talent during replacement", async () => {
    const item = await prisma!.item.findFirstOrThrow({ where: { name: "Liquor" } });
    await prisma!.item.update({ where: { id: item.id }, data: { type: "MAGIC" } });
    await expect(installAcademicTemplate(prisma, { apply: true, replace: true })).rejects.toThrow("Cannot reclassify Liquor");
    await prisma!.item.update({ where: { id: item.id }, data: { type: "GEAR" } });
    const other = await prisma!.archetype.create({ data: { name: "Custom scholar", mainAttribute: "logic", mainSkill: "learning" } });
    const talent = await prisma!.talent.findFirstOrThrow({ where: { name: "Bookworm" } });
    await prisma!.talent.update({ where: { id: talent.id }, data: { archetypeId: other.id } });
    await expect(installAcademicTemplate(prisma, { apply: true, replace: true })).rejects.toThrow("belongs to or is offered by another archetype");
    await prisma!.talent.update({ where: { id: talent.id }, data: { archetypeId: (await prisma!.archetype.findFirstOrThrow({ where: { name: "Academic" } })).id } });
  });
  it("creates a complete template for a fresh catalogue", async () => {
    await prisma!.user.deleteMany();
    await prisma!.archetype.deleteMany();
    await prisma!.talent.deleteMany();
    await prisma!.item.deleteMany();
    const report = await installAcademicTemplate(prisma, { apply: true });
    expect(report.applied).toBe(true);
    expect(await prisma!.item.count()).toBe(5);
    expect(await prisma!.talent.count()).toBe(3);
    expect((await prisma!.archetype.findUniqueOrThrow({ where: { id: report.archetypeId }, include: archetypeTemplateInclude })).equipmentGroups).toHaveLength(3);
  });
});
