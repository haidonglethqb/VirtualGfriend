'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Check } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';

const LANGUAGE_SETTINGS_I18N = {
  vi: {
    title: 'Ngôn ngữ',
    comingSoon: 'Sắp có',
    info: 'Thông tin:',
    currentSupport: 'Hiện tại ứng dụng hỗ trợ Tiếng Việt và English. Các ngôn ngữ khác sẽ được thêm vào trong tương lai.',
  },
  en: {
    title: 'Language',
    comingSoon: 'Coming Soon',
    info: 'Info:',
    currentSupport: 'Currently the app supports Vietnamese and English. Other languages will be added in the future.',
  },
} as const;

const languages = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', disabled: false },
  { code: 'en', name: 'English', flag: '🇬🇧', disabled: false },
  { code: 'ja', name: '日本語', flag: '🇯🇵', disabled: true },
  { code: 'zh', name: '中文', flag: '🇨🇳', disabled: true },
];

export default function LanguageSettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const t = LANGUAGE_SETTINGS_I18N[language];

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
          <h1 className="text-2xl font-bold">{t.title}</h1>
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
              onClick={() => !lang.disabled && setLanguage(lang.code as 'vi' | 'en')}
              className={`w-full rounded-2xl border p-4 transition-all flex items-center justify-between ${
                lang.code === language
                  ? 'bg-love/10 border-love/30'
                  : 'bg-[#271b21] border-[#392830] hover:border-[#392830]/80'
              } ${lang.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{lang.flag}</span>
                <div className="text-left">
                  <h3 className="font-bold">{lang.name}</h3>
                  {lang.disabled && (
                    <p className="text-xs text-[#ba9cab]">{t.comingSoon}</p>
                  )}
                </div>
              </div>
              {lang.code === language && (
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
            ℹ️ <strong>{t.info}</strong> {t.currentSupport}
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
