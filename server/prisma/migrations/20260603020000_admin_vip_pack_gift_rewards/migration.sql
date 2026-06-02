-- Admin-configurable VIP packs and quest gift rewards.

CREATE TYPE "GiftHistorySource" AS ENUM ('USER_SEND', 'VIP_PACK', 'QUEST_REWARD', 'ADMIN_REWARD');

ALTER TABLE "gift_history"
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "source" "GiftHistorySource" NOT NULL DEFAULT 'USER_SEND',
ADD COLUMN "sourceRefId" TEXT;

CREATE TABLE "vip_gift_pack_segments" (
    "id" TEXT NOT NULL,
    "segmentTier" "PremiumTier" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vip_gift_pack_segments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vip_gift_pack_items" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vip_gift_pack_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quest_gift_rewards" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quest_gift_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vip_gift_pack_segments_segmentTier_key" ON "vip_gift_pack_segments"("segmentTier");
CREATE INDEX "vip_gift_pack_segments_isActive_sortOrder_idx" ON "vip_gift_pack_segments"("isActive", "sortOrder");

CREATE UNIQUE INDEX "vip_gift_pack_items_segmentId_giftId_key" ON "vip_gift_pack_items"("segmentId", "giftId");
CREATE INDEX "vip_gift_pack_items_segmentId_isActive_sortOrder_idx" ON "vip_gift_pack_items"("segmentId", "isActive", "sortOrder");
CREATE INDEX "vip_gift_pack_items_giftId_idx" ON "vip_gift_pack_items"("giftId");

CREATE UNIQUE INDEX "quest_gift_rewards_questId_giftId_key" ON "quest_gift_rewards"("questId", "giftId");
CREATE INDEX "quest_gift_rewards_questId_idx" ON "quest_gift_rewards"("questId");
CREATE INDEX "quest_gift_rewards_giftId_idx" ON "quest_gift_rewards"("giftId");

ALTER TABLE "vip_gift_pack_items"
ADD CONSTRAINT "vip_gift_pack_items_segmentId_fkey"
FOREIGN KEY ("segmentId") REFERENCES "vip_gift_pack_segments"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vip_gift_pack_items"
ADD CONSTRAINT "vip_gift_pack_items_giftId_fkey"
FOREIGN KEY ("giftId") REFERENCES "gifts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quest_gift_rewards"
ADD CONSTRAINT "quest_gift_rewards_questId_fkey"
FOREIGN KEY ("questId") REFERENCES "quests"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quest_gift_rewards"
ADD CONSTRAINT "quest_gift_rewards_giftId_fkey"
FOREIGN KEY ("giftId") REFERENCES "gifts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "quest_gift_rewards" ("id", "questId", "giftId", "quantity", "sortOrder", "createdAt", "updatedAt")
SELECT md5(q."id" || ':' || g."id"), q."id", g."id", 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "quests" q
CROSS JOIN LATERAL unnest(q."rewardItems") AS item(value)
JOIN "gifts" g ON g."id" = item.value OR g."name" = item.value
ON CONFLICT ("questId", "giftId") DO NOTHING;
