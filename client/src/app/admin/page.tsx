'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Heart, Coins, Shield, LogOut, Search,
  ChevronLeft, ChevronRight, Edit2, Trash2, Key, RefreshCw,
  TrendingUp, Crown, Sparkles, LayoutDashboard, Settings,
  Target, Image as ImageIcon, Gift, Brain, Bell, Database, BarChart3,
  Plus, X, Check, AlertTriangle, Megaphone, Server, HardDrive,
  Zap, Clock, Activity, Languages, Upload, SendHorizonal, Info, ShieldAlert, CheckCircle2, Timer, UserCheck, Users2,
  ChevronDown,
} from 'lucide-react';
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
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { TierConfigTab } from './tier-config-tab';
import { PricingTab } from './pricing-tab';
import { VipGiftPackAdmin } from './vip-gift-pack-admin';
import { AiSettingsTab } from './ai-settings-tab';
import { useLanguageStore } from '@/store/language-store';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type TabType = 'dashboard' | 'users' | 'characters' | 'messages' | 'quests' | 'templates' | 'analytics' | 'system' | 'tier-configs' | 'pricing' | 'ai-settings';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio?: string | null;
  isEmailVerified: boolean;
  isPremium: boolean;
  premiumTier: string | null;
  premiumExpiresAt: string | null;
  coins: number;
  gems: number;
  streak: number;
  userGender?: string;
  datingPreference?: string;
  createdAt: string;
  lastLoginAt: string | null;
}

type RewardTargetType = 'all' | 'free' | 'premium' | 'tier' | 'selected_users';
type BroadcastType = 'info' | 'success' | 'warning';

interface AdminTarget {
  type: RewardTargetType;
  tiers?: string[];
  userIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
  lastActiveAfter?: string;
  lastActiveBefore?: string;
  minStreak?: number;
  minLevel?: number;
  hasActiveCharacter?: boolean;
}

interface RewardForm {
  coins: number;
  gems: number;
  message: string;
  target: AdminTarget;
  gifts: Array<{ giftId: string; quantity: number }>;
}

interface ResetPasswordForm {
  userId: string;
  username: string;
  newPassword: string;
  confirmPassword: string;
}

const TIER_OPTIONS = [
  { value: 'FREE',     label: 'Free',     Icon: Shield,   gradient: 'from-slate-600 to-slate-700',   ring: 'ring-slate-400/60',   glow: '',                    iconColor: 'text-slate-200'  },
  { value: 'BASIC',    label: 'Basic',    Icon: Zap,      gradient: 'from-blue-600 to-cyan-600',     ring: 'ring-blue-400/70',    glow: 'shadow-blue-500/25',  iconColor: 'text-cyan-100'   },
  { value: 'PRO',      label: 'Pro',      Icon: Sparkles, gradient: 'from-violet-600 to-purple-700', ring: 'ring-violet-400/70',  glow: 'shadow-violet-500/25', iconColor: 'text-violet-100' },
  { value: 'ULTIMATE', label: 'Ultimate', Icon: Crown,    gradient: 'from-amber-500 to-orange-500',  ring: 'ring-amber-400/70',   glow: 'shadow-amber-500/30', iconColor: 'text-amber-100'  },
];

interface Character {
  id: string;
  name: string;
  nickname: string | null;
  gender: string;
  personality: string;
  level: number;
  affection: number;
  isActive: boolean;
  createdAt: string;
  user: { email: string; username: string };
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  user: { email: string; username: string };
  character: { name: string } | null;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  requirements?: { action?: string; count?: number };
  rewardCoins: number;
  rewardGems: number;
  rewardXp: number;
  rewardAffection: number;
  rewardItems?: string[];
  minimumTier?: string;
  requiresPremium?: boolean;
  giftRewards?: Array<{ giftId: string; quantity: number; gift?: GiftCatalogItem }>;
  rewardSummary?: {
    coins: number;
    gems: number;
    xp: number;
    affection: number;
    items: string[];
    gifts: Array<{ giftId: string; quantity: number; gift?: GiftCatalogItem }>;
  };
  isActive: boolean;
  sortOrder: number;
}

interface QuestSummary {
  total: number;
  active: number;
  inactive: number;
  premium: number;
  withGiftReward: number;
  missingConfig: number;
}

interface QuestFilters {
  search: string;
  type: string;
  category: string;
  isActive: string;
  action: string;
  minimumTier: string;
  rewardType: string;
  giftId: string;
}

interface GiftCatalogItem {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  category: string;
  rarity: string;
  minimumTier: string;
  requiresPremium: boolean;
  affectionBonus: number;
  isActive?: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  gender: string;
  personality: string;
  style?: string;
  isDefault?: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface TemplateFormData {
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

interface Stats {
  totalUsers: number;
  premiumUsers: number;
  totalCharacters: number;
  totalMessages: number;
  activeUsersToday: number;
  newUsersToday: number;
  premiumRate: string;
}

interface SystemInfo {
  databaseSize: string;
  tables: { name: string; rows: number }[];
  nodeVersion: string;
  uptime: number;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
}

interface AnalyticsData {
  dailyStats: Array<{ date: string; new_users: number; messages: number; active_users: number }>;
  messageStats: Array<{ date: string; count: number }>;
  topUsers: Array<{ id: string; username: string | null; displayName: string | null; email: string; messageCount: number }>;
  premiumDistribution: Array<{ premiumTier: string; _count: number }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGINATION: Pagination = { page: 1, limit: 20, total: 0, totalPages: 0 };

// Chart.js dark theme defaults
const chartDefaults = {
  color: '#9ca3af',
  borderColor: 'rgba(255,255,255,0.06)',
};

const createTemplateFormData = (template?: Template): TemplateFormData => ({
  name: template?.name || '',
  description: template?.description || '',
  avatarUrl: template?.avatarUrl || '',
  gender: template?.gender || 'FEMALE',
  personality: template?.personality || 'caring',
  style: template?.style || 'anime',
  isDefault: Boolean(template?.isDefault),
  isActive: template?.isActive ?? true,
  sortOrder: template?.sortOrder ?? 0,
});

const ADMIN_I18N = {
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
      pricing: 'Bảng giá',
      aiSettings: 'Cấu hình AI',
    },
    broadcast: 'Thông báo',
    reward: 'Tặng thưởng',
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
      pricing: 'Pricing',
      aiSettings: 'AI Settings',
    },
    broadcast: 'Broadcast',
    reward: 'Give Rewards',
    logout: 'Logout',
    languageTitle: 'Language',
  },
} as const;

// Pagination Controls Component
function PaginationControls({ 
  pagination, 
  setPagination,
  language,
}: { 
  pagination: Pagination; 
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  language: 'vi' | 'en';
}) {
  const isVi = language === 'vi';
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700/50">
      <p className="text-sm text-gray-400">
        {isVi ? 'Hiển thị' : 'Showing'} {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} {isVi ? 'đến' : 'to'}{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} {isVi ? 'trong tổng số' : 'of'} {pagination.total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
          disabled={pagination.page === 1}
          className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="px-4 py-2 bg-gray-700/50 rounded-lg">
          {pagination.page} / {pagination.totalPages || 1}
        </span>
        <button
          onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
          disabled={pagination.page >= pagination.totalPages}
          className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Modal Component
function Modal({
  title,
  onClose,
  children,
  size = 'md',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`bg-gray-800 rounded-2xl p-6 w-full border border-gray-700 ${size === 'lg' ? 'max-w-lg' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

// Broadcast Modal Component
function BroadcastModal({
  form,
  setForm,
  onSubmit,
  onClose,
  loading,
  language,
  status,
  selectedUserCount,
}: {
  form: { title: string; message: string; type: BroadcastType; durationMs: number; target: AdminTarget };
  setForm: (f: typeof form) => void;
  onSubmit: () => void;
  onClose: () => void;
  loading: boolean;
  language: string;
  status: { type: 'success' | 'error'; message: string } | null;
  selectedUserCount: number;
}) {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  const typeOptions = [
    { value: 'info' as const, label: tr('Thông tin', 'Info'), Icon: Info, color: 'from-blue-500 to-cyan-500', ring: 'ring-blue-400/50', bg: 'bg-blue-500/15' },
    { value: 'success' as const, label: tr('Thành công', 'Success'), Icon: CheckCircle2, color: 'from-emerald-500 to-green-500', ring: 'ring-emerald-400/50', bg: 'bg-emerald-500/15' },
    { value: 'warning' as const, label: tr('Cảnh báo', 'Warning'), Icon: ShieldAlert, color: 'from-amber-500 to-orange-400', ring: 'ring-amber-400/50', bg: 'bg-amber-500/15' },
  ];

  const targetOptions = [
    { value: 'all' as const, label: tr('Tất cả', 'All Users'), Icon: Users2, desc: tr('Gửi cho tất cả người dùng', 'Send to all users') },
    { value: 'free' as const, label: 'Free', Icon: UserCheck, desc: tr('Chỉ tài khoản miễn phí', 'Free accounts only') },
    { value: 'premium' as const, label: 'Premium', Icon: Crown, desc: tr('Chỉ tài khoản premium', 'Premium accounts only') },
    { value: 'tier' as const, label: tr('Theo gói', 'By Tier'), Icon: Crown, desc: tr('Chọn một hoặc nhiều gói VIP', 'Choose one or more VIP tiers') },
    { value: 'selected_users' as const, label: tr('Đã chọn', 'Selected'), Icon: UserCheck, desc: tr(`${selectedUserCount} người dùng trong bảng`, `${selectedUserCount} table users`) },
  ];

  const durationOptions = [
    { value: 3000, label: '3s' },
    { value: 5000, label: '5s' },
    { value: 8000, label: '8s' },
    { value: 15000, label: '15s' },
    { value: 30000, label: '30s' },
  ];

  const selectedType = typeOptions.find((o) => o.value === form.type) || typeOptions[0];
  const isValid = form.title.trim().length > 0 && form.message.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700/60 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{tr('Gửi thông báo', 'Send Broadcast')}</h3>
              <p className="text-xs text-gray-400">{tr('Gửi thông báo đến người dùng theo thời gian thực', 'Send real-time notifications to users')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Notification Type */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{tr('Loại thông báo', 'Notification Type')}</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, type: opt.value })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer ${
                    form.type === opt.value
                      ? `${opt.bg} border-opacity-60 ring-1 ${opt.ring} border-transparent`
                      : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${opt.color} flex items-center justify-center shadow-sm`}>
                    <opt.Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-xs font-medium ${form.type === opt.value ? 'text-white' : 'text-gray-400'}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{tr('Tiêu đề', 'Title')} <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={tr('Nhập tiêu đề thông báo...', 'Enter notification title...')}
              maxLength={100}
              className="w-full bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
            <p className="text-right text-[10px] text-gray-500">{form.title.length}/100</p>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{tr('Nội dung', 'Message')} <span className="text-red-400">*</span></label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder={tr('Nhập nội dung thông báo...', 'Enter notification message...')}
              maxLength={500}
              rows={3}
              className="w-full bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none"
            />
            <p className="text-right text-[10px] text-gray-500">{form.message.length}/500</p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              {tr('Thời gian hiển thị', 'Display Duration')}
            </label>
            <div className="flex gap-2">
              {durationOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, durationMs: opt.value })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    form.durationMs === opt.value
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target audience */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{tr('Đối tượng nhận', 'Target Audience')}</label>
            <div className="space-y-2">
              {targetOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, target: { ...form.target, type: opt.value } })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer text-left ${
                    form.target.type === opt.value
                      ? 'bg-purple-500/15 border-purple-500/40 ring-1 ring-purple-400/30'
                      : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    form.target.type === opt.value ? 'bg-purple-500/30' : 'bg-gray-700/60'
                  }`}>
                    <opt.Icon className={`w-4 h-4 ${form.target.type === opt.value ? 'text-purple-300' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${form.target.type === opt.value ? 'text-white' : 'text-gray-300'}`}>{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    form.target.type === opt.value ? 'border-purple-400 bg-purple-500' : 'border-gray-600'
                  }`}>
                    {form.target.type === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
            {form.target.type === 'tier' && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                {TIER_OPTIONS.filter((tier) => tier.value !== 'FREE').map((tier) => (
                  <label key={tier.value} className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={form.target.tiers?.includes(tier.value) || false}
                      onChange={(event) => {
                        const tiers = new Set(form.target.tiers || []);
                        if (event.target.checked) tiers.add(tier.value);
                        else tiers.delete(tier.value);
                        setForm({ ...form, target: { ...form.target, tiers: Array.from(tiers) } });
                      }}
                    />
                    {tier.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {(form.title || form.message) && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{tr('Xem trước', 'Preview')}</label>
              <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${selectedType.color} flex items-center justify-center flex-shrink-0 shadow`}>
                    <selectedType.Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{form.title || tr('Tiêu đề...', 'Title...')}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{form.message || tr('Nội dung thông báo...', 'Notification message...')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {status && (
          <div className={`mx-6 mb-4 rounded-xl border px-4 py-3 text-sm ${
            status.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}>
            {status.message}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700/50 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm font-medium transition-all cursor-pointer"
          >
            {tr('Hủy', 'Cancel')}
          </button>
          <button
            onClick={onSubmit}
            disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <SendHorizonal className="w-4 h-4" />
            )}
            {loading ? tr('Đang gửi...', 'Sending...') : tr('Gửi thông báo', 'Send Broadcast')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RewardModal({
  form,
  setForm,
  onSubmit,
  onPreview,
  onClose,
  loading,
  language,
  status,
  selectedUserCount,
  giftCatalog,
  preview,
}: {
  form: RewardForm;
  setForm: (form: RewardForm) => void;
  onSubmit: () => void;
  onPreview: () => void;
  onClose: () => void;
  loading: boolean;
  language: string;
  status: { type: 'success' | 'error'; message: string } | null;
  selectedUserCount: number;
  giftCatalog: GiftCatalogItem[];
  preview: { recipientCount: number; directEligible: number; inventoryFallbackEstimate: number } | null;
}) {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const targetOptions = [
    { value: 'all' as const, label: tr('Tất cả', 'All Users') },
    { value: 'free' as const, label: 'Free' },
    { value: 'premium' as const, label: 'Premium' },
    { value: 'tier' as const, label: tr('Theo gói', 'By Tier') },
    { value: 'selected_users' as const, label: tr(`Đã chọn (${selectedUserCount})`, `Selected (${selectedUserCount})`) },
  ];
  const isValid = Number(form.coins || 0) > 0 || Number(form.gems || 0) > 0 || form.gifts.length > 0;

  return (
    <Modal title={tr('Tặng thưởng', 'Give Rewards')} size="lg" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="text-sm text-gray-400">{tr('Xu', 'Coins')}</span>
            <input
              type="number"
              min={0}
              value={form.coins}
              onChange={(event) => setForm({ ...form, coins: Number(event.target.value) })}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-gray-400">{tr('Ngọc', 'Gems')}</span>
            <input
              type="number"
              min={0}
              value={form.gems}
              onChange={(event) => setForm({ ...form, gems: Number(event.target.value) })}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-gray-400">{tr('Nội dung thông báo', 'Notification message')}</span>
          <textarea
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
            rows={3}
            maxLength={500}
            placeholder={tr('Bạn đã nhận được phần thưởng từ quản trị viên.', 'You received a reward from the admin.')}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white resize-none"
          />
        </label>

        <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{tr('Quà tặng cụ thể', 'Concrete gifts')}</p>
            <button
              type="button"
              onClick={() => {
                const firstGift = giftCatalog[0];
                if (!firstGift) return;
                setForm({ ...form, gifts: [...form.gifts, { giftId: firstGift.id, quantity: 1 }] });
              }}
              className="rounded-lg bg-pink-500/20 px-3 py-1.5 text-xs font-medium text-pink-200 hover:bg-pink-500/30"
            >
              {tr('Thêm quà', 'Add gift')}
            </button>
          </div>
          <div className="space-y-2">
            {form.gifts.map((giftReward, index) => (
              <div key={`${giftReward.giftId}-${index}`} className="flex gap-2">
                <select
                  value={giftReward.giftId}
                  onChange={(event) => {
                    const next = [...form.gifts];
                    next[index] = { ...next[index], giftId: event.target.value };
                    setForm({ ...form, gifts: next });
                  }}
                  className="min-w-0 flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                >
                  {giftCatalog.map((gift) => (
                    <option key={gift.id} value={gift.id}>{gift.emoji} {gift.name} · {gift.minimumTier}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={giftReward.quantity}
                  onChange={(event) => {
                    const next = [...form.gifts];
                    next[index] = { ...next[index], quantity: Number(event.target.value) || 1 };
                    setForm({ ...form, gifts: next });
                  }}
                  className="w-20 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gifts: form.gifts.filter((_, itemIndex) => itemIndex !== index) })}
                  className="px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {form.gifts.length === 0 && <p className="text-sm text-gray-500">{tr('Chưa chọn quà cụ thể', 'No concrete gift selected')}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-400">{tr('Phạm vi người nhận', 'Recipient scope')}</p>
          <div className="grid grid-cols-2 gap-2">
            {targetOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm({ ...form, target: { ...form.target, type: option.value } })}
                className={`rounded-xl border px-3 py-2 text-sm text-left ${
                  form.target.type === option.value
                    ? 'border-purple-400 bg-purple-500/15 text-white'
                    : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{tr('Xem trước người nhận', 'Recipient preview')}</p>
              <p className="text-xs text-gray-400">
                {preview
                  ? tr(
                      `${preview.recipientCount} người · trực tiếp ${preview.directEligible} · lưu kho ${preview.inventoryFallbackEstimate}`,
                      `${preview.recipientCount} users · direct ${preview.directEligible} · inventory ${preview.inventoryFallbackEstimate}`
                    )
                  : tr('Bấm xem trước trước khi gửi số lượng lớn.', 'Preview recipient count before sending.')}
              </p>
            </div>
            <button type="button" onClick={onPreview} className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-600">
              {tr('Xem trước', 'Preview')}
            </button>
          </div>
        </div>

        {form.target.type === 'tier' && (
          <div className="grid grid-cols-2 gap-2">
            {TIER_OPTIONS.filter((tier) => tier.value !== 'FREE').map((tier) => (
              <label key={tier.value} className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.target.tiers?.includes(tier.value) || false}
                  onChange={(event) => {
                    const tiers = new Set(form.target.tiers || []);
                    if (event.target.checked) tiers.add(tier.value);
                    else tiers.delete(tier.value);
                    setForm({ ...form, target: { ...form.target, tiers: Array.from(tiers) } });
                  }}
                />
                {tier.label}
              </label>
            ))}
          </div>
        )}

        {status && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            status.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}>
            {status.message}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
            {tr('Hủy', 'Cancel')}
          </button>
          <button
            onClick={onSubmit}
            disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? tr('Đang xử lý...', 'Processing...') : tr('Tặng thưởng', 'Give Rewards')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminPage() {
  const { language, toggleLanguage } = useLanguageStore();
  const t = ADMIN_I18N[language];
  const tr = useCallback((vi: string, en: string) => (language === 'vi' ? vi : en), [language]);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = checking
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(7);
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questSummary, setQuestSummary] = useState<QuestSummary | null>(null);
  const [questFilters, setQuestFilters] = useState<QuestFilters>({
    search: '',
    type: '',
    category: '',
    isActive: '',
    action: '',
    minimumTier: '',
    rewardType: '',
    giftId: '',
  });
  const [giftCatalog, setGiftCatalog] = useState<GiftCatalogItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  
  const [userPagination, setUserPagination] = useState<Pagination>({ ...DEFAULT_PAGINATION, limit: 20 });
  const [characterPagination, setCharacterPagination] = useState<Pagination>({ ...DEFAULT_PAGINATION, limit: 20 });
  const [messagePagination, setMessagePagination] = useState<Pagination>({ ...DEFAULT_PAGINATION, limit: 50 });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Broadcast modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState<{
    title: string;
    message: string;
    type: BroadcastType;
    durationMs: number;
    target: AdminTarget;
  }>({
    title: '',
    message: '',
    type: 'info' as BroadcastType,
    durationMs: 5000,
    target: { type: 'all' as RewardTargetType, tiers: [] as string[], userIds: [] as string[] },
  });
  const [broadcastStatus, setBroadcastStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardForm, setRewardForm] = useState<RewardForm>({
    coins: 0,
    gems: 0,
    message: '',
    target: { type: 'all', tiers: [], userIds: [] },
    gifts: [],
  });
  const [rewardPreview, setRewardPreview] = useState<{ recipientCount: number; directEligible: number; inventoryFallbackEstimate: number } | null>(null);
  const [rewardStatus, setRewardStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState<ResetPasswordForm | null>(null);
  const [resetPasswordStatus, setResetPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<User | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ message, type });
  };

  const getQuestActionLabel = useCallback((action?: string) => {
    const labels: Record<string, string> = {
      send_message: tr('Gửi tin nhắn', 'Send messages'),
      send_gift: tr('Tặng quà', 'Send gifts'),
      daily_login: tr('Đăng nhập ngày', 'Daily login'),
      morning_greeting: tr('Chào buổi sáng', 'Morning greeting'),
      goodnight_message: tr('Chúc ngủ ngon', 'Goodnight message'),
      romantic_message: tr('Tin nhắn lãng mạn', 'Romantic message'),
      reach_level: tr('Đạt level', 'Reach level'),
      reach_affection: tr('Đạt thân mật', 'Reach affection'),
    };
    return action ? labels[action] || action : tr('Chưa cấu hình', 'Missing config');
  }, [tr]);

  const getQuestRequirementText = useCallback((quest: Quest) => {
    const action = quest.requirements?.action;
    const count = quest.requirements?.count || 1;
    return `${getQuestActionLabel(action)} · ${count}`;
  }, [getQuestActionLabel]);

  const handleLogout = useCallback(() => {
    setToken('');
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
  }, []);

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}, authToken?: string) => {
    const tokenToUse = authToken || token || localStorage.getItem('adminToken') || '';
    
    const res = await fetch(`${API_URL}/api/admin${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenToUse}`,
        ...options.headers,
      },
    });
    
    if (res.status === 401) {
      handleLogout();
      throw new Error('Session expired');
    }
    
    return res;
  }, [handleLogout, token]);

  // Check for saved token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      // Verify token is still valid
      fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (res.ok) {
            setToken(savedToken);
            setIsLoggedIn(true);
          } else {
            localStorage.removeItem('adminToken');
            setIsLoggedIn(false);
          }
        })
        .catch(() => {
          localStorage.removeItem('adminToken');
          setIsLoggedIn(false);
        });
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || tr('Đăng nhập thất bại', 'Login failed'));

      setToken(data.token);
      localStorage.setItem('adminToken', data.token);
      setIsLoggedIn(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tr('Đăng nhập thất bại', 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Fetch functions
  const fetchStats = useCallback(async () => {
    const res = await apiCall('/stats');
    if (res.ok) setStats(await res.json());
  }, [apiCall]);

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(userPagination.page),
      limit: String(userPagination.limit),
      ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
    });
    const res = await apiCall(`/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setUserPagination(data.pagination);
    }
  }, [apiCall, userPagination.page, userPagination.limit, debouncedSearchQuery]);

  const fetchCharacters = useCallback(async () => {
    const params = new URLSearchParams({ page: String(characterPagination.page), limit: String(characterPagination.limit) });
    const res = await apiCall(`/characters?${params}`);
    if (res.ok) {
      const data = await res.json();
      setCharacters(data.characters);
      setCharacterPagination(data.pagination);
    }
  }, [apiCall, characterPagination.page, characterPagination.limit]);

  const fetchMessages = useCallback(async () => {
    const params = new URLSearchParams({ page: String(messagePagination.page), limit: String(messagePagination.limit) });
    const res = await apiCall(`/messages?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
      setMessagePagination(data.pagination);
    }
  }, [apiCall, messagePagination.page, messagePagination.limit]);

  const fetchGiftCatalog = useCallback(async () => {
    const res = await apiCall('/gift-catalog?isActive=true&take=200');
    if (res.ok) {
      const data = await res.json();
      setGiftCatalog(data.gifts || []);
    }
  }, [apiCall]);

  const fetchQuests = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(questFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const res = await apiCall(`/quests${params.toString() ? `?${params}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setQuests(data);
        setQuestSummary(null);
      } else {
        setQuests(data.quests || []);
        setQuestSummary(data.summary || null);
      }
    }
  }, [apiCall, questFilters]);

  const fetchAnalytics = useCallback(async (days?: number) => {
    const d = days ?? analyticsDays;
    const res = await apiCall(`/analytics?days=${d}`);
    if (res.ok) setAnalytics(await res.json());
  }, [analyticsDays, apiCall]);

  const fetchTemplates = useCallback(async () => {
    const res = await apiCall('/templates');
    if (res.ok) setTemplates(await res.json());
  }, [apiCall]);

  const fetchSystemInfo = useCallback(async () => {
    const res = await apiCall('/system');
    if (res.ok) setSystemInfo(await res.json());
  }, [apiCall]);

  // Fetch data when tab changes
  useEffect(() => {
    if (isLoggedIn !== true || !token) return;

    const fetchData = async () => {
      try {
        switch (activeTab) {
          case 'dashboard':
            await fetchStats();
            break;
          case 'users':
            await fetchUsers();
            break;
          case 'characters':
            await fetchCharacters();
            break;
          case 'messages':
            await fetchMessages();
            break;
          case 'quests':
            await fetchQuests();
            await fetchGiftCatalog();
            break;
          case 'templates':
            await fetchTemplates();
            break;
          case 'analytics':
            await fetchAnalytics();
            break;
          case 'system':
            await fetchSystemInfo();
            break;
          case 'tier-configs':
            break;
          case 'pricing':
            break;
          case 'ai-settings':
            break;
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    void fetchData();
  }, [activeTab, fetchAnalytics, fetchCharacters, fetchGiftCatalog, fetchMessages, fetchQuests, fetchStats, fetchSystemInfo, fetchTemplates, fetchUsers, isLoggedIn, token]);

  // Action handlers
  const handleUpdateUser = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await apiCall(`/users/${selectedItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((current) => current.map((user) => user.id === selectedItem.id ? { ...user, ...data.user } : user));
        showToast(tr('Cập nhật người dùng thành công', 'User updated successfully'));
        setShowModal(null);
      } else {
        const data = await res.json();
        showToast(data.error || tr('Cập nhật người dùng thất bại', 'Failed to update user'), 'error');
      }
    } catch {
      showToast(tr('Cập nhật người dùng thất bại', 'Failed to update user'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openResetPassword = (user: User) => {
    setResetPasswordStatus(null);
    setResetPasswordForm({
      userId: user.id,
      username: user.username || user.email,
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleResetPasswordSubmit = async () => {
    if (!resetPasswordForm) return;
    if (resetPasswordForm.newPassword.length < 8) {
      setResetPasswordStatus({ type: 'error', message: tr('Mật khẩu phải có ít nhất 8 ký tự', 'Password must be at least 8 characters') });
      return;
    }
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setResetPasswordStatus({ type: 'error', message: tr('Mật khẩu xác nhận không khớp', 'Password confirmation does not match') });
      return;
    }

    setActionLoading(true);
    setResetPasswordStatus(null);
    try {
      const res = await apiCall(`/users/${resetPasswordForm.userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: resetPasswordForm.newPassword }),
      });
      if (res.ok) {
        setResetPasswordStatus({ type: 'success', message: tr('Đặt lại mật khẩu thành công', 'Password reset successfully') });
      } else {
        const data = await res.json();
        setResetPasswordStatus({ type: 'error', message: data.error || tr('Đặt lại mật khẩu thất bại', 'Failed to reset password') });
      }
    } catch {
      setResetPasswordStatus({ type: 'error', message: tr('Đặt lại mật khẩu thất bại', 'Failed to reset password') });
    } finally {
      setActionLoading(false);
    }
  };

  const openRewardModal = (target: AdminTarget = { type: 'all', tiers: [], userIds: [] }) => {
    setRewardStatus(null);
    setRewardPreview(null);
    setRewardForm({
      coins: 0,
      gems: 0,
      message: '',
      target,
      gifts: [],
    });
    void fetchGiftCatalog();
    setShowRewardModal(true);
  };

  const handleRewardSubmit = async () => {
    const coins = Number(rewardForm.coins || 0);
    const gems = Number(rewardForm.gems || 0);
    if (coins <= 0 && gems <= 0 && rewardForm.gifts.length === 0) {
      setRewardStatus({ type: 'error', message: tr('Nhập ít nhất một phần thưởng lớn hơn 0', 'Enter at least one reward greater than 0') });
      return;
    }

    const target = {
      ...rewardForm.target,
      userIds: rewardForm.target.type === 'selected_users' ? selectedUserIds : rewardForm.target.userIds,
    };
    setActionLoading(true);
    setRewardStatus(null);
    try {
      const res = await apiCall('/bulk/rewards', {
        method: 'POST',
        body: JSON.stringify({
          coins,
          gems,
          message: rewardForm.message.trim(),
          target,
          gifts: rewardForm.gifts,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRewardStatus({
          type: 'success',
          message: language === 'vi'
            ? `Đã tặng thưởng cho ${data.affected || 0} người dùng, trao trực tiếp ${data.directDelivered || 0}, lưu kho ${data.inventoryFallback || 0}.`
            : `Rewarded ${data.affected || 0} users, direct ${data.directDelivered || 0}, inventory ${data.inventoryFallback || 0}.`,
        });
        void fetchUsers();
      } else {
        const data = await res.json();
        setRewardStatus({ type: 'error', message: data.error || tr('Tặng thưởng thất bại', 'Failed to give rewards') });
      }
    } catch {
      setRewardStatus({ type: 'error', message: tr('Tặng thưởng thất bại', 'Failed to give rewards') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRewardPreview = async () => {
    const target = {
      ...rewardForm.target,
      userIds: rewardForm.target.type === 'selected_users' ? selectedUserIds : rewardForm.target.userIds,
    };
    try {
      const res = await apiCall('/bulk/rewards/preview', {
        method: 'POST',
        body: JSON.stringify({ target }),
      });
      if (res.ok) setRewardPreview(await res.json());
    } catch {
      setRewardStatus({ type: 'error', message: tr('Không xem trước được người nhận', 'Failed to preview recipients') });
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    if (!confirm(tr('Xóa nhân vật này và toàn bộ dữ liệu liên quan? Hành động này không thể hoàn tác.', 'Delete this character and all related data? This cannot be undone.'))) return;
    
    setActionLoading(true);
    try {
      const res = await apiCall(`/characters/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(tr('Đã xóa nhân vật', 'Character deleted'));
        fetchCharacters();
      }
    } catch {
      showToast(tr('Xóa nhân vật thất bại', 'Failed to delete character'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleQuest = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await apiCall(`/quests/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        showToast(tr('Đã đổi trạng thái nhiệm vụ', 'Quest status toggled'));
        fetchQuests();
      }
    } catch {
      showToast(tr('Đổi trạng thái nhiệm vụ thất bại', 'Failed to toggle quest'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateQuest = async () => {
    setActionLoading(true);
    try {
      const res = await apiCall('/quests', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showToast(tr('Đã tạo nhiệm vụ', 'Quest created'));
        setShowModal(null);
        fetchQuests();
      } else {
        const data = await res.json();
        showToast(data.error || tr('Tạo nhiệm vụ thất bại', 'Failed to create quest'), 'error');
      }
    } catch {
      showToast(tr('Tạo nhiệm vụ thất bại', 'Failed to create quest'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTemplate = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await apiCall(`/templates/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        showToast(tr('Đã đổi trạng thái mẫu', 'Template status toggled'));
        fetchTemplates();
      }
    } catch {
      showToast(tr('Đổi trạng thái mẫu thất bại', 'Failed to toggle template'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('gender', String(formData.gender || 'FEMALE').toLowerCase());

      const tokenToUse = token || localStorage.getItem('adminToken') || '';
      const res = await fetch(`${API_URL}/api/admin/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenToUse}` },
        body,
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || tr('Upload thất bại', 'Upload failed'), 'error');
        return;
      }

      const data = await res.json();
      setFormData({ ...formData, avatarUrl: data.url });
      showToast(tr('Upload thành công', 'Upload successful'));
    } catch {
      showToast(tr('Upload thất bại', 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateTemplate = async () => {
    const source = formData as Record<string, unknown>;
    const payload = {
      ...source,
      name: String(source.name || '').trim(),
      description: String(source.description || '').trim(),
      avatarUrl: String(source.avatarUrl || '').trim(),
      sortOrder: Number(source.sortOrder || 0),
      isDefault: Boolean(source.isDefault),
      isActive: source.isActive !== false,
    };

    if (!payload.name || !payload.description || !payload.avatarUrl) {
      showToast(tr('Vui lòng nhập đủ tên, mô tả và avatar URL', 'Please fill name, description and avatar URL'), 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiCall('/templates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(tr('Đã tạo mẫu nhân vật', 'Template created'));
        setShowModal(null);
        setSelectedTemplate(null);
        setFormData({});
        fetchTemplates();
      } else {
        const data = await res.json();
        showToast(data.error || tr('Tạo mẫu thất bại', 'Failed to create template'), 'error');
      }
    } catch {
      showToast(tr('Tạo mẫu thất bại', 'Failed to create template'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    const source = formData as Record<string, unknown>;
    const payload = {
      ...source,
      name: String(source.name || '').trim(),
      description: String(source.description || '').trim(),
      avatarUrl: String(source.avatarUrl || '').trim(),
      sortOrder: Number(source.sortOrder || 0),
      isDefault: Boolean(source.isDefault),
      isActive: source.isActive !== false,
    };

    setActionLoading(true);
    try {
      const res = await apiCall(`/templates/${selectedTemplate.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(tr('Đã cập nhật mẫu nhân vật', 'Template updated'));
        setShowModal(null);
        setSelectedTemplate(null);
        setFormData({});
        fetchTemplates();
      } else {
        const data = await res.json();
        showToast(data.error || tr('Cập nhật mẫu thất bại', 'Failed to update template'), 'error');
      }
    } catch {
      showToast(tr('Cập nhật mẫu thất bại', 'Failed to update template'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(tr('Xóa mẫu nhân vật này?', 'Delete this character template?'))) return;

    setActionLoading(true);
    try {
      const res = await apiCall(`/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(tr('Đã xóa mẫu nhân vật', 'Template deleted'));
        fetchTemplates();
      } else {
        const data = await res.json();
        showToast(data.error || tr('Xóa mẫu thất bại', 'Failed to delete template'), 'error');
      }
    } catch {
      showToast(tr('Xóa mẫu thất bại', 'Failed to delete template'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBroadcast = () => {
    setBroadcastStatus(null);
    setBroadcastForm({ title: '', message: '', type: 'info', durationMs: 5000, target: { type: 'all', tiers: [], userIds: [] } });
    setShowBroadcastModal(true);
  };

  const handleBroadcastSubmit = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) return;
    const target = {
      ...broadcastForm.target,
      userIds: broadcastForm.target.type === 'selected_users' ? selectedUserIds : broadcastForm.target.userIds,
    };
    setActionLoading(true);
    try {
      const res = await apiCall('/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: broadcastForm.title.trim(),
          message: broadcastForm.message.trim(),
          type: broadcastForm.type,
          durationMs: broadcastForm.durationMs,
          target,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcastStatus({
          type: 'success',
          message: language === 'vi'
            ? `Đã gửi ${data.persisted || 0} thông báo, realtime ${data.deliveredRealtime || 0}.`
            : `Sent ${data.persisted || 0} notifications, realtime ${data.deliveredRealtime || 0}.`,
        });
      } else {
        const data = await res.json();
        setBroadcastStatus({ type: 'error', message: data.error || tr('Gửi thông báo thất bại', 'Failed to send broadcast') });
      }
    } catch {
      setBroadcastStatus({ type: 'error', message: tr('Gửi thông báo thất bại', 'Failed to send broadcast') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanup = async (action: string) => {
    if (!confirm(language === 'vi' ? `Chạy dọn dẹp: ${action}?` : `Run cleanup: ${action}?`)) return;
    
    setActionLoading(true);
    try {
      const res = await apiCall('/cleanup', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
      }
    } catch {
      showToast(tr('Dọn dẹp thất bại', 'Cleanup failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!confirm(tr('Dọn các mẫu trùng lặp? Thao tác này sẽ:\n- Xóa các mẫu trùng tên\n- Chuyển nhân vật sang mẫu được giữ lại\n\nTiếp tục?', 'Clean up duplicate templates? This will:\n- Remove duplicate templates with the same name\n- Migrate characters to the kept template\n\nContinue?'))) return;
    
    setActionLoading(true);
    try {
      const res = await apiCall('/cleanup/duplicate-templates', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        const message = data.deleted.length > 0 
          ? language === 'vi'
            ? `Đã xóa ${data.deleted.length} bản trùng: ${data.deleted.join(', ')}`
            : `Deleted ${data.deleted.length} duplicates: ${data.deleted.join(', ')}`
          : tr('Không tìm thấy mẫu trùng lặp', 'No duplicates found');
        showToast(message);
        // Refresh templates list
        fetchTemplates();
      } else {
        const error = await res.json();
        showToast(error.message || tr('Dọn dẹp thất bại', 'Cleanup failed'), 'error');
      }
    } catch {
      showToast(tr('Dọn dẹp thất bại', 'Cleanup failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: { id: TabType; icon: typeof Users; label: string }[] = useMemo(() => [
    { id: 'dashboard', icon: LayoutDashboard, label: t.tabs.dashboard },
    { id: 'users', icon: Users, label: t.tabs.users },
    { id: 'characters', icon: Heart, label: t.tabs.characters },
    { id: 'messages', icon: MessageSquare, label: t.tabs.messages },
    { id: 'quests', icon: Target, label: t.tabs.quests },
    { id: 'templates', icon: ImageIcon, label: t.tabs.templates },
    { id: 'analytics', icon: BarChart3, label: t.tabs.analytics },
    { id: 'system', icon: Server, label: t.tabs.system },
    { id: 'ai-settings', icon: Brain, label: t.tabs.aiSettings },
    { id: 'tier-configs', icon: Settings, label: t.tabs.tierConfigs },
    { id: 'pricing', icon: Coins, label: t.tabs.pricing },
  ], [t]);

  // Loading state - checking token
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-400">{tr('Đang kiểm tra xác thực...', 'Checking authentication...')}</p>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">{t.loginTitle}</h1>
              <p className="text-gray-400 mt-2">{t.loginSubtitle}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t.username}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder={language === 'vi' ? 'tài khoản admin' : 'admin account'}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{t.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder={language === 'vi' ? 'nhập mật khẩu' : 'enter password'}
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {loading ? t.loggingIn : t.loginButton}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 p-4">
        <div className="h-full flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">{t.loginTitle}</h1>
              <p className="text-xs text-gray-400">Amoura</p>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between px-1">
            <span className="text-xs uppercase tracking-wide text-gray-400">{t.languageTitle}</span>
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-700/60 border border-gray-600 text-gray-200 hover:text-white hover:border-purple-400"
              title={language === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'}
            >
              <Languages className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase">{language}</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
            <nav className="space-y-1">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === item.id ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-gray-700/50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-gray-700/50 space-y-2">
              <button
                onClick={handleBroadcast}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-700/50"
              >
                <Megaphone className="w-5 h-5" />
                {t.broadcast}
              </button>
              <button
                onClick={() => openRewardModal({ type: selectedUserIds.length > 0 ? 'selected_users' : 'all', tiers: [], userIds: selectedUserIds })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-700/50"
              >
                <Sparkles className="w-5 h-5" />
                {t.reward}
              </button>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-gray-700/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20"
            >
              <LogOut className="w-5 h-5" />
              {t.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {statusMessage && (
          <div className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
            statusMessage.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}>
            <span>{statusMessage.message}</span>
            <button onClick={() => setStatusMessage(null)} className="p-1 rounded hover:bg-white/10" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && stats && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
            </motion.div>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{tr('Quản lý người dùng', 'Users Management')}</h2>
                <button onClick={fetchUsers} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setUserPagination(p => ({ ...p, page: 1 })); }}
                    placeholder={tr('Tìm theo email, tên người dùng...', 'Search by email, username...')}
                    className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="w-10 px-4 py-4">
                        <input
                          type="checkbox"
                          checked={users.length > 0 && users.every((user) => selectedUserIds.includes(user.id))}
                          onChange={(event) => {
                            setSelectedUserIds((current) => {
                              const pageIds = users.map((user) => user.id);
                              if (event.target.checked) return Array.from(new Set([...current, ...pageIds]));
                              return current.filter((id) => !pageIds.includes(id));
                            });
                          }}
                          aria-label={tr('Chọn tất cả người dùng trên trang', 'Select all users on this page')}
                        />
                      </th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Người dùng', 'User')}</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">Email</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">Premium</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Xu', 'Coins')}</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Ngọc', 'Gems')}</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Thao tác', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={(event) => {
                              setSelectedUserIds((current) => event.target.checked
                                ? Array.from(new Set([...current, user.id]))
                                : current.filter((id) => id !== user.id));
                            }}
                            aria-label={tr('Chọn người dùng', 'Select user')}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                              {(user.displayName || user.username || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{user.displayName || user.username}</p>
                              <p className="text-sm text-gray-400">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300">{user.email}</td>
                        <td className="px-6 py-4 text-center">
                          {user.isPremium ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                              <Crown className="w-3 h-3" />
                              {user.premiumTier || 'Premium'}
                            </span>
                          ) : (
                            <span className="text-gray-500">{tr('Miễn phí', 'Free')}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-yellow-400">{user.coins}</td>
                        <td className="px-6 py-4 text-center text-purple-400">{user.gems}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedItem(user);
                                setFormData({
                                  coins: user.coins,
                                  gems: user.gems,
                                  email: user.email,
                                  username: user.username,
                                  displayName: user.displayName || '',
                                  bio: user.bio || '',
                                  userGender: user.userGender || 'NOT_SPECIFIED',
                                  datingPreference: user.datingPreference || 'ALL',
                                  isPremium: user.isPremium,
                                  premiumTier: user.premiumTier || 'FREE',
                                  premiumExpiresAt: user.premiumExpiresAt ? user.premiumExpiresAt.slice(0, 10) : '',
                                  isEmailVerified: user.isEmailVerified,
                                });
                                setShowModal('editUser');
                              }}
                              className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                              title={tr('Sửa', 'Edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openResetPassword(user)}
                              className="p-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"
                              title={tr('Đặt lại mật khẩu', 'Reset Password')}
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openRewardModal({ type: 'selected_users', userIds: [user.id], tiers: [] })}
                              className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                              title={tr('Tặng thưởng', 'Give Rewards')}
                            >
                              <Gift className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls pagination={userPagination} setPagination={setUserPagination} language={language} />
              </div>
            </motion.div>
          )}

          {/* CHARACTERS */}
          {activeTab === 'characters' && (
            <motion.div key="characters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{tr('Quản lý nhân vật', 'Characters Management')}</h2>
                <button onClick={fetchCharacters} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Nhân vật', 'Character')}</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Chủ sở hữu', 'Owner')}</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Cấp độ', 'Level')}</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Độ thân mật', 'Affection')}</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Trạng thái', 'Status')}</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Thao tác', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {characters.map((char) => (
                      <tr key={char.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{char.name}</p>
                            <p className="text-sm text-gray-400">{char.personality} • {char.gender}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300">{char.user.email}</td>
                        <td className="px-6 py-4 text-center">{char.level}</td>
                        <td className="px-6 py-4 text-center text-pink-400">{char.affection}%</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-sm ${char.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {char.isActive ? tr('Đang hoạt động', 'Active') : tr('Không hoạt động', 'Inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteCharacter(char.id)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                            title={tr('Xóa', 'Delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls pagination={characterPagination} setPagination={setCharacterPagination} language={language} />
              </div>
            </motion.div>
          )}

          {/* MESSAGES */}
          {activeTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{tr('Tin nhắn', 'Messages')} ({messagePagination.total.toLocaleString()})</h2>
                <button onClick={fetchMessages} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Người dùng', 'User')}</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Nhân vật', 'Character')}</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Vai trò', 'Role')}</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Nội dung', 'Content')}</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Ngày', 'Date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg) => (
                      <tr key={msg.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-6 py-4 text-gray-300">{msg.user.email}</td>
                        <td className="px-6 py-4 text-gray-300">{msg.character?.name || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {msg.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300 max-w-md truncate">{msg.content}</td>
                        <td className="px-6 py-4 text-gray-400 text-sm">{new Date(msg.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls pagination={messagePagination} setPagination={setMessagePagination} language={language} />
              </div>
            </motion.div>
          )}

          {/* QUESTS */}
          {activeTab === 'quests' && (
            <motion.div key="quests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{tr('Quản lý nhiệm vụ', 'Quests Management')}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setFormData({
                        type: 'DAILY',
                        category: 'chat',
                        requirements: { action: 'send_message', count: 1 },
                        rewardCoins: 0,
                        rewardGems: 0,
                        rewardXp: 0,
                        rewardAffection: 0,
                        minimumTier: 'FREE',
                        giftRewards: [],
                        isActive: true,
                      });
                      setShowModal('createQuest');
                    }}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> {tr('Tạo nhiệm vụ', 'Create Quest')}
                  </button>
                  <button onClick={fetchQuests} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
                {[
                  { label: tr('Tổng', 'Total'), value: questSummary?.total ?? quests.length, color: 'text-white' },
                  { label: tr('Đang hoạt động', 'Active'), value: questSummary?.active ?? quests.filter((q) => q.isActive).length, color: 'text-green-300' },
                  { label: tr('Tạm tắt', 'Inactive'), value: questSummary?.inactive ?? quests.filter((q) => !q.isActive).length, color: 'text-red-300' },
                  { label: 'VIP', value: questSummary?.premium ?? quests.filter((q) => q.requiresPremium || q.minimumTier !== 'FREE').length, color: 'text-amber-300' },
                  { label: tr('Có quà', 'Gift reward'), value: questSummary?.withGiftReward ?? quests.filter((q) => (q.giftRewards || []).length > 0).length, color: 'text-pink-300' },
                  { label: tr('Thiếu cấu hình', 'Missing config'), value: questSummary?.missingConfig ?? quests.filter((q) => !q.requirements?.action || !q.requirements?.count).length, color: 'text-orange-300' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-700/60 bg-gray-800/50 p-4">
                    <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-gray-400">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="mb-5 rounded-2xl border border-gray-700/50 bg-gray-800/40 p-4">
                <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
                  <input
                    value={questFilters.search}
                    onChange={(e) => setQuestFilters({ ...questFilters, search: e.target.value })}
                    placeholder={tr('Tìm nhiệm vụ...', 'Search quests...')}
                    className="rounded-lg border border-gray-600 bg-gray-900/60 px-3 py-2 text-sm text-white md:col-span-2"
                  />
                  <select value={questFilters.type} onChange={(e) => setQuestFilters({ ...questFilters, type: e.target.value })} className="rounded-lg border border-gray-600 bg-gray-900/60 px-3 py-2 text-sm text-white">
                    <option value="">{tr('Mọi loại', 'All types')}</option>
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="ACHIEVEMENT">ACHIEVEMENT</option>
                    <option value="RELATIONSHIP">RELATIONSHIP</option>
                    <option value="STORY">STORY</option>
                  </select>
                  <select value={questFilters.isActive} onChange={(e) => setQuestFilters({ ...questFilters, isActive: e.target.value })} className="rounded-lg border border-gray-600 bg-gray-900/60 px-3 py-2 text-sm text-white">
                    <option value="">{tr('Mọi trạng thái', 'All status')}</option>
                    <option value="true">{tr('Đang hoạt động', 'Active')}</option>
                    <option value="false">{tr('Tạm tắt', 'Inactive')}</option>
                  </select>
                  <select value={questFilters.action} onChange={(e) => setQuestFilters({ ...questFilters, action: e.target.value })} className="rounded-lg border border-gray-600 bg-gray-900/60 px-3 py-2 text-sm text-white">
                    <option value="">{tr('Mọi hành động', 'All actions')}</option>
                    {['send_message', 'send_gift', 'daily_login', 'morning_greeting', 'goodnight_message', 'romantic_message', 'reach_level', 'reach_affection'].map((action) => (
                      <option key={action} value={action}>{getQuestActionLabel(action)}</option>
                    ))}
                  </select>
                  <select value={questFilters.minimumTier} onChange={(e) => setQuestFilters({ ...questFilters, minimumTier: e.target.value })} className="rounded-lg border border-gray-600 bg-gray-900/60 px-3 py-2 text-sm text-white">
                    <option value="">{tr('Mọi tier', 'All tiers')}</option>
                    {['FREE', 'BASIC', 'PRO', 'ULTIMATE'].map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                  </select>
                  <select value={questFilters.rewardType} onChange={(e) => setQuestFilters({ ...questFilters, rewardType: e.target.value })} className="rounded-lg border border-gray-600 bg-gray-900/60 px-3 py-2 text-sm text-white">
                    <option value="">{tr('Mọi thưởng', 'All rewards')}</option>
                    <option value="coins">{tr('Xu', 'Coins')}</option>
                    <option value="gems">{tr('Ngọc', 'Gems')}</option>
                    <option value="xp">XP</option>
                    <option value="affection">Affection</option>
                    <option value="gift">{tr('Quà cụ thể', 'Gift reward')}</option>
                  </select>
                  <select value={questFilters.giftId} onChange={(e) => setQuestFilters({ ...questFilters, giftId: e.target.value })} className="rounded-lg border border-gray-600 bg-gray-900/60 px-3 py-2 text-sm text-white">
                    <option value="">{tr('Mọi gift', 'All gifts')}</option>
                    {giftCatalog.map((gift) => <option key={gift.id} value={gift.id}>{gift.emoji} {gift.name}</option>)}
                  </select>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={fetchQuests} className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600">{tr('Lọc', 'Apply')}</button>
                  <button
                    onClick={() => setQuestFilters({ search: '', type: '', category: '', isActive: '', action: '', minimumTier: '', rewardType: '', giftId: '' })}
                    className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                  >
                    {tr('Xóa lọc', 'Reset')}
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {quests.map((quest) => (
                  <div key={quest.id} className="grid gap-4 rounded-2xl border border-gray-700/50 bg-gray-800/45 p-4 xl:grid-cols-[minmax(0,1.6fr)_1fr_1fr_auto] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{quest.title}</p>
                        <span className="rounded bg-gray-700/70 px-2 py-0.5 text-xs text-gray-300">{quest.type}</span>
                        <span className="rounded bg-gray-700/70 px-2 py-0.5 text-xs text-gray-300">{quest.category}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-400">{quest.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-blue-500/15 px-2 py-1 text-blue-300">{getQuestRequirementText(quest)}</span>
                        {(quest.requiresPremium || quest.minimumTier !== 'FREE') && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-300">VIP {quest.minimumTier || 'BASIC'}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {quest.rewardCoins > 0 && <span className="text-yellow-300">{quest.rewardCoins} {tr('xu', 'coins')}</span>}
                      {quest.rewardGems > 0 && <span className="text-purple-300">{quest.rewardGems} {tr('ngọc', 'gems')}</span>}
                      {quest.rewardXp > 0 && <span className="text-blue-300">{quest.rewardXp} XP</span>}
                      {quest.rewardAffection > 0 && <span className="text-pink-300">{quest.rewardAffection} affection</span>}
                      {quest.rewardCoins <= 0 && quest.rewardGems <= 0 && quest.rewardXp <= 0 && quest.rewardAffection <= 0 && <span className="text-gray-500">{tr('Không scalar reward', 'No scalar reward')}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(quest.giftRewards || []).length > 0 ? (quest.giftRewards || []).map((reward) => (
                        <span key={reward.giftId} className="rounded-full border border-pink-400/25 bg-pink-400/10 px-2 py-1 text-xs text-pink-200">
                          {reward.gift?.emoji || '🎁'} {reward.gift?.name || reward.giftId} x{reward.quantity}
                        </span>
                      )) : <span className="text-sm text-gray-500">{tr('Chưa có quà cụ thể', 'No gift reward')}</span>}
                    </div>
                    <div className="flex items-center gap-2 xl:justify-end">
                      <span className={`px-2 py-1 rounded text-xs ${quest.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {quest.isActive ? tr('Đang hoạt động', 'Active') : tr('Không hoạt động', 'Inactive')}
                      </span>
                      <button onClick={() => handleToggleQuest(quest.id)} className="p-2 bg-gray-600/50 rounded-lg hover:bg-gray-600">
                        <Zap className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TEMPLATES */}
          {activeTab === 'templates' && (
            <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{tr('Mẫu nhân vật', 'Character Templates')}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setFormData({ ...createTemplateFormData() });
                      setShowModal('createTemplate');
                    }}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> {tr('Thêm mẫu', 'Add Template')}
                  </button>
                  <button onClick={fetchTemplates} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
                    {template.avatarUrl && (
                      <div className="h-48 bg-gray-700 relative">
                        <Image src={template.avatarUrl} alt={template.name} fill className="object-cover" loading="lazy" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${template.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {template.isActive ? tr('Đang hoạt động', 'Active') : tr('Không hoạt động', 'Inactive')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{template.description}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{template.gender} • {template.personality} • #{template.sortOrder}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedTemplate(template);
                              setFormData({ ...createTemplateFormData(template) });
                              setShowModal('editTemplate');
                            }}
                            className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                            title={tr('Sửa', 'Edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                            title={tr('Xóa', 'Delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleTemplate(template.id)}
                            className="p-2 bg-gray-600/50 rounded-lg hover:bg-gray-600"
                            title={tr('Bật/tắt', 'Toggle')}
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{tr('Bảng điều khiển phân tích', 'Analytics Dashboard')}</h2>
                <div className="flex items-center gap-3">
                  <select
                    value={analyticsDays}
                    onChange={(e) => {
                      const days = Number(e.target.value);
                      setAnalyticsDays(days);
                      fetchAnalytics(days);
                    }}
                    className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value={7}>{tr('7 ngày gần nhất', 'Last 7 days')}</option>
                    <option value={14}>{tr('14 ngày gần nhất', 'Last 14 days')}</option>
                    <option value={30}>{tr('30 ngày gần nhất', 'Last 30 days')}</option>
                    <option value={90}>{tr('90 ngày gần nhất', 'Last 90 days')}</option>
                  </select>
                  <button onClick={() => fetchAnalytics()} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {!analytics ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
                      <p className="text-sm text-gray-400 mb-1">{tr('Người dùng mới', 'New Users')} ({analyticsDays}{tr(' ngày', 'd')})</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {analytics.dailyStats.reduce((acc, d) => acc + d.new_users, 0)}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
                      <p className="text-sm text-gray-400 mb-1">{tr('Tin nhắn', 'Messages')} ({analyticsDays}{tr(' ngày', 'd')})</p>
                      <p className="text-2xl font-bold text-green-400">
                        {analytics.messageStats.reduce((acc, d) => acc + d.count, 0).toLocaleString()}
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

                  {/* User Growth & Messages - Combined Line Chart */}
                  <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      {tr('Đăng ký người dùng và tin nhắn', 'User Registrations & Messages')}
                    </h3>
                    <div className="h-72">
                      <Line
                        data={{
                          labels: analytics.dailyStats.map(d => {
                            const date = new Date(d.date);
                            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                          }),
                          datasets: [
                            {
                              label: tr('Người dùng mới', 'New Users'),
                              data: analytics.dailyStats.map(d => d.new_users),
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
                              data: analytics.dailyStats.map(d => d.messages),
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
                            tooltip: {
                              backgroundColor: '#1f2937',
                              titleColor: '#fff',
                              bodyColor: '#9ca3af',
                              borderColor: '#374151',
                              borderWidth: 1,
                              padding: 12,
                            },
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

                  {/* Active Users Bar Chart */}
                  <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-amber-400" />
                      {tr('Người dùng hoạt động theo ngày', 'Daily Active Users')}
                    </h3>
                    <div className="h-64">
                      <Bar
                        data={{
                          labels: analytics.dailyStats.map(d => {
                            const date = new Date(d.date);
                            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                          }),
                          datasets: [{
                            label: tr('Người dùng hoạt động', 'Active Users'),
                            data: analytics.dailyStats.map(d => d.active_users || 0),
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
                            tooltip: {
                              backgroundColor: '#1f2937',
                              titleColor: '#fff',
                              bodyColor: '#9ca3af',
                              borderColor: '#374151',
                              borderWidth: 1,
                            },
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
                    {/* Premium Distribution - Doughnut */}
                    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        {tr('Phân bố gói Premium', 'Premium Distribution')}
                      </h3>
                      {analytics.premiumDistribution.length > 0 ? (
                        <div className="h-64 flex items-center justify-center">
                          <Doughnut
                            data={{
                              labels: analytics.premiumDistribution.map(t => t.premiumTier),
                              datasets: [{
                                data: analytics.premiumDistribution.map(t => t._count),
                                backgroundColor: [
                                  'rgba(107,114,128,0.7)',  // FREE - gray
                                  'rgba(59,130,246,0.7)',   // BASIC - blue
                                  'rgba(168,85,247,0.7)',   // PRO - purple
                                  'rgba(251,191,36,0.7)',   // ULTIMATE - yellow
                                ],
                                borderColor: [
                                  '#6b7280',
                                  '#3b82f6',
                                  '#a855f7',
                                  '#fbbf24',
                                ],
                                borderWidth: 2,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'bottom',
                                  labels: {
                                    color: chartDefaults.color,
                                    usePointStyle: true,
                                    padding: 16,
                                    font: { size: 13 },
                                  },
                                },
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

                    {/* Top Users */}
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
            </motion.div>
          )}

          {/* SYSTEM */}
          {activeTab === 'system' && systemInfo && (
            <motion.div key="system" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{tr('Thông tin hệ thống', 'System Information')}</h2>
                <button onClick={fetchSystemInfo} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-400">{tr('Dung lượng cơ sở dữ liệu', 'Database Size')}</span>
                  </div>
                  <p className="text-2xl font-bold">{systemInfo.databaseSize}</p>
                </div>
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-green-400" />
                    <span className="text-gray-400">{tr('Thời gian hoạt động', 'Uptime')}</span>
                  </div>
                  <p className="text-2xl font-bold">{Math.floor(systemInfo.uptime / 3600)}h {Math.floor((systemInfo.uptime % 3600) / 60)}m</p>
                </div>
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-400">{tr('Bộ nhớ', 'Memory')}</span>
                  </div>
                  <p className="text-2xl font-bold">{Math.round(systemInfo.memoryUsage.heapUsed / 1024 / 1024)} MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <h3 className="font-semibold mb-4">{tr('Thống kê bảng dữ liệu', 'Table Statistics')}</h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {systemInfo.tables.map((table) => (
                      <div key={table.name} className="flex justify-between p-2 bg-gray-700/30 rounded">
                        <span className="text-gray-300">{table.name}</span>
                        <span className="text-gray-400">{table.rows.toLocaleString()} {tr('dòng', 'rows')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <h3 className="font-semibold mb-4">{tr('Tác vụ dọn dẹp', 'Cleanup Actions')}</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleCleanup('expired_tokens')}
                      disabled={actionLoading}
                      className="w-full p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 text-left"
                    >
                      <p className="font-medium">{tr('Dọn token hết hạn', 'Clean Expired Tokens')}</p>
                      <p className="text-sm text-gray-400">{tr('Xóa refresh token đã hết hạn hoặc bị thu hồi', 'Remove expired and revoked refresh tokens')}</p>
                    </button>
                    <button
                      onClick={() => handleCleanup('old_messages')}
                      disabled={actionLoading}
                      className="w-full p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 text-left"
                    >
                      <p className="font-medium">{tr('Dọn tin nhắn cũ', 'Clean Old Messages')}</p>
                      <p className="text-sm text-gray-400">{tr('Xóa tin nhắn cũ hơn 6 tháng (chỉ người dùng miễn phí)', 'Delete messages older than 6 months (free users only)')}</p>
                    </button>
                    <button
                      onClick={() => handleCleanup('inactive_users')}
                      disabled={actionLoading}
                      className="w-full p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 text-left"
                    >
                      <p className="font-medium">{tr('Tìm người dùng không hoạt động', 'Find Inactive Users')}</p>
                      <p className="text-sm text-gray-400">{tr('Liệt kê người dùng không hoạt động trên 90 ngày', 'List users inactive for 90+ days')}</p>
                    </button>
                    <button
                      onClick={handleCleanupDuplicates}
                      disabled={actionLoading}
                      className="w-full p-4 bg-red-700/50 rounded-xl hover:bg-red-700 text-left"
                    >
                      <p className="font-medium">{tr('Dọn mẫu trùng lặp', 'Clean Duplicate Templates')}</p>
                      <p className="text-sm text-gray-400">{tr('Xóa mẫu nhân vật trùng và chuyển nhân vật sang mẫu còn lại', 'Remove duplicate character templates and migrate characters')}</p>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TIER CONFIGS */}
          {activeTab === 'tier-configs' && (
            <motion.div key="tier-configs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="space-y-6">
                <TierConfigTab apiCall={apiCall} showToast={showToast} />
                <VipGiftPackAdmin apiCall={apiCall} showToast={showToast} language={language} />
              </div>
            </motion.div>
          )}

          {/* PRICING */}
          {activeTab === 'pricing' && (
            <motion.div key="pricing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PricingTab apiCall={apiCall} showToast={showToast} />
            </motion.div>
          )}

          {/* AI SETTINGS */}
          {activeTab === 'ai-settings' && (
            <motion.div key="ai-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AiSettingsTab apiCall={apiCall} showToast={showToast} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showModal === 'editUser' && selectedItem && (
          <Modal title={tr('Chỉnh sửa người dùng', 'Edit User')} size="lg" onClose={() => setShowModal(null)}>
            {/* Profile Header */}
            <div className="flex items-center gap-4 p-4 mb-4 rounded-2xl bg-gradient-to-r from-violet-900/40 to-purple-900/20 border border-violet-700/20">
              <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-violet-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {(selectedItem.displayName || selectedItem.username || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-bold text-white truncate">{selectedItem.displayName || selectedItem.username}</p>
                  {(selectedItem as User).isEmailVerified && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] rounded-md font-medium shrink-0">
                      <Check className="w-3 h-3" />{tr('Đã xác minh', 'Verified')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 truncate">@{(selectedItem as User).username}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{(selectedItem as User).email}</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="flex flex-col items-center gap-1 py-2.5 bg-gray-700/30 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-sm font-bold text-orange-400">{(selectedItem as User).streak ?? 0}</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Streak</span>
              </div>
              <div className="flex flex-col items-center gap-1 py-2.5 bg-gray-700/30 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-400">{(selectedItem as User).coins ?? 0}</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">{tr('Xu', 'Coins')}</span>
              </div>
              <div className="flex flex-col items-center gap-1 py-2.5 bg-gray-700/30 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-sm font-bold text-purple-400">{(selectedItem as User).gems ?? 0}</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">{tr('Ngọc', 'Gems')}</span>
              </div>
            </div>

            <div className="space-y-5 max-h-[45vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  {tr('Thông tin tài khoản', 'Account Info')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="email"
                    value={(formData.email as string) || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                    placeholder="Email"
                  />
                  <input
                    type="text"
                    value={(formData.username as string) || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                    placeholder={tr('Tên đăng nhập', 'Username')}
                  />
                  <input
                    type="text"
                    value={(formData.displayName as string) || ''}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="col-span-2 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                    placeholder={tr('Tên hiển thị', 'Display name')}
                  />
                  <textarea
                    value={(formData.bio as string) || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="col-span-2 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white resize-none"
                    rows={3}
                    placeholder="Bio"
                  />
                  <select
                    value={(formData.userGender as string) || 'NOT_SPECIFIED'}
                    onChange={(e) => setFormData({ ...formData, userGender: e.target.value })}
                    className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value="NOT_SPECIFIED">{tr('Chưa chọn giới tính', 'Not specified')}</option>
                    <option value="MALE">{tr('Nam', 'Male')}</option>
                    <option value="FEMALE">{tr('Nữ', 'Female')}</option>
                    <option value="NON_BINARY">Non-binary</option>
                    <option value="OTHER">{tr('Khác', 'Other')}</option>
                  </select>
                  <select
                    value={(formData.datingPreference as string) || 'ALL'}
                    onChange={(e) => setFormData({ ...formData, datingPreference: e.target.value })}
                    className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value="ALL">{tr('Tất cả', 'All')}</option>
                    <option value="MALE">{tr('Nam', 'Male')}</option>
                    <option value="FEMALE">{tr('Nữ', 'Female')}</option>
                    <option value="NON_BINARY">Non-binary</option>
                  </select>
                </div>
              </div>

              {/* Premium Tier */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  {tr('Gói Premium', 'Premium Tier')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TIER_OPTIONS.map((tier) => {
                    const isSelected = (formData.premiumTier as string || 'FREE') === tier.value;
                    return (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, premiumTier: tier.value, isPremium: tier.value !== 'FREE' })}
                        className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 text-left group ${
                          isSelected
                            ? `border-transparent ring-2 ${tier.ring} bg-gradient-to-br ${tier.gradient} shadow-lg ${tier.glow}`
                            : 'border-gray-600/40 bg-gray-700/20 hover:border-gray-500/60 hover:bg-gray-700/40'
                        }`}
                        aria-pressed={isSelected}
                        aria-label={`Select ${tier.label} tier`}
                      >
                        <div className="flex items-center gap-2.5 mb-1">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/15' : 'bg-gray-600/50 group-hover:bg-gray-600/70'}`}>
                            <tier.Icon className={`w-4 h-4 ${isSelected ? tier.iconColor : 'text-gray-400'}`} />
                          </div>
                          <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {tier.label}
                          </span>
                        </div>
                        <p className={`text-xs leading-snug ${
                          isSelected ? 'text-white/70' : 'text-gray-500'
                        }`}>
                          {tier.value === 'FREE'     && tr('Truy cập cơ bản', 'Basic access')}
                          {tier.value === 'BASIC'    && tr('Nhiệm vụ & lịch sử', 'Quests & history')}
                          {tier.value === 'PRO'      && tr('AI không giới hạn', 'Unlimited AI')}
                          {tier.value === 'ULTIMATE' && tr('Tất cả tính năng', 'All features')}
                        </p>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-white/25 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Premium Expiry */}
              {(formData.premiumTier as string) !== 'FREE' && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    {tr('Hết hạn Premium', 'Premium Expires')}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      type="date"
                      value={(formData.premiumExpiresAt as string) || ''}
                      onChange={(e) => setFormData({ ...formData, premiumExpiresAt: e.target.value || null })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all [color-scheme:dark]"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {tr('Bỏ trống = không giới hạn', 'Leave empty = permanent')}
                  </p>
                </div>
              )}

              {/* Currency */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  {tr('Chỉnh sửa tiền tệ', 'Adjust Currency')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400 pointer-events-none" />
                    <input
                      type="number"
                      value={formData.coins as number || 0}
                      onChange={(e) => setFormData({ ...formData, coins: Number(e.target.value) })}
                      className="w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all"
                      aria-label={tr('Xu', 'Coins')}
                      placeholder={tr('Xu', 'Coins')}
                    />
                  </div>
                  <div className="relative">
                    <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 pointer-events-none" />
                    <input
                      type="number"
                      value={formData.gems as number || 0}
                      onChange={(e) => setFormData({ ...formData, gems: Number(e.target.value) })}
                      className="w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                      aria-label={tr('Ngọc', 'Gems')}
                      placeholder={tr('Ngọc', 'Gems')}
                    />
                  </div>
                </div>
              </div>

              {/* Account Settings */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  {tr('Tài khoản', 'Account')}
                </label>
                <div className="flex items-center justify-between p-3.5 bg-gray-700/30 rounded-xl border border-gray-600/50 hover:border-gray-500/50 transition-colors duration-150">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/15 rounded-lg">
                      <Shield className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-200 font-medium">{tr('Email đã xác minh', 'Email Verified')}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{tr('Bỏ qua bước xác minh email', 'Skip email verification step')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isEmailVerified: !formData.isEmailVerified })}
                    className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-blue-500 shrink-0 ${
                      formData.isEmailVerified ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={!!(formData.isEmailVerified)}
                    aria-label={tr('Bật/tắt xác minh email', 'Toggle email verification')}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        formData.isEmailVerified ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Divider + Actions */}
            <div className="h-px bg-gray-700/50 my-5" />
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(null)}
                className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 cursor-pointer transition-colors duration-150 font-medium"
              >
                {tr('Hủy', 'Cancel')}
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={actionLoading}
                className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-400 hover:to-purple-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-md shadow-violet-500/20"
              >
                {actionLoading ? tr('Đang lưu...', 'Saving...') : tr('Lưu thay đổi', 'Save Changes')}
              </button>
            </div>
          </Modal>
        )}

        {showModal === 'createQuest' && (
          <Modal title={tr('Tạo nhiệm vụ', 'Create Quest')} onClose={() => setShowModal(null)}>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Tiêu đề', 'Title')} *</label>
                <input
                  type="text"
                  value={formData.title as string || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  placeholder={tr('Tiêu đề nhiệm vụ', 'Quest title')}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Mô tả', 'Description')} *</label>
                <textarea
                  value={formData.description as string || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  rows={2}
                  placeholder={tr('Mô tả nhiệm vụ', 'Quest description')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Loại', 'Type')}</label>
                  <select
                    value={formData.type as string || 'DAILY'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value="DAILY">{tr('Hằng ngày', 'Daily')}</option>
                    <option value="WEEKLY">{tr('Hằng tuần', 'Weekly')}</option>
                    <option value="ACHIEVEMENT">{tr('Thành tựu', 'Achievement')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Danh mục', 'Category')}</label>
                  <select
                    value={formData.category as string || 'chat'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value="chat">{tr('Trò chuyện', 'Chat')}</option>
                    <option value="gift">{tr('Quà tặng', 'Gift')}</option>
                    <option value="social">{tr('Xã hội', 'Social')}</option>
                    <option value="explore">{tr('Khám phá', 'Explore')}</option>
                  </select>
                </div>
              </div>
              <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-4">
                <div className="mb-3 text-sm font-semibold text-white">{tr('Điều kiện hoàn thành', 'Completion condition')}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">{tr('Hành động', 'Action')}</label>
                    <select
                      value={(formData.requirements as { action?: string })?.action || 'send_message'}
                      onChange={(e) => setFormData({ ...formData, requirements: { ...(formData.requirements as object || {}), action: e.target.value } })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                    >
                      {['send_message', 'send_gift', 'daily_login', 'morning_greeting', 'goodnight_message', 'romantic_message', 'reach_level', 'reach_affection'].map((action) => (
                        <option key={action} value={action}>{getQuestActionLabel(action)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">{tr('Số lượng/mốc', 'Count/threshold')}</label>
                    <input
                      type="number"
                      min={1}
                      value={(formData.requirements as { count?: number })?.count || 1}
                      onChange={(e) => setFormData({ ...formData, requirements: { ...(formData.requirements as object || {}), count: Number(e.target.value) || 1 } })}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Xu', 'Coins')}</label>
                  <input
                    type="number"
                    value={formData.rewardCoins as number || 0}
                    onChange={(e) => setFormData({ ...formData, rewardCoins: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Ngọc', 'Gems')}</label>
                  <input
                    type="number"
                    value={formData.rewardGems as number || 0}
                    onChange={(e) => setFormData({ ...formData, rewardGems: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">XP</label>
                  <input
                    type="number"
                    value={formData.rewardXp as number || 0}
                    onChange={(e) => setFormData({ ...formData, rewardXp: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Affection</label>
                  <input
                    type="number"
                    value={formData.rewardAffection as number || 0}
                    onChange={(e) => setFormData({ ...formData, rewardAffection: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Minimum tier</label>
                  <select
                    value={formData.minimumTier as string || 'FREE'}
                    onChange={(e) => setFormData({ ...formData, minimumTier: e.target.value, requiresPremium: e.target.value !== 'FREE' })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    {['FREE', 'BASIC', 'PRO', 'ULTIMATE'].map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                  </select>
                </div>
              </div>
              <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">{tr('Quà tặng cụ thể', 'Gift rewards')}</div>
                  <button
                    type="button"
                    onClick={() => {
                      const firstGift = giftCatalog[0];
                      if (!firstGift) return;
                      const current = Array.isArray(formData.giftRewards) ? formData.giftRewards as Array<{ giftId: string; quantity: number }> : [];
                      setFormData({ ...formData, giftRewards: [...current, { giftId: firstGift.id, quantity: 1 }] });
                    }}
                    className="rounded-lg bg-pink-500/20 px-3 py-1.5 text-xs font-medium text-pink-200 hover:bg-pink-500/30"
                  >
                    {tr('Thêm quà', 'Add gift')}
                  </button>
                </div>
                <div className="space-y-2">
                  {(Array.isArray(formData.giftRewards) ? formData.giftRewards as Array<{ giftId: string; quantity: number }> : []).map((reward, index) => (
                    <div key={`${reward.giftId}-${index}`} className="flex gap-2">
                      <select
                        value={reward.giftId}
                        onChange={(e) => {
                          const current = Array.isArray(formData.giftRewards) ? [...formData.giftRewards as Array<{ giftId: string; quantity: number }>] : [];
                          current[index] = { ...current[index], giftId: e.target.value };
                          setFormData({ ...formData, giftRewards: current });
                        }}
                        className="min-w-0 flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      >
                        {giftCatalog.map((gift) => <option key={gift.id} value={gift.id}>{gift.emoji} {gift.name} · {gift.minimumTier}</option>)}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={reward.quantity}
                        onChange={(e) => {
                          const current = Array.isArray(formData.giftRewards) ? [...formData.giftRewards as Array<{ giftId: string; quantity: number }>] : [];
                          current[index] = { ...current[index], quantity: Number(e.target.value) || 1 };
                          setFormData({ ...formData, giftRewards: current });
                        }}
                        className="w-20 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = Array.isArray(formData.giftRewards) ? formData.giftRewards as Array<{ giftId: string; quantity: number }> : [];
                          setFormData({ ...formData, giftRewards: current.filter((_, itemIndex) => itemIndex !== index) });
                        }}
                        className="px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!Array.isArray(formData.giftRewards) || formData.giftRewards.length === 0) && (
                    <div className="text-sm text-gray-500">{tr('Chưa chọn quà cụ thể', 'No concrete gifts selected')}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
                {tr('Hủy', 'Cancel')}
              </button>
              <button onClick={handleCreateQuest} disabled={actionLoading} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50">
                {actionLoading ? tr('Đang tạo...', 'Creating...') : tr('Tạo nhiệm vụ', 'Create Quest')}
              </button>
            </div>
          </Modal>
        )}

        {showModal === 'createTemplate' && (
          <Modal title={tr('Thêm mẫu nhân vật', 'Create Template')} onClose={() => setShowModal(null)}>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Tên mẫu', 'Name')} *</label>
                <input
                  type="text"
                  value={formData.name as string || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Mô tả', 'Description')} *</label>
                <textarea
                  value={formData.description as string || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Avatar *</label>
                {(formData.avatarUrl as string) && (
                  <div className="mb-2 flex justify-center">
                    <div className="w-20 h-20 rounded-xl border border-gray-600 relative overflow-hidden">
                      <Image src={formData.avatarUrl as string} alt="Preview" fill className="object-cover" sizes="80px" />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.avatarUrl as string || ''}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                    placeholder="https://... hoặc upload bên dưới"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl flex items-center gap-2"
                  >
                    <Upload size={16} />
                    {uploading ? '...' : 'Upload'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Giới tính', 'Gender')}</label>
                  <select
                    value={formData.gender as string || 'FEMALE'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value="FEMALE">FEMALE</option>
                    <option value="MALE">MALE</option>
                    <option value="NON_BINARY">NON_BINARY</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Tính cách', 'Personality')}</label>
                  <input
                    type="text"
                    value={formData.personality as string || ''}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Style</label>
                  <input
                    type="text"
                    value={formData.style as string || 'anime'}
                    onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Thứ tự', 'Sort order')}</label>
                  <input
                    type="number"
                    value={formData.sortOrder as number || 0}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isActive ?? true)}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  {tr('Đang hoạt động', 'Active')}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isDefault)}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4"
                  />
                  {tr('Mặc định', 'Default')}
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
                {tr('Hủy', 'Cancel')}
              </button>
              <button onClick={handleCreateTemplate} disabled={actionLoading} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50">
                {actionLoading ? tr('Đang tạo...', 'Creating...') : tr('Tạo mẫu', 'Create Template')}
              </button>
            </div>
          </Modal>
        )}

        {showModal === 'editTemplate' && selectedTemplate && (
          <Modal title={tr('Sửa mẫu nhân vật', 'Edit Template')} onClose={() => setShowModal(null)}>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Tên mẫu', 'Name')} *</label>
                <input
                  type="text"
                  value={formData.name as string || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Mô tả', 'Description')} *</label>
                <textarea
                  value={formData.description as string || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Avatar *</label>
                {(formData.avatarUrl as string) && (
                  <div className="mb-2 flex justify-center">
                    <div className="w-20 h-20 rounded-xl border border-gray-600 relative overflow-hidden">
                      <Image src={formData.avatarUrl as string} alt="Preview" fill className="object-cover" sizes="80px" />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.avatarUrl as string || ''}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                    placeholder="https://... hoặc upload bên dưới"
                  />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    id="editAvatarUpload"
                    onChange={(e) => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('editAvatarUpload')?.click()}
                    disabled={uploading}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl flex items-center gap-2"
                  >
                    <Upload size={16} />
                    {uploading ? '...' : 'Upload'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Giới tính', 'Gender')}</label>
                  <select
                    value={formData.gender as string || 'FEMALE'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value="FEMALE">FEMALE</option>
                    <option value="MALE">MALE</option>
                    <option value="NON_BINARY">NON_BINARY</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Tính cách', 'Personality')}</label>
                  <input
                    type="text"
                    value={formData.personality as string || ''}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Style</label>
                  <input
                    type="text"
                    value={formData.style as string || 'anime'}
                    onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Thứ tự', 'Sort order')}</label>
                  <input
                    type="number"
                    value={formData.sortOrder as number || 0}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isActive ?? true)}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  {tr('Đang hoạt động', 'Active')}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isDefault)}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4"
                  />
                  {tr('Mặc định', 'Default')}
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
                {tr('Hủy', 'Cancel')}
              </button>
              <button onClick={handleUpdateTemplate} disabled={actionLoading} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50">
                {actionLoading ? tr('Đang lưu...', 'Saving...') : tr('Lưu thay đổi', 'Save Changes')}
              </button>
            </div>
          </Modal>
        )}

        {resetPasswordForm && (
          <Modal title={tr('Đặt lại mật khẩu', 'Reset Password')} onClose={() => setResetPasswordForm(null)}>
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                {tr('Người dùng', 'User')}: <span className="text-gray-200">{resetPasswordForm.username}</span>
              </p>
              <input
                type="password"
                value={resetPasswordForm.newPassword}
                onChange={(event) => setResetPasswordForm({ ...resetPasswordForm, newPassword: event.target.value })}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                placeholder={tr('Mật khẩu mới', 'New password')}
              />
              <input
                type="password"
                value={resetPasswordForm.confirmPassword}
                onChange={(event) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: event.target.value })}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                placeholder={tr('Nhập lại mật khẩu', 'Confirm password')}
              />
              {resetPasswordStatus && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${
                  resetPasswordStatus.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}>
                  {resetPasswordStatus.message}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setResetPasswordForm(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
                  {tr('Hủy', 'Cancel')}
                </button>
                <button onClick={handleResetPasswordSubmit} disabled={actionLoading} className="flex-1 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-500 disabled:opacity-50">
                  {actionLoading ? tr('Đang xử lý...', 'Processing...') : tr('Đặt lại', 'Reset')}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRewardModal && (
          <RewardModal
            form={rewardForm}
            setForm={setRewardForm}
            onSubmit={handleRewardSubmit}
            onPreview={handleRewardPreview}
            onClose={() => setShowRewardModal(false)}
            loading={actionLoading}
            language={language}
            status={rewardStatus}
            selectedUserCount={selectedUserIds.length}
            giftCatalog={giftCatalog}
            preview={rewardPreview}
          />
        )}
      </AnimatePresence>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {showBroadcastModal && (
          <BroadcastModal
            form={broadcastForm}
            setForm={setBroadcastForm}
            onSubmit={handleBroadcastSubmit}
            onClose={() => setShowBroadcastModal(false)}
            loading={actionLoading}
            language={language}
            status={broadcastStatus}
            selectedUserCount={selectedUserIds.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}



