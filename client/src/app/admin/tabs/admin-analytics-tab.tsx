'use client';

import { RefreshCw, TrendingUp, Sparkles, Crown, Activity } from 'lucide-react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { chartDefaults, formatAnalyticsBucketLabel } from '../admin-types';
import type { AnalyticsData } from '../admin-types';

interface AnalyticsTabProps {
  analytics: AnalyticsData | null;
  analyticsDays: number;
  setAnalyticsDays: React.Dispatch<React.SetStateAction<number>>;
  analyticsGroupBy: 'day' | 'week' | 'month';
  setAnalyticsGroupBy: React.Dispatch<React.SetStateAction<'day' | 'week' | 'month'>>;
  analyticsPremiumTier: 'ALL' | 'FREE' | 'BASIC' | 'PRO' | 'ULTIMATE';
  setAnalyticsPremiumTier: React.Dispatch<React.SetStateAction<'ALL' | 'FREE' | 'BASIC' | 'PRO' | 'ULTIMATE'>>;
  analyticsUserSegment: 'all' | 'new' | 'returning';
  setAnalyticsUserSegment: React.Dispatch<React.SetStateAction<'all' | 'new' | 'returning'>>;
  analyticsVerified: 'all' | 'verified' | 'unverified';
  setAnalyticsVerified: React.Dispatch<React.SetStateAction<'all' | 'verified' | 'unverified'>>;
  analyticsMessageRole: 'ALL' | 'USER' | 'AI' | 'SYSTEM';
  setAnalyticsMessageRole: React.Dispatch<React.SetStateAction<'ALL' | 'USER' | 'AI' | 'SYSTEM'>>;
  analyticsTopLimit: number;
  setAnalyticsTopLimit: React.Dispatch<React.SetStateAction<number>>;
  analyticsSortBy: 'messages' | 'coins' | 'gems' | 'streak' | 'lastActiveAt';
  setAnalyticsSortBy: React.Dispatch<React.SetStateAction<'messages' | 'coins' | 'gems' | 'streak' | 'lastActiveAt'>>;
  analyticsMinMessageCount: number;
  setAnalyticsMinMessageCount: React.Dispatch<React.SetStateAction<number>>;
  fetchAnalytics: (days?: number) => void;
  language: 'vi' | 'en';
}

export function AnalyticsTab({
  analytics, analyticsDays, setAnalyticsDays, analyticsGroupBy, setAnalyticsGroupBy,
  analyticsPremiumTier, setAnalyticsPremiumTier, analyticsUserSegment, setAnalyticsUserSegment,
  analyticsVerified, setAnalyticsVerified, analyticsMessageRole, setAnalyticsMessageRole,
  analyticsTopLimit, setAnalyticsTopLimit, analyticsSortBy, setAnalyticsSortBy,
  analyticsMinMessageCount, setAnalyticsMinMessageCount, fetchAnalytics, language,
}: AnalyticsTabProps) {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{tr('Bảng điều khiển phân tích', 'Analytics Dashboard')}</h2>
        <button onClick={() => fetchAnalytics()} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <select
          value={analyticsDays}
          onChange={(e) => setAnalyticsDays(Number(e.target.value))}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
        >
          <option value={7}>{tr('7 ngày', '7 days')}</option>
          <option value={14}>{tr('14 ngày', '14 days')}</option>
          <option value={30}>{tr('30 ngày', '30 days')}</option>
          <option value={90}>{tr('90 ngày', '90 days')}</option>
          <option value={180}>{tr('180 ngày', '180 days')}</option>
        </select>
        <select
          value={analyticsGroupBy}
          onChange={(e) => setAnalyticsGroupBy(e.target.value as 'day' | 'week' | 'month')}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
        >
          <option value="day">{tr('Nhóm theo ngày', 'Group by day')}</option>
          <option value="week">{tr('Nhóm theo tuần', 'Group by week')}</option>
          <option value="month">{tr('Nhóm theo tháng', 'Group by month')}</option>
        </select>
        <select
          value={analyticsPremiumTier}
          onChange={(e) => setAnalyticsPremiumTier(e.target.value as 'ALL' | 'FREE' | 'BASIC' | 'PRO' | 'ULTIMATE')}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
        >
          <option value="ALL">{tr('Mọi gói', 'All tiers')}</option>
          <option value="FREE">FREE</option>
          <option value="BASIC">BASIC</option>
          <option value="PRO">PRO</option>
          <option value="ULTIMATE">ULTIMATE</option>
        </select>
        <select
          value={analyticsUserSegment}
          onChange={(e) => setAnalyticsUserSegment(e.target.value as 'all' | 'new' | 'returning')}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
        >
          <option value="all">{tr('Mọi nhóm người dùng', 'All user segments')}</option>
          <option value="new">{tr('Người dùng mới', 'New users')}</option>
          <option value="returning">{tr('Người dùng quay lại', 'Returning users')}</option>
        </select>
        <button
          onClick={() => fetchAnalytics()}
          className="px-3 py-2 bg-purple-500 rounded-xl text-white text-sm hover:bg-purple-600"
        >
          {tr('Áp dụng filter', 'Apply filters')}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <select
          value={analyticsVerified}
          onChange={(e) => setAnalyticsVerified(e.target.value as 'all' | 'verified' | 'unverified')}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
        >
          <option value="all">{tr('Mọi trạng thái email', 'All email status')}</option>
          <option value="verified">{tr('Đã xác minh email', 'Verified email')}</option>
          <option value="unverified">{tr('Chưa xác minh email', 'Unverified email')}</option>
        </select>
        <select
          value={analyticsMessageRole}
          onChange={(e) => setAnalyticsMessageRole(e.target.value as 'ALL' | 'USER' | 'AI' | 'SYSTEM')}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
        >
          <option value="ALL">{tr('Mọi loại tin nhắn', 'All message roles')}</option>
          <option value="USER">USER</option>
          <option value="AI">AI</option>
          <option value="SYSTEM">SYSTEM</option>
        </select>
        <input
          type="number"
          min={1}
          max={100}
          value={analyticsTopLimit}
          onChange={(e) => setAnalyticsTopLimit(Math.min(100, Math.max(1, Number(e.target.value) || 10)))}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
          placeholder={tr('Top N người dùng', 'Top N users')}
        />
        <select
          value={analyticsSortBy}
          onChange={(e) => setAnalyticsSortBy(e.target.value as 'messages' | 'coins' | 'gems' | 'streak' | 'lastActiveAt')}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
        >
          <option value="messages">{tr('Sắp xếp theo tin nhắn', 'Sort by messages')}</option>
          <option value="coins">{tr('Sắp xếp theo xu', 'Sort by coins')}</option>
          <option value="gems">{tr('Sắp xếp theo ngọc', 'Sort by gems')}</option>
          <option value="streak">{tr('Sắp xếp theo streak', 'Sort by streak')}</option>
          <option value="lastActiveAt">{tr('Sắp xếp theo hoạt động gần nhất', 'Sort by last active')}</option>
        </select>
        <input
          type="number"
          min={0}
          value={analyticsMinMessageCount}
          onChange={(e) => setAnalyticsMinMessageCount(Math.max(0, Number(e.target.value) || 0))}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
          placeholder={tr('Tin nhắn tối thiểu', 'Min messages')}
        />
      </div>

      {!analytics ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-1">{tr('Người dùng mới', 'New Users')} ({analyticsDays}{tr(' ngày', 'd')})</p>
              <p className="text-2xl font-bold text-blue-400">
                {analytics.summary?.newUsers ?? analytics.dailyStats.reduce((acc, d) => acc + d.new_users, 0)}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-1">{tr('Tin nhắn', 'Messages')} ({analyticsDays}{tr(' ngày', 'd')})</p>
              <p className="text-2xl font-bold text-green-400">
                {(analytics.summary?.totalMessages ?? analytics.messageStats.reduce((acc, d) => acc + d.count, 0)).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-1">{tr('TB tin nhắn/ngày', 'Avg Messages/Day')}</p>
              <p className="text-2xl font-bold text-purple-400">
                {analytics.messageStats.length > 0
                  ? Math.round(analytics.messageStats.reduce((acc, d) => acc + d.count, 0) / analytics.messageStats.length).toLocaleString()
                  : 0}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-1">{tr('TB người dùng hoạt động/ngày', 'Avg Active Users/Day')}</p>
              <p className="text-2xl font-bold text-amber-400">
                {analytics.dailyStats.length > 0
                  ? Math.round(analytics.dailyStats.reduce((acc, d) => acc + (d.active_users || 0), 0) / analytics.dailyStats.length)
                  : 0}
              </p>
            </div>
          </div>

          {analytics.summary && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
                <p className="text-xs text-gray-400">{tr('Tổng user trong scope', 'Total users in scope')}</p>
                <p className="text-xl font-bold text-white">{analytics.summary.totalUsers.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
                <p className="text-xs text-gray-400">{tr('Returning users', 'Returning users')}</p>
                <p className="text-xl font-bold text-emerald-400">{analytics.summary.returningUsers.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
                <p className="text-xs text-gray-400">{tr('Premium rate', 'Premium rate')}</p>
                <p className="text-xl font-bold text-yellow-400">{analytics.summary.premiumRate}%</p>
              </div>
              <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
                <p className="text-xs text-gray-400">{tr('Churn risk users', 'Churn risk users')}</p>
                <p className="text-xl font-bold text-red-400">{analytics.summary.churnRiskUsers.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
                <p className="text-xs text-gray-400">{tr('Hoạt động 15 phút gần nhất', 'Active in last 15 minutes')}</p>
                <p className="text-xl font-bold text-cyan-400">{analytics.summary.activeNow.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              {tr('Đăng ký người dùng và tin nhắn', 'User Registrations & Messages')}
            </h3>
            <div className="h-72">
              <Line
                data={{
                  labels: analytics.dailyStats.map((d) => formatAnalyticsBucketLabel(d.date)),
                  datasets: [
                    {
                      label: tr('Người dùng mới', 'New Users'),
                      data: analytics.dailyStats.map((d) => d.new_users),
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59,130,246,0.1)',
                      fill: true,
                      tension: 0.4,
                      pointRadius: 3,
                      pointHoverRadius: 6,
                      yAxisID: 'y',
                    },
                    {
                      label: tr('Tin nhắn', 'Messages'),
                      data: analytics.dailyStats.map((d) => d.messages),
                      borderColor: '#22c55e',
                      backgroundColor: 'rgba(34,197,94,0.1)',
                      fill: true,
                      tension: 0.4,
                      pointRadius: 3,
                      pointHoverRadius: 6,
                      yAxisID: 'y1',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: { labels: { color: chartDefaults.color, usePointStyle: true, padding: 20 } },
                    tooltip: { backgroundColor: '#1f2937', titleColor: '#fff', bodyColor: '#9ca3af', borderColor: '#374151', borderWidth: 1, padding: 12 },
                  },
                  scales: {
                    x: { ticks: { color: chartDefaults.color }, grid: { color: chartDefaults.borderColor } },
                    y: {
                      type: 'linear', position: 'left',
                      title: { display: true, text: tr('Người dùng mới', 'New Users'), color: '#3b82f6' },
                      ticks: { color: '#3b82f6' },
                      grid: { color: chartDefaults.borderColor },
                      beginAtZero: true,
                    },
                    y1: {
                      type: 'linear', position: 'right',
                      title: { display: true, text: tr('Tin nhắn', 'Messages'), color: '#22c55e' },
                      ticks: { color: '#22c55e' },
                      grid: { drawOnChartArea: false },
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              {tr('Người dùng hoạt động theo ngày', 'Daily Active Users')}
            </h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: analytics.dailyStats.map((d) => formatAnalyticsBucketLabel(d.date)),
                  datasets: [{
                    label: tr('Người dùng hoạt động', 'Active Users'),
                    data: analytics.dailyStats.map((d) => d.active_users || 0),
                    backgroundColor: 'rgba(251,191,36,0.6)',
                    borderColor: '#fbbf24',
                    borderWidth: 1,
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1f2937', titleColor: '#fff', bodyColor: '#9ca3af', borderColor: '#374151', borderWidth: 1 },
                  },
                  scales: {
                    x: { ticks: { color: chartDefaults.color }, grid: { color: chartDefaults.borderColor } },
                    y: { ticks: { color: chartDefaults.color }, grid: { color: chartDefaults.borderColor }, beginAtZero: true },
                  },
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                {tr('Phân bố gói Premium', 'Premium Distribution')}
              </h3>
              {analytics.premiumDistribution.length > 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <Doughnut
                    data={{
                      labels: analytics.premiumDistribution.map((t) => t.premiumTier),
                      datasets: [{
                        data: analytics.premiumDistribution.map((t) => t._count),
                        backgroundColor: ['rgba(107,114,128,0.7)', 'rgba(59,130,246,0.7)', 'rgba(168,85,247,0.7)', 'rgba(251,191,36,0.7)'],
                        borderColor: ['#6b7280', '#3b82f6', '#a855f7', '#fbbf24'],
                        borderWidth: 2,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom', labels: { color: chartDefaults.color, usePointStyle: true, padding: 16, font: { size: 13 } } },
                        tooltip: {
                          backgroundColor: '#1f2937',
                          titleColor: '#fff',
                          bodyColor: '#9ca3af',
                          borderColor: '#374151',
                          borderWidth: 1,
                          callbacks: {
                            label: (ctx) => {
                              const total = analytics.premiumDistribution.reduce((acc, t) => acc + t._count, 0);
                              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
                              return language === 'vi'
                                ? ` ${ctx.label}: ${ctx.parsed} người dùng (${pct}%)`
                                : ` ${ctx.label}: ${ctx.parsed} users (${pct}%)`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">{tr('Chưa có người dùng premium', 'No premium users yet')}</p>
              )}
            </div>

            <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                {tr('Top người dùng theo số tin nhắn', 'Top Users by Messages')}
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {analytics.topUsers.map((user, idx) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                        idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-600/30 text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{user.displayName || user.username || tr('Ẩn danh', 'Anonymous')}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-400">{user.messageCount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{tr('tin nhắn', 'messages')}</p>
                    </div>
                  </div>
                ))}
                {analytics.topUsers.length === 0 && (
                  <p className="text-gray-500 text-center py-4">{tr('Không có dữ liệu', 'No data available')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
