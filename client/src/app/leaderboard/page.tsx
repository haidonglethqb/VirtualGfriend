'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Trophy, Crown, Star, Heart, Flame, Award, Medal, ChevronDown,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuthStore } from '@/store/auth-store'
import { useLanguageStore } from '@/store/language-store'
import api from '@/services/api'

const LEADERBOARD_I18N = {
  vi: {
    title: 'Bảng Xếp Hạng',
    subtitle: 'Xem ai đang dẫn đầu trong cộng đồng Amoura.',
    categories: {
      level: 'Cấp độ',
      affection: 'Độ thân mật',
      streak: 'Chuỗi ngày',
      achievements: 'Thành tích',
    },
    units: {
      level: 'Level',
      affection: 'điểm',
      streak: 'ngày',
      achievements: 'huy hiệu',
    },
    myRank: 'Thứ hạng của bạn',
    noData: 'Chưa có dữ liệu xếp hạng',
  },
  en: {
    title: 'Leaderboard',
    subtitle: 'See who\'s leading in the Amoura community.',
    categories: {
      level: 'Level',
      affection: 'Affection',
      streak: 'Streak',
      achievements: 'Achievements',
    },
    units: {
      level: 'Level',
      affection: 'points',
      streak: 'days',
      achievements: 'badges',
    },
    myRank: 'Your Rank',
    noData: 'No ranking data yet',
  },
} as const;

interface LeaderboardEntry {
  rank: number
  userId: string
  username: string | null
  displayName: string | null
  avatar: string | null
  isPremium: boolean
  value: number
}

interface LeaderboardData {
  category: string
  entries: LeaderboardEntry[]
  myRank: { rank: number; value: number } | null
}

export default function LeaderboardPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const { language } = useLanguageStore()
  const t = LEADERBOARD_I18N[language]
  const [activeCategory, setActiveCategory] = useState('level')
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const categories = [
    { key: 'level', label: t.categories.level, icon: Star, color: 'text-yellow-400', unit: t.units.level },
    { key: 'affection', label: t.categories.affection, icon: Heart, color: 'text-pink-400', unit: t.units.affection },
    { key: 'streak', label: t.categories.streak, icon: Flame, color: 'text-orange-400', unit: t.units.streak },
    { key: 'achievements', label: t.categories.achievements, icon: Award, color: 'text-purple-400', unit: t.units.achievements },
  ]

  const fetchLeaderboard = useCallback(async (category: string) => {
    setIsLoading(true)
    try {
      const res = await api.get<LeaderboardData>(`/leaderboard?category=${category}&limit=20`)
      if (res.success) {
        setData(res.data)
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    fetchLeaderboard(activeCategory)
  }, [isAuthenticated, router, activeCategory, fetchLeaderboard])

  const rankColors: Record<number, string> = {
    1: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30',
    2: 'from-gray-400/20 to-gray-500/5 border-gray-400/30',
    3: 'from-amber-700/20 to-amber-800/5 border-amber-700/30',
  }

  const rankIcons: Record<number, typeof Trophy> = {
    1: Crown,
    2: Medal,
    3: Medal,
  }

  const activeCat = categories.find(c => c.key === activeCategory)!

  if (!isAuthenticated) return null

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            {t.title}
          </h1>
          <p className="text-[#ba9cab]">{t.subtitle}</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => {
            const isActive = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-love text-white shadow-lg shadow-love/25'
                    : 'bg-[#271b21] text-[#ba9cab] hover:bg-[#392830] hover:text-white border border-[#392830]'
                }`}
              >
                <cat.icon className={`w-4 h-4 ${isActive ? 'text-white' : cat.color}`} />
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* My Rank Card */}
        {data?.myRank && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-love/10 border border-love/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-love flex items-center justify-center font-bold text-sm">
                #{data.myRank.rank}
              </div>
              <div>
                <p className="font-bold text-sm">{t.myRank}</p>
                <p className="text-xs text-[#ba9cab]">{data.myRank.value} {activeCat.unit}</p>
              </div>
            </div>
            <activeCat.icon className={`w-6 h-6 ${activeCat.color}`} />
          </motion.div>
        )}

        {/* Leaderboard List */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-[#271b21] animate-pulse"
              />
            ))
          ) : data?.entries.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">{t.noData}</p>
            </div>
          ) : (
            data?.entries.map((entry, i) => {
              const isMe = entry.userId === user?.id
              const isTop3 = entry.rank <= 3
              const RankIcon = rankIcons[entry.rank] || Trophy
              const bgClass = isMe
                ? 'bg-love/10 border-love/20'
                : rankColors[entry.rank] || 'bg-[#271b21]/60 border-[#392830]/50'

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${bgClass}`}
                >
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm ${
                    entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                    entry.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                    entry.rank === 3 ? 'bg-amber-700/20 text-amber-500' :
                    'bg-[#392830] text-gray-400'
                  }`}>
                    {isTop3 ? <RankIcon className="w-5 h-5" /> : entry.rank}
                  </div>

                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-love to-purple-600 flex items-center justify-center text-lg font-bold flex-shrink-0">
                    {(entry.displayName || entry.username || '?')[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate flex items-center gap-1.5">
                      {entry.displayName || entry.username || 'Ẩn danh'}
                      {entry.isPremium && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                      {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-love/20 text-love font-bold">BẠN</span>}
                    </p>
                    {entry.username && (
                      <p className="text-xs text-gray-500">@{entry.username}</p>
                    )}
                  </div>

                  {/* Value */}
                  <div className="text-right flex-shrink-0">
                    <p className={`font-extrabold text-lg ${
                      entry.rank === 1 ? 'text-yellow-400' :
                      entry.rank === 2 ? 'text-gray-300' :
                      entry.rank === 3 ? 'text-amber-500' :
                      'text-white'
                    }`}>
                      {entry.value.toLocaleString('vi-VN')}
                    </p>
                    <p className="text-[10px] text-gray-500">{activeCat.unit}</p>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>
    </AppLayout>
  )
}
