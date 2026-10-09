-- AlterTable
ALTER TABLE "Archetype" ADD COLUMN     "bookKey" TEXT,
ADD COLUMN     "sourceBook" TEXT,
ADD COLUMN     "sourcePage" INTEGER;

-- AlterTable
ALTER TABLE "Talent" ADD COLUMN     "bookKey" TEXT;

-- CreateTable
CREATE TABLE "SkillDefinition" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attribute" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "extraSuccesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "guidance" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceBook" TEXT,
    "sourcePages" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "SkillDefinition_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Archetype_bookKey_key" ON "Archetype"("bookKey");

-- CreateIndex
CREATE UNIQUE INDEX "Talent_bookKey_key" ON "Talent"("bookKey");

