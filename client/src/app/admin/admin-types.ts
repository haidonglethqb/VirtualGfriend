'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
);

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type TabType =
  | 'dashboard'
  | 'users'
  | 'characters'
  | 'messages'
  | 'quests'
  | 'templates'
  | 'analytics'
  | 'system'
  | 'tier-configs';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  isEmailVerified: boolean;
  isPremium: boolean;
  premiumTier: string;
  coins: number;
  gems: number;
  streak: number;
  createdAt: string;
  lastLoginAt: string;
}

export interface Character {
  id: string;
  name: string;
  nickname: string;
  gender: string;
  personality: string;
  level: number;
  affection: number;
  isActive: boolean;
  createdAt: string;
  user: { email: string };
}

export interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  user: { email: string };
  character?: { name: string };
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  rewardCoins: number;
  rewardGems: number;
  rewardXp: number;
  isActive: boolean;
  sortOrder: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  gender: string;
  personality: string;
  style: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface TemplateFormData extends Record<string, unknown> {
  name: string;
  description: string;
  avatarUrl: string;
  gender: string;
  personality: string;
  style: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface Stats {
  totalUsers: number;
  premiumUsers: number;
  totalCharacters: number;
  totalMessages: number;
  activeUsersToday: number;
  newUsersToday: number;
  premiumRate: number;
}

export interface SystemInfo {
  databaseSize: string;
  tables: { name: string; rows: number; seqScan?: number; idxScan?: number; deadRows?: number }[];
  nodeVersion: string;
  uptime: number;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
  connections?: { active: number; total: number };
  dbPerformance?: { cacheHitRate: number };
  realtimeActivity?: { messages: number };
  requestStats?: { path: string; method: string; requests: number; avgDurationMs: number; p95DurationMs: number }[];
  errorStats?: { severity: string; count: number }[];
  filtersApplied?: { windowMinutes: number };
}

export interface AnalyticsData {
  dailyStats: { date: string; new_users: number; messages: number; active_users?: number }[];
  messageStats: { date: string; count: number }[];
  topUsers: { id: string; email: string; username?: string; displayName?: string; messageCount: number }[];
  premiumDistribution: { premiumTier: string; _count: number }[];
  summary?: {
    newUsers: number;
    totalMessages: number;
    totalUsers: number;
    returningUsers: number;
    premiumRate: number;
    churnRiskUsers: number;
    activeNow: number;
  };
  filtersApplied?: Record<string, unknown>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const ADMIN_I18N = {
  vi: {
    loginTitle: 'Trang Quản Trị',
    loginSubtitle: 'Hệ thống quản lý Amoura',
    username: 'Tên đăng nhập',
    password: 'Mật khẩu',
    loginButton: 'Đăng nhập',
    loggingIn: 'Đang đăng nhập...',
    tabs: {
      dashboard: 'Tổng quan',
      users: 'Người dùng',
      characters: 'Nhân vật',
      messages: 'Tin nhắn',
      quests: 'Nhiệm vụ',
      templates: 'Mẫu nhân vật',
      analytics: 'Phân tích',
      system: 'Hệ thống',
      tierConfigs: 'Cấu hình VIP',
    },
    broadcast: 'Thông báo',
    giveCoinsAll: 'Tặng xu (tất cả)',
    giveGemsAll: 'Tặng ngọc (tất cả)',
    logout: 'Đăng xuất',
    languageTitle: 'Ngôn ngữ',
  },
  en: {
    loginTitle: 'Admin Panel',
    loginSubtitle: 'Amoura Management System',
    username: 'Username',
    password: 'Password',
    loginButton: 'Login',
    loggingIn: 'Logging in...',
    tabs: {
      dashboard: 'Dashboard',
      users: 'Users',
      characters: 'Characters',
      messages: 'Messages',
      quests: 'Quests',
      templates: 'Templates',
      analytics: 'Analytics',
      system: 'System',
      tierConfigs: 'VIP Config',
    },
    broadcast: 'Broadcast',
    giveCoinsAll: 'Give Coins (All)',
    giveGemsAll: 'Give Gems (All)',
    logout: 'Logout',
    languageTitle: 'Language',
  },
} as const;

export const chartDefaults = {
  color: '#9ca3af',
  borderColor: 'rgba(255,255,255,0.06)',
};

export function formatAnalyticsBucketLabel(bucket: string): string {
  const parts = bucket.split('-').map((part) => Number(part));
  const [year, month, day] = parts;
  if (!year || !month || !day) return bucket;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

export function createTemplateFormData(template?: Template): TemplateFormData {
  return {
    name: template?.name || '',
    description: template?.description || '',
    avatarUrl: template?.avatarUrl || '',
    gender: template?.gender || 'FEMALE',
    personality: template?.personality || 'caring',
    style: template?.style || 'anime',
    isDefault: Boolean(template?.isDefault),
    isActive: template?.isActive ?? true,
    sortOrder: template?.sortOrder ?? 0,
  };
}
