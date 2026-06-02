'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  CheckCircle,
  Coins,
  Gem,
  Gift,
  Heart,
  Loader2,
  Lock,
  Play,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { EmojiSvgIcon } from '@/components/ui/emoji-svg-icon';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { arcApi, type ArcDetail, type ArcQuest } from '@/services/api';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';

function progressPercent(quest: ArcQuest) {
  const current = quest.userProgress?.progress ?? 0;
  const max = quest.userProgress?.maxProgress || quest.target || 1;
  return Math.min(100, Math.round((current / max) * 100));
}

function rewardText(quest: ArcQuest, isVi: boolean) {
  const parts = [
    quest.rewardCoins > 0 ? `${quest.rewardCoins} ${isVi ? 'xu' : 'coins'}` : null,
    quest.rewardGems > 0 ? `${quest.rewardGems} gems` : null,
    quest.rewardXp > 0 ? `${quest.rewardXp} XP` : null,
    quest.rewardAffection > 0 ? `${quest.rewardAffection} affection` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

export default function ArcDetailPage() {
  const params = useParams<{ arcId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const [arc, setArc] = useState<ArcDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const fetchArc = useCallback(async () => {
    try {
      setLoading(true);
      const response = await arcApi.getArcDetail(params.arcId);
      setArc(response.data);
    } catch (error) {
      toast({
        title: isVi ? 'Lỗi' : 'Error',
        description: error instanceof Error ? error.message : isVi ? 'Không thể tải arc' : 'Failed to load arc',
        variant: 'destructive',
      });
      router.push('/arc');
    } finally {
      setLoading(false);
    }
  }, [isVi, params.arcId, router, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    void fetchArc();
  }, [fetchArc, isAuthenticated, router]);

  const finalQuest = useMemo(
    () => arc?.quests.find((quest) => quest.id === arc.finalQuestId) ?? null,
    [arc]
  );

  const canClaimFinalQuest =
    finalQuest?.userProgress?.status === 'COMPLETED' && finalQuest.isArcFinalQuest;
  const canClaimArc =
    arc?.canClaimArc || (finalQuest?.userProgress?.status === 'CLAIMED' && !arc?.completedAt);

  const handleStartArc = async () => {
    try {
      setActionLoading('start');
      const response = await arcApi.startArc(params.arcId);
      setArc(response.data);
      toast({
        title: isVi ? 'Đã bắt đầu arc' : 'Arc started',
        description: isVi ? 'Tất cả nhiệm vụ trong arc đã sẵn sàng.' : 'All arc quests are ready.',
      });
    } catch (error) {
      toast({
        title: isVi ? 'Lỗi' : 'Error',
        description: error instanceof Error ? error.message : isVi ? 'Không thể bắt đầu arc' : 'Failed to start arc',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClaimQuest = async (questId: string) => {
    try {
      setActionLoading(questId);
      await arcApi.claimArcQuestReward(params.arcId, questId);
      await fetchArc();
      toast({
        title: isVi ? 'Đã nhận thưởng' : 'Reward claimed',
        description: isVi ? 'Phần thưởng nhiệm vụ đã được cộng.' : 'Quest rewards were added.',
      });
    } catch (error) {
      toast({
        title: isVi ? 'Lỗi' : 'Error',
        description: error instanceof Error ? error.message : isVi ? 'Không thể nhận thưởng' : 'Failed to claim reward',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClaimArc = async () => {
    try {
      setActionLoading('arc');
      await arcApi.claimArcCompletion(params.arcId);
      await fetchArc();
      setCelebrating(true);
      toast({
        title: isVi ? 'Arc hoàn thành' : 'Arc completed',
        description: isVi ? 'Danh hiệu và khung cảnh mới đã được mở khóa nếu có.' : 'Title and scene rewards were unlocked when available.',
      });
    } catch (error) {
      toast({
        title: isVi ? 'Lỗi' : 'Error',
        description: error instanceof Error ? error.message : isVi ? 'Không thể nhận thưởng arc' : 'Failed to claim arc reward',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || !arc) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
          <div className="h-40 animate-pulse rounded-2xl bg-white/[0.05]" />
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl bg-white/[0.05]" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Button asChild variant="ghost" className="mb-5">
          <Link href="/arc" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {isVi ? 'Hành trình' : 'Arcs'}
          </Link>
        </Button>

        <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent">
          <div className="p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-love/10">
                <EmojiSvgIcon emoji={arc.iconEmoji} className="h-11 w-11" />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">{arc.name}</h1>
                  {arc.completedAt && <CheckCircle className="h-6 w-6 text-green-400" />}
                </div>
                <p className="text-sm text-gray-400">{arc.description}</p>
              </div>
              <div className="text-left md:text-right">
                <div className="text-3xl font-bold text-white">{arc.completionPercent}%</div>
                <div className="text-xs text-gray-500">
                  {arc.completedQuests}/{arc.totalQuests} {isVi ? 'nhiệm vụ' : 'quests'}
                </div>
              </div>
            </div>
            <Progress value={arc.completionPercent} className="mt-6 h-2" />
          </div>
        </div>

        {celebrating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-amber-300" />
              <span className="font-semibold">{isVi ? 'Hành trình đã tiến thêm một chương.' : 'Your journey advanced to the next chapter.'}</span>
            </div>
          </motion.div>
        )}

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-300" />
            <h2 className="text-lg font-bold text-white">{isVi ? 'Thưởng hoàn thành Arc' : 'Arc Completion Rewards'}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <RewardItem icon={<Coins className="h-4 w-4" />} label={`${arc.rewards.coins} ${isVi ? 'xu' : 'coins'}`} />
            <RewardItem icon={<Gem className="h-4 w-4" />} label={`${arc.rewards.gems} gems`} />
            <RewardItem icon={<Star className="h-4 w-4" />} label={`${arc.rewards.xp} XP`} />
            <RewardItem icon={<Heart className="h-4 w-4" />} label={`${arc.rewards.affection} affection`} />
            {arc.rewards.titleName && <RewardItem icon={<Award className="h-4 w-4" />} label={arc.rewards.titleName} />}
            {arc.rewards.sceneName && <RewardItem icon={<Gift className="h-4 w-4" />} label={arc.rewards.sceneName} />}
          </div>
        </section>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-white">{isVi ? 'Nhiệm vụ Arc' : 'Arc Quests'}</h2>
          {!arc.isStarted && (
            <Button onClick={handleStartArc} disabled={actionLoading === 'start'} className="gap-2">
              {actionLoading === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isVi ? 'Bắt đầu Arc' : 'Start Arc'}
            </Button>
          )}
          {arc.isStarted && canClaimArc && (
            <Button onClick={handleClaimArc} disabled={actionLoading === 'arc'} className="gap-2">
              {actionLoading === 'arc' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
              {isVi ? 'Nhận thưởng Arc' : 'Claim Arc Reward'}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {arc.quests.map((quest, index) => {
            const started = !!quest.userProgress;
            const claimed = quest.userProgress?.status === 'CLAIMED';
            const completed = quest.userProgress?.status === 'COMPLETED' || claimed;
            const canClaim = quest.isArcFinalQuest && quest.userProgress?.status === 'COMPLETED';
            const percent = progressPercent(quest);

            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border ${
                    claimed ? 'border-green-400/40 bg-green-400/10 text-green-300'
                      : completed ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
                        : started ? 'border-love/40 bg-love/10 text-love'
                          : 'border-white/10 bg-gray-900 text-gray-500'
                  }`}>
                    {claimed ? <CheckCircle className="h-5 w-5" /> : started ? index + 1 : <Lock className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{quest.title}</h3>
                      {quest.isArcFinalQuest && (
                        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-xs text-amber-200">
                          {isVi ? 'Cuối arc' : 'Final'}
                        </span>
                      )}
                    </div>
                    <p className="mb-3 text-sm text-gray-400">{quest.description}</p>
                    <Progress value={percent} className="h-2" />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                      <span>
                        {quest.userProgress?.progress ?? 0}/{quest.userProgress?.maxProgress ?? quest.target}
                      </span>
                      <span>{rewardText(quest, isVi)}</span>
                    </div>
                  </div>

                  <div className="sm:w-36">
                    {canClaim ? (
                      <Button
                        onClick={() => handleClaimQuest(quest.id)}
                        disabled={actionLoading === quest.id}
                        className="w-full gap-2"
                      >
                        {actionLoading === quest.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                        {isVi ? 'Nhận' : 'Claim'}
                      </Button>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-xs text-gray-400">
                        {claimed
                          ? isVi ? 'Đã nhận' : 'Claimed'
                          : completed
                            ? isVi ? 'Hoàn thành' : 'Completed'
                            : started
                              ? isVi ? 'Đang làm' : 'In progress'
                              : isVi ? 'Chưa bắt đầu' : 'Not started'}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

function RewardItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-gray-200">
      <span className="text-amber-300">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}
