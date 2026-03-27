'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Heart, Coins, Shield, LogOut,
  Crown, Sparkles, LayoutDashboard, Settings,
  Target, Image, BarChart3, Check, AlertTriangle,
  Megaphone, Server, Languages,
} from 'lucide-react';
import { TierConfigTab } from './tier-config-tab';
import { useLanguageStore } from '@/store/language-store';
import { API_URL, ADMIN_I18N, createTemplateFormData } from './admin-types';
import type { TabType, User, Character, Message, Quest, Template, Stats, SystemInfo, AnalyticsData, Pagination } from './admin-types';
import { DashboardTab } from './tabs/admin-dashboard-tab';
import { UsersTab } from './tabs/admin-users-tab';
import { CharactersTab } from './tabs/admin-characters-tab';
import { MessagesTab } from './tabs/admin-messages-tab';
import { QuestsTab } from './tabs/admin-quests-tab';
import { TemplatesTab } from './tabs/admin-templates-tab';
import { AnalyticsTab } from './tabs/admin-analytics-tab';
import { SystemTab } from './tabs/admin-system-tab';
// Side-effectful import: registers Chart.js components used by analytics tab

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
  const [analyticsGroupBy, setAnalyticsGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [analyticsPremiumTier, setAnalyticsPremiumTier] = useState<'ALL' | 'FREE' | 'BASIC' | 'PRO' | 'ULTIMATE'>('ALL');
  const [analyticsUserSegment, setAnalyticsUserSegment] = useState<'all' | 'new' | 'returning'>('all');
  const [analyticsVerified, setAnalyticsVerified] = useState<'all' | 'verified' | 'unverified'>('all');
  const [analyticsMessageRole, setAnalyticsMessageRole] = useState<'ALL' | 'USER' | 'AI' | 'SYSTEM'>('ALL');
  const [analyticsTopLimit, setAnalyticsTopLimit] = useState(10);
  const [analyticsSortBy, setAnalyticsSortBy] = useState<'messages' | 'coins' | 'gems' | 'streak' | 'lastActiveAt'>('messages');
  const [analyticsMinMessageCount, setAnalyticsMinMessageCount] = useState(0);
  const [systemWindowMinutes, setSystemWindowMinutes] = useState(60);
  const [systemTableLimit, setSystemTableLimit] = useState(20);
  
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
    const params = new URLSearchParams({
      days: String(d),
      groupBy: analyticsGroupBy,
      premiumTier: analyticsPremiumTier,
      userSegment: analyticsUserSegment,
      verified: analyticsVerified,
      messageRole: analyticsMessageRole,
      topLimit: String(analyticsTopLimit),
      sortBy: analyticsSortBy,
      minMessageCount: String(analyticsMinMessageCount),
    });
    const res = await apiCall(`/analytics?${params.toString()}`);
    if (res.ok) setAnalytics(await res.json());
  };

  const fetchTemplates = async () => {
    const res = await apiCall('/templates');
    if (res.ok) setTemplates(await res.json());
  };

  const fetchSystemInfo = async () => {
    const params = new URLSearchParams({
      windowMinutes: String(systemWindowMinutes),
      tableLimit: String(systemTableLimit),
    });
    const res = await apiCall(`/system?${params.toString()}`);
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

          {activeTab === 'dashboard' && stats && (

            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <DashboardTab stats={stats} language={language} />

            </motion.div>

          )}

          {activeTab === 'users' && (

            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <UsersTab

                users={users} pagination={pagination} setPagination={setPagination}

                searchQuery={searchQuery} setSearchQuery={setSearchQuery} language={language}

                fetchUsers={fetchUsers} formData={formData} setFormData={setFormData}

                showModal={showModal} setShowModal={setShowModal}

                selectedItem={selectedItem} setSelectedItem={setSelectedItem}

                handleUpdateUser={handleUpdateUser} handleResetPassword={handleResetPassword}

                handleGiveRewards={handleGiveRewards} actionLoading={actionLoading}

              />

            </motion.div>

          )}

          {activeTab === 'characters' && (

            <motion.div key="characters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <CharactersTab

                characters={characters} pagination={pagination} setPagination={setPagination}

                language={language} fetchCharacters={fetchCharacters}

                handleDeleteCharacter={handleDeleteCharacter}

              />

            </motion.div>

          )}

          {activeTab === 'messages' && (

            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <MessagesTab

                messages={messages} pagination={pagination} setPagination={setPagination}

                language={language} fetchMessages={fetchMessages}

              />

            </motion.div>

          )}

          {activeTab === 'quests' && (

            <motion.div key="quests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <QuestsTab

                quests={quests} language={language} fetchQuests={fetchQuests}

                handleToggleQuest={handleToggleQuest} handleCreateQuest={handleCreateQuest}

                formData={formData} setFormData={setFormData}

                showModal={showModal} setShowModal={setShowModal} actionLoading={actionLoading}

              />

            </motion.div>

          )}

          {activeTab === 'templates' && (

            <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <TemplatesTab

                templates={templates} language={language} fetchTemplates={fetchTemplates}

                handleToggleTemplate={handleToggleTemplate} handleCreateTemplate={handleCreateTemplate}

                handleUpdateTemplate={handleUpdateTemplate} handleDeleteTemplate={handleDeleteTemplate}

                formData={formData} setFormData={setFormData}

                showModal={showModal} setShowModal={setShowModal}

                selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate}

                createTemplateFormData={createTemplateFormData} actionLoading={actionLoading}

              />

            </motion.div>

          )}

          {activeTab === 'analytics' && (

            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <AnalyticsTab

                analytics={analytics} analyticsDays={analyticsDays} setAnalyticsDays={setAnalyticsDays}

                analyticsGroupBy={analyticsGroupBy} setAnalyticsGroupBy={setAnalyticsGroupBy}

                analyticsPremiumTier={analyticsPremiumTier} setAnalyticsPremiumTier={setAnalyticsPremiumTier}

                analyticsUserSegment={analyticsUserSegment} setAnalyticsUserSegment={setAnalyticsUserSegment}

                analyticsVerified={analyticsVerified} setAnalyticsVerified={setAnalyticsVerified}

                analyticsMessageRole={analyticsMessageRole} setAnalyticsMessageRole={setAnalyticsMessageRole}

                analyticsTopLimit={analyticsTopLimit} setAnalyticsTopLimit={setAnalyticsTopLimit}

                analyticsSortBy={analyticsSortBy} setAnalyticsSortBy={setAnalyticsSortBy}

                analyticsMinMessageCount={analyticsMinMessageCount} setAnalyticsMinMessageCount={setAnalyticsMinMessageCount}

                fetchAnalytics={fetchAnalytics} language={language}

              />

            </motion.div>

          )}

          {activeTab === 'system' && systemInfo && (

            <motion.div key="system" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <SystemTab

                systemInfo={systemInfo} systemWindowMinutes={systemWindowMinutes}

                setSystemWindowMinutes={setSystemWindowMinutes} systemTableLimit={systemTableLimit}

                setSystemTableLimit={setSystemTableLimit} fetchSystemInfo={fetchSystemInfo}

                handleCleanup={handleCleanup} handleCleanupDuplicates={handleCleanupDuplicates}

                actionLoading={actionLoading} language={language}

              />

            </motion.div>

          )}

          {activeTab === 'tier-configs' && (

            <motion.div key="tier-configs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <TierConfigTab apiCall={apiCall} showToast={showToast} />

            </motion.div>

          )}

        </AnimatePresence>

      </main>
    </div>
  );
}
