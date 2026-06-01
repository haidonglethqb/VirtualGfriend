-- Add global account progression fields to users
ALTER TABLE "users"
ADD COLUMN "accountLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "accountXp" INTEGER NOT NULL DEFAULT 0;