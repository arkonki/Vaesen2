-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'GM', 'ADMIN');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('YOUNG', 'MIDDLE_AGED', 'OLD');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('WEAPON', 'ARMOR', 'GEAR', 'MAGIC');

-- CreateEnum
CREATE TYPE "TalentType" AS ENUM ('GENERAL', 'ARCHETYPE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "archetypeId" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "trauma" TEXT NOT NULL,
    "darkSecret" TEXT NOT NULL,
    "physicalConditions" JSONB NOT NULL DEFAULT '{}',
    "mentalConditions" JSONB NOT NULL DEFAULT '{}',
    "insightsDefects" JSONB NOT NULL DEFAULT '{}',
    "experiencePoints" INTEGER NOT NULL DEFAULT 0,
    "resources" INTEGER NOT NULL DEFAULT 0,
    "capital" INTEGER NOT NULL DEFAULT 0,
    "memento" TEXT,
    "notes" TEXT,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterAttribute" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "physique" INTEGER NOT NULL DEFAULT 2,
    "precision" INTEGER NOT NULL DEFAULT 2,
    "logic" INTEGER NOT NULL DEFAULT 2,
    "empathy" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "CharacterAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSkill" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "agility" INTEGER NOT NULL DEFAULT 0,
    "closeCombat" INTEGER NOT NULL DEFAULT 0,
    "force" INTEGER NOT NULL DEFAULT 0,
    "medicine" INTEGER NOT NULL DEFAULT 0,
    "rangedCombat" INTEGER NOT NULL DEFAULT 0,
    "stealth" INTEGER NOT NULL DEFAULT 0,
    "investigation" INTEGER NOT NULL DEFAULT 0,
    "learning" INTEGER NOT NULL DEFAULT 0,
    "vigilance" INTEGER NOT NULL DEFAULT 0,
    "inspiration" INTEGER NOT NULL DEFAULT 0,
    "manipulation" INTEGER NOT NULL DEFAULT 0,
    "observation" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CharacterSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Archetype" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mainAttribute" TEXT NOT NULL,
    "mainSkill" TEXT NOT NULL,
    "startingResourcesMin" INTEGER NOT NULL DEFAULT 0,
    "startingResourcesMax" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Archetype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bonus" INTEGER NOT NULL DEFAULT 0,
    "availability" INTEGER NOT NULL DEFAULT 0,
    "type" "ItemType" NOT NULL,
    "damage" INTEGER,
    "range" TEXT,
    "skill" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Talent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TalentType" NOT NULL,
    "archetypeId" TEXT,

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NPC" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "physique" INTEGER NOT NULL DEFAULT 2,
    "precision" INTEGER NOT NULL DEFAULT 2,
    "logic" INTEGER NOT NULL DEFAULT 2,
    "empathy" INTEGER NOT NULL DEFAULT 2,
    "physicalToughness" INTEGER NOT NULL DEFAULT 0,
    "mentalToughness" INTEGER NOT NULL DEFAULT 0,
    "skills" JSONB NOT NULL DEFAULT '{}',
    "weapons" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "NPC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaesen" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "might" INTEGER NOT NULL,
    "bodyControl" INTEGER NOT NULL,
    "magic" INTEGER NOT NULL,
    "manipulation" INTEGER NOT NULL,
    "fear" INTEGER NOT NULL,
    "magicalPowers" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "ritual" TEXT NOT NULL,
    "secret" TEXT NOT NULL,

    CONSTRAINT "Vaesen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gmId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyMember" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "PartyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Headquarters" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "developmentPoints" INTEGER NOT NULL DEFAULT 0,
    "facilities" JSONB NOT NULL DEFAULT '[]',
    "contacts" JSONB NOT NULL DEFAULT '[]',
    "personnel" JSONB NOT NULL DEFAULT '[]',
    "history" TEXT NOT NULL,
    "threats" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Headquarters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdventureTask" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',

    CONSTRAINT "AdventureTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAttribute_characterId_key" ON "CharacterAttribute"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSkill_characterId_key" ON "CharacterSkill"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyMember_partyId_characterId_key" ON "PartyMember"("partyId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Headquarters_partyId_key" ON "Headquarters"("partyId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_archetypeId_fkey" FOREIGN KEY ("archetypeId") REFERENCES "Archetype"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAttribute" ADD CONSTRAINT "CharacterAttribute_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_gmId_fkey" FOREIGN KEY ("gmId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMember" ADD CONSTRAINT "PartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMember" ADD CONSTRAINT "PartyMember_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Headquarters" ADD CONSTRAINT "Headquarters_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdventureTask" ADD CONSTRAINT "AdventureTask_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
