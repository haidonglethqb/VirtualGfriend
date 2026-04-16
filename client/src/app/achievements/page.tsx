'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Star, CheckCircle, Lock, Gift, MessageCircle, Heart, Zap,
  Sparkles, CircleDollarSign, Gem,
} from 'lucide-react';
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

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  category: string;
  requirement: any;
  rewardXp: number;
  rewardCoins: number;
  rewardGems: number;
  points: number;
  isSecret: boolean;
  sortOrder: number;
  unlocked: boolean;
  claimed: boolean;
  progress: number;
  unlockedAt: string | null;
}

export default function AchievementsPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { isAuthenticated } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAchievements();
    }
  }, [isAuthenticated]);

  async function fetchAchievements() {
    try {
      const token = getAuthToken();
      const [achRes, ptsRes] = await Promise.all([
        fetch(`${API_URL}/api/achievements${activeCategory !== 'all' ? `?category=${activeCategory}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/achievements/points`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (achRes.ok) setAchievements(await achRes.json());
      if (ptsRes.ok) {
        const data = await ptsRes.json();
        setTotalPoints(data.points);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    { id: 'all', label: isVi ? 'Tất cả' : 'All', icon: Trophy },
    { id: 'chat', label: isVi ? 'Trò chuyện' : 'Chat', icon: MessageCircle },
    { id: 'gift', label: isVi ? 'Quà tặng' : 'Gifts', icon: Gift },
    { id: 'relationship', label: isVi ? 'Quan hệ' : 'Relationship', icon: Heart },
    { id: 'streak', label: isVi ? 'Kiên trì' : 'Streak', icon: Zap },
    { id: 'romance', label: isVi ? 'Lãng mạn' : 'Romance', icon: Star },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Skeleton header */}
          <div className="text-center mb-8 space-y-3">
            <div className="h-9 w-48 bg-white/[0.06] rounded-xl mx-auto animate-pulse" />
            <div className="h-4 w-64 bg-white/[0.04] rounded-lg mx-auto animate-pulse" />
            <div className="h-10 w-36 bg-white/[0.04] rounded-full mx-auto animate-pulse" />
          </div>
          {/* Skeleton tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-24 bg-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
          {/* Skeleton cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-white/[0.06] rounded" />
                    <div className="h-3 w-full bg-white/[0.04] rounded" />
                    <div className="h-3 w-1/2 bg-white/[0.04] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with gradient banner */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative text-center mb-8 rounded-3xl overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/10 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.12),transparent_70%)] pointer-events-none" />
          <div className="relative px-6 py-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-amber-400" />
              <h1 className="text-3xl font-bold">{isVi ? 'Thành Tựu' : 'Achievements'}</h1>
            </div>
            <p className="text-gray-400 mb-5">
              {isVi ? 'Thu thập thành tựu và nhận phần thưởng' : 'Collect achievements and earn rewards'}
            </p>
            {/* Total Points Badge */}
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-xl font-bold text-amber-300">{totalPoints.toLocaleString()}</span>
              <span className="text-sm text-amber-400/70">{isVi ? 'điểm' : 'pts'}</span>
            </div>
          </div>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); fetchAchievements(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.id
                    ? 'bg-love text-white shadow-lg shadow-love/20'
                    : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Achievement Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((ach, idx) => (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={ach.unlocked ? { y: -2, transition: { duration: 0.15 } } : {}}
              className={`rounded-2xl border p-5 transition-all duration-300 ${
                ach.unlocked
                  ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/[0.07] via-amber-500/[0.03] to-transparent hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10'
                  : 'border-white/[0.06] bg-white/[0.02] opacity-60 hover:opacity-75'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                  ach.unlocked
                    ? 'bg-gradient-to-br from-amber-500/30 to-yellow-500/20 shadow-inner shadow-amber-500/10'
                    : 'bg-gray-800/80'
                }`}>
                  {ach.unlocked
                    ? <Trophy className="w-6 h-6 text-amber-400" />
                    : <Lock className="w-5 h-5 text-gray-600" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white truncate">
                      {ach.unlocked ? ach.name : (ach.isSecret ? '???' : ach.name)}
                    </h3>
                    {ach.unlocked && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                    {ach.unlocked ? ach.description : (ach.isSecret ? '' : ach.description)}
                  </p>

                  {/* Progress bar */}
                  {!ach.unlocked && (
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-love to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (ach.progress / (ach.requirement?.count || 1)) * 100)}%` }}
                      />
                    </div>
                  )}

                  {/* Rewards row */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {ach.rewardXp > 0 && (
                      <span className="flex items-center gap-1 text-purple-400/80">
                        <Sparkles className="w-3 h-3" />
                        {ach.rewardXp} XP
                      </span>
                    )}
                    {ach.rewardCoins > 0 && (
                      <span className="flex items-center gap-1 text-yellow-400/80">
                        <CircleDollarSign className="w-3 h-3" />
                        {ach.rewardCoins}
                      </span>
                    )}
                    {ach.rewardGems > 0 && (
                      <span className="flex items-center gap-1 text-cyan-400/80">
                        <Gem className="w-3 h-3" />
                        {ach.rewardGems}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-amber-400/70">
                      <Star className="w-3 h-3 fill-amber-400/70" />
                      {ach.points} pts
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {achievements.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-gray-500"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 opacity-30" />
            </div>
            <p className="font-medium text-gray-400 mb-1">
              {isVi ? 'Chưa có thành tựu nào' : 'No achievements yet'}
            </p>
            <p className="text-sm">
              {isVi ? 'Hãy trò chuyện và tương tác để mở khóa!' : 'Start chatting and interacting to unlock!'}
            </p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
