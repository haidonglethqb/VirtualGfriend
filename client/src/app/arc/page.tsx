'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, Lock, Star, Crown, Zap, AlertCircle, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { useLanguageStore } from '@/store/language-store';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('vgfriend-auth');
    if (stored) return JSON.parse(stored).state?.accessToken || null;
  } catch { /* noop */ }
  return null;
}

interface ArcQuest {
  id: string;
  title: string;
  description: string;
  type: string;
  sortOrder: number;
  prerequisiteQuestId: string | null;
}

interface Arc {
  id: string;
  name: string;
  description: string;
  iconEmoji: string;
  minLevel: number;
  maxLevel: number;
  requiredTier: string;
  backgroundImage: string | null;
  orderIndex: number;
  completionPercent: number;
  completedAt: string | null;
  unlockedAt: string | null;
  isUnlocked: boolean;
  totalQuests: number;
  quests: ArcQuest[];
}

export default function ArcPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { isAuthenticated } = useAuthStore();
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchArcs();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  async function fetchArcs() {
    try {
      setError(null);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/arcs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(isVi ? 'Không thể tải hành trình' : 'Failed to load arcs');
      }
      const data = await res.json();
      setArcs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const tierLabels: Record<string, string> = {
    FREE: isVi ? 'Miễn phí' : 'Free',
    BASIC: 'VIP Basic',
    PRO: 'VIP Pro',
    ULTIMATE: 'VIP Ultimate',
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          {/* Header skeleton */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="animate-pulse bg-white/[0.05] rounded-2xl h-24 w-full" />
          </div>
          {/* Arc card skeletons */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-white/[0.05] rounded-2xl h-32" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-bold text-gray-300 mb-2">
            {isVi ? 'Đăng nhập để xem hành trình' : 'Login to view arcs'}
          </h2>
          <Link href="/auth/login">
            <button className="px-6 py-2 rounded-xl bg-love text-white font-medium mt-4">
              {isVi ? 'Đăng nhập' : 'Login'}
            </button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-purple-600/80 to-love/60 p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <BookOpen className="w-6 h-6 text-white" />
                <h1 className="text-3xl font-bold text-white">{isVi ? 'Hành Trình Câu Chuyện' : 'Story Arcs'}</h1>
              </div>
              <p className="text-white/80">
                {isVi ? 'Khám phá từng chương truyện và hoàn thành nhiệm vụ để tiến cấp' : 'Explore each chapter and complete quests to advance'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-300 font-medium">{error}</p>
              <button onClick={fetchArcs} className="text-sm text-red-400 underline mt-1">
                {isVi ? 'Thử lại' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!error && arcs.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-300 mb-2">
              {isVi ? 'Chưa có chương truyện nào' : 'No arcs available yet'}
            </h2>
            <p className="text-gray-500">
              {isVi ? 'Các chương truyện sẽ xuất hiện khi bạn tiến triển trong game.' : 'Arcs will appear as you progress in the game.'}
            </p>
          </div>
        )}

        {/* Arc Timeline */}
        {!error && arcs.length > 0 && (
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-love/30 via-purple-500/20 to-transparent hidden md:block" />

            <div className="space-y-6">
              {arcs.map((arc, idx) => (
              <motion.div
                key={arc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative rounded-2xl border overflow-hidden transition-all duration-300 ${
                  arc.isUnlocked
                    ? 'border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent hover:border-white/20'
                    : 'border-white/5 bg-gray-900/50 opacity-60'
                }`}
              >
                {/* Arc header */}
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border ${
                      arc.isUnlocked
                        ? 'bg-gradient-to-br from-love/20 to-purple-500/20 border-white/10 shadow-lg shadow-love/10'
                        : 'bg-gray-900 border-white/5'
                    }`}>
                      {arc.iconEmoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-bold text-white">{arc.name}</h2>
                        {!arc.isUnlocked && <Lock className="w-4 h-4 text-gray-500" />}
                        {arc.completedAt && <CheckCircle className="w-5 h-5 text-green-400" />}
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{arc.description}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {isVi ? 'Cấp' : 'Lv.'} {arc.minLevel}-{arc.maxLevel}
                        </span>
                        <span className="flex items-center gap-1">
                          {arc.requiredTier === 'FREE' ? (
                            <Crown className="w-3 h-3 text-gray-400" />
                          ) : arc.requiredTier === 'PRO' ? (
                            <Zap className="w-3 h-3 text-purple-400" />
                          ) : (
                            <Star className="w-3 h-3 text-amber-400" />
                          )}
                          {tierLabels[arc.requiredTier]}
                        </span>
                        <span>{arc.totalQuests} {isVi ? 'nhiệm vụ' : 'quests'}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-2xl font-bold text-white">{arc.completionPercent}%</div>
                      <div className="text-xs text-gray-500">{isVi ? 'hoàn thành' : 'complete'}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        arc.completionPercent >= 100
                          ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                          : 'bg-gradient-to-r from-love to-purple-500'
                      }`}
                      style={{ width: `${arc.completionPercent}%` }}
                    />
                  </div>

                  {/* Quest list */}
                  {arc.isUnlocked && arc.quests.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">
                        {isVi ? 'Nhiệm vụ trong chương' : 'Chapter Quests'}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {arc.quests.map((quest) => (
                          <div key={quest.id} className="flex items-center gap-2 text-sm text-gray-400 p-2 rounded-lg bg-white/[0.02]">
                            <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                            <span className="truncate">{quest.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        )}

        {/* CTA */}
        {!isAuthenticated && (
          <div className="text-center mt-8">
            <Link href="/auth/register">
              <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-love to-purple-500 text-white font-bold">
                {isVi ? 'Bắt đầu hành trình' : 'Start Your Journey'}
              </button>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
