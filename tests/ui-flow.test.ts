import { describe, expect, it } from "vitest";
import type { Archetype, Item, Talent } from "@prisma/client";
import { safeCallbackPath, compendiumTab } from "../src/lib/ui-flow";
import { firstIncompleteStep, initialState, restoreCharacterDraft, type WizardState } from "../src/lib/character-draft";

const archetype: Archetype = { bookKey:null,sourceBook:null,sourcePage:null, id: "00000000-0000-4000-8000-000000000001", name: "Academic", flavorText: "", firstNameOptions: [], lastNameOptions: [], motivationOptions: [], traumaOptions: [], darkSecretOptions: [], relationshipOptions: [], mainAttribute: "logic", mainSkill: "learning", startingResourcesMin: 1, startingResourcesMax: 3 };
const talent: Talent = { bookKey:null, id: "00000000-0000-4000-8000-000000000002", name: "Research", description: "Research", type: "GENERAL", archetypeId: null };
const item: Item = { bookKey:null, sourceBook:null, sourcePage:null, protection:null, agilityPenalty:null, doses:null, toxicity:null, id: "00000000-0000-4000-8000-000000000003", name: "Notebook", description: null, bonus: 1, availability: 1, type: "GEAR", damage: null, range: null, skill: "learning" };
const complete: WizardState = { ...initialState, name: "Astrid", archetypeId: archetype.id, mainAttribute: "logic", mainSkill: "learning", minResources: 1, maxResources: 3, ageGroup: "YOUNG", attributeAllowance: 15, skillAllowance: 10, attributes: { physique: 4, precision: 3, logic: 4, empathy: 4 }, skills: { ...initialState.skills, agility: 2, stealth: 2, learning: 3, observation: 2, investigation: 1 }, resources: 1, talentId: talent.id, motivation: "Truth", trauma: "The lake", darkSecret: "A promise", equipment: [item] };
const serialized = (data = complete, step = 8) => JSON.stringify({ version: 2, data, step });

describe("navigation destinations", () => {
  it("keeps an internal destination including query and fragment", () => expect(safeCallbackPath("/parties/abc/mysteries?q=bell#clue")).toBe("/parties/abc/mysteries?q=bell#clue"));
  it("rejects external, malformed, and authentication-loop destinations", () => {
    for (const value of [undefined, "https://evil.example", "//evil.example", "/\\evil.example", "/login?callbackUrl=/login", "/api/auth/signout", "/\n/evil.example"]) expect(safeCallbackPath(value)).toBe("/");
  });
  it("does not allow a player to select GM-only categories via the URL", () => {
    for (const tab of ["npcs","vaesen"]) { expect(compendiumTab(tab,false)).toBe("rules"); expect(compendiumTab(tab,true)).toBe(tab); }
    expect(compendiumTab("items",false)).toBe("items"); expect(compendiumTab("unknown",true)).toBe("rules");
  });
});
describe("private character drafts", () => {
  it("restores a valid draft and its review step", () => expect(restoreCharacterDraft(serialized(),[archetype],[talent],[item])).toEqual({data:complete,step:8}));
  it("rejects invalid JSON, unsupported versions, and malformed fields", () => {
    for (const raw of ["broken", "{}", JSON.stringify({version:3,data:complete,step:8}), serialized({...complete, attributes:{...complete.attributes,physique:99}})]) expect(restoreCharacterDraft(raw,[archetype],[talent],[item])).toBeNull();
  });
  it("derives allowances and rules from the current catalogue, not saved metadata", () => {
    const restored = restoreCharacterDraft(serialized({...complete,attributeAllowance:999,mainAttribute:"physique"}),[archetype],[talent],[item])!;
    expect(restored.data.attributeAllowance).toBe(15);expect(restored.data.mainAttribute).toBe("logic");
  });
  it("removes unavailable or forbidden starting equipment and talents", () => {
    const magic = {...item,type:"MAGIC" as const};
    const restored = restoreCharacterDraft(serialized(),[archetype],[],[magic])!;
    expect(restored.data.equipment).toEqual([]);expect(restored.data.talentId).toBe("");expect(restored.step).toBe(6);
  });
  it("returns to identity if the archetype has been removed", () => expect(restoreCharacterDraft(serialized(),[],[talent],[item])?.step).toBe(1));
  it("prevents skipping incomplete allocation steps", () => {
    expect(firstIncompleteStep(initialState)).toBe(1);expect(firstIncompleteStep(complete)).toBe(8);
    expect(firstIncompleteStep({...complete,attributes:{...complete.attributes,logic:3}})).toBe(4);
    expect(firstIncompleteStep({...complete,skills:{...complete.skills,learning:2}})).toBe(5);
    expect(firstIncompleteStep({...complete,darkSecret:""})).toBe(6);
    expect(restoreCharacterDraft(serialized({...complete,skills:{...complete.skills,learning:2}}),[archetype],[talent],[item])?.step).toBe(5);
  });
  it("migrates older seven-step drafts without losing their data", () => {
    const raw = JSON.stringify({version:1,step:7,data:complete});
    expect(restoreCharacterDraft(raw,[archetype],[talent],[item])).toEqual({data:complete,step:8});
  });
  it("asks for archetype, age, and then name", () => {
    expect(firstIncompleteStep({...initialState,archetypeId:archetype.id})).toBe(2);
    expect(firstIncompleteStep({...complete,name:""})).toBe(3);
  });
});
