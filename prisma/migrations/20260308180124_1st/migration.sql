-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "AdventureTask" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "GameMap" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "markers" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "GameMap_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GameMap" ADD CONSTRAINT "GameMap_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
