-- CreateEnum
CREATE TYPE "MysteryStatus" AS ENUM ('PREP', 'ACTIVE', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MysteryEntityType" AS ENUM ('NPC', 'VAESEN', 'PERSON');

-- CreateTable
CREATE TABLE "PartyStashItem" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "PartyStashItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mystery" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "hook" TEXT,
    "aftermath" TEXT,
    "status" "MysteryStatus" NOT NULL DEFAULT 'PREP',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mystery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryClue" (
    "id" TEXT NOT NULL,
    "mysteryId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MysteryClue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryEntity" (
    "id" TEXT NOT NULL,
    "mysteryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MysteryEntityType" NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MysteryEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryLocation" (
    "id" TEXT NOT NULL,
    "mysteryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MysteryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartyStashItem_partyId_itemId_key" ON "PartyStashItem"("partyId", "itemId");

-- CreateIndex
CREATE INDEX "PartyStashItem_partyId_idx" ON "PartyStashItem"("partyId");

-- CreateIndex
CREATE INDEX "PartyStashItem_itemId_idx" ON "PartyStashItem"("itemId");

-- CreateIndex
CREATE INDEX "Mystery_partyId_status_idx" ON "Mystery"("partyId", "status");

-- CreateIndex
CREATE INDEX "MysteryClue_mysteryId_idx" ON "MysteryClue"("mysteryId");

-- CreateIndex
CREATE INDEX "MysteryEntity_mysteryId_type_idx" ON "MysteryEntity"("mysteryId", "type");

-- CreateIndex
CREATE INDEX "MysteryLocation_mysteryId_idx" ON "MysteryLocation"("mysteryId");

-- AddForeignKey
ALTER TABLE "PartyStashItem" ADD CONSTRAINT "PartyStashItem_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyStashItem" ADD CONSTRAINT "PartyStashItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mystery" ADD CONSTRAINT "Mystery_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryClue" ADD CONSTRAINT "MysteryClue_mysteryId_fkey" FOREIGN KEY ("mysteryId") REFERENCES "Mystery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryEntity" ADD CONSTRAINT "MysteryEntity_mysteryId_fkey" FOREIGN KEY ("mysteryId") REFERENCES "Mystery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryLocation" ADD CONSTRAINT "MysteryLocation_mysteryId_fkey" FOREIGN KEY ("mysteryId") REFERENCES "Mystery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
