import assert from 'node:assert/strict';
import { mkdtemp, cp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
const url = process.env.MIGRATION_TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Use a fresh isolated MIGRATION_TEST_DATABASE_URL ending in _test');
const prisma = new PrismaClient({ datasources: { db: { url } } });
const temp = await mkdtemp(path.join(tmpdir(),'vaesen-migration-'));
let userId;
function migrate(schema) {
  const result = spawnSync(path.resolve('node_modules/.bin/prisma'),['migrate','deploy','--schema',schema],{ env: { ...process.env,DATABASE_URL: url },encoding:'utf8' });
  if (result.status !== 0) throw new Error(result.stdout + result.stderr);
}
try {
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
  assert.equal(tables.length,0,'Migration test database must be empty');
  await cp('prisma/schema.prisma',path.join(temp,'schema.prisma'));
  for (const name of await readdir('prisma/migrations')) {
    if (name !== '20261007100000_castle_system') await cp(path.join('prisma/migrations',name),path.join(temp,'migrations',name),{ recursive:true });
  }
  migrate(path.join(temp,'schema.prisma'));
  const user = await prisma.user.create({ data: { role:'GM',email:`migration-${crypto.randomUUID()}@test.local`,passwordHash:'existing-test-hash' } });userId=user.id;
  const party = await prisma.party.create({ data: { name:'Legacy campaign',gmId:userId } });
  const facilities = [{ name:'Infirmary',cost:6,description:'Old healing text' },{ name:'Workshop',cost:5 },{ name:'Custom Ballroom',cost:9 }];
  const hq = await prisma.headquarters.create({ data: { partyId:party.id,name:'Legacy Castle',history:'Preserved history',developmentPoints:23,facilities,personnel:[{ name:'Butler',cost:2 }],threats:[{ title:'Old ghost',description:'Do not lose this secret',status:'ACTIVE' }] } });
  migrate(path.resolve('prisma/schema.prisma'));
  const after = await prisma.headquarters.findUniqueOrThrow({ where:{ id:hq.id },include:{ castleUpgrades:true,castleThreats:true } });
  assert.equal(after.developmentPoints,23);assert.equal(after.history,'Preserved history');assert.deepEqual(after.facilities,facilities);
  assert.equal(after.castleUpgrades.filter((u) => u.key==='library').length,1);
  assert.equal(after.castleUpgrades.filter((u) => u.key==='algot-frisk').length,1);
  assert.equal(after.castleUpgrades.find((u) => u.key==='infirmary').status,'ACTIVE');
  assert.equal(after.castleUpgrades.find((u) => u.name==='Custom Ballroom').status,'REVIEW');
  assert.equal(after.castleThreats[0].description,'Do not lose this secret');
  assert.equal((await prisma.user.findUniqueOrThrow({ where:{ id:userId } })).passwordHash,'existing-test-hash');
  assert.equal(await prisma.castlePurchase.count({ where:{ occasion:{ headquartersId:hq.id } } }),0);
  console.log('Legacy migration passed: balance, ownership, custom assets, original JSON, threats and accounts preserved.');
} finally {
  if (userId) await prisma.user.deleteMany({ where:{ id:userId } });
  await prisma.$disconnect();await rm(temp,{ recursive:true,force:true });
}
