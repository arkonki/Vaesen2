/* eslint-disable @typescript-eslint/no-require-imports -- Shared engine-free Node content importer. */
const { archetypes, source } = require('./archetypes.json');
const { descriptions } = require('./archetype-talents');
const { skills } = require('./skills');
const { startingItems } = require('./starting-items');
const { equipment } = require('./equipment');
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const key = name => name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const legacyStats = { Academic:['logic','learning',1,3], Doctor:['precision','medicine',2,4], Officer:['physique','closeCombat',3,5], Priest:['empathy','inspiration',1,3] };
const suggestionFields = ['firstNameOptions','lastNameOptions','motivationOptions','traumaOptions','darkSecretOptions','relationshipOptions'];
const include = { startingTalents:{include:{talent:true}},equipmentGroups:{orderBy:{position:'asc'},include:{options:{include:{item:true}}}} };
function canAdopt(record, definition) {
  if (record.bookKey) return false;
  const a=definition.archetype;
  const stats=[record.mainAttribute.toLowerCase(),record.mainSkill.toLowerCase(),record.startingResourcesMin,record.startingResourcesMax];
  const expected=[a.mainAttribute,a.mainSkill,a.startingResourcesMin,a.startingResourcesMax];
  const empty=!record.flavorText && suggestionFields.every(f=>!record[f].length) && !record.equipmentGroups.length && !record.startingTalents.length;
  if (empty && (equal(stats,expected) || equal(stats,legacyStats[a.name]))) return true;
  if (!Object.entries(a).every(([field,value])=>equal(record[field],value))) return false;
  if (!equal(record.startingTalents.map(l=>l.talent.name).sort(), [...definition.talentNames].sort())) return false;
  if (record.startingTalents.some(({talent})=>talent.type!=='ARCHETYPE' || talent.archetypeId!==record.id || talent.description!==descriptions[talent.name])) return false;
  return record.equipmentGroups.length===definition.equipmentGroups.length && record.equipmentGroups.every((group,index)=>{
    const expected=definition.equipmentGroups[index];
    const expectedKeys=expected.items.map(name=>(equipment.find(i=>i.name===name) || startingItems.find(i=>i.name===name)).bookKey).sort();
    return group.position===index && group.label===expected.label && group.quantity===expected.quantity && equal(group.options.map(o=>o.item.bookKey).sort(),expectedKeys);
  });
}
async function installCoreReference(prisma,{apply=false}={}) {
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(73904246)::text`;
    const changes=[],retained=[];
    const itemIds=new Map();
    const requiredNames=new Set(archetypes.flatMap(a=>a.equipmentGroups.flatMap(g=>g.items)));
    for(const name of requiredNames) {
      const definition=equipment.find(i=>i.name===name) || startingItems.find(i=>i.name===name);
      if(!definition) throw Error(`Missing verified equipment definition: ${name}`);
      const existing=await tx.item.findUnique({where:{bookKey:definition.bookKey}});
      if(existing) { itemIds.set(name,existing.id);continue; }
      if(!startingItems.includes(definition)) throw Error('Import the core equipment catalogue first: npm run db:content:equipment -- --apply');
      changes.push(`Create starting item: ${name}`);
      if(apply) {
        const {usages,...data}=definition;
        const record=await tx.item.create({data:{...data,usages:{create:usages.map((u,position)=>({...u,position}))}}});
        itemIds.set(name,record.id);
      }
    }
    for(const definition of skills) {
      if(await tx.skillDefinition.findUnique({where:{key:definition.key}})) {retained.push(`Skill: ${definition.name}`);continue;}
      changes.push(`Create skill reference: ${definition.name}`);
      if(apply) await tx.skillDefinition.create({data:definition});
    }
    for(const definition of archetypes) {
      if(await tx.archetype.findUnique({where:{bookKey:definition.bookKey}})) {retained.push(`Archetype: ${definition.archetype.name}`);continue;}
      const matches=await tx.archetype.findMany({where:{name:{equals:definition.archetype.name,mode:'insensitive'}},include});
      const adopted=matches.length===1 && canAdopt(matches[0],definition) ? matches[0] : null;
      changes.push(`${adopted ? 'Complete verified/legacy' : 'Create book'} archetype: ${definition.archetype.name}${matches.length && !adopted ? ' (custom entries preserved separately)' : ''}`);
      const archetypeData={...definition.archetype,bookKey:definition.bookKey,sourceBook:source.title,sourcePage:definition.sourcePage};
      const record=apply ? adopted ? await tx.archetype.update({where:{id:adopted.id},data:archetypeData}) : await tx.archetype.create({data:archetypeData}) : adopted;
      const talentIds=[];
      for(const name of definition.talentNames) {
        const bookKey=`core-talent-${key(name)}`;
        let talent=await tx.talent.findUnique({where:{bookKey}});
        if(talent && talent.archetypeId!==record?.id) throw Error(`Book talent belongs to another archetype: ${name}`);
        if(!talent) {
          const matches=await tx.talent.findMany({where:{name:{equals:name,mode:'insensitive'}}});
          const reuse=matches.length===1 && !matches[0].bookKey && matches[0].type==='ARCHETYPE' && matches[0].archetypeId===record?.id && matches[0].description===descriptions[name] ? matches[0] : null;
          if(!descriptions[name]) throw Error(`Missing talent rules: ${name}`);
          changes.push(`${reuse ? 'Identify existing' : 'Create'} talent: ${name}`);
          if(apply) talent=reuse ? await tx.talent.update({where:{id:reuse.id},data:{bookKey}}) : await tx.talent.create({data:{name,description:descriptions[name],type:'ARCHETYPE',archetypeId:record.id,bookKey}});
        }
        if(talent) talentIds.push(talent.id);
      }
      if(!apply) continue;
      if(!adopted?.startingTalents.length) await tx.archetypeStartingTalent.createMany({data:talentIds.map(talentId=>({archetypeId:record.id,talentId}))});
      if(!adopted?.equipmentGroups.length) for(const [position,group] of definition.equipmentGroups.entries()) {
        await tx.archetypeEquipmentGroup.create({data:{archetypeId:record.id,label:group.label,quantity:group.quantity,position,options:{create:group.items.map(name=>({itemId:itemIds.get(name)}))}}});
      }
    }
    return {applied:apply && changes.length>0,changes,retained,skills:skills.length,archetypes:archetypes.length};
  },{timeout:60000,isolationLevel:'Serializable'});
}
module.exports={installCoreReference};
