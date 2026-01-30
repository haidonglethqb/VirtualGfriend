/*
  Warnings:

  - Added the required column `userId` to the `gift_history` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MemoryType" ADD VALUE 'SPECIAL';
ALTER TYPE "MemoryType" ADD VALUE 'DATE';
ALTER TYPE "MemoryType" ADD VALUE 'CHAT';

-- First add userId as nullable
ALTER TABLE "gift_history" ADD COLUMN "userId" TEXT;

-- Update existing records to get userId from character's owner
UPDATE "gift_history" gh
SET "userId" = c."userId"
FROM "characters" c
WHERE gh."characterId" = c.id;

-- Now make it NOT NULL
ALTER TABLE "gift_history" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "memories" ADD COLUMN     "characterId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "streak" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "gift_history" ADD CONSTRAINT "gift_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
