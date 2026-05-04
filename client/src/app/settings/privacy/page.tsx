'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Check, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import { useLanguageStore } from '@/store/language-store';

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const [isLoading, setIsLoading] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    profilePublic: false,
    showActivity: false,
    allowMessages: true,
    allowExPersonaMessages: true,
  });

  const fetchPrivacySettings = useCallback(async () => {
    try {
      const response = await api.get('/users/privacy');
      if (response.success && response.data) {
        setPrivacySettings(response.data as typeof privacySettings);
      }
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    void fetchPrivacySettings();
  }, [fetchPrivacySettings, isAuthenticated, router]);

  const handleToggle = async (key: keyof typeof privacySettings) => {
    const newValue = !privacySettings[key];
    setPrivacySettings((prev) => ({ ...prev, [key]: newValue }));

    try {
      setIsLoading(true);
      await api.patch('/users/privacy', { [key]: newValue });
      toast({
        title: tr('Thành công', 'Success'),
        description: tr('Cài đặt quyền riêng tư đã được cập nhật', 'Privacy settings updated'),
      });
    } catch {
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể cập nhật cài đặt', 'Unable to update settings'),
        variant: 'destructive',
      });
      setPrivacySettings((prev) => ({ ...prev, [key]: !newValue }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Link href="/settings">
            <button className="p-2 rounded-lg hover:bg-[#392830] transition-colors">
              <ArrowLeft className="w-5 h-5 text-love" />
            </button>
          </Link>
          <Lock className="w-6 h-6 text-love" />
          <h1 className="text-2xl font-bold">{tr('Quyền riêng tư', 'Privacy')}</h1>
        </motion.div>

        {/* Privacy Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Profile Public */}
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">{tr('Hồ sơ công khai', 'Public profile')}</h3>
                <p className="text-[#ba9cab]">{tr('Cho phép những người khác xem hồ sơ của bạn', 'Allow others to view your profile')}</p>
              </div>
              <button
                onClick={() => handleToggle('profilePublic')}
                disabled={isLoading}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  privacySettings.profilePublic ? 'bg-gradient-to-r from-love to-pink-600' : 'bg-[#392830]'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    privacySettings.profilePublic ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Show Activity */}
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">{tr('Hiển thị hoạt động', 'Show activity')}</h3>
                <p className="text-[#ba9cab]">{tr('Cho phép xem lịch sử trò chuyện của bạn', 'Allow others to see your chat activity')}</p>
              </div>
              <button
                onClick={() => handleToggle('showActivity')}
                disabled={isLoading}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  privacySettings.showActivity ? 'bg-gradient-to-r from-love to-pink-600' : 'bg-[#392830]'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    privacySettings.showActivity ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Allow Messages */}
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">{tr('Cho phép tin nhắn', 'Allow messages')}</h3>
                <p className="text-[#ba9cab]">{tr('Cho phép nhận tin nhắn từ người khác', 'Allow receiving messages from others')}</p>
              </div>
              <button
                onClick={() => handleToggle('allowMessages')}
                disabled={isLoading}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  privacySettings.allowMessages ? 'bg-gradient-to-r from-love to-pink-600' : 'bg-[#392830]'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    privacySettings.allowMessages ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">{tr('Tin nhắn từ người cũ AI', 'AI ex messages')}</h3>
                <p className="text-[#ba9cab]">
                  {tr(
                    'Cho phép hệ thống gửi lại tin nhắn comeback từ phiên bản người cũ sau khi chia tay.',
                    'Allow comeback messages from the ex-persona after a breakup.'
                  )}
                </p>
              </div>
              <button
                onClick={() => handleToggle('allowExPersonaMessages')}
                disabled={isLoading}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  privacySettings.allowExPersonaMessages ? 'bg-gradient-to-r from-love to-pink-600' : 'bg-[#392830]'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    privacySettings.allowExPersonaMessages ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Data Export */}
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">{tr('Tải xuống dữ liệu', 'Download data')}</h3>
                <p className="text-[#ba9cab]">{tr('Tải xuống tất cả dữ liệu cá nhân của bạn', 'Download all of your personal data')}</p>
              </div>
              <button className="px-4 py-2 rounded-lg bg-love/10 border border-love/30 text-love hover:bg-love/20 transition-colors">
                {tr('Tải xuống', 'Download')}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
        >
          <p className="text-sm text-yellow-200">
            {tr('Mẹo: Bạn có thể thay đổi các cài đặt này bất kỳ lúc nào.', 'Tip: You can change these settings at any time.')}
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
