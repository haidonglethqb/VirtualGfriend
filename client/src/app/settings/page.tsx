'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Settings, User, Bell, Volume2, Moon, 
  Globe, Shield, LogOut, ChevronRight, Heart, 
  Palette, Trash2, HelpCircle, Info, Brain
} from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface SettingItem {
  icon: React.ReactNode;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

interface UserSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  theme: string;
  language: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<UserSettings>({
    notificationsEnabled: true,
    soundEnabled: true,
    theme: 'dark',
    language: 'vi',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    fetchSettings();
  }, [isAuthenticated, router]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<UserSettings>('/users/settings');
      if (response.success && response.data) {
        const s = response.data;
        setSettings({
          notificationsEnabled: s.notificationsEnabled ?? true,
          soundEnabled: s.soundEnabled ?? true,
          theme: s.theme || 'dark',
          language: s.language || 'vi',
        });
        if (s.language === 'vi' || s.language === 'en') {
          setLanguage(s.language);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: tr('Đã đăng xuất', 'Logged out'),
      description: tr('Hẹn gặp lại bạn!', 'See you again soon!'),
    });
    router.push('/');
  };

  const handleToggle = async (key: keyof UserSettings) => {
    const newValue = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newValue }));
    
    try {
      setIsSaving(true);
      await api.patch('/users/settings', { [key]: newValue });
    } catch (error) {
      console.error('Failed to save setting:', error);
      // Revert on error
      setSettings((prev) => ({ ...prev, [key]: !newValue }));
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể lưu cài đặt', 'Could not save settings'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const profileSettings: SettingItem[] = [
    {
      icon: <User className="w-5 h-5" />,
      label: tr('Chỉnh sửa hồ sơ', 'Edit profile'),
      description: tr('Cập nhật thông tin cá nhân', 'Update personal information'),
      href: '/settings/profile',
    },
    {
      icon: <Heart className="w-5 h-5" />,
      label: tr('Người yêu ảo của tôi', 'My AI companion'),
      description: tr('Xem và chỉnh sửa nhân vật', 'View and edit character'),
      href: '/settings/character',
    },
    {
      icon: <Brain className="w-5 h-5" />,
      label: tr('Quản lý Facts', 'Manage facts'),
      description: tr('Xem và chỉnh sửa thông tin AI đã học', 'View and edit what AI has learned'),
      href: '/settings/facts',
    },
  ];

  const appSettings: SettingItem[] = [
    {
      icon: <Bell className="w-5 h-5" />,
      label: tr('Thông báo', 'Notifications'),
      description: tr('Nhận thông báo từ người yêu', 'Receive companion notifications'),
      rightElement: (
        <ToggleSwitch
          checked={settings.notificationsEnabled}
          onChange={() => handleToggle('notificationsEnabled')}
        />
      ),
    },
    {
      icon: <Volume2 className="w-5 h-5" />,
      label: tr('Âm thanh', 'Sound'),
      description: tr('Hiệu ứng âm thanh trong app', 'In-app sound effects'),
      rightElement: (
        <ToggleSwitch
          checked={settings.soundEnabled}
          onChange={() => handleToggle('soundEnabled')}
        />
      ),
    },
    {
      icon: <Moon className="w-5 h-5" />,
      label: tr('Chế độ tối', 'Dark mode'),
      description: tr('Giao diện tối', 'Dark appearance'),
      rightElement: (
        <ToggleSwitch
          checked={settings.theme === 'dark'}
          onChange={() => {
            const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
            setSettings((prev) => ({ ...prev, theme: newTheme }));
            api.patch('/users/settings', { theme: newTheme }).catch(() => {
              // Revert on error
              setSettings((prev) => ({ ...prev, theme: settings.theme }));
              toast({ title: tr('Lỗi', 'Error'), description: tr('Không thể thay đổi chế độ tối', 'Could not change dark mode'), variant: 'destructive' });
            });
          }}
        />
      ),
    },
    {
      icon: <Globe className="w-5 h-5" />,
      label: tr('Ngôn ngữ', 'Language'),
      description: language === 'vi' ? 'Tiếng Việt' : 'English',
      href: '/settings/language',
    },
    {
      icon: <Palette className="w-5 h-5" />,
      label: tr('Giao diện', 'Appearance'),
      description: tr('Tùy chỉnh màu sắc và theme', 'Customize colors and theme'),
      href: '/settings/appearance',
    },
  ];

  const otherSettings: SettingItem[] = [
    {
      icon: <Shield className="w-5 h-5" />,
      label: tr('Quyền riêng tư', 'Privacy'),
      description: tr('Quản lý dữ liệu và bảo mật', 'Manage data and security'),
      href: '/settings/privacy',
    },
    {
      icon: <HelpCircle className="w-5 h-5" />,
      label: tr('Trợ giúp & Hỗ trợ', 'Help & support'),
      href: '/settings/help',
    },
    {
      icon: <Info className="w-5 h-5" />,
      label: tr('Về ứng dụng', 'About app'),
      description: tr('Phiên bản 1.0.0', 'Version 1.0.0'),
      href: '/settings/about',
    },
  ];

  const dangerSettings: SettingItem[] = [
    {
      icon: <Trash2 className="w-5 h-5" />,
      label: tr('Xóa tài khoản', 'Delete account'),
      description: tr('Xóa vĩnh viễn tài khoản và dữ liệu', 'Permanently delete account and data'),
      onClick: () => {
        // TODO: Show confirmation dialog
        toast({
          title: tr('Chức năng này chưa khả dụng', 'This feature is not available yet'),
          variant: 'destructive',
        });
      },
      danger: true,
    },
    {
      icon: <LogOut className="w-5 h-5" />,
      label: tr('Đăng xuất', 'Log out'),
      onClick: handleLogout,
      danger: true,
    },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-love" />
            {tr('Cài đặt', 'Settings')}
          </h1>
        </div>

        {/* User info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="rounded-2xl bg-[#271b21] border border-love/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-love to-pink-600 flex items-center justify-center text-2xl text-white font-bold border-2 border-love/30">
                {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{user?.username || tr('Người dùng', 'User')}</h2>
                <p className="text-[#ba9cab]">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span className="text-love">Premium</span>
                  <span className="text-[#ba9cab]">•</span>
                  <span className="text-[#ba9cab]">{tr('Chuỗi ngày', 'Streak')}: {user?.streak || 1} {tr('ngày', 'days')}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SettingsSection title={tr('Hồ sơ', 'Profile')} items={profileSettings} />
        </motion.div>

        {/* App settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SettingsSection title={tr('Ứng dụng', 'App')} items={appSettings} />
        </motion.div>

        {/* Other settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <SettingsSection title={tr('Khác', 'Other')} items={otherSettings} />
        </motion.div>

        {/* Danger zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <SettingsSection title={tr('Vùng nguy hiểm', 'Danger zone')} items={dangerSettings} />
        </motion.div>
      </div>
    </AppLayout>
  );
}

function SettingsSection({ title, items }: { title: string; items: SettingItem[] }) {
  return (
    <div className="rounded-2xl bg-[#271b21] border border-[#392830] overflow-hidden">
      <div className="px-6 py-3 border-b border-[#392830]">
        <h3 className="text-sm text-[#ba9cab] font-medium">{title}</h3>
      </div>
      <div>
        {items.map((item, index) => (
          <SettingsRow key={index} item={item} isLast={index === items.length - 1} />
        ))}
      </div>
    </div>
  );
}

function SettingsRow({ item, isLast }: { item: SettingItem; isLast: boolean }) {
  const content = (
    <div
      className={`flex items-center gap-4 px-6 py-4 hover:bg-[#392830]/50 transition-colors cursor-pointer ${
        !isLast ? 'border-b border-[#392830]' : ''
      }`}
      onClick={item.onClick}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        item.danger ? 'bg-red-500/10 text-red-400' : 'bg-love/10 text-love'
      }`}>
        {item.icon}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${item.danger ? 'text-red-400' : ''}`}>{item.label}</p>
        {item.description && (
          <p className="text-sm text-[#ba9cab]">{item.description}</p>
        )}
      </div>
      {item.rightElement || (
        item.href && <ChevronRight className="w-5 h-5 text-[#ba9cab]" />
      )}
    </div>
  );

  if (item.href) {
    return <Link href={item.href}>{content}</Link>;
  }

  return content;
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`w-12 h-7 rounded-full transition-colors relative ${
        checked ? 'bg-gradient-to-r from-love to-pink-600' : 'bg-[#392830]'
      }`}
    >
      <span
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}
