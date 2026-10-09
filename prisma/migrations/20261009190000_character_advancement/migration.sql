-- CreateEnum
CREATE TYPE "AdvancementKind" AS ENUM ('SKILL', 'TALENT');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "experienceVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CharacterAdvancement" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" "AdvancementKind" NOT NULL,
    "targetKey" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "previousValue" INTEGER,
    "newValue" INTEGER,
    "xpCost" INTEGER NOT NULL,
    "xpBefore" INTEGER NOT NULL,
    "xpAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterAdvancement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterAdvancement_characterId_createdAt_id_idx" ON "CharacterAdvancement"("characterId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAdvancement_characterId_requestId_key" ON "CharacterAdvancement"("characterId", "requestId");

-- AddForeignKey
ALTER TABLE "CharacterAdvancement" ADD CONSTRAINT "CharacterAdvancement_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAdvancement" ADD CONSTRAINT "CharacterAdvancement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

