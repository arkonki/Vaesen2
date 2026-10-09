import { loadEnvFile } from 'node:process';
import { createRequire } from 'node:module';
import { createPrismaClient } from '../prisma/client.js';
const { importEquipment } = createRequire(import.meta.url)('../prisma/content/equipment.js');
try {loadEnvFile('.env');} catch(error) {if(error.code !== 'ENOENT') throw error;}
if(process.argv.slice(2).some(arg=>arg !== '--apply')) throw new Error('Usage: node scripts/import-equipment.mjs [--apply]');
const prisma=createPrismaClient();
try {
 const result=await importEquipment(prisma,{apply:process.argv.includes('--apply')});
 console.log(`${result.applied ? 'Imported' : 'Preview'}: ${result.total} core catalogue definitions; ${result.changes.length} changes; ${result.retained} existing book definitions retained.`);
 for(const change of result.changes) console.log(change);
 console.log('Existing custom definitions, descriptions, character/stash quantities and starting-equipment links are preserved.');
} catch(error) {console.error(error.message);process.exitCode=1;} finally {await prisma.$disconnect();}
