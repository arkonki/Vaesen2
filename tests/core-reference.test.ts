import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import { SKILL_KEYS } from "../src/lib/character-rules";
import { SKILL_ATTRIBUTES, skillReferenceSchema } from "../src/lib/skill-reference";
import { archetypeTemplateSchema } from "../src/lib/archetype-template";
import { equipmentSchema, type EquipmentInput } from "../src/lib/equipment";
import { archetypes } from "../prisma/content/archetypes.json";
import type { SkillDefinition } from "@prisma/client";
const require=createRequire(import.meta.url);
const {skills}=require("../prisma/content/skills") as {skills:SkillDefinition[]};
const {descriptions}=require("../prisma/content/archetype-talents") as {descriptions:Record<string,string>};
const {startingItems}=require("../prisma/content/starting-items") as {startingItems:(EquipmentInput & {bookKey:string})[]};
const {equipment}=require("../prisma/content/equipment") as {equipment:EquipmentInput[]};
describe("verified core references",()=>{
  it("covers all twelve fixed skills with the correct attributes and pages",()=>{
    expect(skills.map(s=>s.key)).toEqual(SKILL_KEYS);
    for(const skill of skills) {
      expect(skill.attribute).toBe(SKILL_ATTRIBUTES[skill.key as keyof typeof SKILL_ATTRIBUTES]);
      expect(skill.sourcePages.every(p=>p>=44 && p<=47)).toBe(true);
      const {name,attribute,...fields}=skill;
      expect(name).toBeTruthy();expect(attribute).toBeTruthy();expect(skillReferenceSchema.safeParse(fields).success).toBe(true);
    }
  });
  it("contains all ten archetypes, complete suggestions and thirty real talent rules",()=>{
    expect(archetypes).toHaveLength(10);expect(new Set(archetypes.map((a:{bookKey:string})=>a.bookKey)).size).toBe(10);
    const names=new Set();
    for(const def of archetypes) {
      expect(archetypeTemplateSchema.safeParse(def.archetype).success).toBe(true);
      expect(def.archetype.firstNameOptions).toHaveLength(6);expect(def.archetype.lastNameOptions).toHaveLength(3);
      for(const f of ["motivationOptions","traumaOptions","darkSecretOptions","relationshipOptions"] as const)expect(def.archetype[f]).toHaveLength(3);
      expect(def.archetype.flavorText.length).toBeGreaterThan(500);expect(def.talentNames).toHaveLength(3);
      for(const name of def.talentNames) {names.add(name);expect(descriptions[name]?.length).toBeGreaterThan(20);}
      expect(def.equipmentGroups).toHaveLength(3);
      for(const group of def.equipmentGroups)for(const name of group.items)expect([...equipment,...startingItems].some(i=>i.name===name),name).toBe(true);
    }
    expect(names.size).toBe(30);
  });
  it("corrects the bootstrap archetype mechanics using the printed rules",()=>{
    const get=(name:string)=>archetypes.find((a:{archetype:{name:string}})=>a.archetype.name===name)!.archetype;
    expect(get("Doctor")).toMatchObject({mainAttribute:"logic",mainSkill:"medicine",startingResourcesMin:4,startingResourcesMax:6});
    expect(get("Officer")).toMatchObject({mainAttribute:"precision",mainSkill:"rangedCombat",startingResourcesMin:3,startingResourcesMax:7});
    expect(get("Priest")).toMatchObject({mainAttribute:"empathy",mainSkill:"observation",startingResourcesMin:4,startingResourcesMax:6});
    expect(get("Vagabond")).toMatchObject({mainAttribute:"physique",mainSkill:"manipulation",startingResourcesMin:1,startingResourcesMax:3});
  });
  it("records special starter effects and risks without inventing prices or bonuses",()=>{
    expect(startingItems).toHaveLength(4);
    for(const item of startingItems) {const data=Object.fromEntries(Object.entries(item).filter(([key])=>!["bookKey","damage","range","skill"].includes(key)));expect(item.bookKey).toMatch(/^core-starting/);expect(equipmentSchema.safeParse(data).success,item.name).toBe(true);expect(data.availability).toBe(0);}
    expect(startingItems.find(i=>i.type==='MAGIC')!.usages[0].requirements).toContain('one mental Condition each hour');
  });
  it("does not accept invented skill mappings or change a canonical key through prose",()=>{
    expect(skillReferenceSchema.safeParse({key:"magic",description:"x",extraSuccesses:[],guidance:[],sourceBook:null,sourcePages:[]}).success).toBe(false);
    expect(skillReferenceSchema.safeParse({key:"medicine",attribute:"logic",description:"x",extraSuccesses:[],guidance:[],sourceBook:null,sourcePages:[]}).success).toBe(false);
  });
});
