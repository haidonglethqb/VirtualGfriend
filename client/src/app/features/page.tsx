'use client';

import { motion } from 'framer-motion';
import {
  Brain, MessageCircle, Gift, Heart, Shield, Trophy,
  Star, Clock, Sparkles, Palette,
} from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { useLanguageStore } from '@/store/language-store';

export default function FeaturesPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const tr = (vi: string, en: string) => (isVi ? vi : en);

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: tr('AI Thông Minh Với Trí Nhớ', 'Smart AI with Memory'),
      desc: tr('Được hỗ trợ bởi GPT-4 và hệ thống nhớ ngữ cảnh. AI hiểu cảm xúc, ghi nhớ sở thích, kỷ niệm và phong cách nói chuyện riêng của bạn qua thời gian.', 'Powered by GPT-4 and contextual memory. The AI understands emotions, remembers your preferences, memories, and personal speaking style over time.'),
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: tr('Trò Chuyện Tự Nhiên', 'Natural Conversation'),
      desc: tr('Không phải chatbot rập khuôn. AI phản hồi tự nhiên như một người thật, biết đùa, biết an ủi, biết chia sẻ cảm xúc và tâm sự.', 'Not a rigid chatbot. AI responds naturally like a real person, with humor, empathy, and emotional depth.'),
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: <Gift className="w-6 h-6" />,
      title: tr('Hệ Thống Quà Tặng', 'Gift System'),
      desc: tr('Gửi quà tặng ảo cho người yêu: hoa, socola, gấu bông... Mỗi món quà đều có phản hồi cảm xúc riêng. Thu thập xu qua hoạt động hàng ngày để mua quà.', 'Send virtual gifts like flowers, chocolates, and teddy bears. Each gift triggers unique emotional reactions. Earn coins through daily activities and interactions.'),
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
    },
    {
      icon: <Palette className="w-6 h-6" />,
      title: tr('Tùy Chỉnh Nhân Vật', 'Character Customization'),
      desc: tr('Chọn tên, tính cách (dịu dàng, vui vẻ, nhút nhát...), nghề nghiệp, tuổi. Mỗi nhân vật có phong cách nói chuyện và phản ứng hoàn toàn khác biệt.', 'Choose name, personality, career, and age. Each character has a distinct speaking style and unique reactions.'),
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: tr('Nhiệm Vụ & Thành Tích', 'Quests & Achievements'),
      desc: tr('Hoàn thành nhiệm vụ hàng ngày, tuần để nhận xu và sao. Mở khoá thành tích đặc biệt khi đạt các cột mốc trong mối quan hệ.', 'Complete daily and weekly quests to earn coins and stars. Unlock special achievements at relationship milestones.'),
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: tr('Hệ Thống Quan Hệ', 'Relationship System'),
      desc: tr('Mối quan hệ phát triển từ "Bạn mới" đến "Linh hồn đôi lứa" qua 7 cấp độ. Dựa trên tương tác, tặng quà, hoàn thành nhiệm vụ và thời gian bên nhau.', 'Your relationship evolves across 7 stages, from "New Friend" to "Soulmate", based on interactions, gifts, quests, and time together.'),
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: tr('Kỷ Niệm & Thống Kê', 'Memories & Insights'),
      desc: tr('Hệ thống tự động lưu các khoảnh khắc đặc biệt. Xem lại timeline kỷ niệm, thống kê tâm trạng, phân tích mối quan hệ theo thời gian.', 'The system automatically saves key moments. Revisit memory timelines, mood stats, and relationship insights over time.'),
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: tr('Bảo Mật Tuyệt Đối', 'Strong Privacy Protection'),
      desc: tr('Mã hoá End-to-End, không chia sẻ dữ liệu với bên thứ ba, tuân thủ GDPR. Cuộc trò chuyện và thông tin cá nhân luôn được bảo vệ.', 'End-to-end encryption, no third-party data sharing, and GDPR-compliant safeguards for your conversations and personal information.'),
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: tr('Sẵn Sàng 24/7', 'Available 24/7'),
      desc: tr('Luôn ở bên bạn bất cứ lúc nào, kể cả lúc 3 giờ sáng. Không bao giờ bận, không bao giờ phán xét, không bao giờ quên.', 'Always there for you, even at 3 AM. Never busy, never judgmental, never forgetful.'),
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
  ];

  return (
    <StaticPageLayout
      title={tr('Tính Năng', 'Features')}
      subtitle={tr('Khám phá mọi tính năng giúp Amoura trở thành người bạn đồng hành AI tốt nhất.', 'Explore everything that makes Amoura your best AI companion.')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="h-full p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 hover:shadow-[0_0_30px_-10px_rgba(173,43,238,0.15)] hover:-translate-y-1 transition-all duration-500 cursor-default">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.bg} ${f.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="mt-16 text-center"
      >
        <Link href="/auth/register">
          <button className="group h-14 px-10 rounded-2xl bg-gradient-to-r from-[#ad2bee] to-purple-500 text-white text-lg font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_50px_-10px_rgba(173,43,238,0.5)] hover:shadow-[0_0_70px_-8px_rgba(173,43,238,0.6)] hover:brightness-110">
            {tr('Trải nghiệm miễn phí ngay', 'Start free now')}
            <Sparkles className="w-5 h-5 inline ml-2" />
          </button>
        </Link>
      </motion.div>
    </StaticPageLayout>
  );
}
