-- Clean FK refs to scenes being deleted
DELETE FROM character_scenes WHERE "sceneId" NOT IN (
  SELECT MIN(id) FROM scenes GROUP BY name
);
-- Delete duplicate scenes
DELETE FROM scenes WHERE id NOT IN (
  SELECT MIN(id) FROM scenes GROUP BY name
);

-- Clean FK refs to gifts being deleted
DELETE FROM user_gifts WHERE "giftId" NOT IN (
  SELECT MIN(id) FROM gifts GROUP BY name, rarity
);
DELETE FROM gift_history WHERE "giftId" NOT IN (
  SELECT MIN(id) FROM gifts GROUP BY name, rarity
);
-- Delete duplicate gifts
DELETE FROM gifts WHERE id NOT IN (
  SELECT MIN(id) FROM gifts GROUP BY name, rarity
);
-- Clean FK refs to achievements being deleted
DELETE FROM user_achievements WHERE "achievementId" NOT IN (
  SELECT MIN(id) FROM achievements GROUP BY name
);
-- Delete duplicate achievements
DELETE FROM achievements WHERE id NOT IN (
  SELECT MIN(id) FROM achievements GROUP BY name
);
-- Verify
SELECT 'scenes' as tbl, COUNT(*) as total FROM scenes
UNION ALL
SELECT 'gifts', COUNT(*) FROM gifts
UNION ALL
SELECT 'achievements', COUNT(*) FROM achievements
UNION ALL
SELECT 'quests', COUNT(*) FROM quests;
