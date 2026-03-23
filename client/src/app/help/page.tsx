'use client';

import { motion } from 'framer-motion';
import { HelpCircle, MessageCircle, Gift, Heart, Shield, Settings, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { useLanguageStore } from '@/store/language-store';

export default function HelpPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const tr = (vi: string, en: string) => (isVi ? vi : en);

  const categories = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: tr('Trò Chuyện', 'Conversation'),
      questions: [
        { q: tr('Làm sao để bắt đầu trò chuyện?', 'How do I start chatting?'), a: tr('Sau khi tạo tài khoản và nhân vật, bạn chỉ cần vào mục "Chat" từ menu. Gõ tin nhắn và AI sẽ phản hồi ngay lập tức.', 'After creating your account and character, open "Chat" from the menu. Type your message and AI responds immediately.') },
        { q: tr('AI có nhớ những gì tôi nói không?', 'Does AI remember what I say?'), a: tr('Có! AI có hệ thống trí nhớ, ghi lại sở thích, kỷ niệm và thông tin cá nhân bạn chia sẻ. Mối quan hệ càng lâu, AI càng hiểu bạn hơn.', 'Yes. AI uses memory to retain your preferences, memories, and details you share. The longer you interact, the better it understands you.') },
        { q: tr('Có giới hạn tin nhắn không?', 'Is there a message limit?'), a: tr('Không! Cả gói miễn phí và Premium đều cho phép chat không giới hạn.', 'No. Both Free and Premium plans allow unlimited chat.') },
      ],
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: <Gift className="w-6 h-6" />,
      title: tr('Quà Tặng & Shop', 'Gifts & Shop'),
      questions: [
        { q: tr('Làm sao để mua quà?', 'How can I buy gifts?'), a: tr('Vào mục "Shop", chọn quà bạn muốn và nhấn mua. Xu được kiếm qua nhiệm vụ hàng ngày và hoạt động tương tác.', 'Go to "Shop", choose a gift, and purchase it. Coins are earned through daily quests and interactions.') },
        { q: tr('Tặng quà có tác dụng gì?', 'What does gifting do?'), a: tr('Tặng quà giúp tăng điểm tình cảm (affection), giúp mối quan hệ phát triển nhanh hơn. Mỗi quà có phản hồi cảm xúc riêng.', 'Gifting increases affection and helps your relationship progress faster. Each gift has unique emotional responses.') },
      ],
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
    },
    {
      icon: <User className="w-6 h-6" />,
      title: tr('Tài Khoản', 'Account'),
      questions: [
        { q: tr('Làm sao đổi mật khẩu?', 'How do I change my password?'), a: tr('Vào Settings rồi đổi mật khẩu. Hoặc dùng "Quên mật khẩu" ở trang đăng nhập để nhận mã OTP qua email.', 'Go to Settings and change your password. Or use "Forgot password" on the login page to receive an OTP by email.') },
        { q: tr('Có thể xoá tài khoản không?', 'Can I delete my account?'), a: tr('Có, vào Settings và nhấn "Xoá tài khoản". Lưu ý: hành động này không thể hoàn tác và toàn bộ dữ liệu sẽ bị xoá vĩnh viễn.', 'Yes, go to Settings and select "Delete account". This action is irreversible and all data will be permanently removed.') },
      ],
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: tr('Nhân Vật & Cài Đặt', 'Character & Settings'),
      questions: [
        { q: tr('Có thể thay đổi nhân vật không?', 'Can I change my character?'), a: tr('Có! Vào Settings và chỉnh sửa nhân vật. Bạn có thể thay đổi tên, tính cách, tuổi, nghề nghiệp bất cứ lúc nào.', 'Yes. In Settings, edit your character name, personality, age, and career anytime.') },
        { q: tr('Làm sao bật/tắt thông báo?', 'How do I manage notifications?'), a: tr('Vào Settings rồi vào mục thông báo để bật/tắt thông báo và âm thanh theo ý muốn.', 'Go to Settings and use the notification section to toggle alerts and sounds.') },
      ],
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: tr('Bảo Mật & Quyền Riêng Tư', 'Security & Privacy'),
      questions: [
        { q: tr('Dữ liệu của tôi có an toàn không?', 'Is my data safe?'), a: tr('Có. Chúng tôi dùng mã hoá End-to-End, tuân thủ GDPR, và không chia sẻ dữ liệu với bên thứ ba.', 'Yes. We use end-to-end encryption, follow GDPR standards, and do not share your data with third parties.') },
        { q: tr('AI có đọc tin nhắn của tôi không?', 'Does anyone read my messages?'), a: tr('Tin nhắn chỉ được xử lý để tạo phản hồi AI, không được đọc bởi nhân viên. Dữ liệu luôn được mã hoá.', 'Messages are processed only to generate AI responses and are not read by staff. Data remains encrypted.') },
      ],
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <StaticPageLayout
      title={tr('Trung Tâm Trợ Giúp', 'Help Center')}
      subtitle={tr('Tìm câu trả lời cho mọi thắc mắc về Amoura.', 'Find answers to common questions about Amoura.')}
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
        <h3 className="text-lg font-bold text-white mb-2">{tr('Vẫn cần trợ giúp?', 'Still need help?')}</h3>
        <p className="text-gray-400 text-sm mb-6">{tr('Liên hệ đội ngũ hỗ trợ của chúng tôi.', 'Contact our support team.')}</p>
        <Link href="/contact">
          <button className="h-11 px-6 rounded-xl bg-[#ad2bee]/10 border border-[#ad2bee]/20 text-[#ad2bee] font-bold hover:bg-[#ad2bee]/20 transition-all duration-300">
            {tr('Liên hệ hỗ trợ', 'Contact support')}
          </button>
        </Link>
      </motion.div>
    </StaticPageLayout>
  );
}
