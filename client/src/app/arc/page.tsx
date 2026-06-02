'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, BookOpen, CheckCircle, Crown, Lock, Play, Star, Zap } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { EmojiSvgIcon } from '@/components/ui/emoji-svg-icon';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { arcApi, type ArcSummary } from '@/services/api';

export default function ArcPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { isAuthenticated } = useAuthStore();
  const [arcs, setArcs] = useState<ArcSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArcs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await arcApi.getArcs();
      setArcs(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : isVi ? 'Không thể tải hành trình' : 'Failed to load arcs');
    } finally {
      setLoading(false);
    }
  }, [isVi]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchArcs();
    } else {
      setLoading(false);
    }
  }, [fetchArcs, isAuthenticated]);

  const tierLabels: Record<string, string> = {
    FREE: isVi ? 'Miễn phí' : 'Free',
    BASIC: 'VIP Basic',
    PRO: 'VIP Pro',
    ULTIMATE: 'VIP Ultimate',
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <div className="h-28 animate-pulse rounded-2xl bg-white/[0.05]" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-2xl bg-white/[0.05]" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="py-20 text-center">
          <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-600" />
          <h2 className="mb-2 text-xl font-bold text-gray-300">
            {isVi ? 'Đăng nhập để xem hành trình' : 'Login to view arcs'}
          </h2>
          <Button asChild className="mt-4">
            <Link href="/auth/login">{isVi ? 'Đăng nhập' : 'Login'}</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-br from-purple-600/80 to-love/60 p-6 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <BookOpen className="h-6 w-6 text-white" />
                <h1 className="text-3xl font-bold text-white">
                  {isVi ? 'Hành Trình Câu Chuyện' : 'Story Arcs'}
                </h1>
              </div>
              <p className="text-white/80">
                {isVi
                  ? 'Hoàn thành từng arc để mở khóa chương tiếp theo, danh hiệu và khung cảnh mới.'
                  : 'Complete each arc to unlock the next chapter, titles, and scenes.'}
              </p>
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-300">{error}</p>
              <button onClick={fetchArcs} className="mt-1 text-sm text-red-400 underline">
                {isVi ? 'Thử lại' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {!error && arcs.length === 0 && (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-600" />
            <h2 className="mb-2 text-xl font-bold text-gray-300">
              {isVi ? 'Chưa có chương truyện nào' : 'No arcs available yet'}
            </h2>
          </div>
        )}

        {!error && arcs.length > 0 && (
          <div className="space-y-6">
            {arcs.map((arc, index) => (
              <motion.div
                key={arc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className={`rounded-2xl border p-6 transition ${
                  arc.isUnlocked
                    ? 'border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent hover:border-white/20'
                    : 'border-white/5 bg-gray-900/50 opacity-70'
                }`}
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                  <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border ${
                    arc.isUnlocked
                      ? 'border-white/10 bg-gradient-to-br from-love/20 to-purple-500/20 shadow-lg shadow-love/10'
                      : 'border-white/5 bg-gray-900'
                  }`}>
                    <EmojiSvgIcon emoji={arc.iconEmoji} className="h-8 w-8" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-white">{arc.name}</h2>
                      {!arc.isUnlocked && <Lock className="h-4 w-4 text-gray-500" />}
                      {arc.completedAt && <CheckCircle className="h-5 w-5 text-green-400" />}
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-300">
                        {arc.completedQuests}/{arc.totalQuests} {isVi ? 'nhiệm vụ' : 'quests'}
                      </span>
                    </div>

                    <p className="mb-4 text-sm text-gray-400">{arc.description}</p>

                    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {isVi ? 'Cấp' : 'Lv.'} {arc.minLevel}-{arc.maxLevel}
                      </span>
                      <span className="flex items-center gap-1">
                        {arc.requiredTier === 'FREE' ? (
                          <Crown className="h-3 w-3 text-gray-400" />
                        ) : arc.requiredTier === 'PRO' ? (
                          <Zap className="h-3 w-3 text-purple-400" />
                        ) : (
                          <Star className="h-3 w-3 text-amber-400" />
                        )}
                        {tierLabels[arc.requiredTier]}
                      </span>
                      {!arc.isUnlocked && (
                        <span className="text-amber-300">
                          {arc.lockReason === 'tier'
                            ? isVi ? 'Cần nâng cấp VIP' : 'VIP tier required'
                            : isVi ? 'Hoàn thành arc trước để mở khóa' : 'Complete the previous arc to unlock'}
                        </span>
                      )}
                    </div>

                    <Progress value={arc.completionPercent} className="h-2" />
                  </div>

                  <div className="flex min-w-[160px] flex-col items-start gap-3 md:items-end">
                    <div className="text-left md:text-right">
                      <div className="text-2xl font-bold text-white">{arc.completionPercent}%</div>
                      <div className="text-xs text-gray-500">{isVi ? 'hoàn thành' : 'complete'}</div>
                    </div>
                    {arc.isUnlocked ? (
                      <Button asChild className="w-full md:w-auto">
                        <Link href={`/arc/${arc.id}`} className="gap-2">
                          <Play className="h-4 w-4" />
                          {arc.completedAt
                            ? isVi ? 'Xem lại' : 'Review'
                            : arc.completionPercent > 0
                              ? isVi ? 'Tiếp tục' : 'Continue'
                              : isVi ? 'Bắt đầu' : 'Start'}
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled className="w-full md:w-auto">
                        <span className="gap-2">
                          <Lock className="h-4 w-4" />
                          {isVi ? 'Đang khóa' : 'Locked'}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
