'use client';

import { motion } from 'framer-motion';
import { MapPin, Heart, Zap, Coffee, Code, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { useLanguageStore } from '@/store/language-store';

export default function CareersPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const tr = (vi: string, en: string) => (isVi ? vi : en);

  const positions = [
    {
      title: 'Senior AI/ML Engineer',
      team: 'AI Team',
      location: tr('Remote / TP.HCM', 'Remote / HCMC'),
      type: tr('Toàn thời gian', 'Full-time'),
      desc: tr('Phát triển và tối ưu mô hình AI cho trải nghiệm trò chuyện tự nhiên. Yêu cầu kinh nghiệm với LLM, NLP, và fine-tuning.', 'Build and optimize AI models for natural conversations. Experience with LLMs, NLP, and fine-tuning is required.'),
      tags: ['Python', 'PyTorch', 'LLM', 'NLP'],
    },
    {
      title: 'Full-Stack Developer',
      team: 'Product Team',
      location: tr('Remote / TP.HCM', 'Remote / HCMC'),
      type: tr('Toàn thời gian', 'Full-time'),
      desc: tr('Xây dựng tính năng mới cho web app. Stack: Next.js, TypeScript, Node.js, PostgreSQL, Redis.', 'Develop new features for the web app. Stack: Next.js, TypeScript, Node.js, PostgreSQL, Redis.'),
      tags: ['TypeScript', 'Next.js', 'Node.js', 'PostgreSQL'],
    },
    {
      title: 'UI/UX Designer',
      team: 'Design Team',
      location: tr('Remote / TP.HCM', 'Remote / HCMC'),
      type: tr('Toàn thời gian', 'Full-time'),
      desc: tr('Thiết kế giao diện và trải nghiệm người dùng cho sản phẩm AI. Yêu cầu portfolio và kinh nghiệm với Figma.', 'Design interfaces and product UX for our AI platform. Portfolio and Figma experience are required.'),
      tags: ['Figma', 'UI Design', 'Prototype', 'User Research'],
    },
    {
      title: 'DevOps Engineer',
      team: 'Infrastructure Team',
      location: 'Remote',
      type: tr('Toàn thời gian', 'Full-time'),
      desc: tr('Quản lý hạ tầng cloud, CI/CD, monitoring. Kinh nghiệm Docker, Kubernetes, AWS/GCP.', 'Manage cloud infrastructure, CI/CD, and monitoring. Experience with Docker, Kubernetes, and AWS/GCP is required.'),
      tags: ['Docker', 'K8s', 'AWS', 'CI/CD'],
    },
  ];

  const perks = [
    { icon: <Coffee className="w-5 h-5" />, title: 'Remote-first', desc: tr('Làm việc từ đâu cũng được', 'Work from anywhere') },
    { icon: <Zap className="w-5 h-5" />, title: tr('Lương cạnh tranh', 'Competitive salary'), desc: tr('Top thị trường + equity', 'Top-market salary + equity') },
    { icon: <Heart className="w-5 h-5" />, title: tr('Bảo hiểm Premium', 'Premium insurance'), desc: tr('Sức khoẻ + nha khoa', 'Health + dental coverage') },
    { icon: <Code className="w-5 h-5" />, title: 'Learning budget', desc: tr('10M/năm cho học tập', '$400/year learning budget') },
    { icon: <Sparkles className="w-5 h-5" />, title: tr('20 ngày phép', '20 paid leave days'), desc: tr('Nghỉ phép linh hoạt', 'Flexible leave policy') },
    { icon: <MapPin className="w-5 h-5" />, title: 'Team retreat', desc: tr('2 lần/năm du lịch nhóm', 'Twice-a-year team retreats') },
  ];

  return (
    <StaticPageLayout
      title={tr('Tuyển Dụng', 'Careers')}
      subtitle={tr('Tham gia đội ngũ đang định hình tương lai của AI companion tại Việt Nam.', 'Join the team shaping the future of AI companions in Vietnam.')}
    >
      {/* Perks */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16">
        {perks.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
          >
            <div className="text-[#ad2bee]">{p.icon}</div>
            <div>
              <p className="font-bold text-white text-sm">{p.title}</p>
              <p className="text-xs text-gray-500">{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Positions */}
      <h2 className="text-2xl font-bold text-white mb-8">{tr('Vị Trí Đang Tuyển', 'Open Positions')}</h2>
      <div className="flex flex-col gap-5">
        {positions.map((pos, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#ad2bee]/20 hover:-translate-y-0.5 transition-all duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#ad2bee] transition-colors duration-300">
                    {pos.title}
                  </h3>
                  <p className="text-sm text-gray-500">{pos.team} · {pos.location} · {pos.type}</p>
                </div>
                <Link href="/contact">
                  <button className="h-9 px-5 rounded-lg bg-[#ad2bee]/10 border border-[#ad2bee]/20 text-[#ad2bee] text-sm font-bold hover:bg-[#ad2bee]/20 transition-all duration-300 whitespace-nowrap">
                    {tr('Ứng tuyển', 'Apply')}
                  </button>
                </Link>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">{pos.desc}</p>
              <div className="flex flex-wrap gap-2">
                {pos.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-md bg-white/5 text-xs text-gray-400 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-16 p-8 rounded-2xl border border-white/5 bg-white/[0.02] text-center"
      >
        <h3 className="text-lg font-bold text-white mb-2">{tr('Không thấy vị trí phù hợp?', 'Did not find a matching role?')}</h3>
        <p className="text-gray-400 text-sm mb-6">{tr('Gửi CV và chúng tôi sẽ liên lạc khi có vị trí phù hợp.', 'Send your CV and we will contact you when a suitable role opens.')}</p>
        <Link href="/contact">
          <button className="h-11 px-6 rounded-xl bg-[#ad2bee]/10 border border-[#ad2bee]/20 text-[#ad2bee] font-bold hover:bg-[#ad2bee]/20 transition-all duration-300">
            {tr('Gửi CV tự do', 'Send open application')}
          </button>
        </Link>
      </motion.div>
    </StaticPageLayout>
  );
}
