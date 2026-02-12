/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `achievements` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,rarity]` on the table `gifts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `scenes` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "activeSceneId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE INDEX "character_facts_characterId_importance_idx" ON "character_facts"("characterId", "importance");

-- CreateIndex
CREATE INDEX "characters_userId_isActive_idx" ON "characters"("userId", "isActive");

-- CreateIndex
CREATE INDEX "daily_rewards_userId_claimedAt_idx" ON "daily_rewards"("userId", "claimedAt");

-- CreateIndex
CREATE INDEX "gift_history_userId_createdAt_idx" ON "gift_history"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "gift_history_characterId_createdAt_idx" ON "gift_history"("characterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "gifts_name_rarity_key" ON "gifts"("name", "rarity");

-- CreateIndex
CREATE INDEX "memories_userId_characterId_createdAt_idx" ON "memories"("userId", "characterId", "createdAt");

-- CreateIndex
CREATE INDEX "memories_userId_type_idx" ON "memories"("userId", "type");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_expiresAt_isRevoked_idx" ON "refresh_tokens"("userId", "expiresAt", "isRevoked");

-- CreateIndex
CREATE UNIQUE INDEX "scenes_name_key" ON "scenes"("name");

-- CreateIndex
CREATE INDEX "user_gifts_userId_quantity_idx" ON "user_gifts"("userId", "quantity");

-- CreateIndex
CREATE INDEX "user_quests_userId_status_idx" ON "user_quests"("userId", "status");

-- CreateIndex
CREATE INDEX "user_quests_userId_questId_startedAt_idx" ON "user_quests"("userId", "questId", "startedAt");
