'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Target, Star, Clock, CheckCircle, Gift,
  Calendar, TrendingUp, Zap, Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/app-layout';
import { AdBanner } from '@/components/ads/ad-banner';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

const QUESTS_I18N = {
  vi: {
    title: 'Nhiệm vụ',
    subtitle: 'Hoàn thành nhiệm vụ để nhận thưởng',
    daily: 'Hàng ngày',
    weekly: 'Hàng tuần',
    achievements: 'Thành tích',
    error: 'Lỗi',
    loadError: 'Không thể tải danh sách nhiệm vụ',
    startQuest: '🎯 Bắt đầu nhiệm vụ!',
    completeQuest: 'Hoàn thành nhiệm vụ để nhận thưởng',
    startError: 'Không thể bắt đầu nhiệm vụ',
    claimSuccess: '🎉 Nhận thưởng thành công!',
    claimError: 'Không thể nhận thưởng',
    coins: 'xu',
    gems: 'gem',
    start: 'Bắt đầu',
    starting: 'Đang bắt đầu...',
    completed: 'Hoàn thành',
    claim: 'Nhận thưởng',
    claiming: 'Đang nhận...',
    claimed: 'Đã nhận',
    inProgress: 'Đang thực hiện',
    noQuests: 'Không có nhiệm vụ nào',
    rewards: 'Phần thưởng',
    progress: 'Tiến độ',
  },
  en: {
    title: 'Quests',
    subtitle: 'Complete quests to earn rewards',
    daily: 'Daily',
    weekly: 'Weekly',
    achievements: 'Achievements',
    error: 'Error',
    loadError: 'Cannot load quest list',
    startQuest: '🎯 Quest Started!',
    completeQuest: 'Complete quest to earn rewards',
    startError: 'Cannot start quest',
    claimSuccess: '🎉 Reward Claimed!',
    claimError: 'Cannot claim reward',
    coins: 'coins',
    gems: 'gems',
    start: 'Start',
    starting: 'Starting...',
    completed: 'Completed',
    claim: 'Claim',
    claiming: 'Claiming...',
    claimed: 'Claimed',
    inProgress: 'In Progress',
    noQuests: 'No quests available',
    rewards: 'Rewards',
    progress: 'Progress',
  },
} as const;

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'DAILY' | 'WEEKLY' | 'ACHIEVEMENT' | 'STORY' | 'EVENT';
  category: string;
  requirements: {
    count: number;
    action: string;
  };
  rewardXp: number;
  rewardCoins: number;
  rewardGems: number;
  rewardAffection: number;
  target: number;
  userProgress: {
    id: string;
    progress: number;
    maxProgress: number;
    completed: boolean;
    claimed: boolean;
    completedAt?: string;
    claimedAt?: string;
  } | null;
}

export default function QuestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, user, setUser } = useAuthStore();
  const { language } = useLanguageStore();
  const t = QUESTS_I18N[language];
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    fetchQuests();
  }, [isAuthenticated, router]);

  const fetchQuests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<Quest[]>('/quests/all');
      if (response.success) {
        setQuests(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
      toast({
        title: t.error,
        description: t.loadError,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuest = async (questId: string) => {
    try {
      setStartingId(questId);
      const response = await api.post<Quest>(`/quests/start/${questId}`);
      
      if (response.success) {
        // Refetch quests to get updated state
        await fetchQuests();
        toast({
          title: t.startQuest,
          description: t.completeQuest,
        });
      }
    } catch (error: unknown) {
      console.error('Failed to start quest:', error);
      const errorMessage = error instanceof Error ? error.message : t.startError;
      toast({
        title: t.error,
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setStartingId(null);
    }
  };

  const handleClaimReward = async (questId: string) => {
    try {
      setClaimingId(questId);
      const response = await api.post<{ rewards: { coins: number; gems: number } }>(`/quests/claim/${questId}`);
      
      if (response.success) {
        const result = response.data;
        
        // Refetch quests to get updated state
        await fetchQuests();
        
        // Update user coins/gems
        if (user) {
          setUser({
            ...user,
            coins: (user.coins || 0) + (result.rewards?.coins || 0),
            gems: (user.gems || 0) + (result.rewards?.gems || 0),
          });
        }
        
        toast({
          title: t.claimSuccess,
          description: `+${result.rewards?.coins || 0} ${t.coins}${result.rewards?.gems ? `, +${result.rewards.gems} ${t.gems}` : ''}`,
        });
      }
    } catch (error: unknown) {
      console.error('Failed to claim reward:', error);
      const errorMessage = error instanceof Error ? error.message : t.claimError;
      toast({
        title: t.error,
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setClaimingId(null);
    }
  };

  const filteredQuests = quests.filter((q) => {
    if (activeTab === 'daily') return q.type === 'DAILY';
    if (activeTab === 'weekly') return q.type === 'WEEKLY';
    if (activeTab === 'achievement') return q.type === 'ACHIEVEMENT' || q.type === 'STORY' || q.type === 'EVENT';
    return true;
  });

  const dailyQuests = quests.filter((q) => q.type === 'DAILY');
  const completedToday = dailyQuests.filter((q) => q.userProgress?.completed).length;
  const totalDaily = dailyQuests.length;

  // Calculate stats from real data
  const totalCompleted = quests.filter((q) => q.userProgress?.completed).length;
  const totalCoinsEarned = quests
    .filter((q) => q.userProgress?.claimed)
    .reduce((sum, q) => sum + q.rewardCoins, 0);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-love" />
            {t.title}
          </h1>
          <p className="text-sm text-[#ba9cab] mt-1">
            {t.subtitle}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-love" />
          </div>
        ) : (
            <>
          {/* Progress overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-love to-pink-600 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{t.progress} {language === 'vi' ? 'hôm nay' : 'today'}</h2>
                    <p className="text-white/80 text-sm">
                      {completedToday}/{totalDaily} {language === 'vi' ? 'nhiệm vụ hoàn thành' : 'quests completed'}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {totalDaily > 0 ? Math.round((completedToday / totalDaily) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-white h-full rounded-full transition-all"
                    style={{ width: `${totalDaily > 0 ? (completedToday / totalDaily) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4"
          >
            <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-love" />
              <p className="text-lg font-bold">{user?.streak || 1}</p>
              <p className="text-xs text-[#ba9cab]">{t.streak}</p>
            </div>
            <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-4 text-center">
              <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-lg font-bold">{totalCompleted}</p>
              <p className="text-xs text-[#ba9cab]">{t.completed}</p>
            </div>
            <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-lg font-bold">+{totalCoinsEarned}</p>
              <p className="text-xs text-[#ba9cab]">{language === 'vi' ? 'Xu đã nhận' : 'Coins Earned'}</p>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="daily">{t.daily}</TabsTrigger>
                <TabsTrigger value="weekly">{t.weekly}</TabsTrigger>
                <TabsTrigger value="achievement">{t.achievements}</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4 space-y-3">
                {filteredQuests.map((quest, index) => (
                  <motion.div
                    key={quest.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <QuestCard
                      quest={quest}
                      onStart={handleStartQuest}
                      onClaim={handleClaimReward}
                      isClaiming={claimingId === quest.id}
                      isStarting={startingId === quest.id}
                      t={t}
                    />
                  </motion.div>
                ))}

                {filteredQuests.length === 0 && (
                  <div className="text-center py-12 text-[#ba9cab]">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t.noQuests}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Ad Banner for free users */}
          <AdBanner placement="quests-bottom" />
            </>
          )}
      </div>
    </AppLayout>
  );
}

function QuestCard({
  quest,
  onStart,
  onClaim,
  isClaiming,
  isStarting,
  t
}: {
  quest: Quest;
  onStart: (questId: string) => void;
  onClaim: (questId: string) => void;
  isClaiming: boolean;
  isStarting: boolean;
  t: typeof QUESTS_I18N['vi'];
}) {
  const progress = quest.userProgress?.progress || 0;
  const target = quest.target || 1;
  const progressPercent = target > 0 ? (progress / target) * 100 : 0;
  const isStarted = quest.userProgress !== null;
  const isCompleted = quest.userProgress?.completed || false;
  const isClaimed = quest.userProgress?.claimed || false;

  return (
    <div className={`rounded-2xl bg-[#271b21] border ${isCompleted ? 'border-love/30' : 'border-[#392830]'} p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isCompleted && !isClaimed ? (
              <CheckCircle className="w-5 h-5 text-love fill-love/20" />
            ) : isClaimed ? (
              <Gift className="w-5 h-5 text-green-400" />
            ) : isStarted ? (
              <Clock className="w-5 h-5 text-yellow-500" />
            ) : (
              <Target className="w-5 h-5 text-[#ba9cab]" />
            )}
            <h3 className={`font-medium ${isClaimed ? 'text-[#ba9cab] line-through' : ''}`}>
              {quest.title}
            </h3>
          </div>
          <p className="text-sm text-[#ba9cab] ml-7">{quest.description}</p>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-sm font-bold">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            {quest.rewardCoins}
          </div>
          {quest.rewardAffection > 0 && (
            <div className="flex items-center gap-1 text-xs text-love">
              +{quest.rewardAffection} ❤️
            </div>
          )}
        </div>
      </div>

      {!isClaimed && (
        <div className="space-y-2">
          {isStarted ? (
            <>
              <div className="flex items-center justify-between text-xs text-[#ba9cab]">
                <span>{t.progress}</span>
                <span>{progress}/{target}</span>
              </div>
              <div className="w-full bg-[#392830] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-love to-pink-400 h-full rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {isCompleted && (
                <button
                  className="w-full h-10 mt-2 rounded-full bg-love hover:bg-love/90 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  onClick={() => onClaim(quest.id)}
                  disabled={isClaiming}
                >
                  {isClaiming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Gift className="w-4 h-4" />
                  )}
                  {isClaiming ? t.claiming : t.claim}
                </button>
              )}
            </>
          ) : (
            <button
              className="w-full h-10 mt-2 rounded-full bg-[#392830] hover:bg-[#392830]/80 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-[#392830]"
              onClick={() => onStart(quest.id)}
              disabled={isStarting}
            >
              {isStarting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isStarting ? t.starting : t.start}
            </button>
          )}
        </div>
      )}

      {isClaimed && (
        <p className="text-center text-sm text-green-400 mt-2">
          ✓ {t.claimed}
        </p>
      )}
    </div>
  );
}
