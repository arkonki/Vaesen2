// Shared core-book catalogue and engine-free importer.
const sourceBook = 'Vaesen: Nordic Horror Roleplaying';
const title = key => key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
const profile = (label, kind, skills, bonus, effect, requirements = '', attack = {}) => ({ label, kind, skills, bonus, effect, requirements, damage: null, rangeMin: null, rangeMax: null, ...attack });
const equipment = [];
const add = (key, name, type, availability, bonus, sourcePage, usages, fields = {}) => equipment.push({ bookKey: `core-equipment-${key}`, name, type, availability, bonus, sourceBook, sourcePage, description: usages.map(u => u.effect).join('\n'), protection: null, agilityPenalty: null, doses: null, toxicity: null, usages, ...fields });
const gear = [
 ['Crowbar',1,2,['force'],'Break locks by applying leverage.'],
 ['Lockpicks',1,2,['stealth'],'Pick locks.'],
 ['Opera glasses',1,1,['vigilance'],'Observe things at a distance.'],
 ['Binoculars',2,2,['vigilance'],'Observe things at a distance.'],
 ['Hunting trap',1,1,['vigilance'],'Detect people trying to sneak past.'],
 ['Hunting equipment',2,2,['investigation'],'Investigate in the wilderness.'],
 ['Tinderbox',1,1,['investigation'],'Investigate dimly lit places.'],
 ['Hurricane lamp',2,1,['investigation','vigilance'],'Investigate darkness or detect sneaking people.'],
 ['Compass',1,2,['learning'],'Find your way.'],
 ['Magnifying glass',1,2,['investigation'],'Examine details to find clues.'],
 ['Camera',2,3,['learning','investigation'],'Learn about a place through photography.'],
 ['Writing utensils and paper',1,1,['investigation'],'Take useful investigative notes.'],
 ['Slide rule',1,2,['learning'],'Perform calculations.'],
 ['Simple bandages',1,1,['medicine'],'Treat patients using Medicine.','Required medical supplies.'],
 ['Medical equipment',2,2,['medicine'],'Treat patients using Medicine.','Required medical supplies.'],
 ['Musical instrument',1,2,['inspiration'],'Influence an audience through music.'],
 ['Mastercrafted musical instrument',2,3,['inspiration'],'Influence an audience through exceptional music.'],
 ['Cooking pot',1,1,['inspiration'],'Inspire others through cooking.'],
 ['Field kitchen',2,2,['inspiration'],'Inspire others through cooking.'],
 ['Simple provisions',1,1,[],'Avoid hunger-related Force tests for several days.'],
 ['Nutritious provisions',1,2,[],'Avoid hunger-related Force tests for many days.'],
 ['Liquor',1,1,['inspiration'],'Use alcohol to inspire others.'],
 ['Fine wines',1,2,['inspiration','manipulation'],'Use wine to inspire or manipulate others.'],
 ['Chemical equipment',1,2,['investigation'],'Investigate the cause of a death.'],
 ['Portable laboratory',1,3,['learning'],'Produce poison through Learning.'],
 ['Book collection',1,2,['learning'],'Consult books for information.'],
 ['Old scrolls',2,3,['learning'],'Consult old writings for information.'],
 ['Crystal ball',1,3,['observation'],'Search for clues through Observation.'],
 ['Map book',1,2,['investigation','learning'],'Navigate using maps.'],
 ['Weak horse',1,2,['force'],'Use the horse for tasks involving Force.'],
 ['Strong horse',2,3,['closeCombat','force'],'Use the horse for Close Combat or Force tasks.'],
 ['Pet dog',1,1,['closeCombat'],'The dog assists in Close Combat.'],
 ['Guard dog',2,2,['vigilance','closeCombat'],'The dog assists with guarding or Close Combat.'],
 ['Hunting dog',3,3,['vigilance','closeCombat','investigation'],'The dog assists with vigilance, combat, or investigation.'],
 ['Make-up',1,1,['manipulation'],'Use make-up to support Manipulation.','Some attempts require an appropriate appearance.'],
 ['Disguise',2,2,['manipulation'],'Use a disguise to support Manipulation.','Some attempts require a suitable disguise.'],
 ['Elegant disguise',2,3,['manipulation'],'Support Manipulation, including sneaking by using a convincing disguise.','Some attempts require a suitable disguise.'],
 ['Rope',1,1,['force'],'Climb using Force.'],
 ['Rope ladder',3,2,['force','agility'],'Climb using Force or Agility.'],
 ['Weak poison',0,1,[],'Poison a target; toxicity 3.','Requires administering poison to the target.',3,3],
 ['Strong poison',0,2,[],'Poison a target; toxicity 6.','Requires administering poison to the target.',2,6],
 ['Extremely strong poison',0,3,[],'Poison a target; toxicity 9.','Requires administering poison to the target.',1,9],
];
const keyFor = name => name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
for (const [i,row] of gear.entries()) {
 const [name,bonus,availability,skills,effect,requirements='',doses=null,toxicity=null] = row;
 add(keyFor(name),name,'GEAR',availability,bonus,i < 9 ? 74 : 75,[profile(skills.length ? 'Use equipment' : 'Special effect',skills.length ? 'TOOL' : 'NARRATIVE',skills,skills.length ? bonus : 0,effect,requirements)],{doses,toxicity});
}
for (const [name,protection,agilityPenalty,availability] of [['Light armor',2,1,2],['Medium armor',4,2,3],['Heavy armor',6,3,4]]) {
 add(keyFor(name),name,'ARMOR',availability,0,74,[profile('Worn armor','NARRATIVE',[],0,'Roll Protection dice when hit; each success reduces damage by one.','Subtract the Agility penalty while wearing this armor.')],{protection,agilityPenalty});
}
for (const [name,protection] of [['Furniture',3],['Wooden door',4],['Hill',5],['House wall',6]]) {
 add(keyFor(name),name,'COVER',0,0,74,[profile('Take cover','NARRATIVE',[],0,'Each success on a Protection roll reduces incoming damage by one.','Taking cover costs a fast action. Applies against ranged attacks, not attackers in the same zone, except explosions. Dodge remains available.')],{protection});
}
const services = [
 ['Quack or feldsher',1,'Heal Broken.'],
 ['Doctor',2,'Heal Broken and one mental Condition.'],
 ['Personal doctor or surgeon',3,'Heal Broken and two Conditions of your choice.'],
 ['Bathing facility',1,'Heal one mental Condition.'],
 ['Barber',2,'Heal two mental Conditions.'],
 ['Errand boy',1,'Contact an acquaintance during the next scene if a Manipulation test succeeds.'],
 ['Homing pigeon',2,'Contact an acquaintance during the next scene.'],
 ['Postrider',3,'Contact an acquaintance or obtain an item small enough to carry during the next scene.'],
 ['Carriage',2,'Travel to another location and heal one Condition.'],
 ['Train or boat',3,'Travel to another location and heal three Conditions.'],
 ['Shelter or hostel',1,'Stay overnight with opportunities to rest or receive medical care.'],
 ['Upscale hotel',3,'Receive lodging and food, healing one Condition.'],
 ['Simple meal',1,'Avoid hunger-related Force tests for a few days.'],
 ['Fancy dinner',2,'Avoid hunger-related Force tests for several days.'],
 ['Banquet',3,'Avoid hunger-related Force tests for several days and heal one mental Condition.'],
];
for (const [name,availability,effect] of services) add(keyFor(name),name,'SERVICE',availability,0,76,[profile('Party service','NARRATIVE',name === 'Errand boy' ? ['manipulation'] : [],0,effect,'Applies to the party. Healing through services replaces the regular recovery activity; the GM confirms the scene and eligible participants.')]);
const melee = [
 ['Kick or punch',1,0,0,'force'],['Knuckle duster',1,1,2,'closeCombat'],['Chair',1,1,1,'closeCombat'],['Sledgehammer',2,0,2,'closeCombat'],['Flail',2,2,4,'closeCombat'],['Rifle butt',1,1,0,'closeCombat'],['Knife or dagger',1,1,1,'closeCombat'],['Rapier',1,2,3,'closeCombat'],['Sword or saber',2,2,4,'closeCombat'],['Crowbar',1,1,2,'closeCombat'],['Axe',2,1,1,'closeCombat'],['Quarterstaff',1,1,1,'closeCombat'],['Halberd',3,1,4,'closeCombat'],['Bayonet',2,1,3,'closeCombat'],['Whip',1,1,1,'closeCombat'],
];
for (const [name,damage,bonus,availability,skill] of melee) {
 const attack = profile('Melee attack','ATTACK',[skill],bonus,'A successful hit inflicts the listed damage as Conditions.',name === 'Rifle butt' ? 'Requires a rifle; this is not another purchased object.' : name === 'Kick or punch' ? 'Unarmed attack; no inventory object required.' : '',{damage,rangeMin:0,rangeMax:0});
 if (name === 'Crowbar') equipment.find(item => item.name === name).usages.push(attack);
 else add(keyFor(name),name,availability ? 'WEAPON' : 'ATTACK',availability,bonus,77,[attack]);
}
for (const [name,damage,min,max,bonus,availability] of [['Spear',1,0,1,1,1],['Bow',1,0,2,1,1],['Longbow',2,1,3,1,2],['Crossbow',2,0,1,1,3],['Pistol or revolver',2,0,1,2,4],['Musket',2,1,2,1,3],['Rifle',2,1,3,2,4],['Cannon',5,2,5,1,5]]) {
 add(keyFor(name),name,'WEAPON',availability,bonus,77,[profile('Attack','ATTACK',name === 'Spear' ? ['closeCombat','rangedCombat'] : ['rangedCombat'],bonus,'A successful hit inflicts the listed damage as Conditions.','Attack only within the listed zone interval; the minimum excludes closer zones.',{damage,rangeMin:min,rangeMax:max})]);
}

const legacy = item => {
 const first = item.usages.find(u => u.kind === (['WEAPON','ATTACK'].includes(item.type) ? 'ATTACK' : 'TOOL'));
 const attack = item.usages.find(u => u.kind === 'ATTACK');
 return { skill:first?.skills.map(title).join(', ') || null, damage:attack?.damage ?? null, range:attack ? `${attack.rangeMin}${attack.rangeMax === attack.rangeMin ? '' : `-${attack.rangeMax}`}` : null };
};
const aliases = {'Pistol or revolver':['Pistol','Revolver'],'Knife or dagger':['Knife','Dagger'],'Sword or saber':['Sword','Saber','Sabre'],'Weak poison':['Weak poison (3 doses)'],'Strong poison':['Strong poison (2 doses)'],'Extremely strong poison':['Extremely strong poison (1 dose)']};
async function importEquipment(prisma,{apply=false}={}) {
 return prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(73904244)::text`;
  const changes=[]; const retained=[];
  for (const item of equipment) {
   if (await tx.item.findUnique({where:{bookKey:item.bookKey}})) {retained.push(item.name);continue;}
   const names=[item.name,...(aliases[item.name] || [])];
   const matches=await tx.item.findMany({where:{OR:names.map(name=>({name:{equals:name,mode:'insensitive'}}))},include:{usages:true}});
   const fields=legacy(item);
   const compatible=matches.filter(record=>!record.bookKey && !record.usages.length && record.type===item.type && record.bonus===item.bonus && record.availability===item.availability &&
    (item.type !== 'WEAPON' || (record.damage===fields.damage && record.range===fields.range)) &&
    !(record.sourceBook || record.protection !== null || record.agilityPenalty !== null || record.doses !== null || record.toxicity !== null));
   const reuse=matches.length===1 && compatible.length===1 ? compatible[0] : null;
   changes.push(`${reuse ? 'Enrich existing' : 'Create'}: ${item.name}${!reuse && matches.length ? ' (custom/ambiguous definitions preserved separately)' : ''}`);
   if (!apply) continue;
   const {usages,...data}=item;
   const record=reuse ? await tx.item.update({where:{id:reuse.id},data:{bookKey:data.bookKey,sourceBook:data.sourceBook,sourcePage:data.sourcePage,protection:data.protection,agilityPenalty:data.agilityPenalty,doses:data.doses,toxicity:data.toxicity}})
    : await tx.item.create({data:{...data,...fields}});
   await tx.itemUsage.createMany({data:usages.map((usage,position)=>({...usage,position,itemId:record.id}))});
  }
  return {applied:apply && changes.length>0,changes,retained:retained.length,total:equipment.length};
 },{timeout:30000});
}
module.exports={equipment,importEquipment};
