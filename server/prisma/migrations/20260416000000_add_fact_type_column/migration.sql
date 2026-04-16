-- AlterTable: Add factType column to character_facts (was in schema but missing from migrations)
ALTER TABLE "character_facts" ADD COLUMN IF NOT EXISTS "factType" TEXT NOT NULL DEFAULT 'evolving';
