/*
  Warnings:

  - A unique constraint covering the columns `[title,type]` on the table `quests` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "quests_title_type_key" ON "quests"("title", "type");
