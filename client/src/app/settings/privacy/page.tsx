'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Check, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    profilePublic: false,
    showActivity: false,
    allowMessages: true,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    fetchPrivacySettings();
  }, [isAuthenticated, router]);

  const fetchPrivacySettings = async () => {
    try {
      const response = await api.get('/users/privacy');
      if (response.success && response.data) {
        setPrivacySettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error);
    }
  };

  const handleToggle = async (key: keyof typeof privacySettings) => {
    const newValue = !privacySettings[key];
    setPrivacySettings((prev) => ({ ...prev, [key]: newValue }));

    try {
      setIsLoading(true);
      await api.patch('/users/privacy', { [key]: newValue });
      toast({
        title: 'Thành công',
        description: 'Cài đặt quyền riêng tư đã được cập nhật',
      });
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật cài đặt',
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
          <h1 className="text-2xl font-bold">Quyền riêng tư</h1>
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
                <h3 className="text-lg font-bold mb-2">Hồ sơ công khai</h3>
                <p className="text-[#ba9cab]">Cho phép những người khác xem hồ sơ của bạn</p>
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
                <h3 className="text-lg font-bold mb-2">Hiển thị hoạt động</h3>
                <p className="text-[#ba9cab]">Cho phép xem lịch sử trò chuyện của bạn</p>
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
                <h3 className="text-lg font-bold mb-2">Cho phép tin nhắn</h3>
                <p className="text-[#ba9cab]">Cho phép nhận tin nhắn từ người khác</p>
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

          {/* Data Export */}
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">Tải xuống dữ liệu</h3>
                <p className="text-[#ba9cab]">Tải xuống tất cả dữ liệu cá nhân của bạn</p>
              </div>
              <button className="px-4 py-2 rounded-lg bg-love/10 border border-love/30 text-love hover:bg-love/20 transition-colors">
                Tải xuống
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
            💡 <strong>Mẹo:</strong> Bạn có thể thay đổi các cài đặt này bất kỳ lúc nào.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
