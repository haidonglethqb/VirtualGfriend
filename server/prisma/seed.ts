import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default scenes
  const scenes = await prisma.scene.createMany({
    data: [
      {
        name: 'Phòng khách ấm cúng',
        description: 'Một phòng khách nhỏ xinh với ánh đèn ấm áp',
        imageUrl: '/scenes/living-room.jpg',
        category: 'indoor',
        ambiance: 'cozy',
        isDefault: true,
        sortOrder: 1,
      },
      {
        name: 'Quán cafe',
        description: 'Quán cafe lãng mạn với nhạc nhẹ',
        imageUrl: '/scenes/cafe.jpg',
        category: 'indoor',
        ambiance: 'romantic',
        unlockMethod: 'level',
        unlockValue: 5,
        sortOrder: 2,
      },
      {
        name: 'Công viên hoàng hôn',
        description: 'Công viên yên bình lúc hoàng hôn',
        imageUrl: '/scenes/park-sunset.jpg',
        category: 'outdoor',
        ambiance: 'peaceful',
        unlockMethod: 'level',
        unlockValue: 10,
        sortOrder: 3,
      },
      {
        name: 'Bãi biển đêm',
        description: 'Bãi biển dưới ánh trăng và sao',
        imageUrl: '/scenes/beach-night.jpg',
        category: 'outdoor',
        ambiance: 'romantic',
        unlockMethod: 'purchase',
        priceGems: 50,
        sortOrder: 4,
      },
      {
        name: 'Vườn hoa anh đào',
        description: 'Vườn hoa anh đào nở rộ',
        imageUrl: '/scenes/sakura.jpg',
        category: 'outdoor',
        ambiance: 'peaceful',
        unlockMethod: 'purchase',
        priceGems: 100,
        sortOrder: 5,
      },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Created ${scenes.count} scenes`);

  // Create default quests
  const quests = await prisma.quest.createMany({
    data: [
      // Daily quests
      {
        title: 'Chào buổi sáng',
        description: 'Gửi tin nhắn chào buổi sáng cho người yêu',
        type: 'DAILY',
        category: 'daily',
        requirements: { action: 'send_message', count: 1 },
        rewardXp: 10,
        rewardCoins: 20,
        rewardAffection: 5,
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
        title: 'Tặng quà yêu thương',
        description: 'Tặng một món quà cho người yêu',
        type: 'DAILY',
        category: 'daily',
        requirements: { action: 'send_gift', count: 1 },
        rewardXp: 30,
        rewardCoins: 30,
        rewardAffection: 15,
        sortOrder: 3,
      },
      // Story quests
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
        description: 'Đạt cấp độ quan hệ "Quen biết"',
        type: 'STORY',
        category: 'story',
        requirements: { action: 'reach_stage', count: 1, target: 'ACQUAINTANCE' },
        rewardXp: 100,
        rewardCoins: 200,
        rewardGems: 20,
        sortOrder: 2,
      },
      {
        title: 'Người bạn thân',
        description: 'Đạt cấp độ quan hệ "Bạn thân"',
        type: 'STORY',
        category: 'story',
        requirements: { action: 'reach_stage', count: 1, target: 'CLOSE_FRIEND' },
        rewardXp: 200,
        rewardCoins: 500,
        rewardGems: 50,
        sortOrder: 3,
      },
      {
        title: 'Tình yêu đích thực',
        description: 'Đạt cấp độ quan hệ "Người yêu"',
        type: 'STORY',
        category: 'story',
        requirements: { action: 'reach_stage', count: 1, target: 'LOVER' },
        rewardXp: 500,
        rewardCoins: 1000,
        rewardGems: 100,
        sortOrder: 4,
      },
      // Weekly quests
      {
        title: 'Chuyên gia trò chuyện',
        description: 'Gửi 100 tin nhắn trong tuần',
        type: 'WEEKLY',
        category: 'weekly',
        requirements: { action: 'send_message', count: 100 },
        rewardXp: 100,
        rewardCoins: 200,
        rewardGems: 10,
        rewardAffection: 30,
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
        rewardGems: 15,
        rewardAffection: 50,
        sortOrder: 2,
      },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Created ${quests.count} quests`);

  // Create default gifts
  const gifts = await prisma.gift.createMany({
    data: [
      // Common gifts
      {
        name: 'Hoa hồng',
        description: 'Một bông hoa hồng tươi thắm',
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
        imageUrl: '/gifts/teddy-small.png',
        category: 'special',
        rarity: 'COMMON',
        priceCoins: 100,
        priceGems: 10,
        affectionBonus: 20,
        sortOrder: 3,
      },
      // Uncommon gifts
      {
        name: 'Bó hoa tulip',
        description: 'Bó hoa tulip rực rỡ',
        imageUrl: '/gifts/tulips.png',
        category: 'flower',
        rarity: 'UNCOMMON',
        priceCoins: 200,
        priceGems: 20,
        affectionBonus: 30,
        unlockLevel: 5,
        sortOrder: 4,
      },
      {
        name: 'Bánh kem',
        description: 'Bánh kem đặc biệt',
        imageUrl: '/gifts/cake.png',
        category: 'food',
        rarity: 'UNCOMMON',
        priceCoins: 250,
        priceGems: 25,
        affectionBonus: 35,
        unlockLevel: 5,
        sortOrder: 5,
      },
      // Rare gifts
      {
        name: 'Vòng tay bạc',
        description: 'Vòng tay bạc tinh tế',
        imageUrl: '/gifts/bracelet.png',
        category: 'jewelry',
        rarity: 'RARE',
        priceCoins: 500,
        priceGems: 50,
        affectionBonus: 50,
        unlockLevel: 10,
        sortOrder: 6,
      },
      {
        name: 'Bữa tối lãng mạn',
        description: 'Trải nghiệm bữa tối lãng mạn',
        imageUrl: '/gifts/dinner.png',
        category: 'experience',
        rarity: 'RARE',
        priceCoins: 600,
        priceGems: 60,
        affectionBonus: 60,
        unlockLevel: 10,
        sortOrder: 7,
      },
      // Epic gifts
      {
        name: 'Dây chuyền vàng',
        description: 'Dây chuyền vàng lấp lánh',
        imageUrl: '/gifts/necklace.png',
        category: 'jewelry',
        rarity: 'EPIC',
        priceCoins: 1000,
        priceGems: 100,
        affectionBonus: 80,
        unlockLevel: 15,
        sortOrder: 8,
      },
      {
        name: 'Chuyến du lịch',
        description: 'Chuyến du lịch hai người',
        imageUrl: '/gifts/travel.png',
        category: 'experience',
        rarity: 'EPIC',
        priceCoins: 1500,
        priceGems: 150,
        affectionBonus: 100,
        unlockLevel: 20,
        sortOrder: 9,
      },
      // Legendary gifts
      {
        name: 'Nhẫn kim cương',
        description: 'Nhẫn kim cương hoàn hảo',
        imageUrl: '/gifts/diamond-ring.png',
        category: 'jewelry',
        rarity: 'LEGENDARY',
        priceCoins: 5000,
        priceGems: 500,
        affectionBonus: 200,
        unlockLevel: 25,
        sortOrder: 10,
      },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Created ${gifts.count} gifts`);

  // Create AI prompt templates
  const templates = await prisma.aIPromptTemplate.createMany({
    data: [
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
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Created ${templates.count} AI templates`);

  // Create achievements
  const achievements = await prisma.achievement.createMany({
    data: [
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
        requirement: { action: 'reach_stage', count: 1 },
        rewardXp: 150,
        rewardCoins: 400,
        rewardGems: 25,
        points: 35,
      },
      {
        name: 'Tình yêu vĩnh cửu',
        description: 'Đạt mức quan hệ "Lover"',
        category: 'relationship',
        requirement: { action: 'reach_lover', count: 1 },
        rewardXp: 500,
        rewardCoins: 1000,
        rewardGems: 100,
        points: 100,
      },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Created ${achievements.count} achievements`);

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
