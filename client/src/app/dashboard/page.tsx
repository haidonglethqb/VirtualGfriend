'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Heart, MessageCircle, Gift, Star, Target,
  Calendar, Sparkles, ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import AppLayout from '@/components/layout/app-layout';
import { AdBanner } from '@/components/ads/ad-banner';
import { useAuthStore } from '@/store/auth-store';
import { useCharacterStore } from '@/store/character-store';
import { useLanguageStore } from '@/store/language-store';
import { formatNumber, getRelationshipLabel, getMoodEmoji } from '@/lib/utils';
import api from '@/services/api';

const DASHBOARD_I18N = {
  vi: {
    occupations: {
      student: 'Sinh viên',
      office_worker: 'Nhân viên văn phòng',
      teacher: 'Giáo viên',
      nurse: 'Y tá',
      artist: 'Nghệ sĩ',
      developer: 'Lập trình viên',
      sales: 'Nhân viên bán hàng',
      freelancer: 'Freelancer',
    },
    greetings: {
      morning: 'Chào buổi sáng',
      afternoon: 'Chào buổi chiều',
      evening: 'Chào buổi tối',
    },
    loading: 'Đang tải...',
    subtitle: 'Người yêu ảo của bạn đang chờ đợi cuộc trò chuyện tiếp theo 💕',
    characterName: 'Người yêu của bạn',
    age: 'tuổi',
    affection: 'Độ thân mật',
    chatNow: 'Chat ngay',
    giveGift: 'Tặng quà',
    stats: 'Thống kê',
    viewDetails: 'Xem chi tiết →',
    messagesToday: 'Tin nhắn hôm nay',
    streak: 'Ngày liên tiếp',
    giftsGiven: 'Quà đã tặng',
    day: 'Ngày',
    gifts: 'quà',
    dailyQuests: 'Nhiệm vụ hàng ngày',
    viewAll: 'Xem tất cả →',
    noQuests: 'Chưa có nhiệm vụ nào',
    recentMoments: 'Khoảnh khắc gần đây',
    viewAlbum: 'Xem album →',
    createMemories: 'Trò chuyện nhiều hơn để tạo kỷ niệm đẹp!',
  },
  en: {
    occupations: {
      student: 'Student',
      office_worker: 'Office Worker',
      teacher: 'Teacher',
      nurse: 'Nurse',
      artist: 'Artist',
      developer: 'Developer',
      sales: 'Sales',
      freelancer: 'Freelancer',
    },
    greetings: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    loading: 'Loading...',
    subtitle: 'Your virtual companion is waiting for the next conversation 💕',
    characterName: 'Your Companion',
    age: 'years old',
    affection: 'Affection',
    chatNow: 'Chat Now',
    giveGift: 'Give Gift',
    stats: 'Statistics',
    viewDetails: 'View Details →',
    messagesToday: 'Messages Today',
    streak: 'Day Streak',
    giftsGiven: 'Gifts Given',
    day: 'Day',
    gifts: 'gifts',
    dailyQuests: 'Daily Quests',
    viewAll: 'View All →',
    noQuests: 'No quests yet',
    recentMoments: 'Recent Moments',
    viewAlbum: 'View Album →',
    createMemories: 'Chat more to create beautiful memories!',
  },
} as const;

// Helper function to format occupation label
function getOccupationLabel(occupation: string, language: 'vi' | 'en'): string {
  const labels = DASHBOARD_I18N[language].occupations;
  return labels[occupation as keyof typeof labels] || occupation;
}


interface DailyQuest {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  requirements: {
    count: number;
    action: string;
  };
  rewardXp: number;
  rewardCoins: number;
  rewardGems: number;
  rewardAffection: number;
  userProgress: {
    id: string;
    progress: number;
    completed: boolean;
    claimed: boolean;
  } | null;
}

interface DashboardStats {
  messagesToday: number;
  streak: number;
  giftsGiven: number;
}

interface Memory {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { character, fetchCharacter, isLoading: characterLoading, needsCreation } = useCharacterStore();
  const { language } = useLanguageStore();
  const t = DASHBOARD_I18N[language];
  const [greeting, setGreeting] = useState('');
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    messagesToday: 0,
    streak: 1,
    giftsGiven: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    // Fetch all dashboard data in parallel for faster load
    const [questsResult, chatResult, giftResult, memoriesResult] = await Promise.allSettled([
      api.get<DailyQuest[]>('/quests/daily'),
      api.get<{ messages: Array<{ createdAt: string }> }>('/chat/history?limit=100'),
      api.get<{ items: unknown[]; total: number }>('/shop/history'),
      api.get<{ items: Memory[] }>('/memories?limit=3'),
    ]);

    if (questsResult.status === 'fulfilled' && questsResult.value.success) {
      setDailyQuests(questsResult.value.data.slice(0, 3));
    }

    if (chatResult.status === 'fulfilled' && chatResult.value.success) {
      const messages = chatResult.value.data.messages || [];
      const today = new Date().toDateString();
      const todayMessages = messages.filter(
        (m) => new Date(m.createdAt).toDateString() === today
      );
      setStats((prev) => ({ ...prev, messagesToday: todayMessages.length }));
    }

    if (giftResult.status === 'fulfilled' && giftResult.value.success) {
      setStats((prev) => ({ ...prev, giftsGiven: giftResult.value.data.total || 0 }));
    }

    if (memoriesResult.status === 'fulfilled' && memoriesResult.value.success) {
      setRecentMemories(memoriesResult.value.data.items?.slice(0, 3) || []);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    fetchCharacter();
    fetchDashboardData();

    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t.greetings.morning);
    else if (hour < 18) setGreeting(t.greetings.afternoon);
    else setGreeting(t.greetings.evening);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, router]);

  // Update streak separately when user changes — no need to refetch all data
  useEffect(() => {
    if (user) {
      setStats((prev) => ({ ...prev, streak: user.streak || 1 }));
    }
  }, [user?.streak]);

  // Redirect to onboarding if no character
  useEffect(() => {
    if (needsCreation && !characterLoading && user) {
      router.push('/onboarding');
    }
  }, [needsCreation, characterLoading, user, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  // Show loading while fetching character
  if (characterLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181114]">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <div className="w-20 h-20 rounded-full bg-love shadow-[0_0_30px_rgba(244,37,140,0.5)] mx-auto" />
          </div>
          <p className="text-[#ba9cab]">
            {t.loading}
          </p>
        </div>
      </div>
    );
  }

  const affectionPercentage = character ? (character.affection / 1000) * 100 : 0;

  return (
    <AppLayout>
      {/* Main Content */}
      <div className="space-y-6 pb-8">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">
            {greeting}, <span className="text-love">{user.username || (language === 'vi' ? 'bạn' : 'you')}!</span>
          </h1>
          <p className="text-[#ba9cab]">
            {t.subtitle}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Character Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="relative overflow-hidden rounded-2xl bg-[#271b21] border border-[#392830]">
              {/* Character Header with gradient */}
              <div className="relative h-48 bg-gradient-to-br from-love/80 via-love/60 to-purple-600/60">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full bg-[#181114] p-1 shadow-xl border-4 border-[#271b21] overflow-hidden">
                    {character?.avatarUrl ? (
                      <Image
                        src={character.avatarUrl}
                        alt={character.name || 'Avatar'}
                        width={112}
                        height={112}
                        className="w-full h-full rounded-full object-cover"
                        priority
                        sizes="112px"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#271b21] flex items-center justify-center text-5xl">
                        {character?.name?.[0]?.toUpperCase() || '💕'}
                      </div>
                    )}
                  </div>
                </div>
                {/* Mood indicator */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-[#181114]/60 backdrop-blur-sm text-sm border border-white/10">
                  {getMoodEmoji(character?.mood || 'neutral')} {character?.mood || 'happy'}
                </div>
              </div>

              <div className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white">{character?.name || t.characterName}</h2>
                  <p className="text-love">{getRelationshipLabel(character?.relationshipStage || 'STRANGER')}</p>

                  {/* Character Info */}
                  <div className="mt-3 flex items-center justify-center gap-4 text-sm text-[#ba9cab]">
                    <span>{character?.age || 22} {t.age}</span>
                    <span>•</span>
                    <span className="capitalize">{getOccupationLabel(character?.occupation || 'student', language)}</span>
                  </div>
                </div>

                {/* Affection progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#ba9cab]">{t.affection}</span>
                    <span className="font-bold flex items-center gap-1 text-love">
                      <Heart className="w-4 h-4 fill-love" />
                      {character?.affection || 0}
                    </span>
                  </div>
                  <div className="w-full bg-[#392830] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-love to-pink-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(affectionPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/chat" className="w-full">
                    <button className="w-full flex items-center justify-center gap-2 h-12 rounded-full bg-love hover:bg-love/90 text-white font-bold transition-all shadow-[0_0_20px_rgba(244,37,140,0.3)]">
                      <MessageCircle className="w-5 h-5" />
                      {t.chatNow}
                    </button>
                  </Link>
                  <Link href="/shop" className="w-full">
                    <button className="w-full flex items-center justify-center gap-2 h-12 rounded-full bg-[#392830] hover:bg-[#392830]/80 text-white font-bold transition-all border border-[#392830]">
                      <Gift className="w-5 h-5" />
                      {t.giveGift}
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white/60">{t.stats}</h3>
                <Link href="/analytics">
                  <span className="text-sm text-[#ba9cab] hover:text-love transition-colors">
                    {t.viewDetails}
                  </span>
                </Link>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <StatCard
                  icon={<MessageCircle className="w-5 h-5" />}
                  label={t.messagesToday}
                  value={stats.messagesToday}
                  trend={`~ ${stats.messagesToday}`}
                />
                <StatCard
                  icon={<Calendar className="w-5 h-5" />}
                  label={t.streak}
                  value={stats.streak}
                  trend={`~ ${t.day} ${stats.streak}`}
                />
                <StatCard
                  icon={<Gift className="w-5 h-5" />}
                  label={t.giftsGiven}
                  value={stats.giftsGiven}
                  trend={`~ ${stats.giftsGiven} ${t.gifts}`}
                />
              </div>
            </motion.div>

            {/* Ad Banner for free users */}
            <AdBanner placement="dashboard-bottom" />

            {/* Daily Quests */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <Target className="w-5 h-5 text-love" />
                    {t.dailyQuests}
                  </h3>
                  <Link href="/quests">
                    <button className="text-sm text-[#ba9cab] hover:text-love transition-colors">
                      {t.viewAll}
                    </button>
                  </Link>
                </div>

                <div className="space-y-4">
                  {dailyQuests.length > 0 ? (
                    dailyQuests.map((dq) => {
                      const target = dq.requirements?.count || 1;
                      const progress = dq.userProgress?.progress || 0;
                      const progressPercent = target > 0 ? Math.round((progress / target) * 100) : 0;
                      return (
                        <QuestItem
                          key={dq.id}
                          title={dq.title}
                          description={dq.description}
                          progress={Math.min(progressPercent, 100)}
                          reward={dq.rewardCoins}
                          completed={dq.userProgress?.completed || false}
                        />
                      );
                    })
                  ) : (
                    <p className="text-center text-[#ba9cab] py-4">
                      {t.noQuests}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Recent Memories */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <Sparkles className="w-5 h-5 text-love" />
                    {t.recentMoments}
                  </h3>
                  <Link href="/memories">
                    <button className="text-sm text-[#ba9cab] hover:text-love transition-colors">
                      {t.viewAlbum}
                    </button>
                  </Link>
                </div>

                {recentMemories.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {recentMemories.map((memory) => (
                      <Link href="/memories" key={memory.id}>
                        <div className="aspect-square rounded-xl bg-[#392830] flex items-center justify-center cursor-pointer hover:bg-[#392830]/80 transition-colors group">
                          <div className="text-center p-3">
                            <div className="text-3xl mb-2">
                              {memory.type === 'GIFT' ? '🎁' : memory.type === 'MILESTONE' ? '🏆' : '💬'}
                            </div>
                            <p className="text-xs text-[#ba9cab] line-clamp-2 group-hover:text-white transition-colors">
                              {memory.title}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-xl bg-[#392830]/50 flex items-center justify-center"
                        >
                          <ImageIcon className="w-8 h-8 text-[#ba9cab]/30" />
                        </div>
                      ))}
                    </div>
                    <p className="text-center text-[#ba9cab] text-sm mt-4">
                      {t.createMemories}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend: string;
}) {
  return (
    <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-love to-pink-600 flex items-center justify-center text-white shadow-lg">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-[#ba9cab]">{label}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-green-400">
        {trend}
      </div>
    </div>
  );
}

function QuestItem({
  title,
  description,
  progress,
  reward,
  completed
}: {
  title: string;
  description: string;
  progress: number;
  reward: number;
  completed?: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl ${completed ? 'bg-love/10 border border-love/20' : 'bg-[#392830]/30'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className={`font-medium ${completed ? 'text-love' : 'text-white'}`}>
            {completed && '✓ '}{title}
          </h4>
          <p className="text-sm text-[#ba9cab]">{description}</p>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold text-yellow-500">
          <Star className="w-4 h-4 fill-yellow-500" />
          {reward}
        </div>
      </div>
      {!completed && (
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 bg-[#392830] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-love to-pink-400 h-full rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-[#ba9cab]">{progress}%</span>
        </div>
      )}
    </div>
  );
}
