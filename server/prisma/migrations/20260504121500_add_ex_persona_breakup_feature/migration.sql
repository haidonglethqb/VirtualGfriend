-- AlterEnum
ALTER TYPE "RelationshipEventType" ADD VALUE 'EX_PERSONA_CREATED';

-- AlterTable
ALTER TABLE "characters"
ADD COLUMN "isExPersona" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "exPersonaSourceId" TEXT,
ADD COLUMN "exPersonaGeneratedAt" TIMESTAMP(3),
ADD COLUMN "exMessagingEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "user_settings"
ADD COLUMN "allowExPersonaMessages" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "characters_userId_isExPersona_idx" ON "characters"("userId", "isExPersona");

-- CreateIndex
CREATE INDEX "characters_userId_exPersonaSourceId_idx" ON "characters"("userId", "exPersonaSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "characters_userId_exPersonaSourceId_isExPersona_key" ON "characters"("userId", "exPersonaSourceId", "isExPersona");