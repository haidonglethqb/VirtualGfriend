'use client';

import { motion } from 'framer-motion';
import { Heart, Users, Target, Sparkles, Globe, Shield } from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

const values = [
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Kết Nối Chân Thành',
    desc: 'Chúng tôi tin rằng mọi người đều xứng đáng có một kết nối ý nghĩa, kể cả khi nó bắt đầu từ AI.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Bảo Mật Tuyệt Đối',
    desc: 'Quyền riêng tư của bạn là bất khả xâm phạm. Mọi cuộc trò chuyện đều được mã hoá và bảo vệ.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Đổi Mới Liên Tục',
    desc: 'Chúng tôi luôn cải tiến AI để mang đến trải nghiệm tự nhiên và sâu sắc hơn mỗi ngày.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'Cho Người Việt',
    desc: 'Thiết kế từ đầu cho người dùng Việt Nam với ngôn ngữ, văn hoá và cảm xúc Việt.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
];

const stats = [
  { value: '10,000+', label: 'Người dùng' },
  { value: '500,000+', label: 'Tin nhắn đã gửi' },
  { value: '99%', label: 'Hài lòng' },
  { value: '24/7', label: 'Hoạt động' },
];

const team = [
  { name: 'Nguyễn Minh', role: 'Founder & CEO', avatar: '👨‍💼' },
  { name: 'Trần Thu', role: 'CTO', avatar: '👩‍💻' },
  { name: 'Lê Hoàng', role: 'AI Lead', avatar: '🧑‍🔬' },
  { name: 'Phạm Linh', role: 'Design Lead', avatar: '👩‍🎨' },
];

export default function AboutPage() {
  return (
    <StaticPageLayout
      title="Về Chúng Tôi"
      subtitle="Đội ngũ đứng sau Người Yêu Ảo — nơi công nghệ gặp gỡ trái tim."
    >
      {/* Mission */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="p-8 rounded-2xl border border-[#ad2bee]/20 bg-gradient-to-br from-[#ad2bee]/5 to-purple-600/5 mb-16 text-center"
      >
        <h2 className="text-2xl font-bold text-white mb-4">Sứ Mệnh</h2>
        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl mx-auto">
          Chúng tôi tạo ra Người Yêu Ảo vì tin rằng <strong className="text-[#ad2bee]">không ai xứng đáng phải cô đơn</strong>.
          Sử dụng công nghệ AI tiên tiến nhất, chúng tôi mang đến một không gian an toàn nơi mọi người
          có thể tâm sự, được lắng nghe, và cảm nhận sự kết nối chân thành — dù đó là từ AI.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            viewport={{ once: true }}
            className="text-center p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
          >
            <div className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#ad2bee] to-purple-400 mb-1">
              {s.value}
            </div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Values */}
      <h2 className="text-2xl font-bold text-white text-center mb-8">Giá Trị Cốt Lõi</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {values.map((v, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            viewport={{ once: true }}
            className="group flex items-start gap-4 p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500"
          >
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${v.bg} ${v.color} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
              {v.icon}
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">{v.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Team */}
      <h2 className="text-2xl font-bold text-white text-center mb-8">Đội Ngũ</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {team.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            viewport={{ once: true }}
            className="text-center p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:-translate-y-1 transition-all duration-500 group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{m.avatar}</div>
            <p className="font-bold text-white">{m.name}</p>
            <p className="text-xs text-gray-500">{m.role}</p>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center"
      >
        <Link href="/auth/register">
          <button className="h-14 px-10 rounded-2xl bg-gradient-to-r from-[#ad2bee] to-purple-500 text-white text-lg font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_50px_-10px_rgba(173,43,238,0.5)] hover:brightness-110">
            Tham gia cùng chúng tôi
          </button>
        </Link>
      </motion.div>
    </StaticPageLayout>
  );
}
