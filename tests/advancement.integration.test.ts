import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
const state = vi.hoisted(() => {
  process.env.DATABASE_URL ||= "postgresql://test-only@127.0.0.1:1/not_configured_test";
  if (process.env.TEST_DATABASE_URL) {
    if (!new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) throw new Error("Use an isolated test database");
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
  return { actor: { id: "", role: "PLAYER", name: "Test actor" }, signedIn: true };
});
vi.mock("@/lib/auth", () => ({ getAppSession: async () => state.signedIn ? { user: state.actor } : null }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import prisma from "../src/lib/prisma";
import { purchaseCharacterAdvancement as buy, getCharacterAdvancements as history, updateCharacterExperience as xp, tryPurchaseCharacterAdvancement } from "../src/app/characters/actions";

describe.skipIf(!process.env.TEST_DATABASE_URL)("atomic character advancement", () => {
  const ids = { owner: "", gm: "", outsider: "", admin: "", archetype: "", otherArchetype: "", talent: "", existingTalent: "", character: "", party: "" };
  const prefix = `advancement-${crypto.randomUUID()}`;
  const skillInput = (change = {}) => ({ kind: "SKILL", target: "learning", expectedRank: 4, expectedVersion: 0, requestId: crypto.randomUUID(), ...change });
  const talentInput = (change = {}) => ({ kind: "TALENT", target: ids.talent, expectedVersion: 0, requestId: crypto.randomUUID(), ...change });
  const record = () => prisma.character.findUniqueOrThrow({ where: { id: ids.character }, include: { skill: true, advancements: true, attribute: true } });
  beforeAll(async () => {
    for (const key of ["owner", "gm", "outsider", "admin"] as const) ids[key] = (await prisma.user.create({ data: {
      email: `${prefix}-${key}@test.local`, role: key === "admin" ? "ADMIN" : key === "gm" || key === "outsider" ? "GM" : "PLAYER",
    } })).id;
    for (const key of ["archetype", "otherArchetype"] as const) ids[key] = (await prisma.archetype.create({ data: { name: prefix + key, mainAttribute: "logic", mainSkill: "learning" } })).id;
    ids.existingTalent = (await prisma.talent.create({ data: { name: prefix + "Known", type: "GENERAL", description: "Known" } })).id;
    ids.talent = (await prisma.talent.create({ data: { name: "Other archetype talent", type: "ARCHETYPE", archetypeId: ids.otherArchetype, description: "Other archetype" } })).id;
    ids.character = (await prisma.character.create({ data: { userId: ids.owner, archetypeId: ids.archetype, name: prefix, ageGroup: "OLD", motivation: "Truth", trauma: "Sight", darkSecret: "Debt", resources: 4,
      attribute: { create: { logic: 4 } }, skill: { create: { learning: 4 } } } })).id;
    ids.party = (await prisma.party.create({ data: { name: prefix, gmId: ids.gm, members: { create: { characterId: ids.character } } } })).id;
  });
  beforeEach(async () => {
    state.signedIn = true; state.actor = { id: ids.owner, role: "PLAYER", name: "Test actor" };
    await prisma.characterAdvancement.deleteMany({ where: { characterId: ids.character } });
    await prisma.character.update({ where: { id: ids.character }, data: { experiencePoints: 10, experienceVersion: 0, talents: [ids.existingTalent], notes: "Keep my notes" } });
    await prisma.characterSkill.upsert({ where: { characterId: ids.character }, create: { characterId: ids.character, learning: 4 }, update: { learning: 4, agility: 0 } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [ids.owner, ids.gm, ids.outsider, ids.admin].filter(Boolean) } } });
    await prisma.talent.deleteMany({ where: { id: { in: [ids.talent, ids.existingTalent].filter(Boolean) } } });
    await prisma.archetype.deleteMany({ where: { id: { in: [ids.archetype, ids.otherArchetype].filter(Boolean) } } });
    await prisma.$disconnect();
  });
  it("buys rank five for five XP and snapshots history without changing other fields", async () => {
    const result = await buy(ids.character, skillInput());
    expect(result).toMatchObject({ experiencePoints: 5, experienceVersion: 1, entry: { kind: "SKILL", targetName: "Learning", previousValue: 4, newValue: 5, xpCost: 5, xpBefore: 10, xpAfter: 5, actorName: "Test actor" } });
    expect(await record()).toMatchObject({ resources: 4, notes: "Keep my notes", talents: [ids.existingTalent], skill: { learning: 5 }, attribute: { logic: 4 } });
    expect(result.entry).not.toHaveProperty("actorId"); expect(result.entry).not.toHaveProperty("requestId");
  });
  it("allows learning talents from another archetype and preserves the starting talent", async () => {
    const result = await buy(ids.character, talentInput());
    expect(result.entry).toMatchObject({ kind: "TALENT", targetName: "Other archetype talent", previousValue: null, newValue: null, xpCost: 5 });
    expect((await record()).talents).toEqual([ids.existingTalent, ids.talent]);
  });
  it("allows owner, assigned party GM and administrator, but rejects other accounts and demoted GMs", async () => {
    for (const actor of [{ id: ids.outsider, role: "GM" }, { id: ids.outsider, role: "PLAYER" }, { id: ids.gm, role: "PLAYER" }]) {
      state.actor = { ...actor, name: "Denied" };
      await expect(buy(ids.character, talentInput())).rejects.toThrow("Forbidden");
      await expect(history(ids.character)).rejects.toThrow("Forbidden");
      await expect(xp(ids.character, 100, 0)).rejects.toThrow("Forbidden");
    }
    state.actor = { id: ids.gm, role: "GM", name: "Party GM" };
    await buy(ids.character, skillInput());
    state.actor = { id: ids.admin, role: "ADMIN", name: "Administrator" };
    await buy(ids.character, talentInput({ expectedVersion: 1 }));
    expect((await history(ids.character)).entries.map(e => e.actorName)).toEqual(["Administrator", "Party GM"]);
  });
  it("requires authentication and returns safe validation errors", async () => {
    state.signedIn = false;
    await expect(buy(ids.character, skillInput())).rejects.toThrow("Unauthorized");
    expect(await tryPurchaseCharacterAdvancement(ids.character, skillInput())).toEqual({ ok: false, error: "Unauthorized" });
    state.signedIn = true;
    expect(await tryPurchaseCharacterAdvancement(ids.character, skillInput({ xpCost: 0 }))).toEqual({ ok: false, error: "Invalid advancement request." });
  });
  it("cannot advance beyond five or apply a stale skill rank", async () => {
    await prisma.characterSkill.update({ where: { characterId: ids.character }, data: { learning: 5 } });
    await expect(buy(ids.character, skillInput())).rejects.toThrow("beyond 5");
    await expect(buy(ids.character, skillInput({ expectedRank: 5 }))).rejects.toThrow();
    await expect(buy(ids.character, skillInput({ target: "agility", expectedRank: 1 }))).rejects.toThrow("skill has changed");
    expect((await record()).experiencePoints).toBe(10); expect((await record()).advancements).toHaveLength(0);
  });
  it("raises a zero skill and spends exactly five XP down to zero", async () => {
    await prisma.character.update({ where: { id: ids.character }, data: { experiencePoints: 5 } });
    await buy(ids.character, skillInput({ target: "agility", expectedRank: 0 }));
    expect(await record()).toMatchObject({ experiencePoints: 0, skill: { agility: 1 } });
    await expect(buy(ids.character, talentInput({ expectedVersion: 1 }))).rejects.toThrow("5 unspent XP");
  });
  it("rejects insufficient XP, missing skill records, unknown and duplicate talents without spending", async () => {
    await prisma.character.update({ where: { id: ids.character }, data: { experiencePoints: 4 } });
    await expect(buy(ids.character, talentInput())).rejects.toThrow("5 unspent XP");
    await prisma.character.update({ where: { id: ids.character }, data: { experiencePoints: 10 } });
    await expect(buy(ids.character, talentInput({ target: ids.existingTalent }))).rejects.toThrow("already know");
    await expect(buy(ids.character, talentInput({ target: crypto.randomUUID() }))).rejects.toThrow("no longer exists");
    await prisma.characterSkill.delete({ where: { characterId: ids.character } });
    await expect(buy(ids.character, skillInput())).rejects.toThrow("no skill record");
    expect(await record()).toMatchObject({ experiencePoints: 10, advancements: [] });
  });
  it("does not silently destroy legacy object-shaped talents", async () => {
    await prisma.character.update({ where: { id: ids.character }, data: { talents: [{ name: "Custom old talent" }] } });
    await expect(buy(ids.character, talentInput())).rejects.toThrow("legacy talent data");
    expect(await record()).toMatchObject({ experiencePoints: 10, talents: [{ name: "Custom old talent" }], advancements: [] });
  });
  it("serializes concurrent distinct purchases against the same XP version", async () => {
    const results = await Promise.allSettled([buy(ids.character, skillInput()), buy(ids.character, talentInput())]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await record()).toMatchObject({ experiencePoints: 5, experienceVersion: 1 });
    expect((await record()).advancements).toHaveLength(1);
  });
  it("returns the same receipt for concurrent retries, and later retries never spend again", async () => {
    const input = skillInput();
    const [first, second] = await Promise.all([buy(ids.character, input), buy(ids.character, input)]);
    expect(first.entry.id).toBe(second.entry.id);
    await buy(ids.character, talentInput({ expectedVersion: 1 }));
    const retry = await buy(ids.character, input);
    expect(retry).toMatchObject({ experiencePoints: 0, experienceVersion: 2, entry: { id: first.entry.id } });
    expect((await record()).advancements).toHaveLength(2);
    await expect(buy(ids.character, talentInput({ requestId: input.requestId }))).rejects.toThrow("another advancement");
  });
  it("rejects a stale checkbox after purchases or awards and versions valid XP edits", async () => {
    await buy(ids.character, skillInput());
    await expect(xp(ids.character, 10, 0)).rejects.toThrow("Experience changed");
    await xp(ids.character, 6, 1);
    expect(await record()).toMatchObject({ experiencePoints: 6, experienceVersion: 2 });
    await prisma.character.update({ where: { id: ids.character }, data: { experiencePoints: { increment: 1 }, experienceVersion: { increment: 1 } } });
    await expect(xp(ids.character, 6, 2)).rejects.toThrow("Experience changed");
    await expect(buy(ids.character, talentInput({ expectedVersion: 2 }))).rejects.toThrow("sheet has changed");
    expect((await record()).experiencePoints).toBe(7);
  });
  it("rolls back skill and XP writes if the history insert fails", async () => {
    state.actor.id = crypto.randomUUID(); state.actor.role = "ADMIN";
    await expect(buy(ids.character, skillInput())).rejects.toThrow(); // Invalid actor FK fails after writes.
    expect(await record()).toMatchObject({ experiencePoints: 10, experienceVersion: 0, skill: { learning: 4 }, advancements: [] });
  });
  it("paginates deterministically and refuses foreign-character cursors", async () => {
    const entries = Array.from({ length: 25 }, (_, index) => ({ characterId: ids.character, actorId: ids.owner, actorName: "Test actor", requestId: crypto.randomUUID(), kind: "SKILL" as const,
      targetKey: "agility", targetName: `Record ${index}`, previousValue: 0, newValue: 1, xpCost: 5, xpBefore: 10, xpAfter: 5, createdAt: new Date("2026-10-09T12:00:00Z") }));
    await prisma.characterAdvancement.createMany({ data: entries });
    const first = await history(ids.character); const second = await history(ids.character, first.entries.at(-1)!.id);
    expect(first.entries).toHaveLength(20); expect(first.hasMore).toBe(true);
    expect(second.entries).toHaveLength(5); expect(second.hasMore).toBe(false);
    expect(new Set([...first.entries, ...second.entries].map(e => e.id)).size).toBe(25);
    await expect(history(ids.character, crypto.randomUUID())).rejects.toThrow("Invalid history cursor");
    const other = await prisma.character.create({ data: { userId: ids.owner, archetypeId: ids.archetype, name: "Other", ageGroup: "YOUNG", motivation: "", trauma: "", darkSecret: "" } });
    await expect(history(other.id, first.entries[0].id)).rejects.toThrow("Invalid history cursor");
  });
  it("retains talent-name and actor-name snapshots after catalogue edits and actor deletion", async () => {
    const actor = await prisma.user.create({ data: { email: `${prefix}-temporary@test.local`, role: "ADMIN" } });
    const talent = await prisma.talent.create({ data: { name: "Original talent name", type: "GENERAL", description: "Original" } });
    state.actor = { id: actor.id, role: "ADMIN", name: "Original actor name" };
    const result = await buy(ids.character, talentInput({ target: talent.id }));
    await prisma.talent.update({ where: { id: talent.id }, data: { name: "Renamed" } });
    await prisma.talent.delete({ where: { id: talent.id } }); await prisma.user.delete({ where: { id: actor.id } });
    state.actor = { id: ids.owner, role: "PLAYER", name: "Owner" };
    expect((await history(ids.character)).entries[0]).toMatchObject({ targetName: "Original talent name", actorName: "Original actor name" });
    expect((await prisma.characterAdvancement.findUniqueOrThrow({ where: { id: result.entry.id } })).actorId).toBeNull();
  });
  it("preserves unknown string talent IDs when learning a new talent", async () => {
    await prisma.character.update({ where: { id: ids.character }, data: { talents: ["old-unresolved-id", ids.existingTalent] as Prisma.InputJsonValue } });
    await buy(ids.character, talentInput());
    expect((await record()).talents).toEqual(["old-unresolved-id", ids.existingTalent, ids.talent]);
  });
});
