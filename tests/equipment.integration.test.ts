import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) {
    if (!new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")) throw new Error("Use an isolated test database");
    process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  }
  return { actor:{id:"",role:"ADMIN"} };
});
vi.mock("@/lib/auth",()=>({getAppSession:async()=>({user:state.actor})}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import prisma from "../src/lib/prisma";
import { createItem, updateItem, deleteItem } from "../src/app/admin/actions";
import { upsertPartyStashItem } from "../src/app/parties/actions";
import { equipmentSchema, type EquipmentInput, type EquipmentItem } from "../src/lib/equipment";
const { equipment, importEquipment } = createRequire(import.meta.url)("../prisma/content/equipment.js") as {
  equipment:(EquipmentInput & {bookKey:string})[];
  importEquipment:(db:typeof prisma,options?:{apply?:boolean})=>Promise<{total:number;changes:string[];applied:boolean}>;
};
describe.skipIf(!process.env.TEST_DATABASE_URL)("equipment entry and preservation",()=>{
 const ids={admin:"",player:"",party:"",archetype:"",character:"",item:""}; const prefix=`equipment-${crypto.randomUUID()}`;
 const data=()=>equipmentSchema.parse({name:prefix,type:"GEAR",bonus:1,availability:2,usages:[{label:"Break locks",kind:"TOOL",skills:["force"],bonus:1,effect:"Use leverage."}]});
 beforeAll(async()=>{
  ids.admin=(await prisma.user.create({data:{email:`${prefix}-admin@test.local`,role:"ADMIN"}})).id;
  ids.player=(await prisma.user.create({data:{email:`${prefix}-player@test.local`}})).id;
  ids.party=(await prisma.party.create({data:{name:prefix,gmId:ids.admin}})).id;
  ids.archetype=(await prisma.archetype.create({data:{name:prefix,mainAttribute:"logic",mainSkill:"learning"}})).id;
  ids.character=(await prisma.character.create({data:{name:prefix,userId:ids.player,archetypeId:ids.archetype,ageGroup:"YOUNG",motivation:"",trauma:"",darkSecret:""}})).id;
  state.actor={id:ids.admin,role:"ADMIN"};
 });
 afterAll(async()=>{
  await prisma.user.deleteMany({where:{id:{in:[ids.admin,ids.player].filter(Boolean)}}});
  await prisma.archetype.deleteMany({where:{id:ids.archetype}});
  await prisma.item.deleteMany({where:{name:{startsWith:prefix}}});await prisma.$disconnect();
 });
 it("allows admins to persist profiles, rejects players and malformed requests",async()=>{
  const saved=await createItem(data());ids.item=saved.item.id;expect(saved.item.usages[0].skills).toEqual(["force"]);
  state.actor={id:ids.player,role:"PLAYER"};await expect(createItem(data())).rejects.toThrow("Admin access");
  state.actor={id:ids.admin,role:"ADMIN"};await expect(updateItem(ids.item,{...data(),availability:999})).rejects.toThrow();
  expect((await prisma.item.findUniqueOrThrow({where:{id:ids.item}})).availability).toBe(2);
 });
 it("preserves inventory IDs and quantities during edits and blocks unsafe reclassification",async()=>{
  const row=await prisma.characterInventory.create({data:{characterId:ids.character,itemId:ids.item,quantity:3,notes:"My personal notes"}});
  const updated=await updateItem(ids.item,{...data(),usages:[...data().usages,{label:"Attack",kind:"ATTACK",skills:["closeCombat"],bonus:1,effect:"Strike.",requirements:"",damage:1,rangeMin:0,rangeMax:0}]});
  expect(updated.item.usages).toHaveLength(2);
  const inventory=await prisma.characterInventory.findUniqueOrThrow({where:{id:row.id}});expect(inventory).toMatchObject({quantity:3,notes:"My personal notes",itemId:ids.item});
  await expect(updateItem(ids.item,{...data(),type:"SERVICE",usages:[{...data().usages[0],kind:"NARRATIVE",bonus:0}]})).rejects.toThrow("carried equipment");
  expect((await prisma.item.findUniqueOrThrow({where:{id:ids.item}})).type).toBe("GEAR");
  await expect(deleteItem(ids.item)).rejects.toThrow();
 });
 it("keeps reference entries out of party stash even for admins",async()=>{
  const cover=await createItem({...data(),name:prefix+"cover",type:"COVER",availability:0,protection:3,usages:[{...data().usages[0],kind:"NARRATIVE",bonus:0}]});
  await expect(upsertPartyStashItem(ids.party,cover.item.id,1)).rejects.toThrow("cannot be stored");
  expect(await prisma.partyStashItem.count({where:{itemId:cover.item.id}})).toBe(0);
 });
 it("reports duplicate names without overwriting another entry",async()=>{
  expect((await createItem({...data(),name:prefix.toUpperCase()})).duplicateName).toBe(true);
  expect(await prisma.item.count({where:{name:{equals:prefix,mode:"insensitive"}}})).toBe(2);
  await prisma.item.deleteMany({where:{name:prefix.toUpperCase()}});
 });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("safe book equipment import",()=>{
 let createdIds:string[]=[];let legacyId="";let customId="";let beforeIds:string[]=[];
 beforeAll(async()=>{
  beforeIds=(await prisma.item.findMany({select:{id:true}})).map(i=>i.id);
  if(await prisma.item.count({where:{bookKey:{startsWith:"core-equipment-"}}})) throw new Error("Import tests need a catalogue without an earlier equipment import");
  legacyId=(await prisma.item.create({data:{name:"Map book",type:"GEAR",bonus:1,availability:2,skill:"Investigation, Learning",description:"Preserve custom prose"}})).id;
  customId=(await prisma.item.create({data:{name:"Rifle",type:"WEAPON",bonus:9,availability:1,damage:9,range:"custom",description:"Custom firearm"}})).id;
 });
 afterAll(async()=>{
  await prisma.item.deleteMany({where:{id:{in:createdIds}}});
  await prisma.item.deleteMany({where:{id:{in:[legacyId,customId].filter(Boolean)}}});await prisma.$disconnect();
 });
 it("previews without writes and imports every definition without overwriting custom rules",async()=>{
  const before=await prisma.item.count();expect((await importEquipment(prisma)).changes).toHaveLength(86);expect(await prisma.item.count()).toBe(before);
  expect((await importEquipment(prisma,{apply:true})).applied).toBe(true);
  createdIds=(await prisma.item.findMany({where:{id:{notIn:beforeIds}},select:{id:true}})).map(i=>i.id);
  expect(await prisma.item.count({where:{bookKey:{startsWith:"core-equipment-"}}})).toBe(86);
  expect(await prisma.item.findUniqueOrThrow({where:{id:legacyId},include:{usages:true}})).toMatchObject({description:"Preserve custom prose",bookKey:"core-equipment-map-book",usages:[{skills:["investigation","learning"]}]});
  expect(await prisma.item.findUniqueOrThrow({where:{id:customId}})).toMatchObject({bonus:9,damage:9,description:"Custom firearm",bookKey:null});
  for(const def of equipment) {const item=await prisma.item.findUniqueOrThrow({where:{bookKey:def.bookKey},include:{usages:true}}); expect(item.usages).toHaveLength(def.usages.length);}
 });
 it("is idempotent and preserves subsequent admin edits, including profile IDs",async()=>{
  const item=await prisma.item.findUniqueOrThrow({where:{bookKey:"core-equipment-camera"},include:{usages:true}}) as EquipmentItem;
  await prisma.itemUsage.update({where:{id:item.usages![0].id},data:{effect:"My house rule"}});
  expect((await importEquipment(prisma,{apply:true})).changes).toEqual([]);
  expect(await prisma.itemUsage.findUniqueOrThrow({where:{id:item.usages![0].id}})).toMatchObject({effect:"My house rule"});
 });
});
