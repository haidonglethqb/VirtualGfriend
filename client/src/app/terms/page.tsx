'use client';

import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { useLanguageStore } from '@/store/language-store';

export default function TermsPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const tr = (vi: string, en: string) => (isVi ? vi : en);

  return (
    <StaticPageLayout
      title={tr('Điều Khoản Sử Dụng', 'Terms of Use')}
      subtitle={tr('Cập nhật lần cuối: 12 tháng 2, 2026', 'Last updated: February 12, 2026')}
    >
      <div className="prose prose-invert prose-sm max-w-none space-y-8">
        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('1. Chấp Nhận Điều Khoản', '1. Acceptance of Terms')}</h2>
          <p className="text-gray-400 leading-relaxed">
            {tr('Bằng việc truy cập và sử dụng dịch vụ Amoura, bạn đồng ý với các điều khoản sử dụng này. Nếu không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng dịch vụ.', 'By accessing and using Amoura, you agree to these terms. If you disagree with any part, please do not use the service.')}
          </p>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('2. Mô Tả Dịch Vụ', '2. Service Description')}</h2>
          <p className="text-gray-400 leading-relaxed">
            {tr('Amoura là ứng dụng bạn đồng hành AI sử dụng trí tuệ nhân tạo để tạo trải nghiệm trò chuyện và kết nối. Dịch vụ bao gồm:', 'Amoura is an AI companion app that uses artificial intelligence to create conversational and emotional connection experiences. Services include:')}
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>{tr('Trò chuyện với nhân vật AI được cá nhân hoá', 'Chat with personalized AI characters')}</li>
            <li>{tr('Hệ thống quà tặng, nhiệm vụ và thành tích', 'Gift, quest, and achievement systems')}</li>
            <li>{tr('Lưu trữ kỷ niệm và thống kê quan hệ', 'Memory timeline and relationship insights')}</li>
            <li>{tr('Tuỳ chỉnh nhân vật và cài đặt cá nhân', 'Character customization and personal settings')}</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('3. Tài Khoản Người Dùng', '3. User Accounts')}</h2>
          <ul className="list-disc list-inside text-gray-400 space-y-2">
            <li>{tr('Bạn phải từ 16 tuổi trở lên để sử dụng dịch vụ', 'You must be at least 16 years old')}</li>
            <li>{tr('Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu', 'You are responsible for account and password security')}</li>
            <li>{tr('Mỗi người chỉ được tạo một tài khoản', 'Each person may maintain one account')}</li>
            <li>{tr('Thông tin đăng ký phải chính xác và đầy đủ', 'Registration information must be accurate and complete')}</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('4. Quy Tắc Sử Dụng', '4. Usage Rules')}</h2>
          <p className="text-gray-400 leading-relaxed mb-3">{tr('Bạn ', 'You must ')}<strong className="text-white">{tr('KHÔNG', 'NOT')}</strong>{tr(' được:', ':')}</p>
          <ul className="list-disc list-inside text-gray-400 space-y-2">
            <li>{tr('Sử dụng dịch vụ cho mục đích bất hợp pháp', 'Use the service for unlawful purposes')}</li>
            <li>{tr('Cố gắng hack, phá hoại hoặc khai thác lỗ hổng hệ thống', 'Attempt hacking, disruption, or exploit system vulnerabilities')}</li>
            <li>{tr('Chia sẻ tài khoản với người khác', 'Share your account with others')}</li>
            <li>{tr('Sử dụng bot hoặc công cụ tự động thao túng hệ thống', 'Use bots or automation to manipulate the system')}</li>
            <li>{tr('Đăng nội dung vi phạm pháp luật hoặc xâm phạm quyền của người khác', 'Post unlawful content or violate others rights')}</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('5. Tiền Tệ Ảo & Thanh Toán', '5. Virtual Currency & Payments')}</h2>
          <ul className="list-disc list-inside text-gray-400 space-y-2">
            <li>{tr('Xu và sao là tiền tệ ảo, chỉ sử dụng trong ứng dụng', 'Coins and stars are virtual currency used only in-app')}</li>
            <li>{tr('Xu/sao không có giá trị tiền thật và không thể quy đổi', 'Coins and stars have no real-world cash value and are non-convertible')}</li>
            <li>{tr('Thanh toán Premium là tự động gia hạn hàng tháng', 'Premium subscriptions renew automatically each month')}</li>
            <li>{tr('Huỷ gói Premium có hiệu lực từ kỳ thanh toán tiếp theo', 'Cancellation takes effect from the next billing cycle')}</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('6. Giới Hạn Trách Nhiệm', '6. Limitation of Liability')}</h2>
          <p className="text-gray-400 leading-relaxed">
            {tr('Amoura là sản phẩm giải trí dựa trên AI. Chúng tôi không chịu trách nhiệm cho các quyết định cá nhân dựa trên cuộc trò chuyện AI. AI không thay thế cho tư vấn chuyên gia về tâm lý, y tế hoặc pháp lý.', 'Amoura is an AI-based entertainment product. We are not responsible for personal decisions made based on AI conversations. AI is not a replacement for professional psychological, medical, or legal advice.')}
          </p>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('7. Liên Hệ', '7. Contact')}</h2>
          <p className="text-gray-400 leading-relaxed">
            {tr('Mọi thắc mắc về điều khoản, vui lòng liên hệ:', 'For questions about these terms, contact us:')}<br />
            Email: <a href="mailto:legal@nguoiyeuao.vn" className="text-[#ad2bee] hover:underline">legal@nguoiyeuao.vn</a>
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
