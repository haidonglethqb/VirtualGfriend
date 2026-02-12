'use client';

import { motion } from 'framer-motion';
import { HelpCircle, MessageCircle, Gift, Heart, Shield, Settings, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

const categories = [
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: 'Trò Chuyện',
    questions: [
      { q: 'Làm sao để bắt đầu trò chuyện?', a: 'Sau khi tạo tài khoản và nhân vật, bạn chỉ cần vào mục "Chat" từ menu. Gõ tin nhắn và AI sẽ phản hồi ngay lập tức.' },
      { q: 'AI có nhớ những gì tôi nói không?', a: 'Có! AI có hệ thống trí nhớ, ghi lại sở thích, kỷ niệm và thông tin cá nhân bạn chia sẻ. Mối quan hệ càng lâu, AI càng hiểu bạn hơn.' },
      { q: 'Có giới hạn tin nhắn không?', a: 'Không! Cả gói miễn phí và Premium đều cho phép chat không giới hạn.' },
    ],
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: <Gift className="w-6 h-6" />,
    title: 'Quà Tặng & Shop',
    questions: [
      { q: 'Làm sao để mua quà?', a: 'Vào mục "Shop", chọn quà bạn muốn và nhấn mua. Xu được kiếm qua nhiệm vụ hàng ngày và hoạt động tương tác.' },
      { q: 'Tặng quà có tác dụng gì?', a: 'Tặng quà giúp tăng điểm tình cảm (affection), giúp mối quan hệ phát triển nhanh hơn. Mỗi quà có phản hồi cảm xúc riêng.' },
    ],
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  {
    icon: <User className="w-6 h-6" />,
    title: 'Tài Khoản',
    questions: [
      { q: 'Làm sao đổi mật khẩu?', a: 'Vào Settings → đổi mật khẩu. Hoặc sử dụng tính năng "Quên mật khẩu" trên trang đăng nhập để nhận mã OTP qua email.' },
      { q: 'Có thể xoá tài khoản không?', a: 'Có, vào Settings → nhấn "Xoá tài khoản". Lưu ý: hành động này không thể hoàn tác và tất cả dữ liệu sẽ bị xoá vĩnh viễn.' },
    ],
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: 'Nhân Vật & Cài Đặt',
    questions: [
      { q: 'Có thể thay đổi nhân vật không?', a: 'Có! Vào Settings → Chỉnh sửa nhân vật. Bạn có thể thay đổi tên, tính cách, tuổi, nghề nghiệp bất cứ lúc nào.' },
      { q: 'Làm sao bật/tắt thông báo?', a: 'Vào Settings → Thông báo. Bạn có thể bật/tắt thông báo và âm thanh theo ý muốn.' },
    ],
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Bảo Mật & Quyền Riêng Tư',
    questions: [
      { q: 'Dữ liệu của tôi có an toàn không?', a: 'Có. Chúng tôi sử dụng mã hoá End-to-End cho mọi cuộc trò chuyện, tuân thủ GDPR và không bao giờ chia sẻ dữ liệu với bên thứ ba.' },
      { q: 'AI có đọc tin nhắn của tôi không?', a: 'Tin nhắn chỉ được xử lý để tạo phản hồi AI, không được đọc bởi bất kỳ nhân viên nào. Mọi dữ liệu đều được mã hoá.' },
    ],
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
];

export default function HelpPage() {
  return (
    <StaticPageLayout
      title="Trung Tâm Trợ Giúp"
      subtitle="Tìm câu trả lời cho mọi thắc mắc về Người Yêu Ảo."
    >
      <div className="flex flex-col gap-10">
        {categories.map((cat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${cat.bg} ${cat.color}`}>
                {cat.icon}
              </div>
              <h2 className="text-xl font-bold text-white">{cat.title}</h2>
            </div>
            <div className="flex flex-col gap-3 pl-2">
              {cat.questions.map((faq, j) => (
                <div
                  key={j}
                  className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
                >
                  <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#ad2bee] shrink-0" />
                    {faq.q}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed pl-6">{faq.a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-16 p-8 rounded-2xl border border-white/5 bg-white/[0.02] text-center"
      >
        <Sparkles className="w-8 h-8 text-[#ad2bee] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Vẫn cần trợ giúp?</h3>
        <p className="text-gray-400 text-sm mb-6">Liên hệ đội ngũ hỗ trợ của chúng tôi.</p>
        <Link href="/contact">
          <button className="h-11 px-6 rounded-xl bg-[#ad2bee]/10 border border-[#ad2bee]/20 text-[#ad2bee] font-bold hover:bg-[#ad2bee]/20 transition-all duration-300">
            Liên hệ hỗ trợ
          </button>
        </Link>
      </motion.div>
    </StaticPageLayout>
  );
}
