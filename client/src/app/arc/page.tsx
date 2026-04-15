'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, Lock, Star, Crown, Zap } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { useLanguageStore } from '@/store/language-store';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  useEffect(() => {
    fetchArcs();
  }, []);

  async function fetchArcs() {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/arcs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setArcs(await res.json());
    } catch {
      // Silently fail
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
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin text-love">
            <BookOpen className="w-8 h-8" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{isVi ? 'Hành Trình Câu Chuyện' : 'Story Arcs'}</h1>
          <p className="text-gray-400">
            {isVi ? 'Khám phá từng chương truyện và hoàn thành nhiệm vụ để tiến cấp' : 'Explore each chapter and complete quests to advance'}
          </p>
        </motion.div>

        {/* Arc Timeline */}
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
                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-love/20 to-purple-500/20 flex items-center justify-center text-3xl border border-white/10">
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
                            <div className="w-1.5 h-1.5 rounded-full bg-love/50" />
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
