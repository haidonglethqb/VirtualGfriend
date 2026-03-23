'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';

export default function AboutPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

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
          <Info className="w-6 h-6 text-love" />
          <h1 className="text-2xl font-bold">{tr('Về ứng dụng', 'About app')}</h1>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-[#271b21] to-[#392830] border border-love/20 p-8 text-center mb-6"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-love to-pink-600 flex items-center justify-center text-4xl font-bold mx-auto mb-4">
            ❤️
          </div>
          <h2 className="text-3xl font-bold mb-2">Virtual Girlfriend</h2>
          <p className="text-[#ba9cab]">{tr('Người yêu ảo - Trò chuyện & Tương tác với AI', 'Virtual partner - Chat & interact with AI')}</p>
        </motion.div>

        {/* Version Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3 mb-6"
        >
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-4 flex items-center justify-between">
            <span className="text-[#ba9cab]">{tr('Phiên bản', 'Version')}</span>
            <span className="font-bold">1.0.0</span>
          </div>
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-4 flex items-center justify-between">
            <span className="text-[#ba9cab]">{tr('Bản dựng', 'Build')}</span>
            <span className="font-bold">2026.01.31</span>
          </div>
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-4 flex items-center justify-between">
            <span className="text-[#ba9cab]">{tr('Ngôn ngữ', 'Language')}</span>
            <span className="font-bold">{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
          </div>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-[#271b21] border border-[#392830] p-6 mb-6"
        >
          <h3 className="font-bold text-lg mb-3">{tr('Về chúng tôi', 'About us')}</h3>
          <p className="text-[#ba9cab] leading-relaxed mb-4">
            {tr(
              'Virtual Girlfriend là một ứng dụng tương tác AI tuyệt vời cho phép bạn trò chuyện và xây dựng mối quan hệ với một nhân vật ảo. Ứng dụng được thiết kế để mang lại những trải nghiệm vui vẻ và ý nghĩa.',
              'Virtual Girlfriend is an AI interaction app that lets you chat and build a relationship with a virtual companion. It is designed to deliver fun and meaningful experiences.'
            )}
          </p>
          <p className="text-[#ba9cab] leading-relaxed">
            {tr(
              'Chúng tôi cam kết cung cấp một nền tảng an toàn, vui vẻ và dễ sử dụng để tất cả mọi người đều có thể tận hưởng.',
              'We are committed to providing a safe, enjoyable, and easy-to-use platform for everyone.'
            )}
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl bg-[#271b21] border border-[#392830] p-6 mb-6"
        >
          <h3 className="font-bold text-lg mb-4">{tr('Tính năng', 'Features')}</h3>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-[#ba9cab]">
              <span className="w-2 h-2 bg-love rounded-full" />
              {tr('Trò chuyện thời gian thực với AI', 'Real-time chat with AI')}
            </li>
            <li className="flex items-center gap-2 text-[#ba9cab]">
              <span className="w-2 h-2 bg-love rounded-full" />
              {tr('Gửi quà tặng và nhận phản hồi', 'Send gifts and receive reactions')}
            </li>
            <li className="flex items-center gap-2 text-[#ba9cab]">
              <span className="w-2 h-2 bg-love rounded-full" />
              {tr('Theo dõi kỷ niệm và mối quan hệ', 'Track memories and relationship progress')}
            </li>
            <li className="flex items-center gap-2 text-[#ba9cab]">
              <span className="w-2 h-2 bg-love rounded-full" />
              {tr('Hoàn thành nhiệm vụ hàng ngày', 'Complete daily quests')}
            </li>
            <li className="flex items-center gap-2 text-[#ba9cab]">
              <span className="w-2 h-2 bg-love rounded-full" />
              {tr('Cửa hàng quà tặng độc đáo', 'Unique gift shop')}
            </li>
          </ul>
        </motion.div>

        {/* Credits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-[#271b21] border border-[#392830] p-6"
        >
          <h3 className="font-bold text-lg mb-3">{tr('Công nhân viên', 'Credits')}</h3>
          <p className="text-[#ba9cab] text-sm mb-2">
            <strong>{tr('Phát triển:', 'Development:')}</strong> Tech Team
          </p>
          <p className="text-[#ba9cab] text-sm mb-2">
            <strong>{tr('Thiết kế:', 'Design:')}</strong> Design Team
          </p>
          <p className="text-[#ba9cab] text-sm">
            <strong>{tr('AI & Chatbot:', 'AI & Chatbot:')}</strong> AI Lab
          </p>
        </motion.div>

        {/* Legal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 text-center space-y-2"
        >
          <p className="text-sm text-[#ba9cab]">
            {tr('© 2026 Virtual Girlfriend. Tất cả quyền được bảo lưu.', '© 2026 Virtual Girlfriend. All rights reserved.')}
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <Link href="#" className="text-love hover:underline">
              {tr('Điều khoản dịch vụ', 'Terms of service')}
            </Link>
            <span className="text-[#392830]">•</span>
            <Link href="#" className="text-love hover:underline">
              {tr('Chính sách bảo mật', 'Privacy policy')}
            </Link>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
