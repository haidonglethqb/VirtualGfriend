-- CreateIndex
CREATE INDEX "characters_isActive_level_experience_idx" ON "characters"("isActive", "level", "experience");

-- CreateIndex
CREATE INDEX "characters_isActive_affection_idx" ON "characters"("isActive", "affection");

-- CreateIndex
CREATE INDEX "conversation_members_conversationId_isActive_idx" ON "conversation_members"("conversationId", "isActive");

-- CreateIndex
CREATE INDEX "direct_messages_conversationId_isDeleted_createdAt_idx" ON "direct_messages"("conversationId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "users_streak_idx" ON "users"("streak");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");
