'use client';

import { StaticPageLayout } from '@/components/layout/static-page-layout';

export default function PrivacyPage() {
  return (
    <StaticPageLayout
      title="Chính Sách Bảo Mật"
      subtitle="Cập nhật lần cuối: 12 tháng 2, 2026"
    >
      <div className="prose prose-invert prose-sm max-w-none space-y-8">
        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">1. Thu Thập Dữ Liệu</h2>
          <p className="text-gray-400 leading-relaxed">
            Chúng tôi thu thập thông tin tối thiểu cần thiết để cung cấp dịch vụ:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>Thông tin tài khoản: email, tên hiển thị</li>
            <li>Nội dung trò chuyện: được mã hoá và lưu trữ an toàn</li>
            <li>Dữ liệu sử dụng: thống kê tương tác để cải thiện trải nghiệm</li>
            <li>Thông tin nhân vật: tên, tính cách, tuỳ chỉnh cá nhân</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">2. Sử Dụng Dữ Liệu</h2>
          <p className="text-gray-400 leading-relaxed">
            Dữ liệu được sử dụng để:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>Cung cấp và duy trì dịch vụ trò chuyện AI</li>
            <li>Cá nhân hoá trải nghiệm (sở thích, kỷ niệm, phong cách giao tiếp)</li>
            <li>Cải thiện mô hình AI và chất lượng phản hồi</li>
            <li>Gửi thông báo liên quan đến tài khoản</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">3. Bảo Mật Dữ Liệu</h2>
          <p className="text-gray-400 leading-relaxed">
            Chúng tôi cam kết bảo vệ dữ liệu của bạn bằng các biện pháp:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>Mã hoá End-to-End cho mọi cuộc trò chuyện</li>
            <li>Mã hoá dữ liệu khi lưu trữ (at rest) và truyền tải (in transit)</li>
            <li>Kiểm thử bảo mật định kỳ</li>
            <li>Giới hạn quyền truy cập cho nhân viên</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">4. Chia Sẻ Dữ Liệu</h2>
          <p className="text-gray-400 leading-relaxed">
            Chúng tôi <strong className="text-white">KHÔNG BAO GIỜ</strong> bán hoặc chia sẻ dữ liệu cá nhân với bên thứ ba
            vì mục đích thương mại. Dữ liệu chỉ được chia sẻ khi:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>Có sự đồng ý rõ ràng từ bạn</li>
            <li>Theo yêu cầu của pháp luật</li>
            <li>Cần thiết để bảo vệ quyền lợi và an toàn</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">5. Quyền Của Bạn</h2>
          <p className="text-gray-400 leading-relaxed">
            Theo quy định GDPR và luật bảo vệ dữ liệu, bạn có quyền:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>Truy cập và tải xuống dữ liệu cá nhân</li>
            <li>Yêu cầu chỉnh sửa thông tin không chính xác</li>
            <li>Yêu cầu xoá tài khoản và toàn bộ dữ liệu</li>
            <li>Rút lại sự đồng ý xử lý dữ liệu</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">6. Liên Hệ</h2>
          <p className="text-gray-400 leading-relaxed">
            Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ:<br />
            Email: <a href="mailto:privacy@nguoiyeuao.vn" className="text-[#ad2bee] hover:underline">privacy@nguoiyeuao.vn</a>
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
