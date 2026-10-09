import { describe, expect, it } from "vitest";
import { ADVANCE_XP_COST, MAX_SKILL_RANK, advancementSchema, ownedTalentIds, skillLabel } from "../src/lib/advancement-rules";
import { SKILL_KEYS } from "../src/lib/character-rules";

describe("character advancement rules", () => {
  const skill = { kind: "SKILL", target: "learning", expectedRank: 4, expectedVersion: 0, requestId: crypto.randomUUID() };
  it("charges a flat five XP for either type of Advance and caps skills at five", () => {
    expect(ADVANCE_XP_COST).toBe(5); expect(MAX_SKILL_RANK).toBe(5);
    for (const target of SKILL_KEYS) expect(advancementSchema.safeParse({ ...skill, target }).success).toBe(true);
    expect(advancementSchema.safeParse({ kind: "TALENT", target: crypto.randomUUID(), expectedVersion: 0, requestId: skill.requestId }).success).toBe(true);
    expect(skillLabel("rangedCombat")).toBe("Ranged Combat");
  });
  it("rejects forged costs, attributes, resources, ranks, versions and request IDs", () => {
    for (const change of [{ xpCost: 0 }, { experiencePoints: 100 }, { target: "logic" }, { target: "resources" },
      { expectedRank: 5 }, { expectedRank: -1 }, { expectedRank: 1.5 }, { expectedVersion: -1 }, { expectedVersion: "0" }, { requestId: "fake" }]) {
      expect(advancementSchema.safeParse({ ...skill, ...change }).success).toBe(false);
    }
  });
  it("preserves unknown legacy string IDs but never discards malformed talent data", () => {
    expect(ownedTalentIds(["old-talent", "old-talent", "other"])).toEqual(["old-talent", "other"]);
    for (const value of [null, {}, [{ name: "Legacy talent" }], [1]]) expect(() => ownedTalentIds(value)).toThrow("legacy talent data");
  });
});
