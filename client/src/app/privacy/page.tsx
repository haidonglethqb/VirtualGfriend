'use client';

import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { useLanguageStore } from '@/store/language-store';

export default function PrivacyPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const tr = (vi: string, en: string) => (isVi ? vi : en);

  return (
    <StaticPageLayout
      title={tr('Chính Sách Bảo Mật', 'Privacy Policy')}
      subtitle={tr('Cập nhật lần cuối: 12 tháng 2, 2026', 'Last updated: February 12, 2026')}
    >
      <div className="prose prose-invert prose-sm max-w-none space-y-8">
        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('1. Thu Thập Dữ Liệu', '1. Data Collection')}</h2>
          <p className="text-gray-400 leading-relaxed">
            {tr('Chúng tôi thu thập thông tin tối thiểu cần thiết để cung cấp dịch vụ:', 'We collect only the minimum information required to provide the service:')}
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>{tr('Thông tin tài khoản: email, tên hiển thị', 'Account data: email, display name')}</li>
            <li>{tr('Nội dung trò chuyện: được mã hoá và lưu trữ an toàn', 'Conversation content: encrypted and securely stored')}</li>
            <li>{tr('Dữ liệu sử dụng: thống kê tương tác để cải thiện trải nghiệm', 'Usage data: interaction metrics to improve the experience')}</li>
            <li>{tr('Thông tin nhân vật: tên, tính cách, tuỳ chỉnh cá nhân', 'Character profile: name, personality, personal settings')}</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('2. Sử Dụng Dữ Liệu', '2. Data Usage')}</h2>
          <p className="text-gray-400 leading-relaxed">
            {tr('Dữ liệu được sử dụng để:', 'Data is used to:')}
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>{tr('Cung cấp và duy trì dịch vụ trò chuyện AI', 'Provide and maintain AI conversation services')}</li>
            <li>{tr('Cá nhân hoá trải nghiệm (sở thích, kỷ niệm, phong cách giao tiếp)', 'Personalize your experience (preferences, memories, communication style)')}</li>
            <li>{tr('Cải thiện mô hình AI và chất lượng phản hồi', 'Improve AI model quality and response relevance')}</li>
            <li>{tr('Gửi thông báo liên quan đến tài khoản', 'Send account-related notifications')}</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('3. Bảo Mật Dữ Liệu', '3. Data Security')}</h2>
          <p className="text-gray-400 leading-relaxed">
            {tr('Chúng tôi cam kết bảo vệ dữ liệu của bạn bằng các biện pháp:', 'We protect your data with the following safeguards:')}
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>{tr('Mã hoá End-to-End cho mọi cuộc trò chuyện', 'End-to-end encryption for all conversations')}</li>
            <li>{tr('Mã hoá dữ liệu khi lưu trữ (at rest) và truyền tải (in transit)', 'Encryption both at rest and in transit')}</li>
            <li>{tr('Kiểm thử bảo mật định kỳ', 'Regular security testing')}</li>
            <li>{tr('Giới hạn quyền truy cập cho nhân viên', 'Strict internal access control')}</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('4. Chia Sẻ Dữ Liệu', '4. Data Sharing')}</h2>
          <p className="text-gray-400 leading-relaxed">
            {tr('Chúng tôi ', 'We ')}
            <strong className="text-white">{tr('KHÔNG BAO GIỜ', 'NEVER')}</strong>
            {tr(' bán hoặc chia sẻ dữ liệu cá nhân với bên thứ ba vì mục đích thương mại. Dữ liệu chỉ được chia sẻ khi:', ' sell or share personal data with third parties for commercial purposes. Data is shared only when:')}
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>{tr('Có sự đồng ý rõ ràng từ bạn', 'You explicitly consent')}</li>
            <li>{tr('Theo yêu cầu của pháp luật', 'Required by law')}</li>
            <li>{tr('Cần thiết để bảo vệ quyền lợi và an toàn', 'Necessary to protect rights and safety')}</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('5. Quyền Của Bạn', '5. Your Rights')}</h2>
          <p className="text-gray-400 leading-relaxed">
            {tr('Theo quy định GDPR và luật bảo vệ dữ liệu, bạn có quyền:', 'Under GDPR and applicable privacy laws, you have the right to:')}
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>{tr('Truy cập và tải xuống dữ liệu cá nhân', 'Access and download your personal data')}</li>
            <li>{tr('Yêu cầu chỉnh sửa thông tin không chính xác', 'Request correction of inaccurate data')}</li>
            <li>{tr('Yêu cầu xoá tài khoản và toàn bộ dữ liệu', 'Request account and data deletion')}</li>
            <li>{tr('Rút lại sự đồng ý xử lý dữ liệu', 'Withdraw consent for data processing')}</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">{tr('6. Liên Hệ', '6. Contact')}</h2>
          <p className="text-gray-400 leading-relaxed">
            {tr('Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ:', 'For privacy questions, please contact us:')}<br />
            Email: <a href="mailto:privacy@nguoiyeuao.vn" className="text-[#ad2bee] hover:underline">privacy@nguoiyeuao.vn</a>
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
