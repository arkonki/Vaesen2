ALTER TABLE "Character" ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archiveVersion" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Character_userId_archivedAt_idx" ON "Character"("userId", "archivedAt");
