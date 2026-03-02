-- CreateIndex
CREATE INDEX "character_templates_isActive_idx" ON "character_templates"("isActive");

-- CreateIndex
CREATE INDEX "characters_templateId_idx" ON "characters"("templateId");

-- CreateIndex
CREATE INDEX "messages_characterId_createdAt_idx" ON "messages"("characterId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_userId_createdAt_idx" ON "messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "quests_type_isActive_idx" ON "quests"("type", "isActive");

-- CreateIndex
CREATE INDEX "quests_isActive_idx" ON "quests"("isActive");

-- CreateIndex
CREATE INDEX "gifts_isActive_category_idx" ON "gifts"("isActive", "category");

-- CreateIndex
CREATE INDEX "gifts_isActive_idx" ON "gifts"("isActive");

-- CreateIndex
CREATE INDEX "scenes_isActive_idx" ON "scenes"("isActive");

-- CreateIndex
CREATE INDEX "user_achievements_userId_unlockedAt_idx" ON "user_achievements"("userId", "unlockedAt");

-- CreateIndex
CREATE INDEX "user_achievements_userId_idx" ON "user_achievements"("userId");

-- CreateIndex
CREATE INDEX "daily_rewards_userId_day_idx" ON "daily_rewards"("userId", "day");
