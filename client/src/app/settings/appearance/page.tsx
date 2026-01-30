'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Palette } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';

const themes = [
  {
    id: 'dark',
    name: 'Chế độ tối (Mặc định)',
    colors: ['#181114', '#271b21', '#f4258c'],
    description: 'Giao diện tối, dễ nhìn vào ban đêm',
  },
  {
    id: 'light',
    name: 'Chế độ sáng',
    colors: ['#ffffff', '#f5f5f5', '#f4258c'],
    description: 'Giao diện sáng, dễ nhìn vào ban ngày',
    disabled: true,
  },
  {
    id: 'auto',
    name: 'Tự động',
    colors: ['#181114', '#ffffff', '#f4258c'],
    description: 'Tự động chuyển đổi theo thời gian',
    disabled: true,
  },
];

export default function AppearanceSettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

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
          <Palette className="w-6 h-6 text-love" />
          <h1 className="text-2xl font-bold">Giao diện</h1>
        </motion.div>

        {/* Themes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {themes.map((theme, index) => (
            <motion.button
              key={theme.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              disabled={theme.disabled}
              className={`w-full rounded-2xl border p-6 transition-all ${
                theme.id === 'dark'
                  ? 'bg-love/10 border-love/30'
                  : 'bg-[#271b21] border-[#392830] hover:border-[#392830]/80'
              } ${theme.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{theme.name}</h3>
                {theme.id === 'dark' && (
                  <span className="px-3 py-1 rounded-full bg-love/20 border border-love/30 text-love text-xs font-bold">
                    Hiện tại
                  </span>
                )}
              </div>
              
              <p className="text-[#ba9cab] text-sm mb-4">{theme.description}</p>
              
              <div className="flex gap-2">
                {theme.colors.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1 h-16 rounded-lg border border-white/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Color Customization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-2xl bg-[#271b21] border border-[#392830] p-6"
        >
          <h3 className="font-bold text-lg mb-4">Màu chính</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-love border-2 border-love" />
              <div>
                <p className="font-bold">Màu yêu thích</p>
                <p className="text-sm text-[#ba9cab]">#f4258c</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-[#ba9cab] mt-4">
            💡 Tùy chỉnh màu sắc sẽ được thêm vào trong phiên bản tương lai.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
