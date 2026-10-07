import { describe, it, expect } from "vitest";
import { characterCreationSchema, summarizeConditions, validateCharacterAllocation } from "../src/lib/character-rules";
import { canManageParty, isSessionCurrent, partyCharacterSelect, publicUserSelect } from "../src/lib/security";
import { sanitizeNotes } from "../src/lib/notes";
import { getUpgrade } from "../src/lib/hq-upgrades";
import { passwordSchema } from "../src/lib/user-validation";

const valid = {
  name: "Astrid", archetypeId: "00000000-0000-4000-8000-000000000001", ageGroup: "YOUNG",
  attributes: { physique: 3, precision: 3, logic: 5, empathy: 4 },
  skills: { agility: 1, closeCombat: 1, force: 0, medicine: 0, rangedCombat: 0, stealth: 0,
    investigation: 2, learning: 3, vigilance: 2, inspiration: 1, manipulation: 0, observation: 0 },
  resources: 1, talentId: "00000000-0000-4000-8000-000000000002",
  motivation: "Discover the truth", trauma: "Saw a ghost", darkSecret: "An old debt", equipment: [],
};
const archetype = { mainAttribute: "logic", mainSkill: "Learning", startingResourcesMin: 1, startingResourcesMax: 3 };

describe("character creation", () => {
  it("accepts a legal allocation", () => expect(() => validateCharacterAllocation(characterCreationSchema.parse(valid), archetype)).not.toThrow());
  it("rejects fractional, negative and unknown skills", () => {
    expect(() => characterCreationSchema.parse({ ...valid, skills: { ...valid.skills, force: -1 } })).toThrow();
    expect(() => characterCreationSchema.parse({ ...valid, resources: 1.5 })).toThrow();
    expect(() => characterCreationSchema.parse({ ...valid, skills: { ...valid.skills, invented: 2 } })).toThrow();
  });
  it("rejects overspending and non-main attribute/skill caps", () => {
    const data = characterCreationSchema.parse(valid);
    expect(() => validateCharacterAllocation({ ...data, attributes: { ...data.attributes, physique: 4 } }, archetype)).toThrow();
    expect(() => validateCharacterAllocation({ ...data, attributes: { physique: 5, precision: 3, logic: 3, empathy: 4 } }, archetype)).toThrow();
    expect(() => validateCharacterAllocation({ ...data, skills: { ...data.skills, learning: 2, investigation: 3 } }, archetype)).toThrow();
    expect(() => validateCharacterAllocation({ ...data, resources: 4 }, archetype)).toThrow();
  });
  it("treats Broken separately from condition penalties", () => {
    expect(summarizeConditions({ exhausted: true, battered: true, wounded: true }, {})).toEqual({ physical: 3, mental: 0, isBroken: false });
    expect(summarizeConditions({ broken: true }, { angry: true })).toEqual({ physical: 0, mental: 1, isBroken: true });
  });
});

describe("security boundaries", () => {
  it("allows only the owning GM or an administrator to manage a party", () => {
    expect(canManageParty({ id: "gm", role: "GM" }, "gm")).toBe(true);
    expect(canManageParty({ id: "gm", role: "PLAYER" }, "gm")).toBe(false);
    expect(canManageParty({ id: "other", role: "GM" }, "gm")).toBe(false);
    expect(canManageParty({ id: "admin", role: "ADMIN" }, "gm")).toBe(true);
  });
  it("rejects deleted, demoted, reset and legacy sessions", () => {
    const user = { role: "ADMIN", sessionVersion: 2 };
    expect(isSessionCurrent({ role: "ADMIN", sessionVersion: 2 }, user)).toBe(true);
    expect(isSessionCurrent({ role: "ADMIN", sessionVersion: 1 }, user)).toBe(false);
    expect(isSessionCurrent({ role: "GM", sessionVersion: 2 }, user)).toBe(false);
    expect(isSessionCurrent({ role: "ADMIN" }, user)).toBe(false);
    expect(isSessionCurrent({ role: "ADMIN", sessionVersion: 2 }, null)).toBe(false);
  });
  it("does not select passwords or investigators' private data", () => {
    expect(publicUserSelect).not.toHaveProperty("passwordHash");
    expect(partyCharacterSelect).not.toHaveProperty("darkSecret");
    expect(partyCharacterSelect).not.toHaveProperty("notes");
  });
  it("sanitizes stored markup while preserving safe formatting", () => {
    const clean = sanitizeNotes('<p onclick="evil()">Hello <strong>world</strong><img src=x onerror="evil()"><script>evil()</script><a href="javascript:evil()">link</a></p>');
    expect(clean).toBe("<p>Hello <strong>world</strong>link</p>");
  });
  it("rejects weak passwords and bcrypt truncation", () => {
    expect(passwordSchema.safeParse("admin12345").success).toBe(false);
    expect(passwordSchema.safeParse("a secure password").success).toBe(true);
    expect(passwordSchema.safeParse("é".repeat(40)).success).toBe(false);
  });
  it("gets prices only from the server catalogue", () => {
    expect(getUpgrade("facilities", "Infirmary").cost).toBe(6);
    expect(() => getUpgrade("facilities", "Free super infirmary")).toThrow();
    expect(() => getUpgrade("threats" as never, "Infirmary")).toThrow();
  });
});
