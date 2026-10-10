import { describe, it, expect } from "vitest";
import { CREATION_STEPS, CREATION_HINTS, canContinueCreation, changesCreationFoundation, hasDependentChoices, updateCreationState } from "../src/lib/creation-flow";
import { initialState, type WizardState } from "../src/lib/character-draft";

const chosen: WizardState = { ...initialState, archetypeId: "academic", ageGroup: "YOUNG", attributeAllowance: 15, skillAllowance: 10, mainAttribute: "logic", mainSkill: "learning", minResources: 4, maxResources: 6, resources: 4, name: "Astrid", motivation: "Truth", trauma: "A voice", darkSecret: "A promise", memento: "Letter", relationships: "Linus: Friend" };
const allocated: WizardState = { ...chosen, attributes: { physique: 4, precision: 3, logic: 4, empathy: 4 }, skills: { ...initialState.skills, learning: 3, investigation: 2, observation: 2, vigilance: 2 }, resources: 5, talentId: "bookworm", equipmentChoices: { tools: "book" } };

describe("guided character creation", () => {
  it("keeps the existing eight-step draft format and gives every step guidance", () => {
    expect(CREATION_STEPS).toHaveLength(8); expect(CREATION_HINTS).toHaveLength(8);
    expect(CREATION_STEPS[0]).toBe("Archetype"); expect(CREATION_STEPS[7]).toBe("Review");
  });
  it("never continues past an incomplete step", () => {
    expect(canContinueCreation(1, initialState)).toBe(false);
    expect(canContinueCreation(1, chosen)).toBe(true);
    expect(canContinueCreation(4, chosen)).toBe(false);
    expect(canContinueCreation(4, allocated)).toBe(true);
    expect(canContinueCreation(5, allocated)).toBe(true);
    expect(canContinueCreation(6, { ...allocated, talentId: "" })).toBe(false);
    expect(canContinueCreation(6, { ...allocated, trauma: "  " })).toBe(false);
  });
  it("identifies real foundation changes, not inspecting or reselecting entries", () => {
    expect(changesCreationFoundation(chosen, { archetypeId: "academic" })).toBe(false);
    expect(changesCreationFoundation(chosen, { ageGroup: "YOUNG" })).toBe(false);
    expect(changesCreationFoundation(chosen, { archetypeId: "doctor" })).toBe(true);
    expect(changesCreationFoundation(chosen, { ageGroup: "OLD" })).toBe(true);
    expect(changesCreationFoundation(chosen, { name: "Linus" })).toBe(false);
  });
  it("requests confirmation only when dependent character choices exist", () => {
    expect(hasDependentChoices(chosen)).toBe(false);
    expect(hasDependentChoices(allocated)).toBe(true);
    expect(hasDependentChoices({ ...chosen, talentId: "talent" })).toBe(true);
    expect(hasDependentChoices({ ...chosen, resources: 5 })).toBe(true);
  });
  it("resets age-dependent choices and preserves all written background", () => {
    const result = updateCreationState(allocated, { ageGroup: "OLD", attributeAllowance: 13, skillAllowance: 14 });
    expect(result.attributes).toEqual(initialState.attributes); expect(result.skills).toEqual(initialState.skills);
    expect(result.resources).toBe(4); expect(result.talentId).toBe(""); expect(result.equipmentChoices).toEqual({}); expect(result.equipment).toEqual([]);
    for (const key of ["name", "motivation", "trauma", "darkSecret", "memento", "relationships"] as const) expect(result[key]).toBe(allocated[key]);
    expect(result.attributeAllowance).toBe(13); expect(result.skillAllowance).toBe(14);
    expect(allocated.attributes.logic).toBe(4);
  });
  it("uses the new archetype's resource range and fixed equipment", () => {
    const result = updateCreationState(allocated, { archetypeId: "doctor", mainAttribute: "precision", mainSkill: "medicine", minResources: 3, maxResources: 5, resources: 3, equipmentChoices: { tools: "medical-bag" } });
    expect(result.resources).toBe(3); expect(result.minResources).toBe(3); expect(result.equipmentChoices).toEqual({ tools: "medical-bag" }); expect(result.talentId).toBe("");
  });
  it("preserves other choices when editing a name, background, or allocation", () => {
    const result = updateCreationState(allocated, { name: "Linus" });
    expect(result).toEqual({ ...allocated, name: "Linus" });
    const same = updateCreationState(allocated, { ageGroup: "YOUNG" });
    expect(same).toEqual(allocated);
  });
});
