import { describe, expect, it } from "vitest";
import type { Item, Talent } from "@prisma/client";
import { archetypeTemplateSchema, defaultEquipmentChoices, resolveStartingEquipment, startingTalentsFor, suggestionLines, type ArchetypeTemplate } from "../src/lib/archetype-template";
import { firstIncompleteStep, initialState, restoreCharacterDraft } from "../src/lib/character-draft";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const item: Item = { bookKey:null, sourceBook:null, sourcePage:null, protection:null, agilityPenalty:null, doses:null, toxicity:null, id:uuid(2), name:"Book collection", type:"GEAR", description:null, bonus:0, availability:0, damage:null, range:null, skill:null };
const map = {...item,id:uuid(3),name:"Map book"};
const talent: Talent = { bookKey:null,id:uuid(4),name:"Bookworm",description:"Test",type:"GENERAL",archetypeId:null};
const fields = {name:"Academic",mainAttribute:"logic",mainSkill:"learning",startingResourcesMin:4,startingResourcesMax:6};
const archetype: ArchetypeTemplate = {
  bookKey:null,sourceBook:null,sourcePage:null,archivedAt:null,revision:0,
  ...fields,id:uuid(1),flavorText:"A scholar of the unseen.",firstNameOptions:["Astrid"],lastNameOptions:["Brugge"],
  motivationOptions:["Charting the unknown"],traumaOptions:["A mermaid's magic"],darkSecretOptions:["Hunted"],relationshipOptions:["A good friend"],
  startingTalents:[{talentId:talent.id,talent}],
  equipmentGroups:[{id:uuid(5),label:"Books",quantity:1,options:[{itemId:item.id,item},{itemId:map.id,item:map}]},
    {id:uuid(6),label:"Fixed book",quantity:2,options:[{itemId:item.id,item}]}],
};
describe("archetype template rules", () => {
  it("trims line-separated suggestions without splitting commas inside prose", () => expect(suggestionLines(" First, a promise\r\n\n Second\nFirst, a promise ")).toEqual(["First, a promise","Second"]));
  it("validates resource ranges and actual attribute/skill keys", () => {
    expect(archetypeTemplateSchema.safeParse(fields).success).toBe(true);
    for(const changes of [{startingResourcesMin:7},{startingResourcesMax:11},{mainAttribute:"invented"},{mainSkill:"invented"},{equipmentGroups:[{label:"Books",quantity:0,itemIds:[item.id]}]}]) expect(archetypeTemplateSchema.safeParse({...fields,...changes}).success).toBe(false);
  });
  it("requires options in every equipment group", () => expect(archetypeTemplateSchema.safeParse({...fields,equipmentGroups:[{label:"Books",quantity:1,itemIds:[]}]}).success).toBe(false));
  it("limits starting talents to the configured list", () => expect(startingTalentsFor(archetype,[talent,{...talent,id:uuid(9)}])).toEqual([talent]));
  it("keeps legacy talent selection for templates without a starting list", () => expect(startingTalentsFor({...archetype,startingTalents:[]},[talent,{...talent,id:uuid(9),type:"ARCHETYPE",archetypeId:uuid(8)}])).toEqual([talent]));
  it("auto-selects fixed equipment, not alternatives", () => expect(defaultEquipmentChoices(archetype)).toEqual({[uuid(6)]:item.id}));
  it("aggregates quantities when groups grant the same item", () => expect(resolveStartingEquipment(archetype,{[uuid(5)]:item.id})).toEqual([{itemId:item.id,quantity:3}]));
  it("rejects missing, stale, and unrelated equipment choices", () => {
    for(const choices of [{},{[uuid(5)]:uuid(9)},{[uuid(7)]:item.id}]) expect(()=>resolveStartingEquipment(archetype,choices)).toThrow();
  });
  it("returns an incomplete equipment draft to the equipment step", () => {
    const data = {...initialState,name:"Astrid",archetypeId:archetype.id,ageGroup:"YOUNG" as const,mainAttribute:"logic",mainSkill:"learning",minResources:4,maxResources:6,attributeAllowance:15,skillAllowance:10,
      attributes:{physique:3,precision:3,logic:5,empathy:4},skills:{...initialState.skills,learning:3,investigation:2,vigilance:2,observation:2,inspiration:1},resources:4,talentId:talent.id,motivation:"Truth",trauma:"Sight",darkSecret:"Debt"};
    expect(firstIncompleteStep(data,archetype)).toBe(7);
    expect(restoreCharacterDraft(JSON.stringify({version:2,step:8,data:{...data,equipmentChoices:{[uuid(8)]:item.id}}}),[archetype],[talent],[item,map])?.step).toBe(7);
  });
});
