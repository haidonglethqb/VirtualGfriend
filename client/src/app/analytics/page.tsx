'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

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
              href="/dashboard"
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-pink-500/20">
                <BarChart3 className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Thống kê</h1>
                <p className="text-xs text-white/60">Xem tiến trình mối quan hệ</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="p-4">
          <AnalyticsDashboard />
        </div>
      </div>
    </AppLayout>
  );
}
