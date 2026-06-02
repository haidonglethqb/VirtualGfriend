-- AlterTable
ALTER TABLE "character_facts" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "character_facts" ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "character_facts_characterId_expiresAt_idx" ON "character_facts"("characterId", "expiresAt");
