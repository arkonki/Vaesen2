-- AlterTable
ALTER TABLE "Character" ADD COLUMN "relationships" TEXT;

-- CreateTable
CREATE TABLE "CharacterInventory" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "CharacterInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterInventory_characterId_itemId_key" ON "CharacterInventory"("characterId", "itemId");

-- CreateIndex
CREATE INDEX "CharacterInventory_characterId_idx" ON "CharacterInventory"("characterId");

-- CreateIndex
CREATE INDEX "CharacterInventory_itemId_idx" ON "CharacterInventory"("itemId");

-- AddForeignKey
ALTER TABLE "CharacterInventory" ADD CONSTRAINT "CharacterInventory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterInventory" ADD CONSTRAINT "CharacterInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
