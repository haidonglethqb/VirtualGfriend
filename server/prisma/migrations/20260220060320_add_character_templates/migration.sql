-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "character_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'FEMALE',
    "personality" TEXT NOT NULL DEFAULT 'caring',
    "style" TEXT NOT NULL DEFAULT 'anime',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "character_templates_name_key" ON "character_templates"("name");

-- CreateIndex
CREATE INDEX "character_templates_isActive_sortOrder_idx" ON "character_templates"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "character_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
