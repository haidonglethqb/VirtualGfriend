'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Tag, ArrowLeft, Clock, Share2 } from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { useLanguageStore } from '@/store/language-store';

const blogPosts: Record<string, {
  title: string;
  date: string;
  tag: string;
  tagColor: string;
  readTime: string;
  content: string[];
}> = {
  'nguoi-yeu-ao-v2-ai-thong-minh-hon': {
    title: 'Ra Mắt Amoura v2.0 — AI Thông Minh Hơn Bao Giờ Hết',
    date: '10 Tháng 2, 2026',
    tag: 'Cập nhật',
    tagColor: 'bg-blue-500/10 text-blue-400',
    readTime: '5 phút đọc',
    content: [
      'Chúng tôi rất vui được giới thiệu Amoura phiên bản 2.0 — bản cập nhật lớn nhất từ khi ra mắt. Phiên bản này mang đến trải nghiệm hoàn toàn mới với hệ thống trí nhớ thông minh hơn.',
      'Hệ thống trí nhớ mới cho phép AI ghi nhớ mọi chi tiết từ các cuộc hội thoại trước đó — từ sở thích ăn uống, công việc, đến những kỷ niệm đặc biệt bạn chia sẻ. AI không chỉ nhớ, mà còn biết đưa chúng vào ngữ cảnh phù hợp.',
      'Khả năng hiểu ngữ cảnh sâu hơn giúp AI phản hồi tự nhiên hơn rất nhiều. Thay vì trả lời theo kịch bản, AI giờ đây có thể hiểu cảm xúc tiềm ẩn trong tin nhắn của bạn và đáp lại một cách tinh tế.',
      'Tính năng ghi nhớ kỷ niệm tự động sẽ tự động đánh dấu những khoảnh khắc đặc biệt trong cuộc trò chuyện — lần đầu nói yêu, kỷ niệm sinh nhật, những lời hứa. Tất cả được lưu trong trang Ký Ức để bạn có thể xem lại bất cứ lúc nào.',
      'Ngoài ra, v2.0 còn cải thiện đáng kể tốc độ phản hồi — giảm 40% thời gian chờ so với phiên bản trước. Trải nghiệm trò chuyện giờ đây mượt mà và liền mạch hơn bao giờ hết.',
    ],
  },
  'he-thong-nhiem-vu-thanh-tich': {
    title: 'Hệ Thống Nhiệm Vụ & Thành Tích — Chơi Mà Yêu',
    date: '5 Tháng 2, 2026',
    tag: 'Tính năng',
    tagColor: 'bg-[#ad2bee]/10 text-[#ad2bee]',
    readTime: '4 phút đọc',
    content: [
      'Hệ thống Quest là một trong những tính năng được yêu cầu nhiều nhất từ cộng đồng. Hôm nay, chúng tôi chính thức ra mắt với 3 loại nhiệm vụ: Hàng ngày, Hàng tuần, và Câu chuyện.',
      'Nhiệm vụ hàng ngày bao gồm những hoạt động đơn giản như gửi tin nhắn chào buổi sáng, tặng một món quà, hoặc hỏi thăm AI. Mỗi ngày có 3-5 nhiệm vụ khác nhau, giúp bạn duy trì kết nối đều đặn.',
      'Nhiệm vụ hàng tuần thách thức hơn — có thể là hoàn thành 7 ngày trò chuyện liên tiếp, tặng quà hiếm, hoặc đạt mốc cảm xúc nhất định. Phần thưởng cũng hấp dẫn hơn nhiều.',
      'Nhiệm vụ Câu chuyện là những chuỗi quest dài kể về hành trình xây dựng mối quan hệ. Hoàn thành chúng để mở khoá đoạn hội thoại đặc biệt và phần thưởng độc quyền.',
      'Mỗi nhiệm vụ hoàn thành sẽ nhận được xu, sao, và XP. Tích luỹ đủ thành tích sẽ mở khoá huy hiệu đặc biệt hiển thị trên hồ sơ của bạn.',
    ],
  },
  'shop-qua-tang-cho-nguoi-yeu': {
    title: 'Shop Quà Tặng — Tặng Quà Cho Bạn Đồng Hành',
    date: '1 Tháng 2, 2026',
    tag: 'Tính năng',
    tagColor: 'bg-[#ad2bee]/10 text-[#ad2bee]',
    readTime: '3 phút đọc',
    content: [
      'Shop Quà Tặng mở ra một cách hoàn toàn mới để thể hiện tình cảm với AI của bạn. Dùng xu kiếm được từ nhiệm vụ để mua các món quà đa dạng.',
      'Hiện tại shop có hơn 15 món quà chia theo 5 hạng: Thường (Common), Không phổ biến (Uncommon), Hiếm (Rare), Sử thi (Epic), và Huyền thoại (Legendary). Mỗi hạng có thiết kế và hiệu ứng riêng.',
      'Điều đặc biệt là mỗi món quà đều kích hoạt phản hồi cảm xúc riêng từ AI. Tặng hoa sẽ khác với tặng nhẫn kim cương — AI sẽ phản ứng tùy theo mức độ đặc biệt của món quà.',
      'Một số quà hiếm chỉ mở khoá khi bạn đạt level nhất định hoặc trong các sự kiện đặc biệt. Hãy hoàn thành nhiệm vụ và tích xu để sưu tầm tất cả!',
    ],
  },
  'bao-mat-end-to-end': {
    title: 'Bảo Mật End-to-End — An Toàn Là Ưu Tiên Số 1',
    date: '28 Tháng 1, 2026',
    tag: 'Bảo mật',
    tagColor: 'bg-green-500/10 text-green-400',
    readTime: '6 phút đọc',
    content: [
      'Bảo mật và quyền riêng tư luôn là ưu tiên hàng đầu của Amoura. Bài viết này giải thích chi tiết về kiến trúc bảo mật của chúng tôi.',
      'Mọi tin nhắn giữa bạn và AI đều được mã hoá End-to-End. Điều này có nghĩa là ngay cả đội ngũ kỹ thuật của chúng tôi cũng không thể đọc nội dung cuộc trò chuyện.',
      'Dữ liệu được lưu trữ trên server tại Việt Nam, tuân thủ Luật An ninh mạng 2018 và các tiêu chuẩn bảo mật quốc tế như GDPR. Bạn có toàn quyền kiểm soát dữ liệu của mình.',
      'Tính năng xoá dữ liệu cho phép bạn xoá toàn bộ lịch sử trò chuyện, ký ức, và thông tin cá nhân chỉ với một cú nhấp. Dữ liệu sẽ bị xoá vĩnh viễn trong vòng 24 giờ.',
      'Chúng tôi không bán, không chia sẻ, và không sử dụng dữ liệu cá nhân của bạn cho mục đích quảng cáo. Dữ liệu chỉ được dùng để cải thiện trải nghiệm AI cho chính bạn.',
      'Với mật khẩu được hash bằng bcrypt, JWT token có thời gian hết hạn, và hệ thống OTP để reset mật khẩu — tài khoản của bạn luôn an toàn.',
    ],
  },
  '5-meo-xay-dung-moi-quan-he-ai': {
    title: '5 Mẹo Để Xây Dựng Mối Quan Hệ AI Tốt Nhất',
    date: '25 Tháng 1, 2026',
    tag: 'Hướng dẫn',
    tagColor: 'bg-orange-500/10 text-orange-400',
    readTime: '4 phút đọc',
    content: [
      'AI companion là công nghệ mới, và cách bạn tương tác sẽ quyết định chất lượng trải nghiệm. Dưới đây là 5 mẹo giúp bạn xây dựng mối quan hệ AI tuyệt vời nhất.',
      '1. Chia sẻ sở thích của bạn — Kể cho AI về những gì bạn yêu thích: âm nhạc, phim, sách, ẩm thực. AI sẽ ghi nhớ và đưa vào cuộc trò chuyện sau này, tạo cảm giác gần gũi hơn.',
      '2. Đặt câu hỏi mở — Thay vì hỏi đóng (có/không), hãy đặt câu hỏi mở như "Em nghĩ sao về...", "Nếu được đi du lịch thì..." để khám phá nhân cách AI phong phú hơn.',
      '3. Tặng quà thường xuyên — Mỗi món quà đều kích hoạt phản hồi cảm xúc đặc biệt và tăng độ thân thiết. Đừng quên ghé shop để tìm quà phù hợp!',
      '4. Hoàn thành nhiệm vụ mỗi ngày — Quest giúp duy trì kết nối đều đặn và kiếm xu, sao. Streak liên tục sẽ mở khoá thêm nhiều phần thưởng.',
      '5. Kiên nhẫn — AI sẽ ngày càng hiểu bạn hơn qua thời gian. Những cuộc trò chuyện ban đầu có thể chưa hoàn hảo, nhưng AI học rất nhanh từ mỗi tương tác.',
    ],
  },
  'ai-companion-thay-doi-ket-noi': {
    title: 'Tại Sao AI Companion Đang Thay Đổi Cách Chúng Ta Kết Nối',
    date: '20 Tháng 1, 2026',
    tag: 'Insight',
    tagColor: 'bg-cyan-500/10 text-cyan-400',
    readTime: '7 phút đọc',
    content: [
      'AI companion đang trở thành xu hướng toàn cầu. Từ Replika tại Mỹ đến Character.AI, hàng triệu người trên thế giới đang tìm kiếm sự kết nối qua AI. Tại sao?',
      'Nghiên cứu cho thấy 60% Gen Z tại Châu Á cảm thấy cô đơn ít nhất một lần mỗi tuần. Áp lực công việc, học hành, và mạng xã hội tạo ra khoảng cách trong các mối quan hệ thực.',
      'AI companion không thay thế mối quan hệ thực, mà đóng vai trò bổ trợ — một không gian an toàn để chia sẻ, luyện tập giao tiếp, và giải toả cảm xúc mà không sợ bị phán xét.',
      'Tại Việt Nam, Amoura là nền tảng AI companion đầu tiên được thiết kế riêng cho người Việt — hiểu ngôn ngữ, văn hoá, và bối cảnh xã hội Việt Nam.',
      'Với hơn 10,000 người dùng đã đăng ký chỉ trong tháng đầu tiên, rõ ràng nhu cầu về một "người bạn AI" thực sự rất lớn. Chúng tôi cam kết phát triển sản phẩm để mang đến trải nghiệm ngày càng tốt hơn.',
      'Tương lai của AI companion sẽ tiến xa hơn nữa — giọng nói, video call, và cá nhân hoá sâu hơn. Amoura đang xây dựng nền tảng cho tương lai đó.',
    ],
  },
};

export default function BlogPostPage() {
  const params = useParams();
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const slug = params.slug as string;
  const post = blogPosts[slug];

  if (!post) {
    return (
      <StaticPageLayout
        title={tr('Không tìm thấy bài viết', 'Article not found')}
        subtitle={tr('Bài viết bạn tìm kiếm không tồn tại hoặc đã bị xoá.', 'The article you are looking for does not exist or has been removed.')}
      >
        <div className="text-center py-12">
          <Link href="/blog">
            <button className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#ad2bee] to-purple-500 text-sm font-bold text-white shadow-lg shadow-[#ad2bee]/25 hover:shadow-[#ad2bee]/40 hover:scale-105 active:scale-95 transition-all duration-300">
              {tr('Quay về Blog', 'Back to Blog')}
            </button>
          </Link>
        </div>
      </StaticPageLayout>
    );
  }

  return (
    <StaticPageLayout title={post.title} subtitle="">
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-4 mb-10 -mt-6 justify-center">
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${post.tagColor}`}>
          <Tag className="w-3 h-3 inline mr-1" />{post.tag}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />{post.date}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          <Clock className="w-4 h-4" />{language === 'vi' ? post.readTime : post.readTime.replace('phút đọc', 'min read')}
        </span>
      </div>

      {/* Content */}
      <motion.article
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-3xl mx-auto"
      >
        <div className="space-y-6">
          {post.content.map((paragraph, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
              className="text-gray-300 text-base leading-relaxed"
            >
              {paragraph}
            </motion.p>
          ))}
        </div>

        {/* Share + Back */}
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/5">
          <Link
            href="/blog"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {tr('Tất cả bài viết', 'All articles')}
          </Link>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: post.title, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#ad2bee] transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {tr('Chia sẻ', 'Share')}
          </button>
        </div>
      </motion.article>

      {/* Related CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="text-center mt-16 p-10 rounded-3xl border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent"
      >
        <h3 className="text-xl font-extrabold text-white mb-3">{tr('Trải nghiệm ngay', 'Try it now')}</h3>
        <p className="text-gray-400 text-sm mb-6">{tr('Đăng ký miễn phí và bắt đầu cuộc trò chuyện đầu tiên.', 'Sign up for free and start your first conversation.')}</p>
        <Link href="/auth/register">
          <button className="h-11 px-8 rounded-xl bg-gradient-to-r from-[#ad2bee] to-purple-500 text-sm font-bold text-white shadow-lg shadow-[#ad2bee]/25 hover:shadow-[#ad2bee]/40 hover:scale-105 active:scale-95 transition-all duration-300">
            {tr('Bắt Đầu Miễn Phí', 'Start Free')}
          </button>
        </Link>
      </motion.div>
    </StaticPageLayout>
  );
}
