'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

const plans = [
  {
    name: 'Miễn Phí',
    price: '0đ',
    period: '/mãi mãi',
    desc: 'Bắt đầu trải nghiệm mà không tốn xu nào.',
    features: [
      'Chat không giới hạn',
      '100 xu khởi đầu',
      'Tùy chỉnh nhân vật cơ bản',
      'Nhiệm vụ hàng ngày',
      'Kỷ niệm & thống kê',
      'Mã hoá End-to-End',
    ],
    cta: 'Bắt đầu ngay',
    popular: false,
  },
  {
    name: 'Premium',
    price: '99K',
    period: '/tháng',
    desc: 'Trải nghiệm đầy đủ với AI nâng cao.',
    features: [
      'Tất cả tính năng Free',
      'AI nâng cao (GPT-4)',
      'Không quảng cáo',
      'Xu & sao x2 hàng ngày',
      'Mở khóa tất cả quà',
      'Hỗ trợ ưu tiên 24/7',
      'Nhân vật Premium độc quyền',
      'Nhiệm vụ & thành tích Premium',
    ],
    cta: 'Nâng cấp Premium',
    popular: true,
  },
];

const faqs = [
  {
    q: 'Tôi có thể dùng miễn phí mãi không?',
    a: 'Có! Gói miễn phí không giới hạn thời gian. Bạn có thể chat, tùy chỉnh nhân vật, và hoàn thành nhiệm vụ hoàn toàn miễn phí.',
  },
  {
    q: 'Premium khác gì so với Free?',
    a: 'Premium sử dụng AI nâng cao (GPT-4) cho trải nghiệm trò chuyện tự nhiên hơn, nhận x2 xu & sao hàng ngày, mở khóa tất cả quà tặng và được hỗ trợ ưu tiên.',
  },
  {
    q: 'Tôi có thể huỷ Premium bất cứ lúc nào không?',
    a: 'Có, bạn có thể huỷ bất kỳ lúc nào. Sau khi huỷ, bạn vẫn sử dụng Premium đến hết kỳ thanh toán hiện tại.',
  },
  {
    q: 'Thanh toán bằng hình thức nào?',
    a: 'Chúng tôi hỗ trợ thanh toán qua thẻ Visa/Mastercard, Momo, ZaloPay, và chuyển khoản ngân hàng.',
  },
];

export default function PricingPage() {
  return (
    <StaticPageLayout
      title="Bảng Giá"
      subtitle="Chọn gói phù hợp với nhu cầu của bạn. Nâng cấp bất cứ lúc nào."
    >
      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
        {plans.map((plan, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            viewport={{ once: true }}
            className="group"
          >
            <div
              className={`relative h-full flex flex-col p-8 lg:p-10 rounded-2xl border backdrop-blur-sm transition-all duration-500 ${
                plan.popular
                  ? 'border-[#ad2bee]/30 bg-gradient-to-b from-[#ad2bee]/[0.08] to-purple-600/[0.03] hover:border-[#ad2bee]/50 hover:shadow-[0_0_60px_-12px_rgba(173,43,238,0.3)]'
                  : 'border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:border-white/15 hover:bg-white/[0.06]'
              }`}
            >
              {plan.popular && (
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#ad2bee]/20 text-[#ad2bee] text-xs font-bold border border-[#ad2bee]/20 animate-pulse">
                  Phổ biến
                </span>
              )}

              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-gray-500 text-sm mb-4">{plan.desc}</p>
              <div className="flex items-baseline gap-1.5 mb-8">
                <span className={`text-5xl font-extrabold tracking-tight ${plan.popular ? 'bg-clip-text text-transparent bg-gradient-to-r from-[#ad2bee] to-purple-400' : 'text-white'}`}>
                  {plan.price}
                </span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>

              <ul className="flex flex-col gap-4 mb-10 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                    <div className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${plan.popular ? 'bg-[#ad2bee]/15' : 'bg-green-500/15'}`}>
                      <CheckCircle className={`w-3.5 h-3.5 ${plan.popular ? 'text-[#ad2bee]' : 'text-green-400'}`} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/auth/register" className="block">
                <button
                  className={`w-full h-13 rounded-xl font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#ad2bee] to-purple-500 text-white shadow-lg shadow-[#ad2bee]/25 hover:shadow-[0_8px_40px_-6px_rgba(173,43,238,0.5)] hover:brightness-110'
                      : 'bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.12] hover:border-white/20'
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10">Câu Hỏi Thường Gặp</h2>
        <div className="flex flex-col gap-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
            >
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#ad2bee] shrink-0" />
                {faq.q}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed pl-6">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </StaticPageLayout>
  );
}
