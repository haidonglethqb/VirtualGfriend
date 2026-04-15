'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Calendar, Check, Crown, Zap, Star } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { useLanguageStore } from '@/store/language-store';
import { useAuthStore } from '@/store/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

const REWARD_ICONS: Record<string, string> = {
  coins: '🪙',
  gems: '💎',
};

const REWARD_LABELS: Record<string, string> = {
  coins: 'Xu',
  gems: 'Ngọc',
};

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
      const token = localStorage.getItem('accessToken');
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
      const token = localStorage.getItem('accessToken');
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
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin text-love">
            <Calendar className="w-8 h-8" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{isVi ? 'Thưởng Hàng Ngày' : 'Daily Rewards'}</h1>
          <p className="text-gray-400">
            {isVi ? 'Đăng nhập mỗi ngày để nhận thưởng! VIP nhận nhiều hơn.' : 'Login daily to earn rewards! VIP gets more.'}
          </p>
        </motion.div>

        {/* Claim Result Toast */}
        {lastClaim && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-center"
          >
            <p className="text-lg font-bold text-green-300">
              🎉 {isVi ? 'Đã nhận thưởng!' : 'Reward claimed!'}
            </p>
            <p className="text-sm text-green-400">
              {REWARD_ICONS[lastClaim.rewardType]} +{lastClaim.value.toLocaleString('vi-VN')} {REWARD_LABELS[lastClaim.rewardType]}
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
                    whileHover={isClaimable ? { scale: 1.05 } : {}}
                    className={`relative rounded-2xl p-4 text-center border transition-all ${
                      isClaimable
                        ? 'border-love/50 bg-gradient-to-br from-love/20 to-purple-500/10 shadow-lg shadow-love/20 cursor-pointer'
                        : isPastDay
                        ? 'border-green-500/30 bg-green-500/5'
                        : isBigReward
                        ? 'border-amber-500/20 bg-amber-500/5'
                        : 'border-white/5 bg-white/[0.02]'
                    }`}
                    onClick={isClaimable ? handleClaim : undefined}
                  >
                    {/* Day number */}
                    <div className="text-xs text-gray-500 mb-2">{isVi ? 'Ngày' : 'Day'} {dayNum}</div>

                    {/* Reward icon */}
                    <div className="text-2xl mb-1">{REWARD_ICONS[reward.type]}</div>

                    {/* Reward value */}
                    <div className={`text-sm font-bold ${isBigReward ? 'text-amber-400' : 'text-white'}`}>
                      +{reward.value}
                    </div>

                    {/* Checkmark for claimed */}
                    {isPastDay && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Claim button for current day */}
                    {isClaimable && (
                      <div className="mt-2 text-xs font-bold text-love animate-pulse">
                        {isVi ? 'Nhận!' : 'Claim!'}
                      </div>
                    )}

                    {/* VIP badge for big reward */}
                    {isBigReward && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-[10px] font-bold text-white flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-white" />
                          VIP
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Streak Info */}
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

              {/* Claim button (alternative) */}
              {status.canClaim && (
                <div className="mt-6">
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-love to-purple-500 text-white font-bold shadow-lg shadow-love/30 hover:shadow-love/40 transition-all disabled:opacity-50"
                  >
                    {claiming
                      ? (isVi ? 'Đang nhận...' : 'Claiming...')
                      : (isVi ? `Nhận thưởng ngày ${status.currentDay}` : `Claim Day ${status.currentDay} reward`)}
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
