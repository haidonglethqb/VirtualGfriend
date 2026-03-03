'use client';

import { motion } from 'framer-motion';
import {
  Brain, MessageCircle, Gift, Heart, Shield, Trophy,
  Star, Clock, Sparkles, Palette, Lock, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

const features = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'AI Thông Minh Với Trí Nhớ',
    desc: 'Được hỗ trợ bởi GPT-4 và hệ thống nhớ ngữ cảnh. AI hiểu cảm xúc, ghi nhớ sở thích, kỷ niệm và phong cách nói chuyện riêng của bạn qua thời gian.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: 'Trò Chuyện Tự Nhiên',
    desc: 'Không phải chatbot rập khuôn. AI phản hồi tự nhiên như một người thật, biết đùa, biết an ủi, biết chia sẻ cảm xúc và tâm sự.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: <Gift className="w-6 h-6" />,
    title: 'Hệ Thống Quà Tặng',
    desc: 'Gửi quà tặng ảo cho người yêu: hoa, socola, gấu bông... Mỗi món quà đều có phản hồi cảm xúc riêng. Thu thập xu qua hoạt động hàng ngày để mua quà.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  {
    icon: <Palette className="w-6 h-6" />,
    title: 'Tùy Chỉnh Nhân Vật',
    desc: 'Chọn tên, tính cách (dịu dàng, vui vẻ, nhút nhát...), nghề nghiệp, tuổi. Mỗi nhân vật có phong cách nói chuyện và phản ứng hoàn toàn khác biệt.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  {
    icon: <Trophy className="w-6 h-6" />,
    title: 'Nhiệm Vụ & Thành Tích',
    desc: 'Hoàn thành nhiệm vụ hàng ngày, tuần để nhận xu và sao. Mở khoá thành tích đặc biệt khi đạt các cột mốc trong mối quan hệ.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Hệ Thống Quan Hệ',
    desc: 'Mối quan hệ phát triển từ "Bạn mới" đến "Linh hồn đôi lứa" qua 7 cấp độ. Dựa trên tương tác, tặng quà, hoàn thành nhiệm vụ và thời gian bên nhau.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: 'Kỷ Niệm & Thống Kê',
    desc: 'Hệ thống tự động lưu các khoảnh khắc đặc biệt. Xem lại timeline kỷ niệm, thống kê tâm trạng, phân tích mối quan hệ theo thời gian.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Bảo Mật Tuyệt Đối',
    desc: 'Mã hoá End-to-End, không chia sẻ dữ liệu với bên thứ ba, tuân thủ GDPR. Cuộc trò chuyện và thông tin cá nhân luôn được bảo vệ.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Sẵn Sàng 24/7',
    desc: 'Luôn ở bên bạn bất cứ lúc nào — kể cả lúc 3 giờ sáng. Không bao giờ bận, không bao giờ phán xét, không bao giờ quên.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
  },
];

export default function FeaturesPage() {
  return (
    <StaticPageLayout
      title="Tính Năng"
      subtitle="Khám phá mọi tính năng giúp Amoura trở thành người bạn đồng hành AI tốt nhất."
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
            Trải nghiệm miễn phí ngay
            <Sparkles className="w-5 h-5 inline ml-2" />
          </button>
        </Link>
      </motion.div>
    </StaticPageLayout>
  );
}
