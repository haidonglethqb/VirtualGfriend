'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import { useLanguageStore } from '@/store/language-store';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuthStore();
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
      });
    }
  }, [isAuthenticated, router, user]);

  const handleSave = async () => {
    if (!formData.username.trim()) {
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Vui lòng nhập tên người dùng', 'Please enter a username'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.patch('/users/profile', formData);
      if (response.success) {
        // Update auth store to avoid stale state
        const { setUser, user: currentUser } = useAuthStore.getState();
        if (currentUser) {
          setUser({ ...currentUser, username: formData.username, bio: formData.bio });
        }
        toast({
          title: tr('Thành công', 'Success'),
          description: tr('Hồ sơ đã được cập nhật', 'Profile updated'),
        });
        router.push('/settings');
      }
    } catch {
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể cập nhật hồ sơ', 'Unable to update profile'),
        variant: 'destructive',
      });
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
          <h1 className="text-2xl font-bold">{tr('Chỉnh sửa hồ sơ', 'Edit profile')}</h1>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-[#271b21] border border-[#392830] p-6 space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-[#ba9cab] mb-2">
              {tr('Tên người dùng', 'Username')}
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder={tr('Nhập tên người dùng...', 'Enter username...')}
              className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white placeholder-[#ba9cab] px-4 py-3 focus:outline-none focus:border-love transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ba9cab] mb-2">
              {tr('Email', 'Email')}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={tr('Nhập email...', 'Enter email...')}
              className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white placeholder-[#ba9cab] px-4 py-3 focus:outline-none focus:border-love transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ba9cab] mb-2">
              {tr('Tiểu sử', 'Bio')}
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder={tr('Viết một vài dòng về bạn...', 'Write a few lines about yourself...')}
              className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white placeholder-[#ba9cab] px-4 py-3 focus:outline-none focus:border-love transition-colors resize-none h-24"
            />
          </div>

          <div className="flex gap-3">
            <Link href="/settings" className="flex-1">
              <button className="w-full h-12 rounded-lg border border-[#392830] text-[#ba9cab] hover:text-white hover:border-white/30 transition-all">
                {tr('Hủy', 'Cancel')}
              </button>
            </Link>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 h-12 rounded-lg bg-love hover:bg-love/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{tr('Đang lưu...', 'Saving...')}</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>{tr('Lưu thay đổi', 'Save changes')}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
