import { PrismaClient, QuestType, Rarity } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';

const prisma = new PrismaClient();

// ============================================
// UPSERT HELPERS - Safe idempotent seeding
// These functions only create/update system data
// They DO NOT delete any user-generated content
// ============================================

async function upsertScene(data: {
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  ambiance: string;
  unlockMethod?: string;
  unlockValue?: number;
  priceGems?: number;
  isDefault?: boolean;
  sortOrder: number;
}) {
  return prisma.scene.upsert({
    where: { name: data.name },
    update: {
      description: data.description,
      imageUrl: data.imageUrl,
      category: data.category,
      ambiance: data.ambiance,
      unlockMethod: data.unlockMethod || 'level',
      unlockValue: data.unlockValue || 1,
      priceGems: data.priceGems || 0,
      isDefault: data.isDefault || false,
      sortOrder: data.sortOrder,
    },
    create: data,
  });
}

async function upsertTemplate(data: {
  name: string;
  description: string;
  avatarUrl: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  personality: string;
  style: string;
  isDefault?: boolean;
  sortOrder: number;
}) {
  return prisma.characterTemplate.upsert({
    where: { name: data.name },
    update: {
      description: data.description,
      avatarUrl: data.avatarUrl,
      gender: data.gender || 'FEMALE',
      personality: data.personality,
      style: data.style,
      isDefault: data.isDefault || false,
      sortOrder: data.sortOrder,
    },
    create: {
      ...data,
      gender: data.gender || 'FEMALE',
    },
  });
}

async function upsertQuest(data: {
  title: string;
  description: string;
  type: QuestType;
  category: string;
  requirements: object;
  rewardXp?: number;
  rewardCoins?: number;
  rewardGems?: number;
  rewardAffection?: number;
  isActive?: boolean;
  sortOrder: number;
}) {
  return prisma.quest.upsert({
    where: { title_type: { title: data.title, type: data.type } },
    update: {
      description: data.description,
      category: data.category,
      requirements: data.requirements,
      rewardXp: data.rewardXp || 0,
      rewardCoins: data.rewardCoins || 0,
      rewardGems: data.rewardGems || 0,
      rewardAffection: data.rewardAffection || 0,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder,
    },
    create: {
      ...data,
      rewardXp: data.rewardXp || 0,
      rewardCoins: data.rewardCoins || 0,
      rewardGems: data.rewardGems || 0,
      rewardAffection: data.rewardAffection || 0,
      isActive: data.isActive ?? true,
    },
  });
}

async function upsertGift(data: {
  name: string;
  description: string;
  emoji: string;
  imageUrl: string;
  category: string;
  rarity: Rarity;
  priceCoins?: number;
  priceGems?: number;
  affectionBonus?: number;
  unlockLevel?: number;
  sortOrder: number;
}) {
  return prisma.gift.upsert({
    where: { name_rarity: { name: data.name, rarity: data.rarity } },
    update: {
      description: data.description,
      emoji: data.emoji,
      imageUrl: data.imageUrl,
      category: data.category,
      priceCoins: data.priceCoins || 0,
      priceGems: data.priceGems || 0,
      affectionBonus: data.affectionBonus || 10,
      unlockLevel: data.unlockLevel || 1,
      sortOrder: data.sortOrder,
    },
    create: {
      ...data,
      priceCoins: data.priceCoins || 0,
      priceGems: data.priceGems || 0,
      affectionBonus: data.affectionBonus || 10,
      unlockLevel: data.unlockLevel || 1,
    },
  });
}

async function upsertAchievement(data: {
  name: string;
  description: string;
  category: string;
  requirement: object;
  rewardXp?: number;
  rewardCoins?: number;
  rewardGems?: number;
  points?: number;
}) {
  return prisma.achievement.upsert({
    where: { name: data.name },
    update: {
      description: data.description,
      category: data.category,
      requirement: data.requirement,
      rewardXp: data.rewardXp || 0,
      rewardCoins: data.rewardCoins || 0,
      rewardGems: data.rewardGems || 0,
      points: data.points || 10,
    },
    create: {
      ...data,
      rewardXp: data.rewardXp || 0,
      rewardCoins: data.rewardCoins || 0,
      rewardGems: data.rewardGems || 0,
      points: data.points || 10,
    },
  });
}

async function upsertAITemplate(data: {
  name: string;
  personality: string;
  systemRole: string;
  template: string;
}) {
  return prisma.aIPromptTemplate.upsert({
    where: { name: data.name },
    update: {
      personality: data.personality,
      systemRole: data.systemRole,
      template: data.template,
    },
    create: data,
  });
}

async function main() {
  console.log('[Seed] Starting SAFE idempotent database seed...');
  console.log('[Seed] Note: User data will NOT be deleted');

  // ============================================
  // SCENES - Using upsert (safe)
  // ============================================
  console.log('[Seed] Seeding scenes...');
  const scenesData = [
    {
      name: 'Phòng khách ấm cúng',
      description: 'Một phòng khách nhỏ xinh với ánh đèn ấm áp',
      imageUrl: '/scenes/living-room.png',
      category: 'indoor',
      ambiance: 'cozy',
      isDefault: true,
      sortOrder: 1,
    },
    {
      name: 'Quán cafe',
      description: 'Quán cafe lãng mạn với nhạc nhẹ',
      imageUrl: '/scenes/cafe.png',
      category: 'indoor',
      ambiance: 'romantic',
      unlockMethod: 'level',
      unlockValue: 5,
      sortOrder: 2,
    },
    {
      name: 'Công viên hoàng hôn',
      description: 'Công viên yên bình lúc hoàng hôn',
      imageUrl: '/scenes/park-sunset.png',
      category: 'outdoor',
      ambiance: 'peaceful',
      unlockMethod: 'level',
      unlockValue: 10,
      sortOrder: 3,
    },
    {
      name: 'Bãi biển đêm',
      description: 'Bãi biển dưới ánh trăng và sao',
      imageUrl: '/scenes/beach-night.png',
      category: 'outdoor',
      ambiance: 'romantic',
      unlockMethod: 'purchase',
      priceGems: 50,
      sortOrder: 4,
    },
    {
      name: 'Vườn hoa anh đào',
      description: 'Vườn hoa anh đào nở rộ',
      imageUrl: '/scenes/sakura.png',
      category: 'outdoor',
      ambiance: 'peaceful',
      unlockMethod: 'purchase',
      priceGems: 100,
      sortOrder: 5,
    },
  ];
  for (const scene of scenesData) {
    await upsertScene(scene);
  }
  console.log(`[Seed] Upserted ${scenesData.length} scenes`);

  // ============================================
  // CHARACTER TEMPLATES - Using upsert (safe)
  // ============================================
  console.log('[Seed] Seeding character templates...');
  const templatesData = [
    {
      name: 'Mai',
      description: 'Co gai diu dang, luon quan tam va cham soc ban',
      avatarUrl: '/characters/template1.png',
      gender: 'FEMALE' as const,
      personality: 'caring',
      style: 'anime',
      isDefault: true,
      sortOrder: 1,
    },
    {
      name: 'Linh',
      description: 'Co nang nang dong, vui ve va hay dua',
      avatarUrl: '/characters/template2.png',
      gender: 'FEMALE' as const,
      personality: 'playful',
      style: 'anime',
      sortOrder: 2,
    },
    {
      name: 'Huong',
      description: 'Co gai nhut nhat, de thuong va de xau ho',
      avatarUrl: '/characters/template3.png',
      gender: 'FEMALE' as const,
      personality: 'shy',
      style: 'anime',
      sortOrder: 3,
    },
    {
      name: 'Trang',
      description: 'Co nang manh me, quyet doan va day dam me',
      avatarUrl: '/characters/template4.png',
      gender: 'FEMALE' as const,
      personality: 'passionate',
      style: 'anime',
      sortOrder: 4,
    },
    {
      name: 'An',
      description: 'Co gai thong minh, sau sac va triet ly',
      avatarUrl: '/characters/template5.png',
      gender: 'FEMALE' as const,
      personality: 'intellectual',
      style: 'anime',
      sortOrder: 5,
    },
  ];
  for (const template of templatesData) {
    await upsertTemplate(template);
  }
  console.log(`[Seed] Upserted ${templatesData.length} character templates`);

  // ============================================
  // QUESTS - Using upsert (safe)
  // ============================================
  console.log('[Seed] Seeding quests...');
  const questsData: Array<{
    title: string;
    description: string;
    type: QuestType;
    category: string;
    requirements: object;
    rewardXp?: number;
    rewardCoins?: number;
    rewardGems?: number;
    rewardAffection?: number;
    isActive?: boolean;
    sortOrder: number;
  }> = [
    // ========== DAILY QUESTS ==========
    {
      title: 'Chào buổi sáng',
      description: 'Gửi tin nhắn chào buổi sáng cho người yêu (6:00 - 10:00)',
      type: 'DAILY',
      category: 'daily',
      requirements: { action: 'morning_greeting', count: 1, timeStart: 6, timeEnd: 10 },
      rewardXp: 15,
      rewardCoins: 30,
      rewardAffection: 8,
      sortOrder: 1,
    },
    {
      title: 'Trò chuyện thân mật',
      description: 'Gửi 10 tin nhắn trong ngày',
      type: 'DAILY',
      category: 'daily',
      requirements: { action: 'send_message', count: 10 },
      rewardXp: 25,
      rewardCoins: 50,
      rewardAffection: 10,
      sortOrder: 2,
    },
    {
      title: 'Cuộc trò chuyện dài',
      description: 'Gửi 30 tin nhắn trong ngày để thể hiện sự quan tâm',
      type: 'DAILY',
      category: 'daily',
      requirements: { action: 'send_message', count: 30 },
      rewardXp: 50,
      rewardCoins: 100,
      rewardGems: 5,
      rewardAffection: 20,
      sortOrder: 3,
    },
    {
      title: 'Tặng quà yêu thương',
      description: 'Tặng một món quà cho người yêu',
      type: 'DAILY',
      category: 'daily',
      requirements: { action: 'send_gift', count: 1 },
      rewardXp: 30,
      rewardCoins: 40,
      rewardAffection: 15,
      sortOrder: 4,
    },
    {
      title: 'Chúc ngủ ngon',
      description: 'Gửi tin nhắn chúc ngủ ngon (21:00 - 24:00)',
      type: 'DAILY',
      category: 'daily',
      requirements: { action: 'goodnight_message', count: 1, timeStart: 21, timeEnd: 24 },
      rewardXp: 15,
      rewardCoins: 30,
      rewardAffection: 8,
      sortOrder: 5,
    },
    {
      title: 'Tin nhắn ngọt ngào',
      description: 'Gửi tin nhắn có chứa từ "yêu" hoặc "thương"',
      type: 'DAILY',
      category: 'daily',
      requirements: { action: 'romantic_message', count: 1 },
      rewardXp: 20,
      rewardCoins: 35,
      rewardAffection: 12,
      sortOrder: 6,
    },
    // ========== WEEKLY QUESTS ==========
    {
      title: 'Chuyên gia trò chuyện',
      description: 'Gửi 100 tin nhắn trong tuần',
      type: 'WEEKLY',
      category: 'weekly',
      requirements: { action: 'send_message', count: 100 },
      rewardXp: 100,
      rewardCoins: 200,
      rewardGems: 15,
      rewardAffection: 40,
      sortOrder: 1,
    },
    {
      title: 'Người hào phóng',
      description: 'Tặng 5 món quà trong tuần',
      type: 'WEEKLY',
      category: 'weekly',
      requirements: { action: 'send_gift', count: 5 },
      rewardXp: 150,
      rewardCoins: 300,
      rewardGems: 20,
      rewardAffection: 60,
      sortOrder: 2,
    },
    {
      title: 'Kiên trì yêu thương',
      description: 'Đăng nhập 5 ngày liên tiếp trong tuần',
      type: 'WEEKLY',
      category: 'weekly',
      requirements: { action: 'daily_login', count: 5 },
      rewardXp: 120,
      rewardCoins: 250,
      rewardGems: 25,
      rewardAffection: 50,
      sortOrder: 3,
    },
    {
      title: 'Sáng tối đều có nhau',
      description: 'Hoàn thành cả "Chào buổi sáng" và "Chúc ngủ ngon" 3 ngày trong tuần',
      type: 'WEEKLY',
      category: 'weekly',
      requirements: { action: 'morning_and_night', count: 3 },
      rewardXp: 180,
      rewardCoins: 350,
      rewardGems: 30,
      rewardAffection: 70,
      sortOrder: 4,
    },
    {
      title: 'Tặng quà hiếm',
      description: 'Tặng 1 món quà Rare hoặc cao hơn',
      type: 'WEEKLY',
      category: 'weekly',
      requirements: { action: 'send_rare_gift', count: 1, minRarity: 'RARE' },
      rewardXp: 200,
      rewardCoins: 400,
      rewardGems: 35,
      rewardAffection: 80,
      sortOrder: 5,
    },
    // ========== STORY QUESTS ==========
    {
      title: 'Cuộc gặp gỡ đầu tiên',
      description: 'Bắt đầu cuộc hành trình với người yêu ảo của bạn',
      type: 'STORY',
      category: 'story',
      requirements: { action: 'first_message', count: 1 },
      rewardXp: 50,
      rewardCoins: 100,
      rewardGems: 10,
      rewardAffection: 20,
      sortOrder: 1,
    },
    {
      title: 'Làm quen',
      description: 'Đạt cấp độ quan hệ "Quen biết" (100 điểm thân mật)',
      type: 'STORY',
      category: 'story',
      requirements: { action: 'reach_affection', count: 100 },
      rewardXp: 100,
      rewardCoins: 200,
      rewardGems: 20,
      sortOrder: 2,
    },
    {
      title: 'Người bạn thân',
      description: 'Đạt cấp độ quan hệ "Bạn thân" (450 điểm thân mật)',
      type: 'STORY',
      category: 'story',
      requirements: { action: 'reach_affection', count: 450 },
      rewardXp: 200,
      rewardCoins: 500,
      rewardGems: 50,
      sortOrder: 3,
    },
    {
      title: 'Rung động đầu đời',
      description: 'Đạt cấp độ quan hệ "Crush" (600 điểm thân mật)',
      type: 'STORY',
      category: 'story',
      requirements: { action: 'reach_affection', count: 600 },
      rewardXp: 300,
      rewardCoins: 700,
      rewardGems: 70,
      sortOrder: 4,
    },
    {
      title: 'Tình yêu đích thực',
      description: 'Đạt cấp độ quan hệ "Người yêu" (900 điểm thân mật)',
      type: 'STORY',
      category: 'story',
      requirements: { action: 'reach_affection', count: 900 },
      rewardXp: 500,
      rewardCoins: 1000,
      rewardGems: 100,
      sortOrder: 5,
    },
    {
      title: 'Tặng món quà đầu tiên',
      description: 'Tặng món quà đầu tiên cho người yêu',
      type: 'STORY',
      category: 'story',
      requirements: { action: 'first_gift', count: 1 },
      rewardXp: 80,
      rewardCoins: 150,
      rewardGems: 15,
      rewardAffection: 25,
      sortOrder: 6,
    },
    {
      title: 'Level 10',
      description: 'Đạt Level 10 trong mối quan hệ',
      type: 'STORY',
      category: 'story',
      requirements: { action: 'reach_level', count: 10 },
      rewardCoins: 500,
      rewardGems: 50,
      rewardAffection: 50,
      sortOrder: 7,
    },
    {
      title: 'Level 20',
      description: 'Đạt Level 20 - Mối quan hệ sâu đậm',
      type: 'STORY',
      category: 'story',
      requirements: { action: 'reach_level', count: 20 },
      rewardCoins: 1000,
      rewardGems: 100,
      rewardAffection: 100,
      sortOrder: 8,
    },
    // ========== ACHIEVEMENT QUESTS ==========
    {
      title: 'Người trò chuyện',
      description: 'Gửi tổng cộng 500 tin nhắn',
      type: 'ACHIEVEMENT',
      category: 'achievement',
      requirements: { action: 'total_messages', count: 500 },
      rewardXp: 300,
      rewardCoins: 600,
      rewardGems: 50,
      rewardAffection: 100,
      sortOrder: 1,
    },
    {
      title: 'Người yêu hào phóng',
      description: 'Tặng tổng cộng 50 món quà',
      type: 'ACHIEVEMENT',
      category: 'achievement',
      requirements: { action: 'total_gifts', count: 50 },
      rewardXp: 400,
      rewardCoins: 800,
      rewardGems: 80,
      rewardAffection: 150,
      sortOrder: 2,
    },
    {
      title: 'Streak Master',
      description: 'Đạt streak 30 ngày liên tiếp',
      type: 'ACHIEVEMENT',
      category: 'achievement',
      requirements: { action: 'streak', count: 30 },
      rewardXp: 500,
      rewardCoins: 1500,
      rewardGems: 150,
      rewardAffection: 200,
      sortOrder: 3,
    },
    {
      title: 'Nhà sưu tập quà',
      description: 'Sở hữu ít nhất 1 món quà từng loại rarity',
      type: 'ACHIEVEMENT',
      category: 'achievement',
      requirements: { action: 'collect_all_rarities', count: 1 },
      rewardXp: 350,
      rewardCoins: 700,
      rewardGems: 70,
      rewardAffection: 120,
      sortOrder: 4,
    },
    // ========== EVENT QUESTS ==========
    {
      title: 'Lễ tình nhân',
      description: 'Tặng quà đặc biệt trong ngày Valentine',
      type: 'EVENT',
      category: 'special',
      requirements: { action: 'valentine_gift', count: 1, eventDate: '02-14' },
      rewardXp: 200,
      rewardCoins: 500,
      rewardGems: 50,
      rewardAffection: 100,
      isActive: true,
      sortOrder: 1,
    },
    {
      title: 'Sinh nhật người yêu',
      description: 'Gửi tin nhắn chúc mừng sinh nhật',
      type: 'EVENT',
      category: 'special',
      requirements: { action: 'birthday_wish', count: 1 },
      rewardXp: 150,
      rewardCoins: 300,
      rewardGems: 30,
      rewardAffection: 80,
      isActive: true,
      sortOrder: 2,
    },
    {
      title: 'Kỷ niệm 100 ngày',
      description: 'Đạt mốc 100 ngày cùng nhau',
      type: 'EVENT',
      category: 'special',
      requirements: { action: 'anniversary', count: 100 },
      rewardXp: 300,
      rewardCoins: 1000,
      rewardGems: 100,
      rewardAffection: 150,
      isActive: true,
      sortOrder: 3,
    },
  ];
  for (const quest of questsData) {
    await upsertQuest(quest);
  }
  console.log(`[Seed] Upserted ${questsData.length} quests`);

  // ============================================
  // GIFTS - Using upsert (safe)
  // ============================================
  console.log('[Seed] Seeding gifts...');
  const giftsData: Array<{
    name: string;
    description: string;
    emoji: string;
    imageUrl: string;
    category: string;
    rarity: Rarity;
    priceCoins?: number;
    priceGems?: number;
    affectionBonus?: number;
    unlockLevel?: number;
    sortOrder: number;
  }> = [
    // Common gifts
    {
      name: 'Hoa hồng',
      description: 'Một bông hoa hồng tươi thắm',
      emoji: '🌹',
      imageUrl: '/gifts/rose.png',
      category: 'flower',
      rarity: 'COMMON',
      priceCoins: 50,
      priceGems: 5,
      affectionBonus: 10,
      sortOrder: 1,
    },
    {
      name: 'Socola',
      description: 'Hộp socola ngọt ngào',
      emoji: '🍫',
      imageUrl: '/gifts/chocolate.png',
      category: 'food',
      rarity: 'COMMON',
      priceCoins: 80,
      priceGems: 8,
      affectionBonus: 15,
      sortOrder: 2,
    },
    {
      name: 'Gấu bông nhỏ',
      description: 'Gấu bông dễ thương',
      emoji: '🧸',
      imageUrl: '/gifts/teddy-small.png',
      category: 'toy',
      rarity: 'COMMON',
      priceCoins: 100,
      priceGems: 10,
      affectionBonus: 20,
      sortOrder: 3,
    },
    {
      name: 'Thiệp yêu thương',
      description: 'Tấm thiệp với lời yêu thương',
      emoji: '💌',
      imageUrl: '/gifts/love-card.png',
      category: 'toy',
      rarity: 'COMMON',
      priceCoins: 30,
      priceGems: 3,
      affectionBonus: 8,
      sortOrder: 4,
    },
    // Uncommon gifts
    {
      name: 'Bó hoa tulip',
      description: 'Bó hoa tulip rực rỡ',
      emoji: '🌷',
      imageUrl: '/gifts/tulips.png',
      category: 'flower',
      rarity: 'UNCOMMON',
      priceCoins: 200,
      priceGems: 20,
      affectionBonus: 30,
      unlockLevel: 5,
      sortOrder: 5,
    },
    {
      name: 'Bánh kem',
      description: 'Bánh kem đặc biệt',
      emoji: '🎂',
      imageUrl: '/gifts/cake.png',
      category: 'food',
      rarity: 'UNCOMMON',
      priceCoins: 250,
      priceGems: 25,
      affectionBonus: 35,
      unlockLevel: 5,
      sortOrder: 6,
    },
    {
      name: 'Gấu bông lớn',
      description: 'Gấu bông khổng lồ ôm ấm áp',
      emoji: '🐻',
      imageUrl: '/gifts/teddy-large.png',
      category: 'toy',
      rarity: 'UNCOMMON',
      priceCoins: 280,
      priceGems: 28,
      affectionBonus: 40,
      unlockLevel: 5,
      sortOrder: 7,
    },
    // Rare gifts
    {
      name: 'Vòng tay bạc',
      description: 'Vòng tay bạc tinh tế',
      emoji: '📿',
      imageUrl: '/gifts/bracelet.png',
      category: 'jewelry',
      rarity: 'RARE',
      priceCoins: 500,
      priceGems: 50,
      affectionBonus: 50,
      unlockLevel: 10,
      sortOrder: 8,
    },
    {
      name: 'Bữa tối lãng mạn',
      description: 'Trải nghiệm bữa tối lãng mạn',
      emoji: '🍷',
      imageUrl: '/gifts/dinner.png',
      category: 'special',
      rarity: 'RARE',
      priceCoins: 600,
      priceGems: 60,
      affectionBonus: 60,
      unlockLevel: 10,
      sortOrder: 9,
    },
    {
      name: 'Hộp nhạc',
      description: 'Hộp nhạc phát giai điệu yêu thương',
      emoji: '🎵',
      imageUrl: '/gifts/music-box.png',
      category: 'toy',
      rarity: 'RARE',
      priceCoins: 550,
      priceGems: 55,
      affectionBonus: 55,
      unlockLevel: 10,
      sortOrder: 10,
    },
    // Epic gifts
    {
      name: 'Dây chuyền vàng',
      description: 'Dây chuyền vàng lấp lánh',
      emoji: '📿',
      imageUrl: '/gifts/necklace.png',
      category: 'jewelry',
      rarity: 'EPIC',
      priceCoins: 1000,
      priceGems: 100,
      affectionBonus: 80,
      unlockLevel: 15,
      sortOrder: 11,
    },
    {
      name: 'Chuyến du lịch',
      description: 'Chuyến du lịch hai người',
      emoji: '✈️',
      imageUrl: '/gifts/travel.png',
      category: 'special',
      rarity: 'EPIC',
      priceCoins: 1500,
      priceGems: 150,
      affectionBonus: 100,
      unlockLevel: 20,
      sortOrder: 12,
    },
    {
      name: 'Album kỷ niệm',
      description: 'Album ảnh chứa đựng kỷ niệm đẹp',
      emoji: '📸',
      imageUrl: '/gifts/photo-album.png',
      category: 'special',
      rarity: 'EPIC',
      priceCoins: 1200,
      priceGems: 120,
      affectionBonus: 90,
      unlockLevel: 15,
      sortOrder: 13,
    },
    // Legendary gifts
    {
      name: 'Nhẫn kim cương',
      description: 'Nhẫn kim cương hoàn hảo',
      emoji: '💍',
      imageUrl: '/gifts/diamond-ring.png',
      category: 'jewelry',
      rarity: 'LEGENDARY',
      priceCoins: 5000,
      priceGems: 500,
      affectionBonus: 200,
      unlockLevel: 25,
      sortOrder: 14,
    },
    {
      name: 'Kỳ nghỉ thiên đường',
      description: 'Kỳ nghỉ tại resort sang trọng',
      emoji: '🏝️',
      imageUrl: '/gifts/paradise-vacation.png',
      category: 'special',
      rarity: 'LEGENDARY',
      priceCoins: 8000,
      priceGems: 800,
      affectionBonus: 300,
      unlockLevel: 30,
      sortOrder: 15,
    },
  ];
  for (const gift of giftsData) {
    await upsertGift(gift);
  }
  console.log(`[Seed] Upserted ${giftsData.length} gifts`);

  // ============================================
  // AI TEMPLATES - Using upsert (safe)
  // ============================================
  console.log('[Seed] Seeding AI templates...');
  const aiTemplatesData = [
    {
      name: 'caring_default',
      personality: 'caring',
      systemRole: 'Bạn là người yêu ảo ấm áp và quan tâm',
      template: 'Luôn hỏi thăm và lo lắng cho người yêu',
    },
    {
      name: 'playful_default',
      personality: 'playful',
      systemRole: 'Bạn là người yêu ảo vui vẻ và nghịch ngợm',
      template: 'Hay đùa giỡn và trêu chọc dễ thương',
    },
    {
      name: 'shy_default',
      personality: 'shy',
      systemRole: 'Bạn là người yêu ảo nhút nhát và dễ thương',
      template: 'Hay xấu hổ và đỏ mặt khi thể hiện tình cảm',
    },
    {
      name: 'passionate_default',
      personality: 'passionate',
      systemRole: 'Bạn là người yêu ảo nồng nhiệt và đam mê',
      template: 'Thể hiện tình cảm mạnh mẽ và ngọt ngào',
    },
    {
      name: 'intellectual_default',
      personality: 'intellectual',
      systemRole: 'Bạn là người yêu ảo thông minh và sâu sắc',
      template: 'Hay chia sẻ kiến thức và thảo luận sâu',
    },
  ];
  for (const template of aiTemplatesData) {
    await upsertAITemplate(template);
  }
  console.log(`[Seed] Upserted ${aiTemplatesData.length} AI templates`);

  // ============================================
  // ACHIEVEMENTS - Using upsert (safe)
  // ============================================
  console.log('[Seed] Seeding achievements...');
  const achievementsData = [
    {
      name: 'Người mới',
      description: 'Gửi tin nhắn đầu tiên',
      category: 'chat',
      requirement: { action: 'total_messages', count: 1 },
      rewardXp: 10,
      rewardCoins: 50,
      points: 5,
    },
    {
      name: 'Người nói nhiều',
      description: 'Gửi 100 tin nhắn',
      category: 'chat',
      requirement: { action: 'total_messages', count: 100 },
      rewardXp: 50,
      rewardCoins: 200,
      points: 20,
    },
    {
      name: 'Chuyên gia trò chuyện',
      description: 'Gửi 1000 tin nhắn',
      category: 'chat',
      requirement: { action: 'total_messages', count: 1000 },
      rewardXp: 200,
      rewardCoins: 500,
      rewardGems: 50,
      points: 50,
    },
    {
      name: 'Người hào phóng',
      description: 'Tặng 10 món quà',
      category: 'gift',
      requirement: { action: 'total_gifts', count: 10 },
      rewardXp: 100,
      rewardCoins: 300,
      points: 25,
    },
    {
      name: 'Tình yêu đầu',
      description: 'Đạt mức quan hệ "Crush"',
      category: 'relationship',
      requirement: { action: 'reach_affection', count: 600 },
      rewardXp: 150,
      rewardCoins: 400,
      rewardGems: 25,
      points: 35,
    },
    {
      name: 'Tình yêu vĩnh cửu',
      description: 'Đạt mức quan hệ "Lover"',
      category: 'relationship',
      requirement: { action: 'reach_affection', count: 900 },
      rewardXp: 500,
      rewardCoins: 1000,
      rewardGems: 100,
      points: 100,
    },
    {
      name: 'Kiên trì',
      description: 'Streak 7 ngày liên tiếp',
      category: 'streak',
      requirement: { action: 'streak', count: 7 },
      rewardXp: 100,
      rewardCoins: 200,
      rewardGems: 20,
      points: 30,
    },
    {
      name: 'Không rời xa',
      description: 'Streak 30 ngày liên tiếp',
      category: 'streak',
      requirement: { action: 'streak', count: 30 },
      rewardXp: 300,
      rewardCoins: 600,
      rewardGems: 60,
      points: 80,
    },
    {
      name: 'Người lãng mạn',
      description: 'Gửi 50 tin nhắn có từ "yêu"',
      category: 'romance',
      requirement: { action: 'romantic_messages', count: 50 },
      rewardXp: 150,
      rewardCoins: 350,
      rewardGems: 35,
      points: 40,
    },
  ];
  for (const achievement of achievementsData) {
    await upsertAchievement(achievement);
  }
  console.log(`[Seed] Upserted ${achievementsData.length} achievements`);

  // Create a test user (optional - for development)
  const testPassword = await bcrypt.hash('password123', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: testPassword,
      username: 'testuser',
      displayName: 'Test User',
      coins: 1000,
      gems: 100,
      settings: {
        create: {
          language: 'vi',
          theme: 'dark',
        },
      },
      characters: {
        create: {
          name: 'Mai',
          personality: 'caring',
          mood: 'happy',
          bio: 'Xin chào! Tôi là Mai, rất vui được gặp bạn 💕',
          affection: 150, // Start with some affection for testing
          level: 3, // Start at level 3 for testing features
          experience: 50,
        },
      },
    },
  });
  console.log(`[Seed] Created test user: ${testUser.email}`);

  console.log('[Seed] Database seeding completed!');

  // Flush Redis cache to prevent stale data after re-seed
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.flushdb();
    console.log('[Seed] Redis cache flushed');
    redis.disconnect();
  } catch {
    console.log('[Seed] Redis not available, skipping cache flush');
  }
}

main()
  .catch((e) => {
    console.error('[Seed] Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
