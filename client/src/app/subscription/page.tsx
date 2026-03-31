'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown, Check, X, Loader2, Zap, Gem, Sparkles
} from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { PremiumBadge } from '@/components/PremiumGate';
import { useLanguageStore } from '@/store/language-store';
import { usePremiumStore } from '@/store/premium-store';
import { type PremiumTier, type PremiumFeatures } from '@/lib/premium';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface PricingTier {
  monthlyPrice: number;
  yearlyPrice: number;
  displayName: string;
  description: string;
}

type PricingConfig = Record<string, PricingTier>;

interface PremiumStatus {
  tier: PremiumTier;
  tierDisplay: string;
  isPremium: boolean;
  isVip: boolean;
  expiresAt: string | null;
  daysRemaining: number | null;
  expired: boolean;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  features: {
    maxCharacters: number;
    maxMessagesPerDay: number;
    adFree: boolean;
    canAccessPremiumGifts: boolean;
    canAccessPremiumScenes: boolean;
  };
  usage: {
    messagesUsedToday: number;
    messagesLimit: number;
    messagesRemaining: number;
    isUnlimitedMessages: boolean;
    charactersUsed: number;
    charactersLimit: number;
    charactersRemaining: number;
  };
}

const TIER_CARDS: {
  tier: PremiumTier;
  icon: typeof Crown;
  borderClass: string;
  accentClass: string;
  checkClass: string;
  btnClass: string;
  badge?: string;
}[] = [
  { tier: 'FREE', icon: Sparkles, borderClass: 'border-[#3a2832]', accentClass: 'text-gray-400', checkClass: 'text-green-400', btnClass: '' },
  { tier: 'BASIC', icon: Crown, borderClass: 'border-love/40', accentClass: 'text-love', checkClass: 'text-love', btnClass: 'bg-love hover:bg-love/90' },
  { tier: 'PRO', icon: Zap, borderClass: 'border-purple-400/50', accentClass: 'text-purple-400', checkClass: 'text-purple-400', btnClass: 'bg-purple-500 hover:bg-purple-500/90', badge: 'recommended' },
  { tier: 'ULTIMATE', icon: Gem, borderClass: 'border-amber-400/50', accentClass: 'text-amber-400', checkClass: 'text-amber-400', btnClass: 'bg-amber-500 hover:bg-amber-500/90' },
];

function getFeatureList(config: PremiumFeatures, isVi: boolean) {
  const fmtNum = (v: number) => v === -1 ? (isVi ? 'Không giới hạn' : 'Unlimited') : String(v);
  return [
    { label: isVi ? 'Tin nhắn/ngày' : 'Messages/day', value: fmtNum(config.maxMessagesPerDay), has: true },
    { label: isVi ? 'Số nhân vật' : 'Characters', value: fmtNum(config.maxCharacters), has: true },
    { label: isVi ? 'Giọng nói' : 'Voice messages', value: null, has: config.voiceMessages },
    { label: isVi ? 'Ảnh & video' : 'Images & videos', value: null, has: config.sendImages && config.sendVideos },
    { label: isVi ? 'Sticker premium' : 'Premium stickers', value: null, has: config.sendStickers },
    { label: isVi ? 'Không quảng cáo' : 'Ad-free', value: null, has: config.adFree },
    { label: isVi ? 'Quà & cảnh premium' : 'Premium gifts & scenes', value: null, has: config.canAccessPremiumGifts },
    { label: isVi ? 'Hỗ trợ ưu tiên' : 'Priority support', value: null, has: config.prioritySupport },
    { label: isVi ? 'Truy cập sớm' : 'Early access', value: null, has: config.earlyAccess },
  ];
}

export default function SubscriptionPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { allTierConfigs, fetchTierConfigs, lastFetchedAt } = usePremiumStore();
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { toast } = useToast();

  const tierNames: Record<PremiumTier, string> = {
    FREE: isVi ? 'Miễn Phí' : 'Free',
    BASIC: 'VIP Basic',
    PRO: 'VIP Pro',
    ULTIMATE: 'VIP Ultimate',
  };

  useEffect(() => {
    fetchPremiumStatus();
    fetchPricing();
  }, []);

  useEffect(() => {
    if (!lastFetchedAt) {
      void fetchTierConfigs();
    }
  }, [fetchTierConfigs, lastFetchedAt]);

  async function fetchPremiumStatus() {
    try {
      const response = await api.get<PremiumStatus>('/users/premium-status');
      if (response.success && response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch premium status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPricing() {
    try {
      const response = await api.get<PricingConfig>('/payment/pricing');
      if (response.success && response.data) {
        setPricingConfig(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    }
  }

  async function handleCheckout(tier: string) {
    setCheckoutLoading(tier);
    try {
      const response = await api.post<{ url: string }>('/payment/create-checkout', { tier, billingCycle });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      toast({ title: isVi ? 'Lỗi thanh toán' : 'Checkout error', description: isVi ? 'Không thể tạo phiên thanh toán. Vui lòng thử lại.' : 'Failed to create checkout session.', variant: 'destructive' });
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleCancelSubscription() {
    if (!confirm(isVi ? 'Bạn chắc chắn muốn hủy gói? Bạn vẫn sử dụng được đến hết kỳ hiện tại.' : 'Are you sure you want to cancel? You can still use it until the end of the current period.')) return;
    setCancelLoading(true);
    try {
      await api.post('/payment/cancel');
      await fetchPremiumStatus();
      toast({ title: isVi ? 'Đã hủy đăng ký' : 'Subscription cancelled', description: isVi ? 'Bạn vẫn sử dụng được đến hết kỳ hiện tại.' : 'You can still use premium until the end of the current period.' });
    } catch (error: any) {
      console.error('Cancel failed:', error);
      const msg = error?.response?.data?.error?.message || error?.message || (isVi ? 'Hủy gói thất bại. Vui lòng thử lại.' : 'Failed to cancel subscription. Please try again.');
      toast({ title: isVi ? 'Hủy thất bại' : 'Cancel failed', description: msg, variant: 'destructive' });
    } finally {
      setCancelLoading(false);
    }
  }

  function formatVND(amount: number) {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  }

  function getPrice(tier: PremiumTier) {
    if (tier === 'FREE') return '0₫';
    const cfg = pricingConfig?.[tier];
    if (!cfg) return '—';
    return formatVND(billingCycle === 'MONTHLY' ? cfg.monthlyPrice : cfg.yearlyPrice);
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">{isVi ? 'Gói Đăng Ký' : 'Subscription Plans'}</h1>
          <p className="text-[#ba9cab]">{isVi ? 'Chọn gói phù hợp với bạn' : 'Choose the plan that fits you'}</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-love" />
          </div>
        ) : (
          <>
            {/* Current Status Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-love" />
                {isVi ? 'Trạng thái hiện tại' : 'Current status'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#251820]/50 rounded-xl p-4">
                  <p className="text-sm text-[#ba9cab] mb-1">{isVi ? 'Gói của bạn' : 'Your plan'}</p>
                  <div className="flex items-center gap-2"><PremiumBadge tier={status?.tier} showFree /></div>
                  {status?.expiresAt && (
                    <p className="text-xs text-[#ba9cab] mt-2">
                      {status.expired
                        ? <span className="text-red-400">{isVi ? 'Đã hết hạn' : 'Expired'}</span>
                        : <>{isVi ? 'Hết hạn' : 'Expires'}: {formatDate(status.expiresAt)} ({status.daysRemaining} {isVi ? 'ngày' : 'days'})</>}
                    </p>
                  )}
                </div>
                <div className="bg-[#251820]/50 rounded-xl p-4">
                  <p className="text-sm text-[#ba9cab] mb-1">{isVi ? 'Tin nhắn hôm nay' : 'Messages today'}</p>
                  {status?.usage.isUnlimitedMessages ? (
                    <p className="text-xl font-bold text-love">{isVi ? 'Không giới hạn' : 'Unlimited'}</p>
                  ) : (
                    <p className="text-xl font-bold">{status?.usage.messagesUsedToday}/{status?.usage.messagesLimit}</p>
                  )}
                </div>
                <div className="bg-[#251820]/50 rounded-xl p-4">
                  <p className="text-sm text-[#ba9cab] mb-1">{isVi ? 'Nhân vật' : 'Characters'}</p>
                  {status?.usage.charactersLimit === -1 ? (
                    <p className="text-xl font-bold text-love">{isVi ? 'Không giới hạn' : 'Unlimited'}</p>
                  ) : (
                    <p className="text-xl font-bold">{status?.usage.charactersUsed}/{status?.usage.charactersLimit}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingCycle === 'MONTHLY' ? 'bg-love text-white' : 'bg-[#251820]/50 text-[#ba9cab] hover:bg-[#2a1d24]'}`}
              >
                {isVi ? 'Hàng tháng' : 'Monthly'}
              </button>
              <button
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingCycle === 'YEARLY' ? 'bg-love text-white' : 'bg-[#251820]/50 text-[#ba9cab] hover:bg-[#2a1d24]'}`}
              >
                {isVi ? 'Hàng năm' : 'Yearly'}
                <span className="ml-1 text-xs text-green-400">(-17%)</span>
              </button>
            </div>

            {/* 4-Tier Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {TIER_CARDS.map(({ tier, icon: Icon, borderClass, accentClass, checkClass, btnClass, badge }, idx) => {
                const features = getFeatureList(allTierConfigs[tier], isVi);
                const isCurrentTier = status?.tier === tier;
                const isActiveSub = isCurrentTier && status?.isVip;

                return (
                  <motion.div
                    key={tier}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className={`glass rounded-2xl p-5 border-2 ${borderClass} relative overflow-hidden flex flex-col ${badge ? 'ring-1 ring-purple-400/30' : ''}`}
                  >
                    {badge && (
                      <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                        {isVi ? 'Khuyên dùng' : 'Recommended'}
                      </div>
                    )}

                    {/* Header */}
                    <div className="text-center mb-4">
                      <div className={`inline-flex items-center gap-2 mb-2 ${accentClass}`}>
                        <Icon className="w-5 h-5" />
                        <h3 className="text-lg font-bold">{tierNames[tier]}</h3>
                      </div>
                      <p className={`text-2xl font-bold ${tier === 'FREE' ? '' : accentClass}`}>
                        {getPrice(tier)}
                      </p>
                      <p className="text-xs text-[#ba9cab]">
                        {tier === 'FREE'
                          ? (isVi ? 'Mãi mãi' : 'Forever')
                          : billingCycle === 'MONTHLY' ? (isVi ? '/tháng' : '/month') : (isVi ? '/năm' : '/year')}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-5 flex-1">
                      {features.map((f) => (
                        <li key={f.label} className="flex items-center gap-2 text-xs">
                          {f.has ? (
                            <Check className={`w-4 h-4 flex-shrink-0 ${checkClass}`} />
                          ) : (
                            <X className="w-4 h-4 flex-shrink-0 text-red-400/60" />
                          )}
                          <span className={f.has ? '' : 'text-[#ba9cab]/60'}>
                            {f.label}{f.value ? `: ${f.value}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    {tier === 'FREE' ? (
                      !status?.isVip ? (
                        <button disabled className="w-full py-2.5 rounded-xl bg-[#3a2832] text-[#ba9cab] text-sm font-medium cursor-not-allowed">
                          {isVi ? 'Gói hiện tại' : 'Current plan'}
                        </button>
                      ) : null
                    ) : isActiveSub ? (
                      <div className="space-y-2">
                        <button disabled className={`w-full py-2.5 rounded-xl ${accentClass} bg-white/5 font-medium cursor-not-allowed flex items-center justify-center gap-2 text-sm`}>
                          <Crown className="w-4 h-4" />
                          {isVi ? 'Đang sử dụng' : 'Active plan'}
                        </button>
                        {status?.cancelAtPeriodEnd ? (
                          <p className="text-center text-xs text-amber-400">
                            {isVi ? 'Sẽ hủy vào' : 'Cancels on'} {status.cancelAt ? formatDate(status.cancelAt) : ''}
                          </p>
                        ) : (
                          <button
                            onClick={handleCancelSubscription}
                            disabled={cancelLoading}
                            className="w-full py-2 rounded-xl text-xs text-[#ba9cab] hover:text-red-400 transition-colors"
                          >
                            {cancelLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (isVi ? 'Hủy gói' : 'Cancel')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCheckout(tier)}
                        disabled={checkoutLoading !== null}
                        className={`w-full py-2.5 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 ${btnClass}`}
                      >
                        {checkoutLoading === tier ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>{isVi ? 'Nâng cấp' : 'Upgrade'}</>
                        )}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
