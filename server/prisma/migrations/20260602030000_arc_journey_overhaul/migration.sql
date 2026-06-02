-- Arc journey overhaul: sequential unlocks, final quest gating, and completion rewards.

ALTER TABLE "quests"
ADD COLUMN "isArcFinalQuest" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "arcs"
ADD COLUMN "prerequisiteArcId" TEXT,
ADD COLUMN "rewardCoins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rewardGems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rewardAffection" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rewardXp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rewardTitleName" TEXT,
ADD COLUMN "rewardSceneName" TEXT;

CREATE UNIQUE INDEX "arcs_prerequisiteArcId_key" ON "arcs"("prerequisiteArcId");

ALTER TABLE "arcs"
ADD CONSTRAINT "arcs_prerequisiteArcId_fkey"
FOREIGN KEY ("prerequisiteArcId") REFERENCES "arcs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
