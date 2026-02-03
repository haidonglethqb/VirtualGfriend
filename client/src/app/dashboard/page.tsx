'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Heart, MessageCircle, Gift, Star, Target,
  Calendar, Sparkles, ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useCharacterStore } from '@/store/character-store';
import { formatNumber, getRelationshipLabel, getMoodEmoji } from '@/lib/utils';
import api from '@/services/api';

// Helper function to format occupation label
function getOccupationLabel(occupation: string): string {
  const labels: Record<string, string> = {
    student: 'Sinh viên',
    office_worker: 'Nhân viên văn phòng',
    teacher: 'Giáo viên',
    nurse: 'Y tá',
    artist: 'Nghệ sĩ',
    developer: 'Lập trình viên',
    sales: 'Nhân viên bán hàng',
    freelancer: 'Freelancer',
  };
  return labels[occupation] || occupation;
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
  const { character, fetchCharacter, createCharacter, isLoading: characterLoading, needsCreation } = useCharacterStore();
  const [greeting, setGreeting] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    messagesToday: 0,
    streak: 1,
    giftsGiven: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch daily quests
      const questsResponse = await api.get<DailyQuest[]>('/quests/daily');
      if (questsResponse.success) {
        setDailyQuests(questsResponse.data.slice(0, 3));
      }

      // Fetch chat history to count today's messages
      const chatResponse = await api.get<{ messages: Array<{ createdAt: string }> }>('/chat/history?limit=100');
      if (chatResponse.success) {
        const messages = chatResponse.data.messages || [];
        const today = new Date().toDateString();
        const todayMessages = messages.filter(
          (m) => new Date(m.createdAt).toDateString() === today
        );
        setStats((prev) => ({
          ...prev,
          messagesToday: todayMessages.length,
        }));
      }

      // Fetch gift history
      const giftResponse = await api.get<{ gifts?: unknown[] } | unknown[]>('/shop/history');
      if (giftResponse.success) {
        const data = giftResponse.data as { gifts?: unknown[] } | unknown[];
        const gifts = Array.isArray(data) ? data : (data.gifts || []);
        setStats((prev) => ({
          ...prev,
          giftsGiven: gifts.length,
        }));
      }

      // Fetch recent memories
      const memoriesResponse = await api.get<{ memories: Memory[] }>('/memories?limit=3');
      if (memoriesResponse.success) {
        setRecentMemories(memoriesResponse.data.memories?.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
    if (hour < 12) setGreeting('Chào buổi sáng');
    else if (hour < 18) setGreeting('Chào buổi chiều');
    else setGreeting('Chào buổi tối');

    // Update stats from user
    if (user) {
      setStats((prev) => ({
        ...prev,
        streak: user.streak || 1,
      }));
    }
  }, [isAuthenticated, router, fetchCharacter, fetchDashboardData, user]);

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
            Đang tải...
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
            {greeting}, <span className="text-love">{user.username || 'bạn'}!</span>
          </h1>
          <p className="text-[#ba9cab]">
            Người yêu ảo của bạn đang chờ đợi cuộc trò chuyện tiếp theo 💕
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
                  <div className="w-28 h-28 rounded-full bg-[#181114] p-1 shadow-xl border-4 border-[#271b21]">
                    <div className="w-full h-full rounded-full bg-[#271b21] flex items-center justify-center text-5xl">
                      {character?.gender === 'FEMALE' ? '😊' : '😎'}
                    </div>
                  </div>
                </div>
                {/* Mood indicator */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-[#181114]/60 backdrop-blur-sm text-sm border border-white/10">
                  {getMoodEmoji(character?.mood || 'NEUTRAL')} {character?.mood?.toLowerCase() || 'happy'}
                </div>
              </div>

              <div className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white">{character?.name || 'Người yêu của bạn'}</h2>
                  <p className="text-love">{getRelationshipLabel(character?.relationshipStage || 'STRANGER')}</p>

                  {/* Character Info */}
                  <div className="mt-3 flex items-center justify-center gap-4 text-sm text-[#ba9cab]">
                    <span>{character?.age || 22} tuổi</span>
                    <span>•</span>
                    <span className="capitalize">{getOccupationLabel(character?.occupation || 'student')}</span>
                  </div>
                </div>

                {/* Affection progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#ba9cab]">Độ thân mật</span>
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
                      Chat ngay
                    </button>
                  </Link>
                  <Link href="/shop" className="w-full">
                    <button className="w-full flex items-center justify-center gap-2 h-12 rounded-full bg-[#392830] hover:bg-[#392830]/80 text-white font-bold transition-all border border-[#392830]">
                      <Gift className="w-5 h-5" />
                      Tặng quà
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
                <h3 className="text-sm font-medium text-white/60">Thống kê</h3>
                <Link href="/analytics">
                  <span className="text-sm text-[#ba9cab] hover:text-love transition-colors">
                    Xem chi tiết →
                  </span>
                </Link>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <StatCard
                  icon={<MessageCircle className="w-5 h-5" />}
                  label="Tin nhắn hôm nay"
                  value={stats.messagesToday}
                  trend={`~ ${stats.messagesToday}`}
                />
                <StatCard
                  icon={<Calendar className="w-5 h-5" />}
                  label="Ngày liên tiếp"
                  value={stats.streak}
                  trend={`~ Ngày ${stats.streak}`}
                />
                <StatCard
                  icon={<Gift className="w-5 h-5" />}
                  label="Quà đã tặng"
                  value={stats.giftsGiven}
                  trend={`~ ${stats.giftsGiven} quà`}
                />
              </div>
            </motion.div>

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
                    Nhiệm vụ hàng ngày
                  </h3>
                  <Link href="/quests">
                    <button className="text-sm text-[#ba9cab] hover:text-love transition-colors">
                      Xem tất cả →
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
                      Chưa có nhiệm vụ nào
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
                    Khoảnh khắc gần đây
                  </h3>
                  <Link href="/memories">
                    <button className="text-sm text-[#ba9cab] hover:text-love transition-colors">
                      Xem album →
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
                      Trò chuyện nhiều hơn để tạo kỷ niệm đẹp!
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
