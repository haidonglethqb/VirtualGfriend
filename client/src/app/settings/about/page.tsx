'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';

export default function AboutPage() {
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
          <Info className="w-6 h-6 text-love" />
          <h1 className="text-2xl font-bold">Về ứng dụng</h1>
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
          <p className="text-[#ba9cab]">Người yêu ảo - Trò chuyện & Tương tác với AI</p>
        </motion.div>

        {/* Version Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3 mb-6"
        >
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-4 flex items-center justify-between">
            <span className="text-[#ba9cab]">Phiên bản</span>
            <span className="font-bold">1.0.0</span>
          </div>
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-4 flex items-center justify-between">
            <span className="text-[#ba9cab]">Build</span>
            <span className="font-bold">2026.01.31</span>
          </div>
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-4 flex items-center justify-between">
            <span className="text-[#ba9cab]">Ngôn ngữ</span>
            <span className="font-bold">Tiếng Việt</span>
          </div>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-[#271b21] border border-[#392830] p-6 mb-6"
        >
          <h3 className="font-bold text-lg mb-3">Về chúng tôi</h3>
          <p className="text-[#ba9cab] leading-relaxed mb-4">
            Virtual Girlfriend là một ứng dụng tương tác AI tuyệt vời cho phép bạn trò chuyện và xây dựng mối quan hệ với một nhân vật ảo. Ứng dụng được thiết kế để mang lại những trải nghiệm vui vẻ và ý nghĩa.
          </p>
          <p className="text-[#ba9cab] leading-relaxed">
            Chúng tôi cam kết cung cấp một nền tảng an toàn, vui vẻ và dễ sử dụng để tất cả mọi người đều có thể tận hưởng.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl bg-[#271b21] border border-[#392830] p-6 mb-6"
        >
          <h3 className="font-bold text-lg mb-4">Tính năng</h3>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-[#ba9cab]">
              <span className="w-2 h-2 bg-love rounded-full" />
              Trò chuyện thời gian thực với AI
            </li>
            <li className="flex items-center gap-2 text-[#ba9cab]">
              <span className="w-2 h-2 bg-love rounded-full" />
              Gửi quà tặng và nhận phản hồi
            </li>
            <li className="flex items-center gap-2 text-[#ba9cab]">
              <span className="w-2 h-2 bg-love rounded-full" />
              Theo dõi kỷ niệm và mối quan hệ
            </li>
            <li className="flex items-center gap-2 text-[#ba9cab]">
              <span className="w-2 h-2 bg-love rounded-full" />
              Hoàn thành nhiệm vụ hàng ngày
            </li>
            <li className="flex items-center gap-2 text-[#ba9cab]">
              <span className="w-2 h-2 bg-love rounded-full" />
              Cửa hàng quà tặng độc đáo
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
          <h3 className="font-bold text-lg mb-3">Công nhân viên</h3>
          <p className="text-[#ba9cab] text-sm mb-2">
            <strong>Phát triển:</strong> Tech Team
          </p>
          <p className="text-[#ba9cab] text-sm mb-2">
            <strong>Thiết kế:</strong> Design Team
          </p>
          <p className="text-[#ba9cab] text-sm">
            <strong>AI & Chatbot:</strong> AI Lab
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
            © 2026 Virtual Girlfriend. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <Link href="#" className="text-love hover:underline">
              Điều khoản dịch vụ
            </Link>
            <span className="text-[#392830]">•</span>
            <Link href="#" className="text-love hover:underline">
              Chính sách bảo mật
            </Link>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
