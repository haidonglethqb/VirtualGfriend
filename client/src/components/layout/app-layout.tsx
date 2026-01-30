'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Heart, MessageCircle, Gift, Target, ImageIcon, 
  Settings, Star, LogOut
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useCharacterStore } from '@/store/character-store';
import { formatNumber } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const navItems = [
  { href: '/dashboard', icon: Heart, label: 'Trang chủ' },
  { href: '/chat', icon: MessageCircle, label: 'Trò chuyện' },
  { href: '/quests', icon: Target, label: 'Nhiệm vụ' },
  { href: '/shop', icon: Gift, label: 'Cửa hàng' },
  { href: '/memories', icon: ImageIcon, label: 'Kỷ niệm' },
];

export default function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { character } = useCharacterStore();

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
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-love' : 'text-[#ba9cab] hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
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
                  return (
                    <Link key={item.href} href={item.href}>
                      <button 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all group ${
                          isActive 
                            ? 'bg-love/10 text-love border border-love/20' 
                            : 'hover:bg-[#392830] text-[#ba9cab] hover:text-white border border-transparent'
                        }`}
                      >
                        <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>

              {/* Settings & Logout */}
              <div className="mt-4 pt-4 border-t border-[#392830]">
                <Link href="/settings">
                  <button 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all group ${
                      pathname === '/settings' 
                        ? 'bg-love/10 text-love border border-love/20' 
                        : 'hover:bg-[#392830] text-[#ba9cab] hover:text-white border border-transparent'
                    }`}
                  >
                    <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Cài đặt</span>
                  </button>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all group hover:bg-red-500/10 text-[#ba9cab] hover:text-red-400 border border-transparent"
                >
                  <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
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

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#181114]/95 backdrop-blur-sm border-t border-[#392830] z-20">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-4 py-2 ${
                  isActive ? 'text-love' : 'text-[#ba9cab]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
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
