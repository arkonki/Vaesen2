import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>{
  if(process.env.TEST_DATABASE_URL) {if(!new URL(process.env.TEST_DATABASE_URL).pathname.endsWith('_test'))throw Error('Use isolated test database');process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;}
  return {role:'PLAYER'};
});
vi.mock('@/lib/auth',()=>({getAppSession:async()=>({user:{id:'test',role:state.role}})}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import prisma from '../src/lib/prisma';
import {saveSkillReference} from '../src/app/admin/actions';
describe.skipIf(!process.env.TEST_DATABASE_URL)('skill reference permissions',()=>{
  const input={key:'force',description:'Isolated test reference.',extraSuccesses:['Test extra success.'],guidance:[],sourceBook:'Test',sourcePages:[44]};
  beforeAll(async()=>{if(await prisma.skillDefinition.findUnique({where:{key:'force'}}))throw Error('Skill tests require an unused Force reference');});
  afterAll(async()=>{await prisma.skillDefinition.deleteMany({where:{key:'force',sourceBook:'Test'}});await prisma.$disconnect();});
  it('rejects players and GMs',async()=>{
    for(const role of ['PLAYER','GM']) {state.role=role;await expect(saveSkillReference(input)).rejects.toThrow('Admin access');}
  });
  it('lets admins edit prose, but fixes the name and mapping and rejects forged fields',async()=>{
    state.role='ADMIN';
    const record=await saveSkillReference(input);expect(record).toMatchObject({key:'force',name:'Force',attribute:'physique'});
    await expect(saveSkillReference({...input,attribute:'empathy'})).rejects.toThrow();
    await expect(saveSkillReference({...input,key:'magic'})).rejects.toThrow();
    await expect(saveSkillReference({...input,sourcePages:[-1]})).rejects.toThrow();
    expect(await prisma.skillDefinition.findUnique({where:{key:'force'}})).toEqual(record);
  });
});
