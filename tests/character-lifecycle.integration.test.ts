import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) {
    if (!new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) throw Error("Use an isolated test database");
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
  return { actor: { id: "", role: "PLAYER" }, signedIn: true };
});
vi.mock("@/lib/auth", () => ({ getAppSession: async () => state.signedIn ? { user: state.actor } : null }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw Error(`Redirect ${path}`); } }));
import prisma from "../src/lib/prisma";
import { archiveCharacter, updateCharacterConditions, updateCharacterExperience, updateCharacterJournal, purchaseCharacterAdvancement } from "../src/app/characters/actions";
import { enrollCharacter, respondToInvitation } from "../src/app/parties/actions";
import { getCharacterAccess, getPartyAccess } from "../src/lib/access";
import { activateCastleBenefit } from "../src/app/parties/castle-actions";

describe.skipIf(!process.env.TEST_DATABASE_URL)("safe character lifecycle", () => {
  const prefix = `character-archive-${crypto.randomUUID()}`;
  let owner = "", gm = "", other = "", admin = "", characterId = "", archetypeId = "", itemId = "", partyId = "", hqId = "", mysteryId = "", upgradeId = "", invitationId = "";
  const include = { attribute: true, skill: true, inventory: true, advancements: true, parties: true, invitations: true, castleUses: true, preparedItems: true } as const;
  const character = () => prisma.character.findUniqueOrThrow({ where: { id: characterId }, include });
  const actor = (id: string, role = "PLAYER") => { state.actor = { id, role }; };
  const request = async (archived: boolean) => { const c = await character(); return { id: c.id, confirmationName: c.name, expectedVersion: c.archiveVersion, archived }; };
  const content = (c: Awaited<ReturnType<typeof character>>) => { const { archivedAt, archiveVersion, ...saved } = c; void archivedAt; void archiveVersion; return saved; };
  beforeAll(async () => {
    owner = (await prisma.user.create({ data: { email: `${prefix}-owner@test.local` } })).id;
    other = (await prisma.user.create({ data: { email: `${prefix}-other@test.local` } })).id;
    gm = (await prisma.user.create({ data: { email: `${prefix}-gm@test.local`, role: "GM" } })).id;
    admin = (await prisma.user.create({ data: { email: `${prefix}-admin@test.local`, role: "ADMIN" } })).id;
    archetypeId = (await prisma.archetype.create({ data: { name: prefix, mainAttribute: "logic", mainSkill: "learning" } })).id;
    itemId = (await prisma.item.create({ data: { name: prefix, type: "GEAR" } })).id;
    characterId = (await prisma.character.create({ data: { userId: owner, archetypeId, name: prefix, ageGroup: "OLD", motivation: "Truth", trauma: "Sight", darkSecret: "Debt", notes: "Saved journal", relationships: "Trusted ally", experiencePoints: 12, resources: 4,
      physicalConditions: { battered: true }, attribute: { create: { logic: 5 } }, skill: { create: { learning: 3 } }, inventory: { create: { itemId, quantity: 2, notes: "Owned equipment" } },
      advancements: { create: { actorId: owner, actorName: "Owner", requestId: crypto.randomUUID(), kind: "SKILL", targetKey: "learning", targetName: "Learning", previousValue: 2, newValue: 3, xpCost: 5, xpBefore: 17, xpAfter: 12 } },
    } })).id;
    const party = await prisma.party.create({ data: { gmId: gm, name: prefix, notes: "Shared notes", members: { create: { characterId } }, stashItems: { create: { itemId, quantity: 3 } }, tasks: { create: { title: "Shared goal", description: "Keep this" } }, headquarters: { create: { name: prefix, history: "Keep history", developmentPoints: 9 } }, mysteries: { create: { title: "Shared mystery", summary: "Keep summary", status: "ACTIVE", isPublished: true, clues: { create: { content: "Keep clue", isRevealed: true } } } } }, include: { headquarters: true, mysteries: true } });
    partyId = party.id; hqId = party.headquarters!.id; mysteryId = party.mysteries[0].id;
    upgradeId = (await prisma.castleUpgrade.create({ data: { headquartersId: hqId, key: "library", name: "Library", category: "facilities" } })).id;
    const use = await prisma.castleBenefitUse.create({ data: { upgradeId, mysteryId, characterId, channel: "function", useKey: characterId, requestId: crypto.randomUUID(), summary: "Prior benefit", effects: {} } });
    await prisma.castlePreparedItem.create({ data: { useId: use.id, characterId, itemId, quantity: 1 } });
    invitationId = (await prisma.characterInvitation.create({ data: { partyId, characterId } })).id;
    actor(owner);
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [owner, gm, other, admin].filter(Boolean) } } });
    await prisma.archetype.deleteMany({ where: { id: archetypeId } });
    await prisma.item.deleteMany({ where: { id: itemId } });
    await prisma.$disconnect();
  });
  it("requires a session and owner/admin permission, not party-GM edit permission", async () => {
    const input = await request(true);
    state.signedIn = false; await expect(archiveCharacter(input)).rejects.toThrow("Unauthorized"); state.signedIn = true;
    for (const [id, role] of [[other, "PLAYER"], [gm, "GM"]]) {
      actor(id, role); await expect(archiveCharacter(input)).rejects.toThrow("Only the owner");
    }
    actor(owner);
    expect((await character()).archivedAt).toBeNull();
  });
  it("rejects wrong names, invalid versions and forged properties", async () => {
    const input = await request(true);
    for (const patch of [{ confirmationName: "wrong" }, { expectedVersion: -1 }, { expectedVersion: 10 }, { id: "wrong" }, { force: true }, { userId: other }]) await expect(archiveCharacter({ ...input, ...patch })).rejects.toThrow();
    expect((await character()).archiveVersion).toBe(0);
  });
  it("archives once under concurrent clicks without deleting sheet, links or shared campaign data", async () => {
    const before = await character();
    const campaign = await prisma.party.findUniqueOrThrow({ where: { id: partyId }, include: { headquarters: true, tasks: true, stashItems: true, mysteries: { include: { clues: true } } } });
    const input = await request(true);
    const results = await Promise.allSettled([archiveCharacter(input), archiveCharacter(input)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    const after = await character(); expect(after.archivedAt).not.toBeNull(); expect(after.archiveVersion).toBe(1); expect(content(after)).toEqual(content(before));
    expect(await prisma.party.findUniqueOrThrow({ where: { id: partyId }, include: { headquarters: true, tasks: true, stashItems: true, mysteries: { include: { clues: true } } } })).toEqual(campaign);
  });
  it("rejects stale sheet mutations, XP spending and invitations while archived", async () => {
    const before = await character();
    await expect(updateCharacterJournal(characterId, { notes: "Stale autosave" })).rejects.toThrow("archived");
    await expect(updateCharacterConditions(characterId, { physicalConditions: { wounded: true } })).rejects.toThrow("archived");
    await expect(updateCharacterExperience(characterId, 99, before.experienceVersion)).rejects.toThrow("archived");
    await expect(purchaseCharacterAdvancement(characterId, { kind: "SKILL", target: "learning", expectedRank: 3, expectedVersion: before.experienceVersion, requestId: crypto.randomUUID() })).rejects.toThrow("archived");
    await expect(respondToInvitation(invitationId, true)).rejects.toThrow("Invitation not found");
    actor(gm, "GM"); await expect(enrollCharacter(partyId, characterId)).rejects.toThrow("Restore");
    await expect(activateCastleBenefit(hqId, { upgradeId, mysteryId, channel: "function", characterId, notes: "Must not target archived character", requestId: crypto.randomUUID() })).rejects.toThrow("no investigators");
    expect(await character()).toEqual(before); actor(owner);
  });
  it("pauses party access and GM sheet access while keeping owner recovery access", async () => {
    await expect(getPartyAccess(partyId)).rejects.toThrow("Redirect /");
    expect((await getCharacterAccess(characterId)).isOwner).toBe(true);
    actor(gm, "GM"); expect((await getPartyAccess(partyId)).party.members).toEqual([]);
    await expect(getCharacterAccess(characterId)).rejects.toThrow("Redirect /characters"); actor(owner);
  });
  it("allows admin recovery and restores the same IDs, records and membership access", async () => {
    const before = await character(); actor(admin, "ADMIN");
    await archiveCharacter(await request(false)); const after = await character();
    expect(after.archivedAt).toBeNull(); expect(after.archiveVersion).toBe(2); expect(content(after)).toEqual(content(before));
    actor(owner); expect((await getPartyAccess(partyId)).isMember).toBe(true);
    await updateCharacterJournal(characterId, { notes: "Restored journal" });
    expect((await character()).notes).toBe("Restored journal");
  });
  it("rejects old archive requests even after a restore", async () => {
    await expect(archiveCharacter({ ...await request(true), expectedVersion: 0 })).rejects.toThrow("status changed");
    expect((await character()).archivedAt).toBeNull();
  });
  it("serializes an autosave with removal and never reactivates the character", async () => {
    const input = await request(true);
    const results = await Promise.allSettled([archiveCharacter(input), updateCharacterJournal(characterId, { notes: "Save before removal" })]);
    expect(results[0].status).toBe("fulfilled");
    const after = await character(); expect(after.archivedAt).not.toBeNull();
    if (results[1].status === "fulfilled") expect(after.notes).toBe("Save before removal");
    else { expect(String(results[1].reason)).toContain("archived"); expect(after.notes).toBe("Restored journal"); }
    await expect(updateCharacterJournal(characterId, { notes: "Save after removal" })).rejects.toThrow("archived");
    expect(await character()).toEqual(after);
    await archiveCharacter(await request(false));
  });
  it("does not recreate party membership removed by its GM while the character was archived", async () => {
    // A GM removing a party link remains independent of character recovery.
    actor(owner, "GM"); await archiveCharacter(await request(true));
    await prisma.partyMember.deleteMany({ where: { partyId, characterId } });
    await archiveCharacter(await request(false));
    expect((await character()).parties).toEqual([]);
    expect((await character()).inventory).toHaveLength(1);
  });
});
