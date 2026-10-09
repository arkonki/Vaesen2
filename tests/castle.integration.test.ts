import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
const state = vi.hoisted(() => {
  process.env.DATABASE_URL ||= "postgresql://test-only@127.0.0.1:1/not_configured_test";
  if (process.env.TEST_DATABASE_URL) {
    if (!new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test"))
      throw new Error("Use an isolated test database");
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }
  return { actor: { id: "", role: "GM" } };
});
vi.mock("@/lib/auth", () => ({
  getAppSession: async () => ({ user: state.actor }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import prisma from "../src/lib/prisma";
import {
  createParty,
  awardDevelopmentPoints,
} from "../src/app/parties/actions";
import {
  purchaseCastleUpgrade,
  closeCastleOccasion,
  introduceCastleDiscovery,
  reviewCastleDevelopment,
  updateCastleThreat,
  activateCastleBenefit,
  createCastleSession,
  expireCastleSceneBenefit,
  reviewCastleStorage,
  updateCastleUpgrade,
} from "../src/app/parties/castle-actions";

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "castle persistence and permissions",
  () => {
    let gm = "";
    let player = "";
    let archetype = "";
    let character = "";
    let second = "";
    let item = "";
    let partyId = "";
    let hqId = "";
    let mysteryId = "";
    const buy = (key: string, extra: Record<string, unknown> = {}) =>
      purchaseCastleUpgrade(hqId, {
        key,
        requestId: crypto.randomUUID(),
        ...extra,
      });
    const person = {
      personName: "Named contact",
      personDescription: "A trusted Society ally",
    };
    const use = (upgradeId: string, extra: Record<string, unknown> = {}) =>
      activateCastleBenefit(hqId, {
        upgradeId,
        mysteryId,
        channel: "function",
        characterId: character,
        notes: "Confirmed castle scene",
        requestId: crypto.randomUUID(),
        ...extra,
      });
    beforeAll(async () => {
      const prefix = crypto.randomUUID();
      gm = (
        await prisma.user.create({
          data: { email: `${prefix}-gm@test.local`, role: "GM" },
        })
      ).id;
      player = (
        await prisma.user.create({
          data: { email: `${prefix}-player@test.local`, role: "PLAYER" },
        })
      ).id;
      archetype = (
        await prisma.archetype.create({
          data: {
            name: "Doctor",
            mainAttribute: "precision",
            mainSkill: "Medicine",
          },
        })
      ).id;
      const data = {
        userId: player,
        archetypeId: archetype,
        ageGroup: "YOUNG" as const,
        motivation: "Truth",
        trauma: "Sight",
        darkSecret: "Debt",
        resources: 5,
        skill: { create: { inspiration: 5 } },
        attribute: {
          create: { physique: 3, precision: 2, logic: 4, empathy: 2 },
        },
      };
      character = (
        await prisma.character.create({
          data: { ...data, name: "Castle investigator" },
        })
      ).id;
      second = (
        await prisma.character.create({
          data: { ...data, name: "Second investigator" },
        })
      ).id;
      item = (
        await prisma.item.create({
          data: {
            name: `Sword-${prefix}`,
            type: "WEAPON",
            availability: 1,
            skill: "Close Combat",
          },
        })
      ).id;
    });
    beforeEach(async () => {
      state.actor = { id: gm, role: "GM" };
      partyId = (await createParty("Castle test party")).id;
      const hq = await prisma.headquarters.findUniqueOrThrow({
        where: { partyId },
      });
      hqId = hq.id;
      await prisma.partyMember.createMany({
        data: [
          { partyId, characterId: character },
          { partyId, characterId: second },
        ],
      });
      await prisma.headquarters.update({
        where: { id: hqId },
        data: { developmentPoints: 100 },
      });
      mysteryId = (
        await prisma.mystery.create({
          data: {
            partyId,
            title: "Castle test mystery",
            summary: "A haunting",
            status: "PREP",
          },
        })
      ).id;
      await prisma.character.update({
        where: { id: character },
        data: {
          experiencePoints: 10,
          physicalConditions: { exhausted: true, wounded: true, broken: true },
          mentalConditions: { angry: true },
        },
      });
    });
    afterEach(async () => {
      vi.restoreAllMocks();
      if (partyId) await prisma.party.deleteMany({ where: { id: partyId } });
    });
    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { id: { in: [gm, player].filter(Boolean) } },
      });
      if (archetype)
        await prisma.archetype.delete({ where: { id: archetype } });
      if (item) await prisma.item.delete({ where: { id: item } });
      await prisma.$disconnect();
    });
    it("grants starting assets without a purchase, threat or charge", async () => {
      expect(
        (
          await prisma.castleUpgrade.findMany({
            where: { headquartersId: hqId },
          })
        )
          .map((u) => u.key)
          .sort(),
      ).toEqual(["algot-frisk", "library"]);
      expect(await prisma.castlePurchase.count({ where: { occasion: { headquartersId: hqId } } })).toBe(0);
      expect(
        await prisma.castleThreat.count({ where: { headquartersId: hqId } }),
      ).toBe(0);
      await expect(buy("library")).rejects.toThrow("Starting assets");
    });
    it("preserves balances under concurrent spending", async () => {
      await prisma.headquarters.update({
        where: { id: hqId },
        data: { developmentPoints: 6 },
      });
      const results = await Promise.allSettled([
        buy("workshop"),
        buy("annals"),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(
        (await prisma.headquarters.findUniqueOrThrow({ where: { id: hqId } }))
          .developmentPoints,
      ).toBe(2);
    });
    it("replays an idempotent purchase without a second charge or roll", async () => {
      const requestId = crypto.randomUUID();
      const first = await buy("workshop", { requestId });
      const retry = await buy("workshop", { requestId });
      expect(first.id).toBe(retry.id);
      expect(
        await prisma.castlePurchase.count({
          where: { occasion: { headquartersId: hqId } },
        }),
      ).toBe(1);
      await expect(buy("annals", { requestId })).rejects.toThrow("identifier");
    });
    it("enforces repeated-level limits even under concurrent purchases", async () => {
      await buy("local-tavern");
      await buy("local-tavern");
      const results = await Promise.allSettled([
        buy("local-tavern"),
        buy("local-tavern"),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(
        await prisma.castleUpgrade.count({
          where: { headquartersId: hqId, key: "local-tavern" },
        }),
      ).toBe(3);
    });
    it("tracks purchase occasions and leaves successful threat selection to the GM", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      const first = await buy("guard", person);
      const next = await buy("annals");
      expect(first.dice).toBe(5);
      expect(next.dice).toBe(5);
      expect(
        await prisma.castleThreat.count({
          where: { headquartersId: hqId, status: "PENDING" },
        }),
      ).toBe(2);
      await closeCastleOccasion(hqId);
      expect((await buy("chef", person)).dice).toBe(4);
    });
    it("requires discovery and prerequisites, with an explicit audited exception", async () => {
      await expect(buy("botanical-garden")).rejects.toThrow("Prerequisites");
      await introduceCastleDiscovery(hqId, "botanical-garden");
      await expect(buy("botanical-garden")).rejects.toThrow("Gardener");
      await buy("gardener", person);
      await buy("botanical-garden");
      expect(
        (
          await prisma.castleDiscovery.findUniqueOrThrow({
            where: {
              headquartersId_key: {
                headquartersId: hqId,
                key: "botanical-garden",
              },
            },
          })
        ).identified,
      ).toBe(true);
      const exception = await buy("occult-library", {
        overrideReason: "Legacy campaign already owns an occult volume",
      });
      expect(exception.overrideReason).toContain("Legacy campaign");
    });
    it("applies the Difference Engine only to facility purchases", async () => {
      await buy("professor", person);
      await buy("inventor", person);
      await introduceCastleDiscovery(hqId, "difference-engine");
      await buy("difference-engine");
      expect((await buy("workshop")).paidCost).toBe(3);
      expect((await buy("guard", person)).paidCost).toBe(5);
    });
    it("awards a completed mystery review exactly once, even concurrently", async () => {
      await expect(
        reviewCastleDevelopment(hqId, mysteryId, Array(8).fill(true)),
      ).rejects.toThrow("Complete a mystery");
      await prisma.mystery.update({
        where: { id: mysteryId },
        data: { status: "RESOLVED" },
      });
      const answers = [true, true, true, false, false, false, false, false];
      const results = await Promise.allSettled([
        reviewCastleDevelopment(hqId, mysteryId, answers),
        reviewCastleDevelopment(hqId, mysteryId, answers),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(
        (await prisma.headquarters.findUniqueOrThrow({ where: { id: hqId } }))
          .developmentPoints,
      ).toBe(103);
    });
    it("tracks per-investigator recovery permissions and one group use for other benefits", async () => {
      const infirmary = await buy("infirmary");
      const requestId = crypto.randomUUID();
      await use(infirmary.upgradeId, { requestId });
      await use(infirmary.upgradeId, { requestId });
      await expect(use(infirmary.upgradeId)).rejects.toThrow("already used");
      await use(infirmary.upgradeId, { characterId: second });
      const tavern = await buy("local-tavern");
      await use(tavern.upgradeId);
      await expect(
        use(tavern.upgradeId, { characterId: second }),
      ).rejects.toThrow("already used");
    });
    it("adds Annals XP once per gaming session without truncating advancement currency", async () => {
      const annals = await buy("annals");
      const sessionId = await createCastleSession(
        hqId,
        mysteryId,
        "Gaming session 1",
      );
      expect(
        await createCastleSession(hqId, mysteryId, "Gaming session 1"),
      ).toBe(sessionId);
      await use(annals.upgradeId, { sessionId });
      await expect(use(annals.upgradeId, { sessionId })).rejects.toThrow(
        "already received",
      );
      expect(
        (await prisma.character.findUniqueOrThrow({ where: { id: character } }))
          .experiencePoints,
      ).toBe(11);
      expect((await prisma.character.findUniqueOrThrow({ where: { id: character } })).experienceVersion).toBe(1);
    });
    it("prepares canonical gear without turning it into permanent character inventory", async () => {
      const corridor = await buy("weapons-corridor");
      await use(corridor.upgradeId, { itemId: item });
      expect(
        await prisma.castlePreparedItem.count({
          where: { characterId: character, itemId: item },
        }),
      ).toBe(1);
      expect(
        await prisma.characterInventory.count({
          where: { characterId: character, itemId: item },
        }),
      ).toBe(0);
    });
    it("heals selected conditions and does not clear Broken without the physician", async () => {
      await introduceCastleDiscovery(hqId, "gymnasium");
      const gym = await buy("gymnasium");
      await use(gym.upgradeId, { physical: ["wounded"] });
      const healed = await prisma.character.findUniqueOrThrow({
        where: { id: character },
      });
      expect(healed.physicalConditions).toEqual({
        exhausted: true,
        wounded: false,
        broken: true,
      });
    });
    it("expires a Banker scene bonus without changing permanent Resources", async () => {
      const banker = await buy("banker", person);
      await use(banker.upgradeId);
      const record = await prisma.castleBenefitUse.findFirstOrThrow({
        where: { upgradeId: banker.upgradeId },
      });
      await expireCastleSceneBenefit(hqId, record.id);
      expect(
        (
          await prisma.castleBenefitUse.findUniqueOrThrow({
            where: { id: record.id },
          })
        ).expired,
      ).toBe(true);
      expect(
        (await prisma.character.findUniqueOrThrow({ where: { id: character } }))
          .resources,
      ).toBe(5);
    });
    it("treats a group with explicit condition choices and clears Broken", async () => {
      await buy("infirmary");
      const physician = await buy("house-physician", person);
      await use(physician.upgradeId, {
        healingChoices: [
          { characterId: character, physical: ["wounded"], mental: ["angry"] },
        ],
      });
      const treated = await prisma.character.findUniqueOrThrow({
        where: { id: character },
      });
      expect(treated.physicalConditions).toEqual({
        exhausted: true,
        wounded: false,
        broken: false,
      });
      expect(treated.mentalConditions).toEqual({ angry: false, broken: false });
    });
    it("requires a complete named recruit before they can accompany investigators", async () => {
      const recruit = await buy("recruit", person);
      const stats = {
        attributes: { physique: 3, precision: 3, logic: 3, empathy: 3 },
        skills: {
          agility: 2,
          closeCombat: 2,
          force: 2,
          medicine: 2,
          rangedCombat: 2,
        },
      };
      await updateCastleUpgrade(hqId, recruit.upgradeId, { stats });
      await expect(use(recruit.upgradeId)).rejects.toThrow(
        "GM-only motivation",
      );
      await updateCastleUpgrade(hqId, recruit.upgradeId, {
        motivation: "Find the truth",
        darkSecret: "A hidden pact",
        relationships: "Trusts both investigators",
      });
      await use(recruit.upgradeId);
    });
    it("enforces storage capacity while preserving every stash row", async () => {
      const row = await prisma.partyStashItem.create({
        data: { partyId, itemId: item, quantity: 4 },
      });
      await expect(
        reviewCastleStorage(hqId, [{ id: row.id, quantity: 1 }]),
      ).rejects.toThrow("capacity");
      await introduceCastleDiscovery(hqId, "cellar-vault");
      await buy("cellar-vault");
      await reviewCastleStorage(hqId, [{ id: row.id, quantity: 3 }]);
      await expect(
        reviewCastleStorage(hqId, [{ id: row.id, quantity: 4 }]),
      ).rejects.toThrow("capacity");
      expect(
        (
          await prisma.partyStashItem.findUniqueOrThrow({
            where: { id: row.id },
          })
        ).quantity,
      ).toBe(4);
    });
    it("blocks player mutations and cross-castle object identifiers", async () => {
      const other = await createParty("Another castle");
      try {
        const otherHQ = await prisma.headquarters.findUniqueOrThrow({
          where: { partyId: other.id },
        });
        const threat = await prisma.castleThreat.create({
          data: { headquartersId: otherHQ.id, title: "Private threat" },
        });
        await expect(
          updateCastleThreat(hqId, threat.id, {
            title: "Hijacked",
            description: "",
            status: "ACTIVE",
            countdown: [],
            step: 0,
          }),
        ).rejects.toThrow();
        const owned = await prisma.castleUpgrade.findFirstOrThrow({
          where: { headquartersId: otherHQ.id },
        });
        await expect(
          updateCastleUpgrade(hqId, owned.id, { status: "DAMAGED" }),
        ).rejects.toThrow();
        state.actor = { id: player, role: "PLAYER" };
        await expect(buy("annals")).rejects.toThrow("Forbidden");
        await expect(reviewCastleStorage(hqId, [])).rejects.toThrow(
          "Forbidden",
        );
        await expect(
          awardDevelopmentPoints(hqId, 2, "Not authorized"),
        ).rejects.toThrow("Forbidden");
      } finally {
        await prisma.party.delete({ where: { id: other.id } });
      }
    });
  },
);
