'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Check } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';

const languages = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧', disabled: true },
  { code: 'ja', name: '日本語', flag: '🇯🇵', disabled: true },
  { code: 'zh', name: '中文', flag: '🇨🇳', disabled: true },
];

export default function LanguageSettingsPage() {
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
          <Globe className="w-6 h-6 text-love" />
          <h1 className="text-2xl font-bold">Ngôn ngữ</h1>
        </motion.div>

        {/* Languages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {languages.map((lang, index) => (
            <motion.button
              key={lang.code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              disabled={lang.disabled}
              className={`w-full rounded-2xl border p-4 transition-all flex items-center justify-between ${
                lang.code === 'vi'
                  ? 'bg-love/10 border-love/30'
                  : 'bg-[#271b21] border-[#392830] hover:border-[#392830]/80'
              } ${lang.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{lang.flag}</span>
                <div className="text-left">
                  <h3 className="font-bold">{lang.name}</h3>
                  {lang.disabled && (
                    <p className="text-xs text-[#ba9cab]">Sắp có</p>
                  )}
                </div>
              </div>
              {lang.code === 'vi' && (
                <Check className="w-6 h-6 text-love" />
              )}
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20"
        >
          <p className="text-sm text-blue-200">
            ℹ️ <strong>Thông tin:</strong> Hiện tại ứng dụng chỉ hỗ trợ Tiếng Việt. Các ngôn ngữ khác sẽ được thêm vào trong tương lai.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
