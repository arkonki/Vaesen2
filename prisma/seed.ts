import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding data...')

  // 1. Archetypes
  const archs = [
    { name: 'Hunter', mainAttribute: 'precision', mainSkill: 'rangedCombat', min: 2, max: 4 },
    { name: 'Occultist', mainAttribute: 'logic', mainSkill: 'learning', min: 1, max: 3 },
  ];

  for (const arch of archs) {
    const existing = await prisma.archetype.findFirst({ where: { name: arch.name } });
    if (!existing) {
      await prisma.archetype.create({
        data: {
          name: arch.name,
          mainAttribute: arch.mainAttribute,
          mainSkill: arch.mainSkill,
          startingResourcesMin: arch.min,
          startingResourcesMax: arch.max,
        }
      });
    }
  }

  const hunter = await prisma.archetype.findFirst({ where: { name: 'Hunter' } });

  // 2. Talents
  const talents = [
    { name: 'Eagle Eye', type: 'ARCHETYPE' as const, archId: hunter?.id },
    { name: 'Sixth Sense', type: 'GENERAL' as const, archId: null },
  ];

  for (const t of talents) {
    const existing = await prisma.talent.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.talent.create({
        data: {
          name: t.name,
          description: t.name === 'Eagle Eye' ? 'You can see clearly at great distances.' : 'You can sense the presence of Vaesen.',
          type: t.type,
          archetypeId: t.archId as any,
        }
      });
    }
  }

  // 3. Items
  const items = [
    { name: 'Rifle', type: 'WEAPON' as const, damage: 2, range: 'Long' },
    { name: 'Lantern', type: 'GEAR' as const, damage: null, range: null },
  ];

  for (const item of items) {
    const existing = await prisma.item.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.item.create({
        data: {
          name: item.name,
          description: `A useful ${item.name.toLowerCase()}.`,
          type: item.type,
          damage: item.damage,
          range: item.range,
          bonus: 1,
          availability: 2,
        }
      });
    }
  }

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
