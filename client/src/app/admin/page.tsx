'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Heart, Coins, Shield, LogOut, Search,
  ChevronLeft, ChevronRight, Edit2, Trash2, Key, RefreshCw,
  TrendingUp, Crown, Sparkles, LayoutDashboard, Settings,
  Target, Image, Gift, Brain, Bell, Database, BarChart3,
  Plus, X, Check, AlertTriangle, Megaphone, Server, HardDrive,
  Zap, Clock, Activity,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type TabType = 'dashboard' | 'users' | 'characters' | 'messages' | 'quests' | 'templates' | 'analytics' | 'system';

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
  dailyStats: Array<{ date: string; new_users: number; messages: number }>;
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

// Simple Bar Chart Component (no external dependencies)
function BarChart({ 
  data, 
  dataKey, 
  color 
}: { 
  data: Array<{ date: string; [key: string]: string | number }>; 
  dataKey: string; 
  color: string 
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Number(d[dataKey]) || 0), 1);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chart Area */}
      <div className="flex-1 flex items-end gap-1 pb-8 relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue / 2)}</span>
          <span>0</span>
        </div>
        
        {/* Bars */}
        <div className="flex-1 ml-14 flex items-end gap-1 h-full">
          {data.map((item, idx) => {
            const value = Number(item[dataKey]) || 0;
            const heightPercent = (value / maxValue) * 100;
            
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm whitespace-nowrap shadow-xl">
                    <p className="text-white font-medium">{value.toLocaleString()}</p>
                    <p className="text-gray-400 text-xs">{formatDate(item.date)}</p>
                  </div>
                </div>
                
                {/* Bar */}
                <div 
                  className="w-full rounded-t-md transition-all duration-300 hover:opacity-80 cursor-pointer relative"
                  style={{ 
                    height: `${Math.max(heightPercent, 2)}%`,
                    backgroundColor: color,
                    minHeight: '4px'
                  }}
                >
                  {/* Value label on hover */}
                  {heightPercent > 15 && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                      {value}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="ml-14 flex gap-1">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 text-center">
            <span className="text-xs text-gray-500 truncate block">
              {data.length <= 14 ? formatDate(item.date) : (idx % Math.ceil(data.length / 7) === 0 ? formatDate(item.date) : '')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pagination Controls Component
function PaginationControls({ 
  pagination, 
  setPagination 
}: { 
  pagination: Pagination; 
  setPagination: React.Dispatch<React.SetStateAction<Pagination>> 
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700/50">
      <p className="text-sm text-gray-400">
        Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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
      throw new Error('Session expired');
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

      if (!res.ok) throw new Error(data.error || 'Login failed');

      setToken(data.token);
      localStorage.setItem('adminToken', data.token);
      setIsLoggedIn(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
        showToast('User updated successfully');
        setShowModal(null);
        fetchUsers();
      }
    } catch {
      showToast('Failed to update user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPass = prompt('Enter new password (min 8 chars):');
    if (!newPass || newPass.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await apiCall(`/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: newPass }),
      });
      if (res.ok) showToast('Password reset successfully');
    } catch {
      showToast('Failed to reset password', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGiveRewards = async (userId: string) => {
    const coins = prompt('Enter coins to give (0 to skip):');
    const gems = prompt('Enter gems to give (0 to skip):');
    
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
        showToast('Rewards given successfully');
        fetchUsers();
      }
    } catch {
      showToast('Failed to give rewards', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    if (!confirm('Delete this character and all related data? This cannot be undone.')) return;
    
    setActionLoading(true);
    try {
      const res = await apiCall(`/characters/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Character deleted');
        fetchCharacters();
      }
    } catch {
      showToast('Failed to delete character', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleQuest = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await apiCall(`/quests/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        showToast('Quest status toggled');
        fetchQuests();
      }
    } catch {
      showToast('Failed to toggle quest', 'error');
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
        showToast('Quest created');
        setShowModal(null);
        fetchQuests();
      }
    } catch {
      showToast('Failed to create quest', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTemplate = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await apiCall(`/templates/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        showToast('Template status toggled');
        fetchTemplates();
      }
    } catch {
      showToast('Failed to toggle template', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkGive = async (type: 'coins' | 'gems') => {
    const amount = prompt(`Enter ${type} amount to give to ALL users:`);
    if (!amount || parseInt(amount) <= 0) return;
    
    if (!confirm(`Give ${amount} ${type} to ALL users?`)) return;
    
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
      showToast('Failed to give rewards', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBroadcast = async () => {
    const title = prompt('Enter notification title:');
    const message = prompt('Enter notification message:');
    
    if (!title || !message) return;
    
    setActionLoading(true);
    try {
      const res = await apiCall('/broadcast', {
        method: 'POST',
        body: JSON.stringify({ title, message, type: 'info' }),
      });
      if (res.ok) showToast('Broadcast sent to all connected users');
    } catch {
      showToast('Failed to send broadcast', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanup = async (action: string) => {
    if (!confirm(`Run cleanup: ${action}?`)) return;
    
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
      showToast('Cleanup failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!confirm('Clean up duplicate templates? This will:\n- Remove duplicate templates with the same name\n- Migrate characters to the kept template\n\nContinue?')) return;
    
    setActionLoading(true);
    try {
      const res = await apiCall('/cleanup/duplicate-templates', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        const message = data.deleted.length > 0 
          ? `Deleted ${data.deleted.length} duplicates: ${data.deleted.join(', ')}`
          : 'No duplicates found';
        showToast(message);
        // Refresh templates list
        fetchTemplates();
      } else {
        const error = await res.json();
        showToast(error.message || 'Cleanup failed', 'error');
      }
    } catch {
      showToast('Cleanup failed', 'error');
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
          <p className="text-gray-400">Checking authentication...</p>
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
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-gray-400 mt-2">Amoura Management System</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="admin"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  const tabs: { id: TabType; icon: typeof Users; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'characters', icon: Heart, label: 'Characters' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'quests', icon: Target, label: 'Quests' },
    { id: 'templates', icon: Image, label: 'Templates' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'system', icon: Server, label: 'System' },
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
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 p-4 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-gray-400">Amoura</p>
          </div>
        </div>

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

        <div className="mt-8 pt-8 border-t border-gray-700/50 space-y-2">
          <button
            onClick={handleBroadcast}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-700/50"
          >
            <Megaphone className="w-5 h-5" />
            Broadcast
          </button>
          <button
            onClick={() => handleBulkGive('coins')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-700/50"
          >
            <Coins className="w-5 h-5" />
            Give Coins (All)
          </button>
          <button
            onClick={() => handleBulkGive('gems')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-700/50"
          >
            <Sparkles className="w-5 h-5" />
            Give Gems (All)
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <AnimatePresence mode="wait">
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && stats && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
                  { label: 'Premium Users', value: stats.premiumUsers, icon: Crown, color: 'yellow' },
                  { label: 'Characters', value: stats.totalCharacters, icon: Heart, color: 'pink' },
                  { label: 'Messages', value: stats.totalMessages, icon: MessageSquare, color: 'green' },
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
                    <span className="text-gray-400">Active Today</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.activeUsersToday}</p>
                </div>
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-400">New Users Today</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.newUsersToday}</p>
                </div>
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400">Premium Rate</span>
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
                <h2 className="text-2xl font-bold">Users Management</h2>
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
                    placeholder="Search by email, username..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">User</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">Email</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">Premium</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">Coins</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">Gems</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">Actions</th>
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
                            <span className="text-gray-500">Free</span>
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
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleResetPassword(user.id)}
                              className="p-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGiveRewards(user.id)}
                              className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                              title="Give Rewards"
                            >
                              <Gift className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls pagination={pagination} setPagination={setPagination} />
              </div>
            </motion.div>
          )}

          {/* CHARACTERS */}
          {activeTab === 'characters' && (
            <motion.div key="characters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Characters Management</h2>
                <button onClick={fetchCharacters} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">Character</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">Owner</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">Level</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">Affection</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">Status</th>
                      <th className="text-center px-6 py-4 text-gray-400 font-medium">Actions</th>
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
                            {char.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteCharacter(char.id)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls pagination={pagination} setPagination={setPagination} />
              </div>
            </motion.div>
          )}

          {/* MESSAGES */}
          {activeTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Messages ({pagination.total.toLocaleString()})</h2>
                <button onClick={fetchMessages} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">User</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">Character</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">Role</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">Content</th>
                      <th className="text-left px-6 py-4 text-gray-400 font-medium">Date</th>
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
                <PaginationControls pagination={pagination} setPagination={setPagination} />
              </div>
            </motion.div>
          )}

          {/* QUESTS */}
          {activeTab === 'quests' && (
            <motion.div key="quests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Quests Management</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setFormData({}); setShowModal('createQuest'); }}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Create Quest
                  </button>
                  <button onClick={fetchQuests} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {['DAILY', 'WEEKLY', 'ACHIEVEMENT'].map((type) => (
                  <div key={type} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-purple-400">{type} Quests</h3>
                    <div className="grid gap-3">
                      {quests.filter(q => q.type === type).map((quest) => (
                        <div key={quest.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
                          <div>
                            <p className="font-medium">{quest.title}</p>
                            <p className="text-sm text-gray-400">{quest.description}</p>
                            <div className="flex gap-2 mt-2">
                              {quest.rewardCoins > 0 && <span className="text-yellow-400 text-sm">{quest.rewardCoins} coins</span>}
                              {quest.rewardGems > 0 && <span className="text-purple-400 text-sm">{quest.rewardGems} gems</span>}
                              {quest.rewardXp > 0 && <span className="text-blue-400 text-sm">{quest.rewardXp} XP</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${quest.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {quest.isActive ? 'Active' : 'Inactive'}
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
                <h2 className="text-2xl font-bold">Character Templates</h2>
                <button onClick={fetchTemplates} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                  <RefreshCw className="w-5 h-5" />
                </button>
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
                          {template.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{template.description}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{template.gender} • {template.personality}</span>
                        <button
                          onClick={() => handleToggleTemplate(template.id)}
                          className="p-2 bg-gray-600/50 rounded-lg hover:bg-gray-600"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
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
                <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
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
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
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
                  {/* User Growth Chart */}
                  <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      New User Registrations
                    </h3>
                    <div className="h-64">
                      <BarChart data={analytics.dailyStats} dataKey="new_users" color="#3b82f6" />
                    </div>
                  </div>

                  {/* Message Activity Chart */}
                  <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-green-400" />
                      Message Activity
                    </h3>
                    <div className="h-64">
                      <BarChart data={analytics.messageStats} dataKey="count" color="#22c55e" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Users */}
                    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-400" />
                        Top Users by Messages
                      </h3>
                      <div className="space-y-3">
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
                                <p className="font-medium">{user.displayName || user.username || 'Anonymous'}</p>
                                <p className="text-sm text-gray-400">{user.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-purple-400">{user.messageCount.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">messages</p>
                            </div>
                          </div>
                        ))}
                        {analytics.topUsers.length === 0 && (
                          <p className="text-gray-500 text-center py-4">No data available</p>
                        )}
                      </div>
                    </div>

                    {/* Premium Distribution */}
                    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Premium Distribution
                      </h3>
                      <div className="space-y-4">
                        {analytics.premiumDistribution.length > 0 ? (
                          <>
                            {analytics.premiumDistribution.map((tier) => {
                              const total = analytics.premiumDistribution.reduce((acc, t) => acc + t._count, 0);
                              const percentage = total > 0 ? (tier._count / total) * 100 : 0;
                              const tierColors: Record<string, string> = {
                                FREE: 'bg-gray-500',
                                BASIC: 'bg-blue-500',
                                PRO: 'bg-purple-500',
                                ULTIMATE: 'bg-gradient-to-r from-yellow-400 to-pink-500',
                              };
                              return (
                                <div key={tier.premiumTier}>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium">{tier.premiumTier}</span>
                                    <span className="text-sm text-gray-400">{tier._count} users ({percentage.toFixed(1)}%)</span>
                                  </div>
                                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${tierColors[tier.premiumTier] || 'bg-gray-500'} transition-all duration-500`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        ) : (
                          <p className="text-gray-500 text-center py-4">No premium users yet</p>
                        )}
                      </div>

                      {/* Summary Stats */}
                      <div className="mt-6 pt-4 border-t border-gray-700">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-blue-400">
                              {analytics.dailyStats.reduce((acc, d) => acc + d.new_users, 0)}
                            </p>
                            <p className="text-xs text-gray-500">New users ({analyticsDays}d)</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-400">
                              {analytics.messageStats.reduce((acc, d) => acc + d.count, 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">Messages ({analyticsDays}d)</p>
                          </div>
                        </div>
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
                <h2 className="text-2xl font-bold">System Information</h2>
                <button onClick={fetchSystemInfo} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-400">Database Size</span>
                  </div>
                  <p className="text-2xl font-bold">{systemInfo.databaseSize}</p>
                </div>
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-green-400" />
                    <span className="text-gray-400">Uptime</span>
                  </div>
                  <p className="text-2xl font-bold">{Math.floor(systemInfo.uptime / 3600)}h {Math.floor((systemInfo.uptime % 3600) / 60)}m</p>
                </div>
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-400">Memory</span>
                  </div>
                  <p className="text-2xl font-bold">{Math.round(systemInfo.memoryUsage.heapUsed / 1024 / 1024)} MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <h3 className="font-semibold mb-4">Table Statistics</h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {systemInfo.tables.map((table) => (
                      <div key={table.name} className="flex justify-between p-2 bg-gray-700/30 rounded">
                        <span className="text-gray-300">{table.name}</span>
                        <span className="text-gray-400">{table.rows.toLocaleString()} rows</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                  <h3 className="font-semibold mb-4">Cleanup Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleCleanup('expired_tokens')}
                      disabled={actionLoading}
                      className="w-full p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 text-left"
                    >
                      <p className="font-medium">Clean Expired Tokens</p>
                      <p className="text-sm text-gray-400">Remove expired and revoked refresh tokens</p>
                    </button>
                    <button
                      onClick={() => handleCleanup('old_messages')}
                      disabled={actionLoading}
                      className="w-full p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 text-left"
                    >
                      <p className="font-medium">Clean Old Messages</p>
                      <p className="text-sm text-gray-400">Delete messages older than 6 months (free users only)</p>
                    </button>
                    <button
                      onClick={() => handleCleanup('inactive_users')}
                      disabled={actionLoading}
                      className="w-full p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 text-left"
                    >
                      <p className="font-medium">Find Inactive Users</p>
                      <p className="text-sm text-gray-400">List users inactive for 90+ days</p>
                    </button>
                    <button
                      onClick={handleCleanupDuplicates}
                      disabled={actionLoading}
                      className="w-full p-4 bg-red-700/50 rounded-xl hover:bg-red-700 text-left"
                    >
                      <p className="font-medium">Clean Duplicate Templates</p>
                      <p className="text-sm text-gray-400">Remove duplicate character templates and migrate characters</p>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showModal === 'editUser' && selectedItem && (
          <Modal title="Edit User" onClose={() => setShowModal(null)}>
            <p className="text-gray-400 mb-4">{selectedItem.email}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Coins</label>
                <input
                  type="number"
                  value={formData.coins as number || 0}
                  onChange={(e) => setFormData({ ...formData, coins: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Gems</label>
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
                <label htmlFor="isPremium" className="text-gray-300">Premium Status</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
                Cancel
              </button>
              <button onClick={handleUpdateUser} disabled={actionLoading} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50">
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </Modal>
        )}

        {showModal === 'createQuest' && (
          <Modal title="Create Quest" onClose={() => setShowModal(null)}>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title as string || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  placeholder="Quest title"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Description *</label>
                <textarea
                  value={formData.description as string || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  rows={2}
                  placeholder="Quest description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Type</label>
                  <select
                    value={formData.type as string || 'DAILY'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="ACHIEVEMENT">Achievement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category</label>
                  <select
                    value={formData.category as string || 'chat'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value="chat">Chat</option>
                    <option value="gift">Gift</option>
                    <option value="social">Social</option>
                    <option value="explore">Explore</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Coins</label>
                  <input
                    type="number"
                    value={formData.rewardCoins as number || 0}
                    onChange={(e) => setFormData({ ...formData, rewardCoins: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Gems</label>
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
                Cancel
              </button>
              <button onClick={handleCreateQuest} disabled={actionLoading} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50">
                {actionLoading ? 'Creating...' : 'Create Quest'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
