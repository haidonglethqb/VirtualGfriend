'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Brain } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { FactsManager } from '@/components/facts/facts-manager';
import { useLanguageStore } from '@/store/language-store';

export default function FactsSettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-[#1a1015] via-[#1e1318] to-[#1a1015]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 bg-[#1a1015]/90 backdrop-blur-lg border-b border-[#392830]"
        >
          <div className="flex items-center gap-4 p-4">
            <Link 
              href="/settings"
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/20">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">{tr('Quản lý Facts', 'Manage Facts')}</h1>
                <p className="text-xs text-white/60">{tr('Thông tin AI đã học về bạn', 'Information AI has learned about you')}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="p-4">
          <FactsManager />
        </div>
      </div>
    </AppLayout>
  );
}
