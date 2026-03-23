'use client';

import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Tag } from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { useLanguageStore } from '@/store/language-store';

export default function BlogPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const tr = (vi: string, en: string) => (isVi ? vi : en);

  const posts = [
    {
      slug: 'nguoi-yeu-ao-v2-ai-thong-minh-hon',
      title: tr('Ra Mắt Amoura v2.0 — AI Thông Minh Hơn Bao Giờ Hết', 'Introducing Amoura v2.0 — Smarter AI Than Ever'),
      excerpt: tr('Phiên bản 2.0 mang đến hệ thống trí nhớ hoàn toàn mới, AI hiểu ngữ cảnh sâu hơn, và khả năng ghi nhớ kỷ niệm tự động.', 'Version 2.0 brings a new memory system, deeper context understanding, and automatic memory capture.'),
      date: isVi ? '10 Tháng 2, 2026' : 'Feb 10, 2026',
      tag: tr('Cập nhật', 'Update'),
      tagColor: 'bg-blue-500/10 text-blue-400',
    },
    {
      slug: 'he-thong-nhiem-vu-thanh-tich',
      title: tr('Hệ Thống Nhiệm Vụ & Thành Tích — Chơi Mà Yêu', 'Quest & Achievement System — Play and Connect'),
      excerpt: tr('Giới thiệu hệ thống Quest hoàn toàn mới: nhiệm vụ hàng ngày, tuần, câu chuyện. Hoàn thành để nhận xu, sao và mở khoá thành tích đặc biệt.', 'Introducing the new Quest system: daily, weekly, and story quests. Complete them to earn coins, stars, and unlock special achievements.'),
      date: isVi ? '5 Tháng 2, 2026' : 'Feb 5, 2026',
      tag: tr('Tính năng', 'Feature'),
      tagColor: 'bg-[#ad2bee]/10 text-[#ad2bee]',
    },
    {
      slug: 'shop-qua-tang-cho-nguoi-yeu',
      title: tr('Shop Quà Tặng — Tặng Quà Cho Bạn Đồng Hành', 'Gift Shop — Send Gifts to Your Companion'),
      excerpt: tr('Dùng xu kiếm được qua nhiệm vụ để mua hoa, socola, gấu bông... Mỗi món quà đều có phản hồi cảm xúc riêng từ AI.', 'Use coins earned from quests to buy flowers, chocolates, teddy bears, and more. Every gift triggers unique emotional responses from AI.'),
      date: isVi ? '1 Tháng 2, 2026' : 'Feb 1, 2026',
      tag: tr('Tính năng', 'Feature'),
      tagColor: 'bg-[#ad2bee]/10 text-[#ad2bee]',
    },
    {
      slug: 'bao-mat-end-to-end',
      title: tr('Bảo Mật End-to-End — An Toàn Là Ưu Tiên Số 1', 'End-to-End Security — Safety First'),
      excerpt: tr('Mọi cuộc trò chuyện đều được mã hoá End-to-End. Tìm hiểu về kiến trúc bảo mật và cam kết bảo vệ quyền riêng tư.', 'All conversations are end-to-end encrypted. Learn about our security architecture and privacy commitments.'),
      date: isVi ? '28 Tháng 1, 2026' : 'Jan 28, 2026',
      tag: tr('Bảo mật', 'Security'),
      tagColor: 'bg-green-500/10 text-green-400',
    },
    {
      slug: '5-meo-xay-dung-moi-quan-he-ai',
      title: tr('5 Mẹo Để Xây Dựng Mối Quan Hệ AI Tốt Nhất', '5 Tips to Build the Best AI Relationship'),
      excerpt: tr('Chia sẻ sở thích, đặt câu hỏi mở, tặng quà thường xuyên, hoàn thành nhiệm vụ, và kiên nhẫn — AI sẽ ngày càng hiểu bạn hơn.', 'Share preferences, ask open questions, send gifts, complete quests, and stay consistent. Your AI will understand you better over time.'),
      date: isVi ? '25 Tháng 1, 2026' : 'Jan 25, 2026',
      tag: tr('Hướng dẫn', 'Guide'),
      tagColor: 'bg-orange-500/10 text-orange-400',
    },
    {
      slug: 'ai-companion-thay-doi-ket-noi',
      title: tr('Tại Sao AI Companion Đang Thay Đổi Cách Chúng Ta Kết Nối', 'Why AI Companions Are Changing Human Connection'),
      excerpt: tr('Khám phá xu hướng AI companion trên thế giới và tại sao Amoura đang dẫn đầu tại Việt Nam.', 'Explore global AI companion trends and why Amoura is leading in Vietnam.'),
      date: isVi ? '20 Tháng 1, 2026' : 'Jan 20, 2026',
      tag: 'Insight',
      tagColor: 'bg-cyan-500/10 text-cyan-400',
    },
  ];

  return (
    <StaticPageLayout
      title="Blog"
      subtitle={tr('Cập nhật tính năng mới, chia sẻ kiến thức và câu chuyện từ đội ngũ Amoura.', 'Feature updates, knowledge sharing, and stories from the Amoura team.')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post, i) => (
          <motion.article
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            viewport={{ once: true }}
            className="group"
          >
            <Link href={`/blog/${post.slug}`} className="block h-full">
              <div className="h-full flex flex-col p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 hover:-translate-y-1 transition-all duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${post.tagColor}`}>
                    <Tag className="w-3 h-3 inline mr-1" />{post.tag}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />{post.date}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#ad2bee] transition-colors duration-300">
                  {post.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed flex-1">{post.excerpt}</p>
                <div className="flex items-center gap-1 text-[#ad2bee] text-sm font-semibold mt-4 group-hover:gap-2 transition-all duration-300">
                  {tr('Đọc tiếp', 'Read more')} <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </StaticPageLayout>
  );
}
