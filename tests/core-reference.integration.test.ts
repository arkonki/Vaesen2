import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../prisma/client.js";
import { archetypeTemplateInclude, resolveStartingEquipment, startingTalentsFor } from "../src/lib/archetype-template";
const require=createRequire(import.meta.url);
const {installCoreReference}=require("../prisma/content/core-reference");
const {archiveDuplicateArchetypes}=require("../prisma/content/archetype-cleanup");
const {importEquipment}=require("../prisma/content/equipment");
const {archetypes}=require("../prisma/content/archetypes.json");
const {descriptions}=require("../prisma/content/archetype-talents");
const url=process.env.CORE_CONTENT_TEST_DATABASE_URL;
if(url && !new URL(url).pathname.endsWith('_test'))throw Error('Use a separate fresh CORE_CONTENT_TEST_DATABASE_URL ending in _test');
const p=url?createPrismaClient(url):undefined;
describe.skipIf(!p)("core reference import preservation",()=>{
  let legacyId="",customId="",charId="",academicId="";
  beforeAll(async()=>{
    if(await p!.archetype.count() || await p!.item.count() || await p!.skillDefinition.count())throw Error('Core import tests need their own fresh database');
    await expect(installCoreReference(p)).rejects.toThrow('equipment catalogue first');
    await importEquipment(p,{apply:true});
    const definition=archetypes[0];
    academicId=(await p!.archetype.create({data:definition.archetype})).id;
    for(const name of definition.talentNames) {
      const talent=await p!.talent.create({data:{name,description:descriptions[name],type:'ARCHETYPE',archetypeId:academicId}});
      await p!.archetypeStartingTalent.create({data:{archetypeId:academicId,talentId:talent.id}});
    }
    for(const [position,group] of definition.equipmentGroups.entries()) {
      const items=await p!.item.findMany({where:{name:{in:group.items}}});
      await p!.archetypeEquipmentGroup.create({data:{archetypeId:academicId,position,label:group.label,quantity:group.quantity,options:{create:items.map(item=>({itemId:item.id}))}}});
    }
    legacyId=(await p!.archetype.create({data:{name:'Doctor',mainAttribute:'precision',mainSkill:'medicine',startingResourcesMin:2,startingResourcesMax:4}})).id;
    customId=(await p!.archetype.create({data:{name:'Officer',mainAttribute:'empathy',mainSkill:'manipulation',startingResourcesMin:1,startingResourcesMax:2,flavorText:'My personal archetype'}})).id;
    const user=await p!.user.create({data:{email:'core-reference@test.local'}});
    const talent=await p!.talent.create({data:{name:'Steady Hands',description:'Custom legacy talent',type:'ARCHETYPE',archetypeId:legacyId}});
    charId=(await p!.character.create({data:{userId:user.id,archetypeId:legacyId,name:'Existing Doctor',ageGroup:'OLD',resources:2,motivation:'Truth',trauma:'Sight',darkSecret:'Debt',talents:[talent.id],notes:'Private notes'}})).id;
  });
  afterAll(async()=>{await p?.$disconnect();});
  it("previews the complete import without writing",async()=>{
    const before=await p!.archetype.findMany();
    expect((await installCoreReference(p)).changes.length).toBeGreaterThan(40);
    expect(await p!.archetype.findMany()).toEqual(before);expect(await p!.skillDefinition.count()).toBe(0);
  });
  it("completes a seed stub, preserves custom collisions and existing characters",async()=>{
    const before=await p!.character.findUnique({where:{id:charId},include:{inventory:true,skill:true,attribute:true}});
    const custom=await p!.archetype.findUnique({where:{id:customId}});
    const academic=await p!.archetype.findUniqueOrThrow({where:{id:academicId},include:archetypeTemplateInclude});
    await installCoreReference(p,{apply:true});
    expect(await p!.character.findUnique({where:{id:charId},include:{inventory:true,skill:true,attribute:true}})).toEqual(before);
    expect(await p!.archetype.findUnique({where:{id:customId}})).toEqual(custom);
    const adopted=await p!.archetype.findUniqueOrThrow({where:{bookKey:'core-archetype-academic'},include:archetypeTemplateInclude});
    expect(adopted.id).toBe(academicId);expect(adopted.equipmentGroups).toEqual(academic.equipmentGroups);
    expect(adopted.startingTalents.map(t=>t.talentId)).toEqual(academic.startingTalents.map(t=>t.talentId));
    expect(await p!.archetype.findUnique({where:{bookKey:'core-archetype-doctor'}})).toMatchObject({id:legacyId,mainAttribute:'logic',startingResourcesMin:4});
    expect(await p!.archetype.count({where:{bookKey:{startsWith:'core-archetype-'}}})).toBe(10);
    expect(await p!.talent.count({where:{bookKey:{startsWith:'core-talent-'}}})).toBe(30);
    expect(await p!.skillDefinition.count()).toBe(12);
    for(const template of await p!.archetype.findMany({where:{bookKey:{startsWith:'core-archetype-'}},include:archetypeTemplateInclude})) {
      expect(template.startingTalents).toHaveLength(3);expect(template.equipmentGroups).toHaveLength(3);
      expect(startingTalentsFor(template,await p!.talent.findMany())).toHaveLength(3);
      expect(resolveStartingEquipment(template,Object.fromEntries(template.equipmentGroups.map(g=>[g.id,g.options[0].itemId])))).toHaveLength(3);
    }
  });
  it("allows the listed magic option, not an arbitrary item from another group",async()=>{
    const t=await p!.archetype.findUniqueOrThrow({where:{bookKey:'core-archetype-occultist'},include:archetypeTemplateInclude});
    const horn=await p!.item.findUniqueOrThrow({where:{bookKey:'core-starting-stags-horn'}});
    const choices=Object.fromEntries(t.equipmentGroups.map(g=>[g.id,g.options[0].itemId]));
    choices[t.equipmentGroups[1].id]=horn.id;
    expect(resolveStartingEquipment(t,choices).some(r=>r.itemId===horn.id)).toBe(true);
    choices[t.equipmentGroups[0].id]=horn.id;
    expect(()=>resolveStartingEquipment(t,choices)).toThrow('Choose one item');
  });
  it("retains relation IDs, administrator edits and manual skill text on reimport",async()=>{
    const t=await p!.archetype.findUniqueOrThrow({where:{bookKey:'core-archetype-writer'},include:archetypeTemplateInclude});
    await p!.archetype.update({where:{id:t.id},data:{motivationOptions:['Custom motive']}});
    await p!.skillDefinition.update({where:{key:'medicine'},data:{description:'My campaign medical ruling'}});
    const talent=t.startingTalents[0].talent;
    await p!.talent.update({where:{id:talent.id},data:{description:'My talent ruling'}});
    const report=await installCoreReference(p,{apply:true});expect(report.changes).toEqual([]);
    const after=await p!.archetype.findUniqueOrThrow({where:{id:t.id},include:archetypeTemplateInclude});
    expect(after.equipmentGroups).toEqual(t.equipmentGroups);expect(after.motivationOptions).toEqual(['Custom motive']);
    expect(await p!.skillDefinition.findUniqueOrThrow({where:{key:'medicine'}})).toMatchObject({description:'My campaign medical ruling'});
    expect(await p!.talent.findUniqueOrThrow({where:{id:talent.id}})).toMatchObject({description:'My talent ruling'});
  });
  it("does not resurrect an archived book template on reimport",async()=>{
    await p!.archetype.update({where:{bookKey:'core-archetype-hunter'},data:{archivedAt:new Date(),revision:{increment:1}}});
    expect((await installCoreReference(p,{apply:true})).changes).toEqual([]);
    expect((await p!.archetype.findUniqueOrThrow({where:{bookKey:'core-archetype-hunter'}})).archivedAt).not.toBeNull();
  });
  it("previews and archives only duplicates of active book templates without deleting data",async()=>{
    const unique=await p!.archetype.create({data:{name:'Campaign Custom',mainAttribute:'logic',mainSkill:'learning'}});
    const hunter=await p!.archetype.create({data:{name:'Hunter',mainAttribute:'precision',mainSkill:'rangedCombat'}});
    const character=await p!.character.findUniqueOrThrow({where:{id:charId}});
    const before=await p!.archetype.findMany({orderBy:{id:'asc'}});
    const preview=await archiveDuplicateArchetypes(p);
    expect(preview.applied).toBe(false);
    expect(preview.changes.map((r:{id:string})=>r.id)).toEqual([customId]);
    expect(await p!.archetype.findMany({orderBy:{id:'asc'}})).toEqual(before);
    const applied=await archiveDuplicateArchetypes(p,{apply:true});
    expect(applied.applied).toBe(true);
    expect((await p!.archetype.findUniqueOrThrow({where:{id:customId}})).archivedAt).not.toBeNull();
    expect(await p!.archetype.count()).toBe(before.length);
    expect(await p!.archetype.findUniqueOrThrow({where:{id:unique.id}})).toEqual(unique);
    expect(await p!.archetype.findUniqueOrThrow({where:{id:hunter.id}})).toEqual(hunter);
    expect(await p!.character.findUniqueOrThrow({where:{id:charId}})).toEqual(character);
    expect((await archiveDuplicateArchetypes(p,{apply:true})).changes).toEqual([]);
  });
});
