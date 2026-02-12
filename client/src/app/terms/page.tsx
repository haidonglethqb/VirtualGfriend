'use client';

import { StaticPageLayout } from '@/components/layout/static-page-layout';

export default function TermsPage() {
  return (
    <StaticPageLayout
      title="Điều Khoản Sử Dụng"
      subtitle="Cập nhật lần cuối: 12 tháng 2, 2026"
    >
      <div className="prose prose-invert prose-sm max-w-none space-y-8">
        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">1. Chấp Nhận Điều Khoản</h2>
          <p className="text-gray-400 leading-relaxed">
            Bằng việc truy cập và sử dụng dịch vụ Người Yêu Ảo, bạn đồng ý với các điều khoản sử dụng này.
            Nếu không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng dịch vụ.
          </p>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">2. Mô Tả Dịch Vụ</h2>
          <p className="text-gray-400 leading-relaxed">
            Người Yêu Ảo là ứng dụng bạn đồng hành AI sử dụng trí tuệ nhân tạo để tạo trải nghiệm trò chuyện
            và kết nối. Dịch vụ bao gồm:
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-3 space-y-2">
            <li>Trò chuyện với nhân vật AI được cá nhân hoá</li>
            <li>Hệ thống quà tặng, nhiệm vụ và thành tích</li>
            <li>Lưu trữ kỷ niệm và thống kê quan hệ</li>
            <li>Tuỳ chỉnh nhân vật và cài đặt cá nhân</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">3. Tài Khoản Người Dùng</h2>
          <ul className="list-disc list-inside text-gray-400 space-y-2">
            <li>Bạn phải từ 16 tuổi trở lên để sử dụng dịch vụ</li>
            <li>Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu</li>
            <li>Mỗi người chỉ được tạo một tài khoản</li>
            <li>Thông tin đăng ký phải chính xác và đầy đủ</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">4. Quy Tắc Sử Dụng</h2>
          <p className="text-gray-400 leading-relaxed mb-3">Bạn <strong className="text-white">KHÔNG</strong> được:</p>
          <ul className="list-disc list-inside text-gray-400 space-y-2">
            <li>Sử dụng dịch vụ cho mục đích bất hợp pháp</li>
            <li>Cố gắng hack, phá hoại hoặc khai thác lỗ hổng hệ thống</li>
            <li>Chia sẻ tài khoản với người khác</li>
            <li>Sử dụng bot hoặc công cụ tự động thao túng hệ thống</li>
            <li>Đăng nội dung vi phạm pháp luật hoặc xâm phạm quyền của người khác</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">5. Tiền Tệ Ảo & Thanh Toán</h2>
          <ul className="list-disc list-inside text-gray-400 space-y-2">
            <li>Xu và sao là tiền tệ ảo, chỉ sử dụng trong ứng dụng</li>
            <li>Xu/sao không có giá trị tiền thật và không thể quy đổi</li>
            <li>Thanh toán Premium là tự động gia hạn hàng tháng</li>
            <li>Huỷ gói Premium có hiệu lực từ kỳ thanh toán tiếp theo</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">6. Giới Hạn Trách Nhiệm</h2>
          <p className="text-gray-400 leading-relaxed">
            Người Yêu Ảo là sản phẩm giải trí dựa trên AI. Chúng tôi không chịu trách nhiệm cho
            các quyết định cá nhân dựa trên cuộc trò chuyện AI. AI không thay thế cho tư vấn chuyên gia
            về tâm lý, y tế hoặc pháp lý.
          </p>
        </section>

        <section className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white mb-4">7. Liên Hệ</h2>
          <p className="text-gray-400 leading-relaxed">
            Mọi thắc mắc về điều khoản, vui lòng liên hệ:<br />
            Email: <a href="mailto:legal@nguoiyeuao.vn" className="text-[#ad2bee] hover:underline">legal@nguoiyeuao.vn</a>
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
