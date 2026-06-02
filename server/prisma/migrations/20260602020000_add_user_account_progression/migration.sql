ALTER TABLE "users" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD COLUMN "experience" INTEGER NOT NULL DEFAULT 0;

WITH ranked_characters AS (
  SELECT DISTINCT ON ("userId")
    "userId",
    "level",
    "experience"
  FROM "characters"
  WHERE "isActive" = true
    AND "isEnded" = false
  ORDER BY "userId", "level" DESC, "experience" DESC
)
UPDATE "users" AS u
SET
  "level" = ranked_characters."level",
  "experience" = ranked_characters."experience"
FROM ranked_characters
WHERE u."id" = ranked_characters."userId";

CREATE INDEX "users_level_experience_idx" ON "users"("level", "experience");
