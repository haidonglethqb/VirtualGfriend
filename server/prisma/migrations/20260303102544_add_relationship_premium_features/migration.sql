-- CreateEnum
CREATE TYPE "PremiumTier" AS ENUM ('FREE', 'BASIC', 'PRO', 'ULTIMATE');

-- CreateEnum
CREATE TYPE "UserGender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'NOT_SPECIFIED');

-- CreateEnum
CREATE TYPE "DatingPreference" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'ALL');

-- CreateEnum
CREATE TYPE "RelationshipEventType" AS ENUM ('STAGE_UP', 'FIRST_DATE', 'CONFESSION', 'STARTED_DATING', 'ANNIVERSARY', 'BREAKUP', 'RECONCILIATION', 'SPECIAL_MOMENT');

-- AlterEnum
ALTER TYPE "Gender" ADD VALUE 'NON_BINARY';

-- AlterEnum
ALTER TYPE "QuestType" ADD VALUE 'RELATIONSHIP';

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "endReason" TEXT,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "firstMetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isEnded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "relationshipStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "gifts" ADD COLUMN     "minimumTier" "PremiumTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "requiresPremium" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quests" ADD COLUMN     "minimumTier" "PremiumTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "requiresPremium" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "scenes" ADD COLUMN     "minimumTier" "PremiumTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "requiredStage" "RelationshipStage" DEFAULT 'STRANGER',
ADD COLUMN     "requiresPremium" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "datingPreference" "DatingPreference" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "premiumTier" "PremiumTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "userGender" "UserGender" NOT NULL DEFAULT 'NOT_SPECIFIED';

-- CreateTable
CREATE TABLE "relationship_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "eventType" "RelationshipEventType" NOT NULL,
    "fromStage" "RelationshipStage",
    "toStage" "RelationshipStage",
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationship_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "relationship_history_userId_characterId_createdAt_idx" ON "relationship_history"("userId", "characterId", "createdAt");

-- CreateIndex
CREATE INDEX "relationship_history_characterId_eventType_idx" ON "relationship_history"("characterId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "characters_userId_isEnded_idx" ON "characters"("userId", "isEnded");

-- AddForeignKey
ALTER TABLE "relationship_history" ADD CONSTRAINT "relationship_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_history" ADD CONSTRAINT "relationship_history_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
