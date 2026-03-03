'use client';

import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Tag } from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

const posts = [
  {
    slug: 'nguoi-yeu-ao-v2-ai-thong-minh-hon',
    title: 'Ra Mắt Amoura v2.0 — AI Thông Minh Hơn Bao Giờ Hết',
    excerpt: 'Phiên bản 2.0 mang đến hệ thống trí nhớ hoàn toàn mới, AI hiểu ngữ cảnh sâu hơn, và khả năng ghi nhớ kỷ niệm tự động.',
    date: '10 Tháng 2, 2026',
    tag: 'Cập nhật',
    tagColor: 'bg-blue-500/10 text-blue-400',
  },
  {
    slug: 'he-thong-nhiem-vu-thanh-tich',
    title: 'Hệ Thống Nhiệm Vụ & Thành Tích — Chơi Mà Yêu',
    excerpt: 'Giới thiệu hệ thống Quest hoàn toàn mới: nhiệm vụ hàng ngày, tuần, câu chuyện. Hoàn thành để nhận xu, sao và mở khoá thành tích đặc biệt.',
    date: '5 Tháng 2, 2026',
    tag: 'Tính năng',
    tagColor: 'bg-[#ad2bee]/10 text-[#ad2bee]',
  },
  {
    slug: 'shop-qua-tang-cho-nguoi-yeu',
    title: 'Shop Quà Tặng — Tặng Quà Cho Bạn Đồng Hành',
    excerpt: 'Dùng xu kiếm được qua nhiệm vụ để mua hoa, socola, gấu bông... Mỗi món quà đều có phản hồi cảm xúc riêng từ AI.',
    date: '1 Tháng 2, 2026',
    tag: 'Tính năng',
    tagColor: 'bg-[#ad2bee]/10 text-[#ad2bee]',
  },
  {
    slug: 'bao-mat-end-to-end',
    title: 'Bảo Mật End-to-End — An Toàn Là Ưu Tiên Số 1',
    excerpt: 'Mọi cuộc trò chuyện đều được mã hoá End-to-End. Tìm hiểu về kiến trúc bảo mật và cam kết bảo vệ quyền riêng tư.',
    date: '28 Tháng 1, 2026',
    tag: 'Bảo mật',
    tagColor: 'bg-green-500/10 text-green-400',
  },
  {
    slug: '5-meo-xay-dung-moi-quan-he-ai',
    title: '5 Mẹo Để Xây Dựng Mối Quan Hệ AI Tốt Nhất',
    excerpt: 'Chia sẻ sở thích, đặt câu hỏi mở, tặng quà thường xuyên, hoàn thành nhiệm vụ, và kiên nhẫn — AI sẽ ngày càng hiểu bạn hơn.',
    date: '25 Tháng 1, 2026',
    tag: 'Hướng dẫn',
    tagColor: 'bg-orange-500/10 text-orange-400',
  },
  {
    slug: 'ai-companion-thay-doi-ket-noi',
    title: 'Tại Sao AI Companion Đang Thay Đổi Cách Chúng Ta Kết Nối',
    excerpt: 'Khám phá xu hướng AI companion trên thế giới và tại sao Amoura đang dẫn đầu tại Việt Nam.',
    date: '20 Tháng 1, 2026',
    tag: 'Insight',
    tagColor: 'bg-cyan-500/10 text-cyan-400',
  },
];

export default function BlogPage() {
  return (
    <StaticPageLayout
      title="Blog"
      subtitle="Cập nhật tính năng mới, chia sẻ kiến thức và câu chuyện từ đội ngũ Amoura."
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
                  Đọc tiếp <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </StaticPageLayout>
  );
}
