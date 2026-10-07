import { describe, it, expect } from "vitest";
import { HQ_UPGRADES, upgradeByKey } from "../src/lib/hq-upgrades";
import {
  missingRequirements,
  upgradeCost,
  storageCapacity,
  threatRoll,
  validatePersonnelStats,
  healConditions,
  meetsRequirement,
  type CastleContext,
} from "../src/lib/hq-rules";
const context: CastleContext = { owned: [], members: [], facts: [] };
describe("castle book rules", () => {
  it("contains all 49 unique entries and the two free starting assets", () => {
    expect(HQ_UPGRADES).toHaveLength(49);
    expect(new Set(HQ_UPGRADES.map((u) => u.key)).size).toBe(49);
    expect(
      HQ_UPGRADES.filter((u) => u.starting).map((u) => [u.key, u.cost]),
    ).toEqual([
      ["library", 0],
      ["algot-frisk", 0],
    ]);
    for (const u of HQ_UPGRADES) expect(u.page).toBeGreaterThanOrEqual(89);
  });
  it("enforces AND, OR, party resources, archetypes and campaign evidence", () => {
    expect(
      missingRequirements(upgradeByKey("infirmary"), context),
    ).toHaveLength(1);
    expect(
      missingRequirements(upgradeByKey("infirmary"), {
        ...context,
        members: [{ resources: 0, archetype: "Doctor", inspiration: 0 }],
      }),
    ).toEqual([]);
    expect(
      missingRequirements(upgradeByKey("armory"), {
        ...context,
        members: [{ resources: 5, archetype: "Hunter", inspiration: 0 }],
      }),
    ).toHaveLength(1);
    expect(
      missingRequirements(upgradeByKey("occult-library"), {
        ...context,
        facts: ["occult-book"],
      }),
    ).toEqual([]);
    expect(
      meetsRequirement(
        { inspiration: 5 },
        {
          ...context,
          members: [{ resources: 0, archetype: "Author", inspiration: 4 }],
        },
      ),
    ).toBe(false);
  });
  it("counts distinct active facilities rather than repeated levels", () => {
    const owned = Array.from({ length: 6 }, () => ({
      key: "stable",
      category: "facilities",
      status: "ACTIVE",
    }));
    expect(meetsRequirement({ facilities: 6 }, { ...context, owned })).toBe(
      false,
    );
    expect(
      meetsRequirement(
        { upgrade: "stable" },
        { ...context, owned: [{ ...owned[0], status: "DAMAGED" }] },
      ),
    ).toBe(false);
  });
  it("discounts facilities, not staff, and adds storage per active level", () => {
    const owned = [
      { key: "difference-engine", category: "discovered", status: "ACTIVE" },
      ...Array.from({ length: 3 }, () => ({
        key: "cellar-vault",
        category: "discovered",
        status: "ACTIVE",
      })),
      { key: "occult-archive", category: "discovered", status: "DAMAGED" },
    ];
    expect(upgradeCost(upgradeByKey("workshop"), { ...context, owned })).toBe(
      3,
    );
    expect(upgradeCost(upgradeByKey("guard"), { ...context, owned })).toBe(5);
    expect(storageCapacity(owned)).toEqual({ common: 9, occult: 0 });
  });
  it("uses cost plus occasion ordinal and detects successes without choosing a threat", () => {
    expect(threatRoll(4, 2, () => 0.99)).toEqual({
      dice: 6,
      rolls: [6, 6, 6, 6, 6, 6],
      successes: 6,
    });
    expect(threatRoll(4, 0, () => 0).successes).toBe(0);
  });
  it("validates personnel budgets, skill restrictions and toughness", () => {
    const guard = upgradeByKey("guard");
    const stats = {
      attributes: { physique: 3, precision: 3, logic: 3, empathy: 3 },
      skills: { closeCombat: 3, rangedCombat: 3 },
    };
    expect(validatePersonnelStats(guard, stats)).toMatchObject({
      physicalToughness: 2,
      mentalToughness: 1,
    });
    expect(() =>
      validatePersonnelStats(guard, {
        ...stats,
        skills: { closeCombat: 3, learning: 3 },
      }),
    ).toThrow();
    expect(() =>
      validatePersonnelStats(guard, {
        ...stats,
        attributes: { ...stats.attributes, physique: 4 },
      }),
    ).toThrow();
  });
  it("heals selected conditions without silently healing Broken", () => {
    expect(
      healConditions(
        { wounded: true, exhausted: true, broken: true },
        1,
        false,
        ["wounded"],
      ),
    ).toEqual({ wounded: false, exhausted: true, broken: true });
    expect(healConditions({ broken: true }, 2, true)).toEqual({
      broken: false,
    });
    expect(() =>
      healConditions({ wounded: true }, 1, false, ["exhausted"]),
    ).toThrow();
  });
});
