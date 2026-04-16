'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Check, Crown, Zap, Star, CircleDollarSign, Gem, PartyPopper, Loader2 } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { useLanguageStore } from '@/store/language-store';
import { useAuthStore } from '@/store/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('vgfriend-auth');
    if (stored) return JSON.parse(stored).state?.accessToken || null;
  } catch { /* noop */ }
  return null;
}

interface DailyReward {
  day: number;
  type: string;
  value: number;
}

interface DailyRewardStatus {
  currentDay: number;
  canClaim: boolean;
  lastClaimDay: number;
  rewards: DailyReward[];
}

interface ClaimResult {
  day: number;
  rewardType: string;
  value: number;
  bonusMultiplier: number;
}

const REWARD_LABELS: Record<string, string> = {
  coins: 'Xu',
  gems: 'Ngọc',
};

function RewardIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'gems') return <Gem className={className ?? 'w-6 h-6 text-cyan-400'} />;
  return <CircleDollarSign className={className ?? 'w-6 h-6 text-yellow-400'} />;
}

export default function DailyRewardsPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [lastClaim, setLastClaim] = useState<ClaimResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
    }
  }, [isAuthenticated]);

  async function fetchStatus() {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/daily-reward/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStatus(await res.json());
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/daily-reward/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLastClaim(data);
        fetchStatus();
      }
    } catch {
      // Silently fail
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Skeleton header */}
          <div className="text-center mb-8 space-y-3">
            <div className="h-9 w-56 bg-white/[0.06] rounded-xl mx-auto animate-pulse" />
            <div className="h-4 w-72 bg-white/[0.04] rounded-lg mx-auto animate-pulse" />
          </div>
          {/* Skeleton grid */}
          <div className="grid grid-cols-7 gap-3 mb-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 animate-pulse space-y-2">
                <div className="h-3 w-full bg-white/[0.06] rounded" />
                <div className="h-7 w-7 bg-white/[0.06] rounded-lg mx-auto" />
                <div className="h-4 w-3/4 bg-white/[0.06] rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with gradient banner */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative text-center mb-8 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-love/10 via-transparent to-purple-500/10 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(168,85,247,0.10),transparent_70%)] pointer-events-none" />
          <div className="relative px-6 py-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Gift className="w-8 h-8 text-love" />
              <h1 className="text-3xl font-bold">{isVi ? 'Thưởng Hàng Ngày' : 'Daily Rewards'}</h1>
            </div>
            <p className="text-gray-400">
              {isVi ? 'Đăng nhập mỗi ngày để nhận thưởng! VIP nhận nhiều hơn.' : 'Login daily to earn rewards! VIP gets more.'}
            </p>
          </div>
        </motion.div>

        {/* Claim Result Toast */}
        {lastClaim && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <PartyPopper className="w-5 h-5 text-green-300" />
              <p className="text-lg font-bold text-green-300">
                {isVi ? 'Đã nhận thưởng!' : 'Reward claimed!'}
              </p>
            </div>
            <p className="text-sm text-green-400 flex items-center justify-center gap-1.5">
              <RewardIcon
                type={lastClaim.rewardType}
                className={`w-4 h-4 ${lastClaim.rewardType === 'gems' ? 'text-cyan-400' : 'text-yellow-400'}`}
              />
              +{lastClaim.value.toLocaleString('vi-VN')} {REWARD_LABELS[lastClaim.rewardType]}
              {lastClaim.bonusMultiplier > 1 && (
                <span className="ml-1 text-amber-400">
                  (x{lastClaim.bonusMultiplier} VIP bonus!)
                </span>
              )}
            </p>
          </motion.div>
        )}

        {/* 7-Day Calendar Grid */}
        {status && (
          <>
            <div className="grid grid-cols-7 gap-3 mb-8">
              {status.rewards.map((reward, idx) => {
                const dayNum = idx + 1;
                const isCurrentDay = dayNum === status.currentDay;
                const isPastDay = dayNum < status.currentDay || (status.lastClaimDay >= dayNum && !status.canClaim);
                const isClaimable = isCurrentDay && status.canClaim;
                const isBigReward = dayNum === 7;

                return (
                  <motion.div
                    key={dayNum}
                    whileHover={isClaimable ? { scale: 1.06, transition: { duration: 0.15 } } : {}}
                    className={`relative rounded-2xl p-3 text-center border transition-all duration-200 ${
                      isClaimable
                        ? 'border-love/50 bg-gradient-to-br from-love/20 to-purple-500/10 shadow-lg shadow-love/20 cursor-pointer'
                        : isPastDay
                        ? 'border-green-500/30 bg-green-500/[0.06]'
                        : isBigReward
                        ? 'border-amber-500/25 bg-amber-500/[0.05]'
                        : 'border-white/[0.06] bg-white/[0.02]'
                    }`}
                    onClick={isClaimable ? handleClaim : undefined}
                  >
                    {/* Day label */}
                    <div className="text-[10px] text-gray-500 mb-1.5 font-medium">
                      {isVi ? 'Ngày' : 'Day'} {dayNum}
                    </div>

                    {/* Reward icon — SVG Lucide component */}
                    <div className="flex justify-center mb-1">
                      <RewardIcon
                        type={reward.type}
                        className={`w-6 h-6 ${
                          isPastDay
                            ? 'opacity-40'
                            : reward.type === 'gems'
                            ? 'text-cyan-400'
                            : 'text-yellow-400'
                        }`}
                      />
                    </div>

                    {/* Reward value */}
                    <div className={`text-xs font-bold ${isBigReward ? 'text-amber-400' : isPastDay ? 'text-gray-500' : 'text-white'}`}>
                      +{reward.value}
                    </div>

                    {/* Claimed checkmark */}
                    {isPastDay && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Pulse label for claimable */}
                    {isClaimable && (
                      <div className="mt-1.5 text-[10px] font-bold text-love animate-pulse">
                        {isVi ? 'Nhận!' : 'Claim!'}
                      </div>
                    )}

                    {/* Day-7 VIP badge */}
                    {isBigReward && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-[9px] font-bold text-white flex items-center gap-0.5 shadow-sm">
                          <Star className="w-2.5 h-2.5 fill-white" />
                          VIP
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Footer info */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                {isVi ? 'Đăng nhập liên tục để tiến tới ngày 7 với thưởng lớn!' : 'Login consecutively to reach Day 7 for big rewards!'}
              </p>

              {/* VIP Bonus Info */}
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500/10 to-love/10 border border-purple-500/20">
                <Crown className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-300">
                  {isVi ? 'VIP thưởng:' : 'VIP bonus:'}
                </span>
                <span className="flex items-center gap-1 text-xs text-purple-300">
                  <Zap className="w-3 h-3" /> Basic x1.2
                </span>
                <span className="flex items-center gap-1 text-xs text-purple-300">
                  <Zap className="w-3 h-3" /> Pro x1.5
                </span>
                <span className="flex items-center gap-1 text-xs text-amber-300">
                  <Star className="w-3 h-3" /> Ultimate x2.0
                </span>
              </div>

              {/* Claim CTA */}
              {status.canClaim && (
                <div className="mt-6">
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-love to-purple-500 text-white font-bold shadow-lg shadow-love/30 hover:shadow-love/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:scale-100"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isVi ? 'Đang nhận...' : 'Claiming...'}
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4" />
                        {isVi ? `Nhận thưởng ngày ${status.currentDay}` : `Claim Day ${status.currentDay} reward`}
                      </>
                    )}
                  </button>
                </div>
              )}

              {!status.canClaim && status.lastClaimDay > 0 && (
                <p className="text-sm text-gray-500 mt-4">
                  {isVi ? 'Bạn đã nhận thưởng hôm nay. Quay lại ngày mai!' : 'Already claimed today. Come back tomorrow!'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
