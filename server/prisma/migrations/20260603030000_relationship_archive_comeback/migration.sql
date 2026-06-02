ALTER TABLE "user_settings"
ADD COLUMN "allowExComebackEmails" BOOLEAN NOT NULL DEFAULT true;

ALTER TYPE "GiftHistorySource" ADD VALUE IF NOT EXISTS 'EX_GIFT';

CREATE TABLE "ex_comeback_deliveries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "stageIndex" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "messageId" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "emailStatus" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ex_comeback_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ex_comeback_deliveries_characterId_stageIndex_key"
ON "ex_comeback_deliveries"("characterId", "stageIndex");

CREATE INDEX "ex_comeback_deliveries_status_scheduledAt_idx"
ON "ex_comeback_deliveries"("status", "scheduledAt");

CREATE INDEX "ex_comeback_deliveries_userId_characterId_status_idx"
ON "ex_comeback_deliveries"("userId", "characterId", "status");

ALTER TABLE "ex_comeback_deliveries"
ADD CONSTRAINT "ex_comeback_deliveries_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ex_comeback_deliveries"
ADD CONSTRAINT "ex_comeback_deliveries_characterId_fkey"
FOREIGN KEY ("characterId") REFERENCES "characters"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
