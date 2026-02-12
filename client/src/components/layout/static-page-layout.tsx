'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft } from 'lucide-react';

interface StaticPageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function StaticPageLayout({ children, title, subtitle }: StaticPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#060212] text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#060212]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ad2bee] to-purple-600 text-white group-hover:shadow-[0_0_20px_-4px_rgba(173,43,238,0.5)] transition-all duration-300">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <span className="font-bold text-white text-lg">Người Yêu Ảo</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all duration-300 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            Về trang chủ
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#ad2bee]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">{subtitle}</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24"
      >
        {children}
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#060212] py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            &copy; 2026 Người Yêu Ảo. Được tạo với 💕 tại Việt Nam.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-xs text-gray-600 hover:text-white transition-colors">Bảo mật</Link>
            <Link href="/terms" className="text-xs text-gray-600 hover:text-white transition-colors">Điều khoản</Link>
            <Link href="/contact" className="text-xs text-gray-600 hover:text-white transition-colors">Liên hệ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
