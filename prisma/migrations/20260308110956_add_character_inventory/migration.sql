-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "equipment" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "talents" JSONB NOT NULL DEFAULT '[]';
