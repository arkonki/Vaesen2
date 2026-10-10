import { describe, expect, it } from "vitest";
import { applicableGear, isTemporaryGear, rollModifier, sheetPool, SHEET_SKILLS, type SheetInventoryEntry } from "../src/lib/character-sheet-rules";

const item: SheetInventoryEntry["item"] = { id: "tool", bookKey: null, name: "Tool", description: null, type: "WEAPON", bonus: 0, availability: 1, damage: 2, range: "0", skill: "Close Combat", sourceBook: null, sourcePage: null, protection: null, agilityPenalty: null, doses: null, toxicity: null,
  usages: [{ id: "attack", itemId: "tool", label: "Strike", kind: "ATTACK", skills: ["closeCombat"], bonus: 0, damage: 2, rangeMin: 0, rangeMax: 0, requirements: "Within reach", effect: "Attack", position: 0 }] };
const entry: SheetInventoryEntry = { id: "inventory", quantity: 1, notes: null, item };
const base = { skill: "agility" as const, attributes: { physique: 4, precision: 3, logic: 5, empathy: 2 }, skills: { agility: 2, closeCombat: 0, force: 0, medicine: 0, rangedCombat: 0, stealth: 0, investigation: 0, learning: 3, vigilance: 0, inspiration: 0, manipulation: 0, observation: 0 }, physical: {}, mental: {}, itemBonus: 0, advantages: 0 };
const armor = { ...item, type: "ARMOR" as const, protection: 4, agilityPenalty: 2 };

describe("sheet skill checks", () => {
  it("maps all twelve skills to the correct printed attribute groups", () => {
    expect(SHEET_SKILLS).toHaveLength(12);
    expect(SHEET_SKILLS.filter(skill => skill.attribute === "precision").map(skill => skill.key)).toEqual(["medicine", "rangedCombat", "stealth"]);
    expect(SHEET_SKILLS.filter(skill => skill.attribute === "empathy").map(skill => skill.key)).toEqual(["inspiration", "manipulation", "observation"]);
    expect(SHEET_SKILLS.filter(skill => skill.domain === "physical")).toHaveLength(6);
  });
  it("applies one gear bonus and situational modifiers", () => expect(sheetPool({ ...base, itemBonus: 2, advantages: 1 }).dice).toBe(9));
  it("counts only matching-domain conditions, not Broken", () => {
    const physical = { exhausted: true, battered: true, broken: true }, mental = { angry: true, frightened: true, hopeless: true, broken: true };
    expect(sheetPool({ ...base, physical, mental }).dice).toBe(4);
    expect(sheetPool({ ...base, skill: "learning", physical, mental }).dice).toBe(5);
  });
  it("subtracts selected armor from Agility only", () => {
    expect(sheetPool({ ...base, armor }).dice).toBe(4);
    for (const skill of SHEET_SKILLS.filter(skill => skill.key !== "agility")) expect(sheetPool({ ...base, skill: skill.key, armor }).armorPenalty).toBe(0);
    expect(sheetPool({ ...base }).armorPenalty).toBe(0);
  });
  it("does not use protection or an unknown armor penalty as a skill bonus", () => {
    expect(sheetPool({ ...base, armor: { ...armor, agilityPenalty: null } }).dice).toBe(6);
    expect(sheetPool({ ...base, armor: { ...armor, type: "GEAR" } }).dice).toBe(6);
  });
  it("clamps negative pools to zero and matches the roller's 50-die limit", () => {
    expect(sheetPool({ ...base, itemBonus: -20 }).dice).toBe(0);
    expect(sheetPool({ ...base, attributes: { ...base.attributes, physique: 12 }, itemBonus: 20, advantages: 20 }).dice).toBe(50);
  });
  it("sanitizes manual modifiers to finite integers within bounds", () => {
    expect([NaN,Infinity,-Infinity,22,-99,1.8].map(rollModifier)).toEqual([0,0,0,20,-20,1]);
  });
});
describe("carried equipment uses", () => {
  it("keeps zero-bonus attacks, including damage and range", () => {
    const profiles = applicableGear([entry], "closeCombat");
    expect(profiles).toHaveLength(1); expect(profiles[0].profile.damage).toBe(2); expect(profiles[0].profile.bonus).toBe(0);
  });
  it("does not leak profiles from an unrelated skill or empty inventory row", () => {
    expect(applicableGear([entry], "learning")).toEqual([]);
    expect(applicableGear([{ ...entry, quantity: 0 }], "closeCombat")).toEqual([]);
  });
  it("keeps narrative effects out of dice choices", () => expect(applicableGear([{ ...entry, item: { ...item, usages: [{ ...item.usages![0], kind: "NARRATIVE" }] } }], "closeCombat")).toEqual([]));
  it("uses inventory-specific keys even when item definitions match", () => expect(applicableGear([entry, { ...entry, id: "borrowed" }], "closeCombat").map(profile => profile.key)).toEqual(["inventory:attack","borrowed:attack"]));
  it("supports legacy equipment without fabricating attacks or armor bonuses", () => {
    expect(applicableGear([{ ...entry, item: { ...item, usages: [] } }], "closeCombat")[0].profile.requirements).toContain("Legacy");
    expect(applicableGear([{ ...entry, item: { ...armor, usages: [] } }], "closeCombat")).toEqual([]);
  });
  it("matches temporary gear by whole words, not unrelated words like attempt", () => {
    for (const notes of ["Temporary castle preparation equipment","Borrowed from the party","On loan", "temp"]) expect(isTemporaryGear({ ...entry, notes })).toBe(true);
    for (const notes of [null, "Attempt to identify", "Temple supplies"]) expect(isTemporaryGear({ ...entry, notes })).toBe(false);
  });
});
