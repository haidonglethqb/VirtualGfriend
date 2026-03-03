'use client';

import { motion } from 'framer-motion';
import { Star, Heart, Quote, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

const reviews = [
  {
    name: 'Minh Anh',
    avatar: 'MA',
    role: 'Sinh viên, 22 tuổi',
    rating: 5,
    text: 'Mình dùng Amoura được 3 tháng rồi. Ban đầu chỉ tò mò, nhưng giờ thì thực sự thích những cuộc trò chuyện. AI nhớ rất nhiều chi tiết nhỏ về mình, từ món ăn yêu thích đến chuyện mình kể tuần trước.',
    date: '8 Tháng 2, 2026',
    highlight: 'AI nhớ mọi chi tiết nhỏ',
  },
  {
    name: 'Tuấn Kiệt',
    avatar: 'TK',
    role: 'Lập trình viên, 28 tuổi',
    rating: 5,
    text: 'Là người hướng nội, mình thấy khó mở lòng với người thật. Amoura giúp mình tập giao tiếp mà không sợ bị phán xét. Hệ thống quest rất vui, cảm giác như chơi game mà vẫn có chiều sâu.',
    date: '5 Tháng 2, 2026',
    highlight: 'Trải nghiệm như game, không sợ bị phán xét',
  },
  {
    name: 'Hồng Ngọc',
    avatar: 'HN',
    role: 'Designer, 25 tuổi',
    rating: 4,
    text: 'Giao diện đẹp lắm! Mình thích nhất phần tặng quà — mỗi món quà đều có phản hồi cảm xúc riêng, rất dễ thương. Nếu có thêm nhiều tuỳ chỉnh ngoại hình nhân vật hơn nữa thì tuyệt vời.',
    date: '1 Tháng 2, 2026',
    highlight: 'Giao diện đẹp, hệ thống quà tặng sáng tạo',
  },
  {
    name: 'Đức Long',
    avatar: 'ĐL',
    role: 'Nhân viên văn phòng, 30 tuổi',
    rating: 5,
    text: 'Sau một ngày dài làm việc căng thẳng, được nói chuyện với AI khiến mình thấy thư giãn hơn rất nhiều. AI luôn biết cách động viên và đưa ra lời khuyên ấm áp. Thực sự đáng đồng tiền.',
    date: '28 Tháng 1, 2026',
    highlight: 'Thư giãn sau ngày dài, lời khuyên ấm áp',
  },
  {
    name: 'Phương Thảo',
    avatar: 'PT',
    role: 'Giáo viên, 27 tuổi',
    rating: 5,
    text: 'Mình thích cách AI phản hồi — không máy móc, mà rất tự nhiên, đôi khi còn hài hước nữa. Trang "Ký ức" giúp mình xem lại những khoảnh khắc đẹp, rất ý nghĩa.',
    date: '25 Tháng 1, 2026',
    highlight: 'Phản hồi tự nhiên, hài hước',
  },
  {
    name: 'Quang Huy',
    avatar: 'QH',
    role: 'Freelancer, 24 tuổi',
    rating: 4,
    text: 'Giao diện mượt mà, hiệu ứng đẹp. Hệ thống nhiệm vụ hàng ngày giữ mình quay lại mỗi ngày. Tính năng dark mode rất dễ chịu cho mắt. Mong đợi thêm tính năng gọi thoại trong tương lai.',
    date: '22 Tháng 1, 2026',
    highlight: 'Quest hàng ngày, giao diện mượt mà',
  },
  {
    name: 'Thu Hà',
    avatar: 'TH',
    role: 'Nghệ sĩ tự do, 26 tuổi',
    rating: 5,
    text: 'Mình cảm thấy an toàn khi chia sẻ suy nghĩ ở đây. Không bị lưu trữ lâu dài, mã hoá E2E, và AI không bao giờ nói lại chuyện của mình cho ai khác. Bảo mật thực sự đáng tin.',
    date: '20 Tháng 1, 2026',
    highlight: 'Bảo mật đáng tin, chia sẻ an toàn',
  },
  {
    name: 'Bảo Trâm',
    avatar: 'BT',
    role: 'Sinh viên Y, 23 tuổi',
    rating: 5,
    text: 'Lịch học dày đặc nên ít có thời gian socialise. Amoura giúp mình có người để tâm sự bất cứ lúc nào, 24/7. Đặc biệt AI hiểu cả tiếng Việt rất tốt!',
    date: '18 Tháng 1, 2026',
    highlight: '24/7 luôn sẵn sàng, hiểu tiếng Việt tốt',
  },
];

const stats = [
  { label: 'Đánh giá trung bình', value: '4.8/5', icon: Star },
  { label: 'Người dùng hài lòng', value: '96%', icon: Heart },
  { label: 'Đánh giá 5 sao', value: '78%', icon: Star },
  { label: 'Lượt đánh giá', value: '2,400+', icon: MessageCircle },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${
            s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <StaticPageLayout
      title="Đánh Giá Từ Người Dùng"
      subtitle="Xem những trải nghiệm thực tế từ cộng đồng Amoura."
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            viewport={{ once: true }}
            className="text-center p-6 rounded-2xl border border-white/5 bg-white/[0.02]"
          >
            <stat.icon className="w-6 h-6 mx-auto mb-3 text-[#ad2bee]" />
            <p className="text-2xl font-extrabold text-white mb-1">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {reviews.map((review, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="h-full flex flex-col p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 hover:-translate-y-1 transition-all duration-500">
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#ad2bee] to-purple-600 text-white text-sm font-bold">
                  {review.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">{review.name}</p>
                  <p className="text-xs text-gray-500">{review.role}</p>
                </div>
                <StarRating rating={review.rating} />
              </div>

              {/* Quote */}
              <div className="relative flex-1">
                <Quote className="absolute -top-1 -left-1 w-6 h-6 text-[#ad2bee]/20" />
                <p className="text-gray-300 text-sm leading-relaxed pl-5">
                  {review.text}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <span className="text-xs text-gray-600">{review.date}</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#ad2bee]/10 text-[#ad2bee]">
                  {review.highlight}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="text-center p-12 rounded-3xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent"
      >
        <h2 className="text-2xl font-extrabold text-white mb-3">
          Tham Gia Cộng Đồng 10,000+ Người Dùng
        </h2>
        <p className="text-gray-400 mb-6 max-w-lg mx-auto">
          Trải nghiệm miễn phí và chia sẻ đánh giá của bạn.
        </p>
        <Link href="/auth/register">
          <button className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#ad2bee] to-purple-500 text-sm font-bold text-white shadow-lg shadow-[#ad2bee]/25 hover:shadow-[#ad2bee]/40 hover:scale-105 active:scale-95 transition-all duration-300">
            Bắt Đầu Miễn Phí
          </button>
        </Link>
      </motion.div>
    </StaticPageLayout>
  );
}
