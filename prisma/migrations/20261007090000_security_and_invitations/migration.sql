ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Mystery" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MysteryClue" ADD COLUMN "isRevealed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MysteryEntity" ADD COLUMN "isRevealed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MysteryLocation" ADD COLUMN "isRevealed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CharacterInvitation" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CharacterInvitation_partyId_characterId_key" ON "CharacterInvitation"("partyId", "characterId");
CREATE INDEX "CharacterInvitation_characterId_idx" ON "CharacterInvitation"("characterId");
ALTER TABLE "CharacterInvitation" ADD CONSTRAINT "CharacterInvitation_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterInvitation" ADD CONSTRAINT "CharacterInvitation_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HeadquartersLedgerEntry" (
    "id" TEXT NOT NULL,
    "headquartersId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeadquartersLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HeadquartersLedgerEntry_headquartersId_createdAt_idx" ON "HeadquartersLedgerEntry"("headquartersId", "createdAt");
ALTER TABLE "HeadquartersLedgerEntry" ADD CONSTRAINT "HeadquartersLedgerEntry_headquartersId_fkey" FOREIGN KEY ("headquartersId") REFERENCES "Headquarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
