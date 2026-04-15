-- AlterTable: Add arc and chain quest fields to Quest
ALTER TABLE "quests" ADD COLUMN "arcId" TEXT,
ADD COLUMN "prerequisiteQuestId" TEXT;

-- CreateIndex: Unique on prerequisiteQuestId
CREATE UNIQUE INDEX "quests_prerequisiteQuestId_key" ON "quests"("prerequisiteQuestId");

-- CreateIndex: Arc integration indexes
CREATE INDEX "quests_arcId_idx" ON "quests"("arcId");

-- CreateTable: Arc
CREATE TABLE "arcs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconEmoji" TEXT NOT NULL DEFAULT E'\U0001f4d6',
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER NOT NULL DEFAULT 5,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "requiredTier" "PremiumTier" NOT NULL DEFAULT 'FREE',
    "backgroundImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arcs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Arc unique name
CREATE UNIQUE INDEX "arcs_name_key" ON "arcs"("name");

-- CreateIndex: Arc active + order
CREATE INDEX "arcs_isActive_orderIndex_idx" ON "arcs"("isActive", "orderIndex");

-- CreateTable: ArcProgress
CREATE TABLE "arc_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "arcId" TEXT NOT NULL,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "currentQuestId" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "arc_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ArcProgress unique user+arc
CREATE UNIQUE INDEX "arc_progress_userId_arcId_key" ON "arc_progress"("userId", "arcId");

-- CreateIndex: ArcProgress completion
CREATE INDEX "arc_progress_userId_completionPercent_idx" ON "arc_progress"("userId", "completionPercent");

-- CreateIndex: ArcProgress completed
CREATE INDEX "arc_progress_userId_completedAt_idx" ON "arc_progress"("userId", "completedAt");

-- CreateTable: Title
CREATE TABLE "titles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconEmoji" TEXT NOT NULL DEFAULT E'\U0001f3c5',
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "requirement" JSONB NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVipExclusive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "titles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Title unique name
CREATE UNIQUE INDEX "titles_name_key" ON "titles"("name");

-- CreateIndex: Title category + active
CREATE INDEX "titles_category_isActive_idx" ON "titles"("category", "isActive");

-- CreateIndex: Title VIP + active
CREATE INDEX "titles_isVipExclusive_isActive_idx" ON "titles"("isVipExclusive", "isActive");

-- CreateTable: UserTitle
CREATE TABLE "user_titles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_titles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: UserTitle unique user+title
CREATE UNIQUE INDEX "user_titles_userId_titleId_key" ON "user_titles"("userId", "titleId");

-- CreateIndex: UserTitle equipped
CREATE INDEX "user_titles_userId_isEquipped_idx" ON "user_titles"("userId", "isEquipped");

-- CreateIndex: UserTitle unlocked desc
CREATE INDEX "user_titles_userId_unlockedAt_idx" ON "user_titles"("userId", "unlockedAt" DESC);

-- AddForeignKey: Quest -> Arc
ALTER TABLE "quests" ADD CONSTRAINT "quests_arcId_fkey" FOREIGN KEY ("arcId") REFERENCES "arcs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Quest -> Quest (chain)
ALTER TABLE "quests" ADD CONSTRAINT "quests_prerequisiteQuestId_fkey" FOREIGN KEY ("prerequisiteQuestId") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ArcProgress -> User
ALTER TABLE "arc_progress" ADD CONSTRAINT "arc_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ArcProgress -> Arc
ALTER TABLE "arc_progress" ADD CONSTRAINT "arc_progress_arcId_fkey" FOREIGN KEY ("arcId") REFERENCES "arcs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: UserTitle -> User
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserTitle -> Title
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "titles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
