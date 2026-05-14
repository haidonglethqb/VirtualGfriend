'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Crown, Gem, Loader2, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { usePremiumStore } from '@/store/premium-store';
import api from '@/services/api';
import type { PremiumFeatures, PremiumTier } from '@/lib/premium';

interface PricingTier {
  monthlyPrice: number;
  yearlyPrice: number;
  displayName: string;
  description: string;
}

type PricingConfig = Record<string, PricingTier>;

const TIER_ORDER: PremiumTier[] = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];

const TIER_META: Record<PremiumTier, { icon: typeof Sparkles; popular?: boolean }> = {
  FREE: { icon: Sparkles },
  BASIC: { icon: Crown },
  PRO: { icon: Zap, popular: true },
  ULTIMATE: { icon: Gem },
};

function formatVND(amount: number) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}₫`;
}

function buildFeatureList(config: PremiumFeatures, tr: (vi: string, en: string) => string) {
  return [
    config.maxMessagesPerDay === -1
      ? tr('Tin nhắn không giới hạn', 'Unlimited messages')
      : tr(`${config.maxMessagesPerDay} tin nhắn mỗi ngày`, `${config.maxMessagesPerDay} messages per day`),
    config.maxCharacters === -1
      ? tr('Số nhân vật không giới hạn', 'Unlimited characters')
      : tr(`${config.maxCharacters} nhân vật hoạt động`, `${config.maxCharacters} active characters`),
    config.canAccessPremiumGifts || config.canAccessPremiumScenes
      ? tr('Quà tặng và bối cảnh premium', 'Premium gifts and scenes')
      : tr('Quà tặng và bối cảnh cơ bản', 'Core gifts and scenes'),
    config.canAccessPremiumQuests
      ? tr('Nhiệm vụ premium', 'Premium quests')
      : tr('Nhiệm vụ cơ bản', 'Core quests'),
    config.voiceMessages
      ? tr('Tin nhắn giọng nói', 'Voice messages')
      : tr('Không có voice messages', 'No voice messages'),
    config.sendImages && config.sendVideos
      ? tr('Gửi ảnh và video', 'Send images and videos')
      : tr('Không có ảnh/video premium', 'No premium images/videos'),
    config.adFree ? tr('Không quảng cáo', 'Ad-free') : tr('Có thể có quảng cáo', 'Ads may appear'),
    config.canCreateExPersonaOnBreakup
      ? tr('Giữ người cũ AI sau chia tay', 'Keep AI ex after breakup')
      : tr('Không có tính năng người cũ AI', 'No AI ex retention'),
  ];
}

export default function PricingPage() {
  const { language } = useLanguageStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { allTierConfigs, fetchTierConfigs } = usePremiumStore();
  const isVi = language === 'vi';
  const tr = useCallback((vi: string, en: string) => (isVi ? vi : en), [isVi]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [_, pricingResponse] = await Promise.all([
          fetchTierConfigs(true),
          api.get<PricingConfig>('/payment/pricing'),
        ]);

        if (!cancelled && pricingResponse.success && pricingResponse.data) {
          setPricingConfig(pricingResponse.data);
        }
      } catch {
        if (!cancelled) {
          setPricingConfig(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [fetchTierConfigs]);

  const plans = useMemo(() => {
    return TIER_ORDER.map((tier) => {
      const config = allTierConfigs[tier];
      const paidPricing = tier === 'FREE' ? null : pricingConfig?.[tier];
      const Icon = TIER_META[tier].icon;

      return {
        tier,
        Icon,
        popular: TIER_META[tier].popular || false,
        name:
          tier === 'FREE'
            ? tr('Miễn Phí', 'Free')
            : paidPricing?.displayName || tier,
        desc:
          tier === 'FREE'
            ? tr('Bắt đầu với giới hạn miễn phí hiện tại của hệ thống.', 'Start with the system\'s current free limits.')
            : paidPricing?.description || tr('Gói trả phí đang đồng bộ từ cấu hình hệ thống.', 'Paid plan synced from live system config.'),
        price:
          tier === 'FREE'
            ? '0₫'
            : paidPricing
              ? formatVND(paidPricing.monthlyPrice)
              : '—',
        yearlyPrice:
          tier === 'FREE' || !paidPricing ? null : formatVND(paidPricing.yearlyPrice),
        period: tier === 'FREE' ? tr('/mãi mãi', '/forever') : tr('/tháng', '/month'),
        features: buildFeatureList(config, tr),
        cta:
          tier === 'FREE'
            ? tr('Bắt đầu ngay', 'Get started')
            : isAuthenticated
              ? tr('Xem gói này', 'View this plan')
              : tr('Đăng ký để nâng cấp', 'Sign up to upgrade'),
        href: tier === 'FREE' || !isAuthenticated ? '/auth/register' : '/subscription',
      };
    });
  }, [allTierConfigs, isAuthenticated, pricingConfig, tr]);

  const faqs = [
    {
      q: tr('Tôi có thể dùng miễn phí mãi không?', 'Can I use Free forever?'),
      a: tr('Có. Gói miễn phí không giới hạn thời gian, nhưng vẫn tuân theo quota và giới hạn tính năng hiện tại của hệ thống.', 'Yes. The free plan has no time limit, but it still follows the system\'s current quotas and feature limits.'),
    },
    {
      q: tr('Bảng giá này lấy dữ liệu từ đâu?', 'Where does this pricing data come from?'),
      a: tr('Trang này đọc trực tiếp từ cấu hình pricing và tier config hiện tại của hệ thống, nên sẽ phản ánh các thay đổi mới nhất từ admin.', 'This page reads from the current pricing and tier configuration in the system, so it reflects the latest admin changes.'),
    },
    {
      q: tr('Tôi có thể huỷ Premium bất cứ lúc nào không?', 'Can I cancel Premium anytime?'),
      a: tr('Có, bạn có thể huỷ bất kỳ lúc nào. Sau khi huỷ, bạn vẫn sử dụng Premium đến hết kỳ thanh toán hiện tại.', 'Yes, you can cancel anytime. Your Premium access remains active until the current billing cycle ends.'),
    },
    {
      q: tr('Thanh toán bằng hình thức nào?', 'Which payment methods are supported?'),
      a: tr('Thanh toán được xử lý qua Stripe Checkout. Các phương thức khả dụng phụ thuộc vào cấu hình Stripe và khu vực thanh toán của bạn.', 'Payments are processed through Stripe Checkout. Available payment methods depend on your Stripe configuration and billing region.'),
    },
  ];

  return (
    <StaticPageLayout
      title={tr('Bảng Giá', 'Pricing')}
      subtitle={tr('Chọn gói phù hợp với nhu cầu của bạn. Nâng cấp bất cứ lúc nào.', 'Choose the plan that fits your needs. Upgrade anytime.')}
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#ad2bee]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="group"
            >
              <div
                className={`relative h-full flex flex-col p-7 rounded-2xl border backdrop-blur-sm transition-all duration-500 ${
                  plan.popular
                    ? 'border-[#ad2bee]/30 bg-gradient-to-b from-[#ad2bee]/[0.08] to-purple-600/[0.03] hover:border-[#ad2bee]/50 hover:shadow-[0_0_60px_-12px_rgba(173,43,238,0.3)]'
                    : 'border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:border-white/15 hover:bg-white/[0.06]'
                }`}
              >
                {plan.popular && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#ad2bee]/20 text-[#ad2bee] text-xs font-bold border border-[#ad2bee]/20 animate-pulse">
                    {tr('Phổ biến', 'Popular')}
                  </span>
                )}

                <plan.Icon className={`w-5 h-5 mb-4 ${plan.popular ? 'text-[#ad2bee]' : 'text-white/70'}`} />
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-4 min-h-[40px]">{plan.desc}</p>
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className={`text-4xl font-extrabold tracking-tight ${plan.popular ? 'bg-clip-text text-transparent bg-gradient-to-r from-[#ad2bee] to-purple-400' : 'text-white'}`}>
                    {plan.price}
                  </span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                {plan.yearlyPrice && (
                  <p className="text-xs text-gray-500 mb-8">{tr('Giá năm', 'Yearly')}: {plan.yearlyPrice}</p>
                )}

                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                      <div className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${plan.popular ? 'bg-[#ad2bee]/15' : 'bg-green-500/15'}`}>
                        <CheckCircle className={`w-3.5 h-3.5 ${plan.popular ? 'text-[#ad2bee]' : 'text-green-400'}`} />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link href={plan.href} className="block">
                  <button
                    className={`w-full h-12 rounded-xl font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
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
      )}

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10">{tr('Câu Hỏi Thường Gặp', 'Frequently Asked Questions')}</h2>
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
