import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) {
    const database = new URL(process.env.TEST_DATABASE_URL).pathname;
    if (!database.endsWith("_test")) throw new Error("Integration tests require a separate database ending in _test");
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
  return { actor: { id: "", role: "GM" } };
});
vi.mock("@/lib/auth", () => ({ getAppSession: async () => ({ user: state.actor }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import prisma from "../src/lib/prisma";
import { awardDevelopmentPoints, buyUpgrade, enrollCharacter, manageTask, removeCharacter, respondToInvitation } from "../src/app/parties/actions";
import { createPlayerCharacter, updateCharacterJournal } from "../src/app/characters/actions";
import { resetUserPassword } from "../src/app/admin/actions";

describe.skipIf(!process.env.TEST_DATABASE_URL)("database authorization and campaign persistence", () => {
  const ids = { gm1: "", gm2: "", player: "", admin: "", party1: "", party2: "", character: "", member: "", task: "", hq: "", archetype: "", talent: "", item: "" };
  beforeAll(async () => {
    const prefix = `regression-${crypto.randomUUID()}`;
    const gm1 = await prisma.user.create({ data: { email: `${prefix}-gm1@test.local`, role: "GM" } });
    const gm2 = await prisma.user.create({ data: { email: `${prefix}-gm2@test.local`, role: "GM" } });
    const player = await prisma.user.create({ data: { email: `${prefix}-player@test.local`, role: "PLAYER" } });
    const admin = await prisma.user.create({ data: { email: `${prefix}-admin@test.local`, role: "ADMIN" } });
    const archetype = await prisma.archetype.create({ data: { name: prefix, mainAttribute: "logic", mainSkill: "learning", startingResourcesMin: 1, startingResourcesMax: 3 } });
    const talent = await prisma.talent.create({ data: { name: prefix, type: "GENERAL", description: "Test talent" } });
    const item = await prisma.item.create({ data: { name: prefix, type: "GEAR" } });
    const character = await prisma.character.create({ data: {
      userId: player.id, archetypeId: archetype.id, name: prefix, ageGroup: "YOUNG", motivation: "Truth", trauma: "Sight", darkSecret: "Debt", resources: 5,
    } });
    const party1 = await prisma.party.create({ data: { name: prefix, gmId: gm1.id } });
    const party2 = await prisma.party.create({ data: { name: `${prefix}-other`, gmId: gm2.id } });
    const member = await prisma.partyMember.create({ data: { partyId: party2.id, characterId: character.id } });
    const task = await prisma.adventureTask.create({ data: { partyId: party2.id, title: "Protected", description: "Other party" } });
    const hq = await prisma.headquarters.create({ data: { partyId: party1.id, name: prefix, history: "Test", developmentPoints: 6 } });
    Object.assign(ids, { gm1: gm1.id, gm2: gm2.id, player: player.id, admin: admin.id, party1: party1.id, party2: party2.id,
      character: character.id, member: member.id, task: task.id, hq: hq.id, archetype: archetype.id, talent: talent.id, item: item.id });
  });
  beforeEach(() => { state.actor = { id: ids.gm1, role: "GM" }; });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [ids.gm1, ids.gm2, ids.player, ids.admin].filter(Boolean) } } });
    if (ids.archetype) await prisma.archetype.delete({ where: { id: ids.archetype } });
    if (ids.talent) await prisma.talent.delete({ where: { id: ids.talent } });
    if (ids.item) await prisma.item.delete({ where: { id: ids.item } });
    await prisma.$disconnect();
  });

  it("cannot remove another party's member or goal", async () => {
    await expect(removeCharacter(ids.party1, ids.member)).rejects.toThrow();
    await expect(manageTask(ids.party1, ids.task)).rejects.toThrow();
    await expect(manageTask(ids.party1, ids.task, { title: "Hijacked", description: "", status: "FAILED" })).rejects.toThrow();
    expect(await prisma.partyMember.count({ where: { id: ids.member } })).toBe(1);
    expect((await prisma.adventureTask.findUniqueOrThrow({ where: { id: ids.task } })).title).toBe("Protected");
  });
  it("rejects player mutations even if the account is still recorded as party GM", async () => {
    state.actor = { id: ids.gm1, role: "PLAYER" };
    await expect(manageTask(ids.party1, undefined, { title: "Denied", description: "", status: "TODO" })).rejects.toThrow("Forbidden");
  });
  it("requires consent before granting a recruiting GM character access", async () => {
    await enrollCharacter(ids.party1, ids.character);
    expect(await prisma.partyMember.count({ where: { partyId: ids.party1, characterId: ids.character } })).toBe(0);
    await expect(updateCharacterJournal(ids.character, { notes: "Not allowed" })).rejects.toThrow("Forbidden");
    const invitation = await prisma.characterInvitation.findUniqueOrThrow({ where: { partyId_characterId: { partyId: ids.party1, characterId: ids.character } } });
    await expect(respondToInvitation(invitation.id, true)).rejects.toThrow("Invitation not found");
    state.actor = { id: ids.player, role: "PLAYER" };
    await respondToInvitation(invitation.id, true);
    expect(await prisma.partyMember.count({ where: { partyId: ids.party1, characterId: ids.character } })).toBe(1);
    state.actor = { id: ids.gm1, role: "GM" };
    await updateCharacterJournal(ids.character, { notes: "Approved GM note" });
    expect((await prisma.character.findUniqueOrThrow({ where: { id: ids.character } })).notes).toBe("Approved GM note");
  });
  it("preserves journal fields omitted from an update", async () => {
    state.actor = { id: ids.player, role: "PLAYER" };
    await updateCharacterJournal(ids.character, { relationships: "A trusted friend" });
    const character = await prisma.character.findUniqueOrThrow({ where: { id: ids.character } });
    expect(character.notes).toBe("Approved GM note");
    expect(character.relationships).toBe("A trusted friend");
  });
  it("prevents concurrent HQ overspending and records the successful purchase", async () => {
    const results = await Promise.allSettled([
      buyUpgrade(ids.hq, "facilities", "Local Tavern"), buyUpgrade(ids.hq, "facilities", "Workshop"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const hq = await prisma.headquarters.findUniqueOrThrow({ where: { id: ids.hq }, include: { ledgerEntries: true } });
    expect(hq.developmentPoints).toBeGreaterThanOrEqual(0);
    expect(hq.ledgerEntries).toHaveLength(1);
    expect(hq.ledgerEntries[0].points).toBeLessThan(0);
  });
  it("prevents duplicate concurrent purchases", async () => {
    await awardDevelopmentPoints(ids.hq, 20, "Completed mystery");
    const results = await Promise.allSettled([
      buyUpgrade(ids.hq, "facilities", "The Annals of the Society"), buyUpgrade(ids.hq, "facilities", "The Annals of the Society"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const ledger = await prisma.headquartersLedgerEntry.findMany({ where: { headquartersId: ids.hq, description: "Purchased The Annals of the Society" } });
    expect(ledger).toHaveLength(1);
  });
  it("rejects invalid awards and unknown upgrades", async () => {
    await expect(awardDevelopmentPoints(ids.hq, -10, "Invalid")).rejects.toThrow();
    await expect(buyUpgrade(ids.hq, "facilities", "Free forged upgrade")).rejects.toThrow();
    state.actor = { id: ids.gm2, role: "GM" };
    await expect(awardDevelopmentPoints(ids.hq, 5, "Wrong party")).rejects.toThrow("Forbidden");
  });
  it("invalidates prior sessions on password reset", async () => {
    state.actor = { id: ids.admin, role: "ADMIN" };
    const before = await prisma.user.findUniqueOrThrow({ where: { id: ids.player } });
    await resetUserPassword(ids.player, "a replacement secure password");
    const after = await prisma.user.findUniqueOrThrow({ where: { id: ids.player } });
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(after.passwordHash).not.toBeNull();
  });
  it("rejects a tampered creation request before inserting a character", async () => {
    state.actor = { id: ids.player, role: "PLAYER" };
    await expect(createPlayerCharacter({ name: "Tampered", archetypeId: ids.archetype, ageGroup: "YOUNG", attributes: { physique: 99 } })).rejects.toThrow();
    expect(await prisma.character.count({ where: { userId: ids.player } })).toBe(1);
  });
  it("creates a legal character with canonical personal inventory", async () => {
    state.actor = { id: ids.player, role: "PLAYER" };
    const id = await createPlayerCharacter({
      name: "Legal character", archetypeId: ids.archetype, ageGroup: "YOUNG", talentId: ids.talent,
      attributes: { physique: 3, precision: 3, logic: 5, empathy: 4 },
      skills: { agility: 1, closeCombat: 1, force: 0, medicine: 0, rangedCombat: 0, stealth: 0,
        investigation: 2, learning: 3, vigilance: 2, inspiration: 1, manipulation: 0, observation: 0 },
      resources: 1, motivation: "Truth", trauma: "Sight", darkSecret: "Debt",
      equipment: [{ id: ids.item, name: "Forged name", bonus: 100 }],
    });
    const character = await prisma.character.findUniqueOrThrow({ where: { id }, include: { inventory: true, attribute: true, skill: true } });
    expect(character.userId).toBe(ids.player);
    expect(character.inventory[0].itemId).toBe(ids.item);
    expect(JSON.stringify(character.equipment)).not.toContain("Forged name");
    expect(character.attribute?.logic).toBe(5);
    expect(character.skill?.learning).toBe(3);
  });
});
