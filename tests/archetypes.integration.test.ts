import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) {
    if (!new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) throw new Error("Use an isolated test database");
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
  return { actor: { id: "", role: "ADMIN" } };
});
vi.mock("@/lib/auth", () => ({ getAppSession: async () => ({ user: state.actor }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import prisma from "../src/lib/prisma";
import { createArchetype, updateArchetype, updateTalent } from "../src/app/admin/actions";
import { createPlayerCharacter } from "../src/app/characters/actions";
import { archetypeTemplateInclude } from "../src/lib/archetype-template";

describe.skipIf(!process.env.TEST_DATABASE_URL)("archetype templates", () => {
  const ids = { admin: "", player: "", archetype: "", talent: "", otherTalent: "", book: "", map: "", pen: "", magic: "" };
  let template: Awaited<ReturnType<typeof createArchetype>>;
  const prefix = `archetype-test-${crypto.randomUUID()}`;
  const input = () => ({
    name: prefix, flavorText: "A scholar of the unseen.", mainAttribute: "logic", mainSkill: "learning",
    startingResourcesMin: 4, startingResourcesMax: 6,
    firstNameOptions: ["Albert", "Astrid"], lastNameOptions: ["Brugge", "Gregorius"],
    motivationOptions: ["Charting the unknown"], traumaOptions: ["Aged by the magic of a mermaid"],
    darkSecretOptions: ["Hunted by a vaesen"], relationshipOptions: ["A good friend"],
    startingTalentIds: [ids.talent], equipmentGroups: [
      { label: "Books or maps", quantity: 1, itemIds: [ids.book, ids.map] },
      { label: "Writing utensils", quantity: 2, itemIds: [ids.pen] },
    ],
  });
  const characterInput = () => ({
    name: "Astrid Brugge", archetypeId: ids.archetype, ageGroup: "YOUNG", talentId: ids.talent,
    attributes: { physique: 3, precision: 3, logic: 5, empathy: 4 },
    skills: { agility: 1, closeCombat: 1, force: 0, medicine: 0, rangedCombat: 0, stealth: 0,
      investigation: 2, learning: 3, vigilance: 2, inspiration: 1, manipulation: 0, observation: 0 },
    resources: 4, motivation: "My own motivation", trauma: "My own trauma", darkSecret: "My own secret",
    relationships: "Linus: A good friend", equipment: [{ id: ids.magic }],
    equipmentChoices: { [template.equipmentGroups[0].id]: ids.map },
  });
  beforeAll(async () => {
    const admin = await prisma.user.create({ data: { role: "ADMIN", email: `${prefix}-admin@test.local` } });
    const player = await prisma.user.create({ data: { role: "PLAYER", email: `${prefix}-player@test.local` } });
    const talent = await prisma.talent.create({ data: { name: prefix, description: "Test", type: "GENERAL" } });
    const otherTalent = await prisma.talent.create({ data: { name: prefix+"other", description: "Test", type: "GENERAL" } });
    Object.assign(ids, { admin: admin.id, player: player.id, talent: talent.id, otherTalent: otherTalent.id });
    for (const key of ["book", "map", "pen", "magic"] as const) ids[key] = (await prisma.item.create({ data: { name: prefix+key, type: key === "magic" ? "MAGIC" : "GEAR" } })).id;
    state.actor = { id: ids.admin, role: "ADMIN" };
    template = await createArchetype(input()); ids.archetype = template.id;
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [ids.admin, ids.player] } } });
    if(ids.archetype) await prisma.archetype.delete({ where: { id: ids.archetype } });
    await prisma.talent.deleteMany({ where: { id: { in: [ids.talent, ids.otherTalent] } } });
    await prisma.item.deleteMany({ where: { id: { in: [ids.book, ids.map, ids.pen, ids.magic] } } });
    await prisma.$disconnect();
  });
  it("persists the full template and relational choices", async () => {
    const record = await prisma.archetype.findUniqueOrThrow({ where: { id: ids.archetype }, include: archetypeTemplateInclude });
    expect(record.firstNameOptions).toEqual(["Albert", "Astrid"]);
    expect(record.flavorText).toBe("A scholar of the unseen.");
    expect(record.startingTalents[0].talentId).toBe(ids.talent);
    expect(record.equipmentGroups[0].options).toHaveLength(2);
  });
  it("rejects player template edits", async () => {
    state.actor = { id: ids.player, role: "PLAYER" };
    await expect(updateArchetype(ids.archetype, input())).rejects.toThrow("Admin access required");
  });
  it("rolls back invalid references and resource ranges", async () => {
    state.actor = { id: ids.admin, role: "ADMIN" };
    await expect(updateArchetype(ids.archetype, { ...input(), name: "Invalid edit", equipmentGroups: [{ label: "Magic", quantity: 1, itemIds: [ids.magic] }] })).rejects.toThrow("non-magical");
    await expect(updateArchetype(ids.archetype, { ...input(), startingResourcesMin: 7 })).rejects.toThrow("Minimum resources");
    expect((await prisma.archetype.findUniqueOrThrow({ where: { id: ids.archetype } })).name).toBe(prefix);
    expect(await prisma.archetypeEquipmentGroup.count({ where: { archetypeId: ids.archetype } })).toBe(2);
  });
  it("protects linked talent classification", async () => {
    state.actor = { id: ids.admin, role: "ADMIN" };
    await expect(updateTalent(ids.talent, { name: prefix, description: "Test", type: "ARCHETYPE", archetypeId: crypto.randomUUID() })).rejects.toThrow("starting lists");
  });
  it("rejects missing choices, other talents, stale groups, and forbidden alternatives", async () => {
    state.actor = { id: ids.player, role: "PLAYER" };
    for (const changed of [
      { equipmentChoices: {} }, { talentId: ids.otherTalent },
      { equipmentChoices: { [template.equipmentGroups[0].id]: ids.pen } },
      { equipmentChoices: { [crypto.randomUUID()]: ids.book } },
    ]) await expect(createPlayerCharacter({ ...characterInput(), ...changed })).rejects.toThrow();
    expect(await prisma.character.count({ where: { userId: ids.player } })).toBe(0);
  });
  it("uses canonical quantities, fixed items, alternatives, and custom prose", async () => {
    state.actor = { id: ids.player, role: "PLAYER" };
    const id = await createPlayerCharacter(characterInput());
    const character = await prisma.character.findUniqueOrThrow({ where: { id }, include: { inventory: true } });
    expect(character.inventory.map(row => [row.itemId,row.quantity]).sort()).toEqual([[ids.map,1],[ids.pen,2]].sort());
    expect(character.relationships).toBe("Linus: A good friend");
    expect(character.motivation).toBe("My own motivation");
    expect(JSON.stringify(character.equipment)).not.toContain(ids.magic);
  });
});
