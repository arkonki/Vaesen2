import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try { loadEnvFile(path.join(root,'.env')); } catch(e) { if(e.code!=='ENOENT') throw e; }
const args=process.argv.slice(2);
if(args.some(a=>a!=='--apply')) throw Error('Usage: node scripts/import-core-reference.mjs [--apply]');
const require=createRequire(import.meta.url);
const {createPrismaClient}=require('../prisma/client');
const {installCoreReference}=require('../prisma/content/core-reference');
const prisma=createPrismaClient();
try {
  const report=await installCoreReference(prisma,{apply:args.includes('--apply')});
  console.log(`${args.includes('--apply')?'Imported':'Preview'}: ${report.skills} skills, ${report.archetypes} archetypes; ${report.changes.length} changes, ${report.retained.length} references retained.`);
  for(const change of report.changes) console.log(change);
  console.log('Existing characters, learned talents, inventory and custom content are preserved. Reimports retain administrator edits.');
} catch(e) { console.error(e.message);process.exitCode=1; } finally {await prisma.$disconnect();}
