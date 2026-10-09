import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { equipmentSchema, canCarryItem, equipmentBonusLabel, type EquipmentInput, profilesFor, type EquipmentItem } from "../src/lib/equipment";
const { equipment } = createRequire(import.meta.url)("../prisma/content/equipment.js") as { equipment: (EquipmentInput & { bookKey: string })[] };
const input = (name: string) => { const { bookKey, ...fields } = equipment.find(item => item.name === name)!; expect(bookKey).toMatch(/^core-equipment-/); return fields; };
describe("core equipment catalogue", () => {
  it("covers all 87 table entries in 86 definitions with distinct crowbar uses", () => {
    expect(equipment).toHaveLength(86); expect(new Set(equipment.map(i => i.bookKey)).size).toBe(86);
    expect(Object.fromEntries(["GEAR","WEAPON","ARMOR","SERVICE","COVER","ATTACK"].map(type => [type,equipment.filter(i => i.type === type).length]))).toEqual({ GEAR:42, WEAPON:20, ARMOR:3, SERVICE:15, COVER:4, ATTACK:2 });
    expect(input("Crowbar").usages.map(u => [u.kind,u.skills])).toEqual([["TOOL",["force"]],["ATTACK",["closeCombat"]]]);
    for (const item of equipment) expect(equipmentSchema.safeParse(input(item.name)).success, item.name).toBe(true);
  });
  it("stores real zones, separate armor values, multiple skills and poison packs", () => {
    expect(input("Longbow").usages[0]).toMatchObject({ rangeMin:1,rangeMax:3,damage:2 });
    expect(input("Cannon").usages[0]).toMatchObject({ rangeMin:2,rangeMax:5,damage:5 });
    expect(input("Spear").usages[0].skills).toEqual(["closeCombat","rangedCombat"]);
    expect(input("Heavy armor")).toMatchObject({ protection:6,agilityPenalty:3,availability:4 });
    expect(input("Weak poison")).toMatchObject({ doses:3,toxicity:3,bonus:0 });
    expect(input("Rope ladder").usages[0].skills).toEqual(["force","agility"]);
  });
  it("never treats services, cover or unarmed attacks as carried gear", () => {
    for (const name of ["Doctor","House wall","Kick or punch","Rifle butt"]) expect(canCarryItem(input(name))).toBe(false);
    expect(canCarryItem(input("Crystal ball"))).toBe(true); expect(input("Crystal ball").type).toBe("GEAR");
    expect(input("Simple provisions")).toMatchObject({ bonus:1,usages:[{ kind:"NARRATIVE",bonus:0,skills:[] }] });
  });
  it("validates fields at runtime and prevents narrative bonuses or invalid ranges", () => {
    for (const fields of [{...input("Longbow"),availability:6},{...input("Longbow"),bookKey:"forged"},{...input("Heavy armor"),protection:null},
      {...input("Heavy armor"),agilityPenalty:-1},{...input("Weak poison"),doses:0},{...input("Doctor"),usages:[{...input("Doctor").usages[0],bonus:2}]},
      {...input("Longbow"),usages:[{...input("Longbow").usages[0],rangeMin:4,rangeMax:3}]},
      {...input("Crowbar"),usages:[{...input("Crowbar").usages[0],skills:["bogus"]}]}]) expect(equipmentSchema.safeParse(fields).success).toBe(false);
  });
  it("does not turn legacy armor bonus/notes into invented armor mechanics", () => {
    const legacy = { id:"legacy",type:"ARMOR",bonus:6,skill:null } as EquipmentItem;
    expect(profilesFor(legacy)).toEqual([]);
  });
  it("shows provisions as a special effect rather than their printed bonus", () => {
    expect(equipmentBonusLabel(input("Simple provisions") as EquipmentItem)).toBe("Special effect");
    expect(equipmentBonusLabel(input("Crowbar") as EquipmentItem)).toBe("+1");
  });
});
