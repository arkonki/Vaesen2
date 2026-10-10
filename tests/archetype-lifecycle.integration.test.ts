import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) {
    if (!new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) throw Error("Use an isolated test database");
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
  return { actor: { id: "", role: "ADMIN" } };
});
vi.mock("@/lib/auth", () => ({ getAppSession: async () => ({ user: state.actor }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import prisma from "../src/lib/prisma";
import { archiveArchetype, createArchetype, updateArchetype } from "../src/app/admin/actions";
import { createPlayerCharacter } from "../src/app/characters/actions";
import { archetypeTemplateInclude } from "../src/lib/archetype-template";

describe.skipIf(!process.env.TEST_DATABASE_URL)("safe archetype lifecycle", () => {
  const prefix = `lifecycle-${crypto.randomUUID()}`;
  let adminId = "", playerId = "", itemId = "", talentId = "", characterId = "";
  let template: Awaited<ReturnType<typeof createArchetype>>;
  let other: typeof template;
  const input = () => ({ name: prefix, flavorText: "Original template", mainAttribute: "logic", mainSkill: "learning", startingResourcesMin: 4, startingResourcesMax: 6, startingTalentIds: [talentId], equipmentGroups: [{ label: "Book", quantity: 1, itemIds: [itemId] }] });
  const archiveInput = (archived: boolean) => ({ id: template.id, expectedRevision: template.revision, confirmationName: template.name, archived });
  const creation = () => ({ name: "Existing investigator", archetypeId: template.id, ageGroup: "YOUNG", talentId,
    attributes: { physique: 3, precision: 3, logic: 5, empathy: 4 },
    skills: { agility: 1, closeCombat: 1, force: 0, medicine: 0, rangedCombat: 0, stealth: 0, investigation: 2, learning: 3, vigilance: 2, inspiration: 1, manipulation: 0, observation: 0 },
    resources: 4, motivation: "Truth", trauma: "Sight", darkSecret: "Debt", relationships: "A good friend", equipment: [], equipmentChoices: {} });
  beforeAll(async () => {
    adminId = (await prisma.user.create({ data: { email: `${prefix}-admin@test.local`, role: "ADMIN" } })).id;
    playerId = (await prisma.user.create({ data: { email: `${prefix}-player@test.local`, role: "PLAYER" } })).id;
    itemId = (await prisma.item.create({ data: { name: prefix, type: "GEAR" } })).id;
    talentId = (await prisma.talent.create({ data: { name: prefix, description: "Learned rule", type: "GENERAL" } })).id;
    state.actor = { id: adminId, role: "ADMIN" };
    template = await createArchetype(input());
    other = await createArchetype({ ...input(), name: `${prefix}-other` });
    state.actor = { id: playerId, role: "PLAYER" };
    characterId = await createPlayerCharacter(creation());
    state.actor = { id: adminId, role: "ADMIN" };
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [adminId, playerId] } } });
    await prisma.archetype.deleteMany({ where: { id: { in: [template?.id ?? "", other?.id ?? ""] } } });
    await prisma.talent.deleteMany({ where: { id: talentId } });
    await prisma.item.deleteMany({ where: { id: itemId } });
    await prisma.$disconnect();
  });
  it("requires admin permission for editing, removing and restoring", async () => {
    for (const role of ["PLAYER", "GM"]) {
      state.actor = { id: playerId, role };
      await expect(archiveArchetype(archiveInput(true))).rejects.toThrow("Admin access");
      await expect(archiveArchetype(archiveInput(false))).rejects.toThrow("Admin access");
      await expect(updateArchetype(template.id, input(), template.revision)).rejects.toThrow("Admin access");
    }
    state.actor = { id: adminId, role: "ADMIN" };
  });
  it("requires an exact name and revision; malformed requests cannot remove entries", async () => {
    for (const change of [{ confirmationName: "wrong" }, { expectedRevision: -1 }, { id: "wrong" }, { force: true }]) await expect(archiveArchetype({ ...archiveInput(true), ...change })).rejects.toThrow();
    expect((await prisma.archetype.findUniqueOrThrow({ where: { id: template.id } })).archivedAt).toBeNull();
  });
  it("archives an in-use entry without changing characters, talents or equipment", async () => {
    const before = await prisma.character.findUniqueOrThrow({ where: { id: characterId }, include: { attribute: true, skill: true, inventory: true } });
    const groups = template.equipmentGroups;
    const links = template.startingTalents;
    await archiveArchetype(archiveInput(true));
    template = await prisma.archetype.findUniqueOrThrow({ where: { id: template.id }, include: archetypeTemplateInclude });
    expect(template.archivedAt).not.toBeNull(); expect(template.revision).toBe(1);
    expect(template.equipmentGroups).toEqual(groups); expect(template.startingTalents).toEqual(links);
    expect(await prisma.character.findUniqueOrThrow({ where: { id: characterId }, include: { attribute: true, skill: true, inventory: true } })).toEqual(before);
    expect(await prisma.archetype.count({ where: { id: template.id, archivedAt: null } })).toBe(0);
    state.actor = { id: playerId, role: "PLAYER" };
    await expect(createPlayerCharacter(creation())).rejects.toThrow("removed from the catalogue");
    state.actor = { id: adminId, role: "ADMIN" };
  });
  it("restores the same entry and links, without reimporting or recreating anything", async () => {
    const groups = template.equipmentGroups;
    await archiveArchetype(archiveInput(false));
    template = await prisma.archetype.findUniqueOrThrow({ where: { id: template.id }, include: archetypeTemplateInclude });
    expect(template.archivedAt).toBeNull(); expect(template.revision).toBe(2);
    expect(template.equipmentGroups).toEqual(groups);
  });
  it("retains unchanged group IDs and rejects concurrent stale edits", async () => {
    const data = { ...input(), equipmentGroups: template.equipmentGroups.map(group => ({ id: group.id, label: group.label, quantity: group.quantity, itemIds: group.options.map(option => option.itemId) })) };
    const revision = template.revision;
    const groups = template.equipmentGroups;
    const results = await Promise.allSettled([updateArchetype(template.id, { ...data, flavorText: "First editor" }, revision), updateArchetype(template.id, { ...data, flavorText: "Second editor" }, revision)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    template = await prisma.archetype.findUniqueOrThrow({ where: { id: template.id }, include: archetypeTemplateInclude });
    expect(template.revision).toBe(revision + 1); expect(template.equipmentGroups).toEqual(groups);
    await expect(archiveArchetype({ ...archiveInput(true), expectedRevision: revision })).rejects.toThrow("changed in another tab");
  });
  it("rolls back invalid or foreign group references without changing the revision", async () => {
    const before = template;
    await expect(updateArchetype(template.id, { ...input(), equipmentGroups: [{ id: other.equipmentGroups[0].id, label: "Foreign", quantity: 1, itemIds: [itemId] }] }, template.revision)).rejects.toThrow("Equipment groups changed");
    expect(await prisma.archetype.findUniqueOrThrow({ where: { id: template.id }, include: archetypeTemplateInclude })).toEqual(before);
    await expect(updateArchetype(template.id, input(), undefined as unknown as number)).rejects.toThrow("Reload");
  });
});
