import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { loadEnvFile(path.join(root, '.env')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw Error('Usage: node scripts/archive-duplicate-archetypes.mjs [--apply]');
const require = createRequire(import.meta.url);
const { createPrismaClient } = require('../prisma/client');
const { archiveDuplicateArchetypes } = require('../prisma/content/archetype-cleanup');
const prisma = createPrismaClient();
try {
  const report = await archiveDuplicateArchetypes(prisma, { apply: args.includes('--apply') });
  console.log(`${args.includes('--apply') ? 'Archived' : 'Preview'}: ${report.changes.length} custom/legacy duplicates of active core-book archetypes.`);
  for (const entry of report.changes) console.log(`${entry.name}: ${entry.characters} existing characters kept unchanged.`);
  console.log('No characters, scores, learned talents, inventory, or template relations are deleted. Entries can be restored in Admin > Archetypes > Archived.');
} catch (e) { console.error(e.message); process.exitCode = 1; } finally { await prisma.$disconnect(); }
