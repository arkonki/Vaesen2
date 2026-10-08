-- AlterTable
ALTER TABLE "Archetype" ADD COLUMN     "darkSecretOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "firstNameOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "flavorText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastNameOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "motivationOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "relationshipOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "traumaOptions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ArchetypeStartingTalent" (
    "archetypeId" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,

    CONSTRAINT "ArchetypeStartingTalent_pkey" PRIMARY KEY ("archetypeId","talentId")
);

-- CreateTable
CREATE TABLE "ArchetypeEquipmentGroup" (
    "id" TEXT NOT NULL,
    "archetypeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArchetypeEquipmentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchetypeEquipmentOption" (
    "groupId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "ArchetypeEquipmentOption_pkey" PRIMARY KEY ("groupId","itemId")
);

-- CreateIndex
CREATE INDEX "ArchetypeStartingTalent_talentId_idx" ON "ArchetypeStartingTalent"("talentId");

-- CreateIndex
CREATE INDEX "ArchetypeEquipmentGroup_archetypeId_idx" ON "ArchetypeEquipmentGroup"("archetypeId");

-- CreateIndex
CREATE INDEX "ArchetypeEquipmentOption_itemId_idx" ON "ArchetypeEquipmentOption"("itemId");

-- AddForeignKey
ALTER TABLE "ArchetypeStartingTalent" ADD CONSTRAINT "ArchetypeStartingTalent_archetypeId_fkey" FOREIGN KEY ("archetypeId") REFERENCES "Archetype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchetypeStartingTalent" ADD CONSTRAINT "ArchetypeStartingTalent_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchetypeEquipmentGroup" ADD CONSTRAINT "ArchetypeEquipmentGroup_archetypeId_fkey" FOREIGN KEY ("archetypeId") REFERENCES "Archetype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchetypeEquipmentOption" ADD CONSTRAINT "ArchetypeEquipmentOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ArchetypeEquipmentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchetypeEquipmentOption" ADD CONSTRAINT "ArchetypeEquipmentOption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

