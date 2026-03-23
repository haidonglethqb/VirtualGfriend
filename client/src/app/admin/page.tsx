'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Heart, Coins, Shield, LogOut, Search,
  ChevronLeft, ChevronRight, Edit2, Trash2, Key, RefreshCw,
  TrendingUp, Crown, Sparkles, LayoutDashboard, Settings,
  Target, Image, Gift, Brain, Bell, Database, BarChart3,
  Plus, X, Check, AlertTriangle, Megaphone, Server, HardDrive,
  Zap, Clock, Activity, Languages,
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
import { useLanguageStore } from '@/store/language-store';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type TabType = 'dashboard' | 'users' | 'characters' | 'messages' | 'quests' | 'templates' | 'analytics' | 'system' | 'tier-configs';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isEmailVerified: boolean;
  isPremium: boolean;
  premiumTier: string | null;
  coins: number;
  gems: number;
  streak: number;
  createdAt: string;
  lastLoginAt: string | null;
}

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
  rewardCoins: number;
  rewardGems: number;
  rewardXp: number;
  isActive: boolean;
  sortOrder: number;
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
  children 
}: { 
  title: string; 
  onClose: () => void; 
  children: React.ReactNode 
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
        className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function AdminPage() {
  const { language, toggleLanguage } = useLanguageStore();
  const t = ADMIN_I18N[language];
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

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
  const [templates, setTemplates] = useState<Template[]>([]);
  
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<User | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
      throw new Error(tr('Phiên đăng nhập đã hết hạn', 'Session expired'));
    }
    
    return res;
  }, [token]);

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

  // Fetch data when tab changes
  useEffect(() => {
    if (isLoggedIn !== true || !token) return;

    const fetchData = async () => {
      try {
        switch (activeTab) {
          case 'dashboard':
            fetchStats();
            break;
          case 'users':
            fetchUsers();
            break;
          case 'characters':
            fetchCharacters();
            break;
          case 'messages':
            fetchMessages();
            break;
          case 'quests':
            fetchQuests();
            break;
          case 'templates':
            fetchTemplates();
            break;
          case 'analytics':
            fetchAnalytics();
            break;
          case 'system':
            fetchSystemInfo();
            break;
          case 'tier-configs':
            break;
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchData();
  }, [isLoggedIn, token, activeTab, pagination.page, searchQuery]);

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

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
  };

  // Fetch functions
  const fetchStats = async () => {
    const res = await apiCall('/stats');
    if (res.ok) setStats(await res.json());
  };

  const fetchUsers = async () => {
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: '20',
      ...(searchQuery && { search: searchQuery }),
    });
    const res = await apiCall(`/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
    }
  };

  const fetchCharacters = async () => {
    const params = new URLSearchParams({ page: String(pagination.page), limit: '20' });
    const res = await apiCall(`/characters?${params}`);
    if (res.ok) {
      const data = await res.json();
      setCharacters(data.characters);
      setPagination(data.pagination);
    }
  };

  const fetchMessages = async () => {
    const params = new URLSearchParams({ page: String(pagination.page), limit: '50' });
    const res = await apiCall(`/messages?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
      setPagination(data.pagination);
    }
  };

  const fetchQuests = async () => {
    const res = await apiCall('/quests');
    if (res.ok) setQuests(await res.json());
  };

  const fetchAnalytics = async (days?: number) => {
    const d = days ?? analyticsDays;
    const res = await apiCall(`/analytics?days=${d}`);
    if (res.ok) setAnalytics(await res.json());
  };

  const fetchTemplates = async () => {
    const res = await apiCall('/templates');
    if (res.ok) setTemplates(await res.json());
  };

  const fetchSystemInfo = async () => {
    const res = await apiCall('/system');
    if (res.ok) setSystemInfo(await res.json());
  };

  // Action handlers
  const handleUpdateUser = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const res = await apiCall(`/users/${selectedItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showToast(tr('Cập nhật người dùng thành công', 'User updated successfully'));
        setShowModal(null);
        fetchUsers();
      }
    } catch {
      showToast(tr('Cập nhật người dùng thất bại', 'Failed to update user'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPass = prompt(tr('Nhập mật khẩu mới (tối thiểu 8 ký tự):', 'Enter new password (min 8 chars):'));
    if (!newPass || newPass.length < 8) {
      showToast(tr('Mật khẩu phải có ít nhất 8 ký tự', 'Password must be at least 8 characters'), 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await apiCall(`/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: newPass }),
      });
      if (res.ok) showToast(tr('Đặt lại mật khẩu thành công', 'Password reset successfully'));
    } catch {
      showToast(tr('Đặt lại mật khẩu thất bại', 'Failed to reset password'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGiveRewards = async (userId: string) => {
    const coins = prompt(tr('Nhập số xu muốn tặng (0 để bỏ qua):', 'Enter coins to give (0 to skip):'));
    const gems = prompt(tr('Nhập số ngọc muốn tặng (0 để bỏ qua):', 'Enter gems to give (0 to skip):'));
    
    if (!coins && !gems) return;
    
    setActionLoading(true);
    try {
      const res = await apiCall(`/users/${userId}/give`, {
        method: 'POST',
        body: JSON.stringify({ 
          coins: parseInt(coins || '0'), 
          gems: parseInt(gems || '0') 
        }),
      });
      if (res.ok) {
        showToast(tr('Tặng thưởng thành công', 'Rewards given successfully'));
        fetchUsers();
      }
    } catch {
      showToast(tr('Tặng thưởng thất bại', 'Failed to give rewards'), 'error');
    } finally {
      setActionLoading(false);
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

  const handleBulkGive = async (type: 'coins' | 'gems') => {
    const amount = prompt(
      language === 'vi'
        ? `Nhập số lượng ${type === 'coins' ? 'xu' : 'ngọc'} tặng cho TẤT CẢ người dùng:`
        : `Enter ${type} amount to give to ALL users:`,
    );
    if (!amount || parseInt(amount) <= 0) return;
    
    if (!confirm(language === 'vi' ? `Tặng ${amount} ${type === 'coins' ? 'xu' : 'ngọc'} cho TẤT CẢ người dùng?` : `Give ${amount} ${type} to ALL users?`)) return;
    
    setActionLoading(true);
    try {
      const res = await apiCall(`/bulk/${type}`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseInt(amount) }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
      }
    } catch {
      showToast(tr('Tặng thưởng thất bại', 'Failed to give rewards'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBroadcast = async () => {
    const title = prompt(tr('Nhập tiêu đề thông báo:', 'Enter notification title:'));
    const message = prompt(tr('Nhập nội dung thông báo:', 'Enter notification message:'));
    const durationRaw = prompt(tr('Thời lượng hiển thị (ms, mặc định 5000):', 'Display duration (ms, default 5000):'), '5000');
    const targetRaw = prompt(tr('Đối tượng nhận (all/free/premium):', 'Target audience (all/free/premium):'), 'all');
    
    if (!title || !message) return;

    const durationMs = Number(durationRaw || 5000);
    const targetFilter = ['all', 'free', 'premium'].includes((targetRaw || '').toLowerCase())
      ? (targetRaw || 'all').toLowerCase()
      : 'all';
    
    setActionLoading(true);
    try {
      const res = await apiCall('/broadcast', {
        method: 'POST',
        body: JSON.stringify({ title, message, type: 'info', durationMs, targetFilter }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(
          language === 'vi'
            ? `Đã gửi ${data.persisted || 0} thông báo (hiển thị ${data.durationMs || 5000}ms)`
            : `Sent ${data.persisted || 0} notifications (${data.durationMs || 5000}ms display)`
        );
      }
    } catch {
      showToast(tr('Gửi thông báo thất bại', 'Failed to send broadcast'), 'error');
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

  const tabs: { id: TabType; icon: typeof Users; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.tabs.dashboard },
    { id: 'users', icon: Users, label: t.tabs.users },
    { id: 'characters', icon: Heart, label: t.tabs.characters },
    { id: 'messages', icon: MessageSquare, label: t.tabs.messages },
    { id: 'quests', icon: Target, label: t.tabs.quests },
    { id: 'templates', icon: Image, label: t.tabs.templates },
    { id: 'analytics', icon: BarChart3, label: t.tabs.analytics },
    { id: 'system', icon: Server, label: t.tabs.system },
    { id: 'tier-configs', icon: Settings, label: t.tabs.tierConfigs },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

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
                  onClick={() => { setActiveTab(item.id); setPagination(p => ({ ...p, page: 1 })); }}
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
                onClick={() => handleBulkGive('coins')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-700/50"
              >
                <Coins className="w-5 h-5" />
                {t.giveCoinsAll}
              </button>
              <button
                onClick={() => handleBulkGive('gems')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-700/50"
              >
                <Sparkles className="w-5 h-5" />
                {t.giveGemsAll}
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
                    onChange={(e) => { setSearchQuery(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    placeholder={tr('Tìm theo email, tên người dùng...', 'Search by email, username...')}
                    className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
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
                                setFormData({ coins: user.coins, gems: user.gems, isPremium: user.isPremium });
                                setShowModal('editUser');
                              }}
                              className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                              title={tr('Sửa', 'Edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleResetPassword(user.id)}
                              className="p-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"
                              title={tr('Đặt lại mật khẩu', 'Reset Password')}
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGiveRewards(user.id)}
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
                <PaginationControls pagination={pagination} setPagination={setPagination} language={language} />
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
                <PaginationControls pagination={pagination} setPagination={setPagination} language={language} />
              </div>
            </motion.div>
          )}

          {/* MESSAGES */}
          {activeTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{tr('Tin nhắn', 'Messages')} ({pagination.total.toLocaleString()})</h2>
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
                <PaginationControls pagination={pagination} setPagination={setPagination} language={language} />
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
                    onClick={() => { setFormData({}); setShowModal('createQuest'); }}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> {tr('Tạo nhiệm vụ', 'Create Quest')}
                  </button>
                  <button onClick={fetchQuests} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {['DAILY', 'WEEKLY', 'ACHIEVEMENT'].map((type) => (
                  <div key={type} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-purple-400">{type} {tr('Nhiệm vụ', 'Quests')}</h3>
                    <div className="grid gap-3">
                      {quests.filter(q => q.type === type).map((quest) => (
                        <div key={quest.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
                          <div>
                            <p className="font-medium">{quest.title}</p>
                            <p className="text-sm text-gray-400">{quest.description}</p>
                            <div className="flex gap-2 mt-2">
                              {quest.rewardCoins > 0 && <span className="text-yellow-400 text-sm">{quest.rewardCoins} {tr('xu', 'coins')}</span>}
                              {quest.rewardGems > 0 && <span className="text-purple-400 text-sm">{quest.rewardGems} {tr('ngọc', 'gems')}</span>}
                              {quest.rewardXp > 0 && <span className="text-blue-400 text-sm">{quest.rewardXp} XP</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${quest.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {quest.isActive ? tr('Đang hoạt động', 'Active') : tr('Không hoạt động', 'Inactive')}
                            </span>
                            <button
                              onClick={() => handleToggleQuest(quest.id)}
                              className="p-2 bg-gray-600/50 rounded-lg hover:bg-gray-600"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
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
                      <div className="h-48 bg-gray-700">
                        <img src={template.avatarUrl} alt={template.name} className="w-full h-full object-cover" />
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
              <TierConfigTab apiCall={apiCall} showToast={showToast} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showModal === 'editUser' && selectedItem && (
          <Modal title={tr('Chỉnh sửa người dùng', 'Edit User')} onClose={() => setShowModal(null)}>
            <p className="text-gray-400 mb-4">{selectedItem.email}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Xu', 'Coins')}</label>
                <input
                  type="number"
                  value={formData.coins as number || 0}
                  onChange={(e) => setFormData({ ...formData, coins: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Ngọc', 'Gems')}</label>
                <input
                  type="number"
                  value={formData.gems as number || 0}
                  onChange={(e) => setFormData({ ...formData, gems: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPremium"
                  checked={formData.isPremium as boolean || false}
                  onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                />
                <label htmlFor="isPremium" className="text-gray-300">{tr('Trạng thái Premium', 'Premium Status')}</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
                {tr('Hủy', 'Cancel')}
              </button>
              <button onClick={handleUpdateUser} disabled={actionLoading} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50">
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
                <label className="block text-sm text-gray-400 mb-2">Avatar URL *</label>
                <input
                  type="url"
                  value={formData.avatarUrl as string || ''}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  placeholder="https://..."
                />
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
                <label className="block text-sm text-gray-400 mb-2">Avatar URL *</label>
                <input
                  type="url"
                  value={formData.avatarUrl as string || ''}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                />
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
      </AnimatePresence>
    </div>
  );
}
