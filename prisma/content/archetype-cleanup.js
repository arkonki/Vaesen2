/* eslint-disable @typescript-eslint/no-require-imports -- Portable, engine-free content maintenance. */
const { archetypes } = require('./archetypes.json');

async function archiveDuplicateArchetypes(prisma, { apply = false } = {}) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(73904246)::text`;
    const changes = [];
    for (const definition of archetypes) {
      const book = await tx.archetype.findUnique({ where: { bookKey: definition.bookKey } });
      if (!book || book.archivedAt || book.name.toLowerCase() !== definition.archetype.name.toLowerCase()) continue;
      const duplicates = await tx.archetype.findMany({ where: { bookKey: null, archivedAt: null, name: { equals: book.name, mode: 'insensitive' } }, include: { _count: { select: { characters: true } } } });
      for (const entry of duplicates) {
        changes.push({ id: entry.id, name: entry.name, characters: entry._count.characters });
        if (apply) {
          const updated = await tx.archetype.updateMany({ where: { id: entry.id, revision: entry.revision, archivedAt: null, bookKey: null }, data: { archivedAt: new Date(), revision: { increment: 1 } } });
          if (!updated.count) throw Error('An archetype changed during cleanup. No changes were committed; preview again.');
        }
      }
    }
    return { applied: apply && changes.length > 0, changes };
  }, { isolationLevel: 'Serializable', timeout: 30000 });
}
module.exports = { archiveDuplicateArchetypes };
