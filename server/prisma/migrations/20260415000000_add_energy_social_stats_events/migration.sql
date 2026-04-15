-- Add energy/stamina fields to users
ALTER TABLE "users" ADD COLUMN "energy" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "maxEnergy" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "energyRegenAt" TIMESTAMP(3);

-- Add social stats (Persona-style) to users
ALTER TABLE "users" ADD COLUMN "charm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "knowledge" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "guts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "kindness" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "proficiency" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: Events
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "iconEmoji" TEXT NOT NULL DEFAULT E'\U0001f389',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_isActive_startDate_idx" ON "events"("isActive", "startDate");
CREATE INDEX "events_type_isActive_idx" ON "events"("type", "isActive");

-- CreateTable: EventQuests
CREATE TABLE "event_quests" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "bonusMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "event_quests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_quests_eventId_questId_key" ON "event_quests"("eventId", "questId");

-- CreateTable: EventRewards
CREATE TABLE "event_rewards" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "requirement" JSONB NOT NULL,

    CONSTRAINT "event_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_rewards_eventId_idx" ON "event_rewards"("eventId");

-- AddForeignKey: EventQuest -> Event
ALTER TABLE "event_quests" ADD CONSTRAINT "event_quests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: EventReward -> Event
ALTER TABLE "event_rewards" ADD CONSTRAINT "event_rewards_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
