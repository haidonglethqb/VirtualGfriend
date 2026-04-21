'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, MessageCircle, Gift, Calendar, Flame, TrendingUp, Award,
  ChevronRight, User, HeartHandshake, Briefcase, Home, FileText, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { useLanguageStore } from '@/store/language-store';

interface AnalyticsData {
  affectionHistory: { date: string; affection: number; level: number }[];
  activityHeatmap: { date: string; count: number }[];
  totalMessages: number;
  totalGifts: number;
  averageMessagesPerDay: number;
  relationshipDays: number;
  milestones: { type: string; achievedAt: string; description: string }[];
  conversationTopics: { topic: string; count: number }[];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative overflow-hidden rounded-xl p-4',
        'bg-gradient-to-br border border-white/5',
        color
      )}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg bg-white/10">
          {icon}
        </div>
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <div className="mt-2">
        <p className="text-sm text-white/80">{label}</p>
        {subtext && <p className="text-xs text-white/60 mt-0.5">{subtext}</p>}
      </div>
    </motion.div>
  );
}

interface AffectionChartProps {
  data: { date: string; affection: number; level: number }[];
}

function AffectionChart({ data }: AffectionChartProps) {
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const maxAffection = Math.max(...data.map(d => d.affection), 100);
  const chartHeight = 120;

  return (
    <div className="bg-[#271b21] rounded-xl border border-[#392830] p-4">
      <h3 className="text-sm font-medium text-white/80 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-pink-400" />
        {tr('Lịch sử tình cảm', 'Affection history')}
      </h3>
      
      <div className="relative" style={{ height: chartHeight }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-white/40">
          <span>{maxAffection}</span>
          <span>{Math.round(maxAffection / 2)}</span>
          <span>0</span>
        </div>
        
        {/* Chart area */}
        <div className="absolute left-10 right-0 top-0 bottom-0 flex items-end">
          <svg 
            className="w-full h-full" 
            viewBox={`0 0 ${data.length * 12} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            {/* Gradient definition */}
            <defs>
              <linearGradient id="affectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(236, 72, 153)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgb(236, 72, 153)" stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Area */}
            <path
              d={`
                M 0 ${chartHeight}
                ${data.map((d, i) => 
                  `L ${i * 12 + 6} ${chartHeight - (d.affection / maxAffection) * chartHeight}`
                ).join(' ')}
                L ${(data.length - 1) * 12 + 6} ${chartHeight}
                Z
              `}
              fill="url(#affectionGradient)"
            />
            
            {/* Line */}
            <path
              d={data.map((d, i) => 
                `${i === 0 ? 'M' : 'L'} ${i * 12 + 6} ${chartHeight - (d.affection / maxAffection) * chartHeight}`
              ).join(' ')}
              fill="none"
              stroke="rgb(236, 72, 153)"
              strokeWidth="2"
            />
            
            {/* Points */}
            {data.slice(-7).map((d, i, arr) => {
              const idx = data.length - arr.length + i;
              return (
                <circle
                  key={i}
                  cx={idx * 12 + 6}
                  cy={chartHeight - (d.affection / maxAffection) * chartHeight}
                  r="3"
                  fill="rgb(236, 72, 153)"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-white/40 pl-10">
        {data.slice(-7).map((d, i) => (
          <span key={i}>{new Date(d.date).getDate()}</span>
        ))}
      </div>
    </div>
  );
}

interface ActivityHeatmapProps {
  data: { date: string; count: number }[];
}

function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  // Group by weeks
  const weeks: { date: string; count: number }[][] = [];
  let currentWeek: { date: string; count: number }[] = [];
  
  // Create a map for quick lookup
  const dataMap = new Map(data.map(d => [d.date, d.count]));
  
  // Generate last 12 weeks
  for (let i = 83; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split('T')[0];
    const count = dataMap.get(dateKey) || 0;
    
    currentWeek.push({ date: dateKey, count });
    
    if (currentWeek.length === 7 || i === 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  const getColor = (count: number) => {
    if (count === 0) return 'bg-white/5';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return 'bg-pink-900/50';
    if (intensity < 0.5) return 'bg-pink-700/60';
    if (intensity < 0.75) return 'bg-pink-500/70';
    return 'bg-pink-400';
  };

  return (
    <div className="bg-[#271b21] rounded-xl border border-[#392830] p-4">
      <h3 className="text-sm font-medium text-white/80 mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-green-400" />
        {tr('Hoạt động trong 12 tuần', 'Activity in the last 12 weeks')}
      </h3>
      
      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-1">
            {week.map((day, dayIdx) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (weekIdx * 7 + dayIdx) * 0.005 }}
                className={cn(
                  'w-3 h-3 rounded-sm',
                  getColor(day.count)
                )}
                title={language === 'vi' ? `${day.date}: ${day.count} tin nhắn` : `${day.date}: ${day.count} messages`}
              />
            ))}
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-2 mt-3 text-xs text-white/40">
        <span>{tr('Ít', 'Less')}</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-white/5" />
          <div className="w-3 h-3 rounded-sm bg-pink-900/50" />
          <div className="w-3 h-3 rounded-sm bg-pink-700/60" />
          <div className="w-3 h-3 rounded-sm bg-pink-500/70" />
          <div className="w-3 h-3 rounded-sm bg-pink-400" />
        </div>
        <span>{tr('Nhiều', 'More')}</span>
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get<AnalyticsData>('/analytics');
        if (response.success) {
          setData(response.data);
        }
      } catch (err) {
        setError(tr('Không thể tải thống kê', 'Could not load analytics'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-white/60">
        {error || tr('Không có dữ liệu', 'No data available')}
      </div>
    );
  }

  const TOPIC_LABELS: Record<string, string> = {
    personal: tr('Cá nhân', 'Personal'),
    preference: tr('Sở thích', 'Preferences'),
    relationship: tr('Quan hệ', 'Relationship'),
    work: tr('Công việc', 'Work'),
    life: tr('Cuộc sống', 'Life'),
    other: tr('Khác', 'Other'),
  };

  const TOPIC_ICONS: Record<string, React.ReactNode> = {
    personal: <User className="w-3.5 h-3.5" />,
    preference: <Heart className="w-3.5 h-3.5" />,
    relationship: <HeartHandshake className="w-3.5 h-3.5" />,
    work: <Briefcase className="w-3.5 h-3.5" />,
    life: <Home className="w-3.5 h-3.5" />,
    other: <FileText className="w-3.5 h-3.5" />,
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<MessageCircle className="w-5 h-5 text-blue-300" />}
          label={tr('Tổng tin nhắn', 'Total messages')}
          value={data.totalMessages.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
          color="from-blue-500/20 to-cyan-500/20"
        />
        <StatCard
          icon={<Heart className="w-5 h-5 text-pink-300" />}
          label={tr('Ngày yêu nhau', 'Relationship days')}
          value={data.relationshipDays}
          subtext={tr('ngày', 'days')}
          color="from-pink-500/20 to-rose-500/20"
        />
        <StatCard
          icon={<Gift className="w-5 h-5 text-purple-300" />}
          label={tr('Quà đã tặng', 'Gifts sent')}
          value={data.totalGifts}
          color="from-purple-500/20 to-indigo-500/20"
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-300" />}
          label={tr('TB/ngày', 'Avg/day')}
          value={data.averageMessagesPerDay}
          subtext={tr('tin nhắn', 'messages')}
          color="from-orange-500/20 to-amber-500/20"
        />
      </div>

      {/* Charts */}
      {data.affectionHistory.length > 0 && (
        <AffectionChart data={data.affectionHistory} />
      )}

      <ActivityHeatmap data={data.activityHeatmap} />

      {/* Milestones */}
      {data.milestones.length > 0 && (
        <div className="bg-[#271b21] rounded-xl border border-[#392830] p-4">
          <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            {tr('Thành tựu gần đây', 'Recent milestones')}
          </h3>
          <div className="space-y-2">
            {data.milestones.slice(0, 5).map((milestone, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                <div className="p-1.5 rounded-full bg-yellow-500/20">
                  <Award className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{milestone.description}</p>
                  <p className="text-xs text-white/40">
                    {new Date(milestone.achievedAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topics */}
      {data.conversationTopics.length > 0 && (
        <div className="bg-[#271b21] rounded-xl border border-[#392830] p-4">
        <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-pink-400" />
            {tr('Chủ đề thường nói', 'Top conversation topics')}
          </h3>
          <div className="space-y-2">
            {data.conversationTopics.slice(0, 5).map((topic, i) => {
              const maxCount = data.conversationTopics[0]?.count || 1;
              const percentage = (topic.count / maxCount) * 100;
              
              return (
                <div key={i} className="relative">
                  <div 
                    className="absolute inset-0 bg-pink-500/10 rounded-lg"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative flex items-center justify-between p-2">
                    <span className="text-sm text-white flex items-center gap-1.5">
                      {TOPIC_ICONS[topic.topic]}
                      {TOPIC_LABELS[topic.topic] || topic.topic}
                    </span>
                    <span className="text-xs text-white/60">{topic.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
