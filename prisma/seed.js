/* eslint-disable @typescript-eslint/no-require-imports -- Prisma runs this seed as CommonJS. */
const bcrypt = require("bcryptjs");
const { ItemType, Role, TalentType } = require("@prisma/client");
const { createPrismaClient } = require("./client");

const prisma = createPrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@vaesen.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";

const archetypes = [
  {
    name: "Academic",
    mainAttribute: "logic",
    mainSkill: "learning",
    startingResourcesMin: 1,
    startingResourcesMax: 3,
  },
  {
    name: "Doctor",
    mainAttribute: "precision",
    mainSkill: "medicine",
    startingResourcesMin: 2,
    startingResourcesMax: 4,
  },
  {
    name: "Officer",
    mainAttribute: "physique",
    mainSkill: "closeCombat",
    startingResourcesMin: 3,
    startingResourcesMax: 5,
  },
  {
    name: "Priest",
    mainAttribute: "empathy",
    mainSkill: "inspiration",
    startingResourcesMin: 1,
    startingResourcesMax: 3,
  },
];

const generalTalentData = [
  {
    name: "Sixth Sense",
    type: TalentType.GENERAL,
    description: "You can sense the presence of Vaesen and the pressure of the unseen.",
  },
  {
    name: "Iron Will",
    type: TalentType.GENERAL,
    description: "You are harder to break when the Mythic North leans back into view.",
  },
  {
    name: "Fieldcraft",
    type: TalentType.GENERAL,
    description: "You are practiced at travel, foraging, and staying effective away from home.",
  },
];

const archetypeTalentData = [
  {
    archetype: "Academic",
    name: "Research Network",
    description: "Scholarly contacts help you surface obscure leads faster than most investigators.",
  },
  {
    archetype: "Doctor",
    name: "Steady Hands",
    description: "You keep your precision when stitching wounds, setting bones, or working under pressure.",
  },
  {
    archetype: "Officer",
    name: "Command Voice",
    description: "Discipline and presence let you take control of volatile situations.",
  },
  {
    archetype: "Priest",
    name: "Rites of Solace",
    description: "Your rituals and presence can calm fear and restore fragile resolve.",
  },
];

const itemData = [
  {
    name: "Hunting Rifle",
    type: ItemType.WEAPON,
    description: "A reliable long gun for the wilderness and distant targets.",
    bonus: 2,
    availability: 2,
    damage: 2,
    range: "Far",
    skill: "Ranged Combat",
  },
  {
    name: "Service Revolver",
    type: ItemType.WEAPON,
    description: "A sidearm carried by officers, detectives, and those who expect trouble.",
    bonus: 1,
    availability: 3,
    damage: 2,
    range: "Near",
    skill: "Ranged Combat",
  },
  {
    name: "Traveling Medical Bag",
    type: ItemType.GEAR,
    description: "Bandages, tinctures, and instruments for emergency treatment in the field.",
    bonus: 2,
    availability: 2,
    damage: null,
    range: null,
    skill: "Medicine",
  },
  {
    name: "Heavy Coat",
    type: ItemType.ARMOR,
    description: "A thick coat that keeps out weather and softens minor blows.",
    bonus: 1,
    availability: 1,
    damage: null,
    range: null,
    skill: null,
  },
  {
    name: "Lantern",
    type: ItemType.GEAR,
    description: "A dependable source of light when the dark starts to feel inhabited.",
    bonus: 1,
    availability: 1,
    damage: null,
    range: null,
    skill: "Observation",
  },
  {
    name: "Lockpicks",
    type: ItemType.GEAR,
    description: "Simple tools for the discreet opening of doors, trunks, and cabinets.",
    bonus: 1,
    availability: 2,
    damage: null,
    range: null,
    skill: "Stealth",
  },
];

const npcData = [
  {
    name: "Village Constable",
    description: "A local law officer who knows every rumor but trusts outsiders slowly.",
    physique: 3,
    precision: 2,
    logic: 2,
    empathy: 2,
    physicalToughness: 2,
    mentalToughness: 1,
    skills: {
      vigilance: 2,
      manipulation: 1,
      closeCombat: 2,
    },
    weapons: ["Baton", "Service Revolver"],
  },
];

const vaesenData = [
  {
    name: "Mare",
    description: "A nightmare rider that crushes sleepers beneath dread and exhaustion.",
    might: 2,
    bodyControl: 3,
    magic: 4,
    manipulation: 4,
    fear: 3,
    magicalPowers: "Night terrors, suffocating sleep, and dreams turned into hunting grounds.",
    conditions: {
      angry: false,
      frightened: false,
      hopeless: false,
      broken: false,
    },
    ritual: "Appease the Mare by uncovering the source of its grievance and restoring what was violated.",
    secret: "It is bound to a history of cruelty in the home it haunts.",
  },
];

async function upsertByName(model, name, data) {
  const existing = await model.findFirst({
    where: { name },
    select: { id: true, name: true },
  });

  if (existing) {
    return existing;
  }

  return model.create({ data });
}

async function seedUsers() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL.toLowerCase() } });
  if (existing && process.env.SEED_RESET_ADMIN_PASSWORD !== "true") {
    if (existing.role !== Role.ADMIN) throw new Error("Bootstrap email belongs to a non-admin account. Choose another email or explicitly request a reset.");
    return existing;
  }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12 || Buffer.byteLength(ADMIN_PASSWORD, "utf8") > 72) {
    throw new Error("Set SEED_ADMIN_PASSWORD to 12 or more characters (maximum 72 UTF-8 bytes). Existing accounts are preserved unless SEED_RESET_ADMIN_PASSWORD=true.");
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    update: {
      name: ADMIN_NAME,
      role: Role.ADMIN,
      passwordHash,
      sessionVersion: { increment: 1 },
    },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      role: Role.ADMIN,
      passwordHash,
    },
  });

  return admin;
}

async function seedArchetypes() {
  const byName = new Map();

  for (const archetype of archetypes) {
    const saved = await upsertByName(prisma.archetype, archetype.name, archetype);
    byName.set(saved.name, saved);
  }

  return byName;
}

async function seedTalents(archetypesByName) {
  for (const talent of generalTalentData) {
    await upsertByName(prisma.talent, talent.name, talent);
  }

  for (const talent of archetypeTalentData) {
    const archetype = archetypesByName.get(talent.archetype);
    if (!archetype) {
      throw new Error(`Missing archetype for talent: ${talent.name}`);
    }

    await upsertByName(prisma.talent, talent.name, {
      name: talent.name,
      description: talent.description,
      type: TalentType.ARCHETYPE,
      archetypeId: archetype.id,
    });
  }
}

async function seedItems() {
  for (const item of itemData) {
    await upsertByName(prisma.item, item.name, item);
  }
}

async function seedNpcs() {
  for (const npc of npcData) {
    await upsertByName(prisma.nPC, npc.name, npc);
  }
}

async function seedVaesen() {
  for (const vaesen of vaesenData) {
    await upsertByName(prisma.vaesen, vaesen.name, vaesen);
  }
}

async function main() {
  console.log("Seeding Vaesen bootstrap data...");

  const admin = await seedUsers();
  const archetypesByName = await seedArchetypes();
  await seedTalents(archetypesByName);
  await seedItems();
  await seedNpcs();
  await seedVaesen();

  console.log("");
  console.log("Seed completed successfully.");
  console.log(`Admin email: ${admin.email}`);
  console.log("Existing accounts and content were preserved. No passwords are logged.");
  console.log("Override with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME if needed.");
}

main()
  .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
