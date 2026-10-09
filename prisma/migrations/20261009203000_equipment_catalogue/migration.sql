-- CreateEnum
CREATE TYPE "ItemUsageKind" AS ENUM ('TOOL', 'ATTACK', 'NARRATIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ItemType" ADD VALUE 'SERVICE';
ALTER TYPE "ItemType" ADD VALUE 'COVER';
ALTER TYPE "ItemType" ADD VALUE 'ATTACK';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "agilityPenalty" INTEGER,
ADD COLUMN     "bookKey" TEXT,
ADD COLUMN     "doses" INTEGER,
ADD COLUMN     "protection" INTEGER,
ADD COLUMN     "sourceBook" TEXT,
ADD COLUMN     "sourcePage" INTEGER,
ADD COLUMN     "toxicity" INTEGER;

-- CreateTable
CREATE TABLE "ItemUsage" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "ItemUsageKind" NOT NULL,
    "skills" TEXT[],
    "bonus" INTEGER NOT NULL DEFAULT 0,
    "effect" TEXT NOT NULL,
    "requirements" TEXT NOT NULL DEFAULT '',
    "damage" INTEGER,
    "rangeMin" INTEGER,
    "rangeMax" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ItemUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemUsage_itemId_position_idx" ON "ItemUsage"("itemId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Item_bookKey_key" ON "Item"("bookKey");

-- AddForeignKey
ALTER TABLE "ItemUsage" ADD CONSTRAINT "ItemUsage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

