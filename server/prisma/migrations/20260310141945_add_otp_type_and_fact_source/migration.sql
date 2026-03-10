-- CreateEnum
CREATE TYPE "OTPType" AS ENUM ('PASSWORD_RESET', 'REGISTRATION');

-- AlterTable: Add type column to password_reset_otps
ALTER TABLE "password_reset_otps" ADD COLUMN "type" "OTPType" NOT NULL DEFAULT 'PASSWORD_RESET';

-- AlterTable: Add sourceType and learnedAt to character_facts
ALTER TABLE "character_facts" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "character_facts" ADD COLUMN "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
