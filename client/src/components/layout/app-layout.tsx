'use client';

import { ReactNode, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Heart, MessageCircle, Gift, Target, ImageIcon, 
  Settings, Star, LogOut, Users, Trophy
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useCharacterStore } from '@/store/character-store';
import { formatNumber } from '@/lib/utils';
import api from '@/services/api';
import { socketService } from '@/services/socket';

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const navItems = [
  { href: '/dashboard', icon: Heart, label: 'Trang chủ' },
  { href: '/chat', icon: MessageCircle, label: 'Trò chuyện' },
  { href: '/messages', icon: Users, label: 'Nhắn tin' },
  { href: '/quests', icon: Target, label: 'Nhiệm vụ' },
  { href: '/shop', icon: Gift, label: 'Cửa hàng' },
  { href: '/leaderboard', icon: Trophy, label: 'Xếp hạng' },
  { href: '/memories', icon: ImageIcon, label: 'Kỷ niệm' },
];

export default function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { character } = useCharacterStore();

  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const [activeQuestCount, setActiveQuestCount] = useState(0);

  // Fetch badge counts
  const fetchBadgeCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [dmRes, questRes] = await Promise.all([
        api.get<{ count: number }>('/dm/unread-count'),
        api.get<any[]>('/quests/daily'),
      ]);
      if (dmRes.success) setUnreadDmCount(dmRes.data.count);
      if (questRes.success) {
        // Count quests that are available (not claimed) — either not started or completed but unclaimed
        const quests = Array.isArray(questRes.data) ? questRes.data : [];
        const available = quests.filter(
          (q: any) => !q.userProgress || !q.userProgress.claimed
        );
        setActiveQuestCount(available.length);
      }
    } catch {
      // silent
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchBadgeCounts();
    // Poll every 30 seconds
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchBadgeCounts]);

  // Listen for DM events to update badge
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleDmReceive = () => {
      // Only increment if not on messages page
      if (pathname !== '/messages') {
        setUnreadDmCount(prev => prev + 1);
      }
    };
    socketService.on('dm:receive', handleDmReceive);
    return () => {
      socketService.off('dm:receive', handleDmReceive);
    };
  }, [isAuthenticated, pathname]);

  // Reset DM badge when visiting messages page
  useEffect(() => {
    if (pathname === '/messages') {
      setUnreadDmCount(0);
    }
  }, [pathname]);

  // Badge count map
  const badgeCounts: Record<string, number> = {
    '/messages': unreadDmCount,
    '/quests': activeQuestCount,
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#181114] text-white font-sans">
      {/* Header - Simplified */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#392830] bg-[#181114]/95 backdrop-blur-sm px-6 py-4 lg:px-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-4">
            <div className="flex items-center justify-center text-love">
              <Heart className="w-7 h-7 fill-love" />
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">Người Yêu Ảo</h2>
          </Link>
        </div>
        
        {/* Desktop Nav - Only show on lg when no sidebar */}
        <nav className="hidden md:flex lg:hidden items-center gap-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const badge = badgeCounts[item.href] || 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  isActive ? 'text-love' : 'text-[#ba9cab] hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {badge > 0 && (
                  <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-love text-white text-[10px] font-bold animate-pulse">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side - Only coins */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#271b21] border border-[#392830]">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-bold text-sm">{formatNumber(user?.coins || 0)}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative max-w-[1600px] mx-auto w-full">
        {/* Sidebar Navigation */}
        {showSidebar && (
          <aside className="hidden lg:flex flex-col w-64 sticky top-20 h-[calc(100vh-5rem)] p-6 overflow-y-auto border-r border-[#392830]/30">
            <div className="flex flex-col gap-6">
              {/* User Profile in Sidebar */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#271b21] border border-[#392830]">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-love to-pink-600 flex items-center justify-center text-xl border-2 border-love/30">
                  {character?.gender === 'FEMALE' ? '👩' : '👨'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{character?.name || 'Người yêu'}</p>
                  <p className="text-xs text-[#ba9cab]">Level {Math.floor((character?.affection || 0) / 100) + 1}</p>
                </div>
              </div>

              <div>
                <h1 className="text-white text-lg font-bold mb-1">Điều hướng</h1>
                <p className="text-[#ba9cab] text-sm">Chọn trang bạn muốn</p>
              </div>
              
              <div className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const badge = badgeCounts[item.href] || 0;
                  return (
                    <Link key={item.href} href={item.href}>
                      <button 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 group relative ${
                          isActive 
                            ? 'bg-love/10 text-love border border-love/20 shadow-[0_0_12px_rgba(173,43,238,0.15)]' 
                            : 'hover:bg-[#392830] hover:shadow-[0_0_8px_rgba(173,43,238,0.08)] text-[#ba9cab] hover:text-white border border-transparent hover:border-[#4a3040] hover:translate-x-1'
                        }`}
                      >
                        <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                        <span className={`text-sm flex-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                        {badge > 0 && (
                          <span className="min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full bg-love text-white text-[10px] font-bold shadow-[0_0_8px_rgba(173,43,238,0.4)]">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </button>
                    </Link>
                  );
                })}
              </div>

              {/* Settings & Logout */}
              <div className="mt-4 pt-4 border-t border-[#392830]">
                <Link href="/settings">
                  <button 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 group ${
                      pathname === '/settings' 
                        ? 'bg-love/10 text-love border border-love/20 shadow-[0_0_12px_rgba(173,43,238,0.15)]' 
                        : 'hover:bg-[#392830] hover:shadow-[0_0_8px_rgba(173,43,238,0.08)] text-[#ba9cab] hover:text-white border border-transparent hover:border-[#4a3040] hover:translate-x-1'
                    }`}
                  >
                    <Settings className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                    <span className="text-sm font-medium">Cài đặt</span>
                  </button>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 group hover:bg-red-500/10 text-[#ba9cab] hover:text-red-400 border border-transparent hover:border-red-500/20 hover:translate-x-1 hover:shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                >
                  <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-sm font-medium">Đăng xuất</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav — only on mobile (below md), header nav covers md-lg, sidebar covers lg+ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#181114]/95 backdrop-blur-sm border-t border-[#392830] z-20">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const badge = badgeCounts[item.href] || 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-1 px-4 py-2 transition-all duration-200 active:scale-90 ${
                  isActive ? 'text-love' : 'text-[#ba9cab] active:text-white'
                }`}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-2 -right-3 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-love text-white text-[9px] font-bold">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-xs">{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-love" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// Named export for convenience
export { AppLayout };
