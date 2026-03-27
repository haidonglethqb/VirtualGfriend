'use client';

import { Users, Crown, Heart, MessageSquare, TrendingUp, Sparkles } from 'lucide-react';
import type { Stats } from '../admin-types';

interface DashboardTabProps {
  stats: Stats;
  language: 'vi' | 'en';
}

export function DashboardTab({ stats, language }: DashboardTabProps) {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{tr('Tổng quan', 'Dashboard')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: tr('Tổng người dùng', 'Total Users'), value: stats.totalUsers, icon: Users, color: 'blue' },
          { label: tr('Người dùng Premium', 'Premium Users'), value: stats.premiumUsers, icon: Crown, color: 'yellow' },
          { label: tr('Nhân vật', 'Characters'), value: stats.totalCharacters, icon: Heart, color: 'pink' },
          { label: tr('Tin nhắn', 'Messages'), value: stats.totalMessages, icon: MessageSquare, color: 'green' },
        ].map((stat, i) => (
          <div key={i} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-8 h-8 text-${stat.color}-400`} />
              <span className="text-2xl font-bold">{stat.value.toLocaleString()}</span>
            </div>
            <p className="text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-gray-400">{tr('Hoạt động hôm nay', 'Active Today')}</span>
          </div>
          <p className="text-3xl font-bold">{stats.activeUsersToday}</p>
        </div>
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400">{tr('Người dùng mới hôm nay', 'New Users Today')}</span>
          </div>
          <p className="text-3xl font-bold">{stats.newUsersToday}</p>
        </div>
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400">{tr('Tỷ lệ Premium', 'Premium Rate')}</span>
          </div>
          <p className="text-3xl font-bold">{stats.premiumRate}%</p>
        </div>
      </div>
    </div>
  );
}
