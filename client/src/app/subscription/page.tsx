'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown, MessageCircle, Users, Image, Sparkles,
  Check, X, Mail, ExternalLink, Loader2, Mic, Paperclip
} from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { PremiumBadge } from '@/components/premium-gate';
import { useLanguageStore } from '@/store/language-store';
import { usePremiumStore } from '@/store/premium-store';
import { type PremiumTier, type PremiumFeatures } from '@/lib/premium';
import api from '@/services/api';

interface PremiumStatus {
  tier: PremiumTier;
  tierDisplay: string;
  isPremium: boolean;
  isVip: boolean;
  expiresAt: string | null;
  daysRemaining: number | null;
  expired: boolean;
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

function formatFeatureValue(value: boolean | number, isVi: boolean): string {
  if (typeof value === 'boolean') {
    return value ? (isVi ? 'Có' : 'Yes') : (isVi ? 'Không' : 'No');
  }
  if (value === -1) {
    return isVi ? 'Không giới hạn' : 'Unlimited';
  }
  return String(value);
}

function getPlanFeatures(isVi: boolean, freeConfig: PremiumFeatures, vipConfig: PremiumFeatures) {
  return [
    {
      key: 'messages',
      label: isVi ? 'Tin nhắn/ngày' : 'Messages/day',
      free: formatFeatureValue(freeConfig.maxMessagesPerDay, isVi),
      vip: formatFeatureValue(vipConfig.maxMessagesPerDay, isVi),
      icon: MessageCircle,
      freeHasX: false,
      vipHasX: false,
    },
    {
      key: 'characters',
      label: isVi ? 'Số nhân vật' : 'Character slots',
      free: formatFeatureValue(freeConfig.maxCharacters, isVi),
      vip: formatFeatureValue(vipConfig.maxCharacters, isVi),
      icon: Users,
      freeHasX: false,
      vipHasX: false,
    },
    {
      key: 'voice',
      label: isVi ? 'Gửi giọng nói' : 'Voice messages',
      free: formatFeatureValue(freeConfig.voiceMessages, isVi),
      vip: formatFeatureValue(vipConfig.voiceMessages, isVi),
      icon: Mic,
      freeHasX: !freeConfig.voiceMessages,
      vipHasX: !vipConfig.voiceMessages,
    },
    {
      key: 'images',
      label: isVi ? 'Gửi ảnh & video' : 'Send images & videos',
      free: formatFeatureValue(freeConfig.sendImages && freeConfig.sendVideos, isVi),
      vip: formatFeatureValue(vipConfig.sendImages && vipConfig.sendVideos, isVi),
      icon: Paperclip,
      freeHasX: !(freeConfig.sendImages && freeConfig.sendVideos),
      vipHasX: !(vipConfig.sendImages && vipConfig.sendVideos),
    },
    {
      key: 'stickers',
      label: isVi ? 'Sticker độc quyền' : 'Premium stickers',
      free: formatFeatureValue(freeConfig.sendStickers, isVi),
      vip: formatFeatureValue(vipConfig.sendStickers, isVi),
      icon: Sparkles,
      freeHasX: !freeConfig.sendStickers,
      vipHasX: !vipConfig.sendStickers,
    },
    {
      key: 'ads',
      label: isVi ? 'Quảng cáo' : 'Ads',
      free: freeConfig.adFree ? (isVi ? 'Ẩn' : 'Hidden') : (isVi ? 'Hiện' : 'Shown'),
      vip: vipConfig.adFree ? (isVi ? 'Ẩn' : 'Hidden') : (isVi ? 'Hiện' : 'Shown'),
      icon: Image,
      freeHasX: !freeConfig.adFree,
      vipHasX: !vipConfig.adFree,
    },
    {
      key: 'gifts',
      label: isVi ? 'Quà tặng Premium' : 'Premium gifts',
      free: formatFeatureValue(freeConfig.canAccessPremiumGifts, isVi),
      vip: formatFeatureValue(vipConfig.canAccessPremiumGifts, isVi),
      icon: Crown,
      freeHasX: !freeConfig.canAccessPremiumGifts,
      vipHasX: !vipConfig.canAccessPremiumGifts,
    },
    {
      key: 'scenes',
      label: isVi ? 'Khung cảnh độc quyền' : 'Premium scenes',
      free: formatFeatureValue(freeConfig.canAccessPremiumScenes, isVi),
      vip: formatFeatureValue(vipConfig.canAccessPremiumScenes, isVi),
      icon: Image,
      freeHasX: !freeConfig.canAccessPremiumScenes,
      vipHasX: !vipConfig.canAccessPremiumScenes,
    },
  ];
}

export default function SubscriptionPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { allTierConfigs, fetchTierConfigs, lastFetchedAt } = usePremiumStore();
  const freeConfig = allTierConfigs.FREE;
  const vipConfig = allTierConfigs.BASIC;
  const planFeatures = getPlanFeatures(isVi, freeConfig, vipConfig);
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPremiumStatus();
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold mb-2">{isVi ? 'Gói Đăng Ký' : 'Subscription Plans'}</h1>
          <p className="text-[#ba9cab]">{isVi ? 'Nâng cấp để mở khóa đầy đủ tính năng' : 'Upgrade to unlock the full experience'}</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-love" />
          </div>
        ) : (
          <>
            {/* Current Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6 mb-8"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-love" />
                {isVi ? 'Trạng thái hiện tại' : 'Current status'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tier Info */}
                <div className="bg-[#251820]/50 rounded-xl p-4">
                  <p className="text-sm text-[#ba9cab] mb-1">{isVi ? 'Gói của bạn' : 'Your plan'}</p>
                  <div className="flex items-center gap-2">
                    <PremiumBadge tier={status?.tier} showFree />
                  </div>
                  {status?.expiresAt && (
                    <p className="text-xs text-[#ba9cab] mt-2">
                      {status.expired ? (
                        <span className="text-red-400">{isVi ? 'Đã hết hạn' : 'Expired'}</span>
                      ) : (
                        <>{isVi ? 'Hết hạn' : 'Expires'}: {formatDate(status.expiresAt)} ({status.daysRemaining} {isVi ? 'ngày' : 'days'})</>
                      )}
                    </p>
                  )}
                  {status?.isVip && !status?.expiresAt && (
                    <p className="text-xs text-green-400 mt-2">{isVi ? 'Vĩnh viễn' : 'Lifetime'}</p>
                  )}
                </div>

                {/* Message Usage */}
                <div className="bg-[#251820]/50 rounded-xl p-4">
                  <p className="text-sm text-[#ba9cab] mb-1">{isVi ? 'Tin nhắn hôm nay' : 'Messages today'}</p>
                  {status?.usage.isUnlimitedMessages ? (
                    <p className="text-xl font-bold text-love">{isVi ? 'Không giới hạn' : 'Unlimited'}</p>
                  ) : (
                    <>
                      <p className="text-xl font-bold">
                        {status?.usage.messagesUsedToday}/{status?.usage.messagesLimit}
                      </p>
                      <div className="mt-2 h-2 bg-[#3a2832] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-love rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ((status?.usage.messagesUsedToday || 0) / (status?.usage.messagesLimit || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-[#ba9cab] mt-1">
                        {isVi ? 'Còn lại' : 'Remaining'}: {status?.usage.messagesRemaining} {isVi ? 'tin' : 'messages'}
                      </p>
                    </>
                  )}
                </div>

                {/* Character Usage */}
                <div className="bg-[#251820]/50 rounded-xl p-4">
                  <p className="text-sm text-[#ba9cab] mb-1">{isVi ? 'Nhân vật' : 'Characters'}</p>
                  {status?.usage.charactersLimit === -1 ? (
                    <p className="text-xl font-bold text-love">{isVi ? 'Không giới hạn' : 'Unlimited'}</p>
                  ) : (
                    <>
                      <p className="text-xl font-bold">
                        {status?.usage.charactersUsed}/{status?.usage.charactersLimit}
                      </p>
                      <p className="text-xs text-[#ba9cab] mt-1">
                        {isVi ? 'Còn lại' : 'Remaining'}: {status?.usage.charactersRemaining} {isVi ? 'slot' : 'slots'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Plan Comparison */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
            >
              {/* FREE Plan */}
              <div className="glass rounded-2xl p-6 border border-[#3a2832]">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{isVi ? 'Miễn Phí' : 'Free'}</h3>
                  <p className="text-3xl font-bold">0đ</p>
                  <p className="text-sm text-[#ba9cab]">{isVi ? 'Mãi mãi' : 'Forever'}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {planFeatures.map((feature) => (
                    <li key={feature.key} className="flex items-center gap-3">
                      {feature.freeHasX ? (
                        <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                      ) : (
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      )}
                      <span className="text-sm">
                        {feature.label}: <span className="text-[#ba9cab]">{feature.free}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                {!status?.isVip && (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-[#3a2832] text-[#ba9cab] font-medium cursor-not-allowed"
                  >
                    {isVi ? 'Gói hiện tại' : 'Current plan'}
                  </button>
                )}
              </div>

              {/* VIP Plan */}
              <div className="glass rounded-2xl p-6 border-2 border-love relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-love text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                  {isVi ? 'Khuyên dùng' : 'Recommended'}
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-love" />
                    VIP Premium
                  </h3>
                  <p className="text-3xl font-bold text-love">99.000đ</p>
                  <p className="text-sm text-[#ba9cab]">{isVi ? '/thang' : '/month'}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {planFeatures.map((feature) => (
                    <li key={feature.key} className="flex items-center gap-3">
                      {feature.vipHasX ? (
                        <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                      ) : (
                        <Check className="w-5 h-5 text-love flex-shrink-0" />
                      )}
                      <span className="text-sm">
                        {feature.label}: <span className="text-love font-medium">{feature.vip}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                {status?.isVip ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-love/20 text-love font-medium cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    {isVi ? 'Đang sử dụng' : 'Active plan'}
                  </button>
                ) : (
                  <a
                    href="#contact"
                    className="w-full py-3 rounded-xl bg-love hover:bg-love/90 text-white font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    {isVi ? 'Liên hệ nâng cấp' : 'Contact for upgrade'}
                  </a>
                )}
              </div>
            </motion.div>

            {/* Contact Section */}
            <motion.div
              id="contact"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-love" />
                {isVi ? 'Liên hệ nâng cấp VIP' : 'Contact for VIP upgrade'}
              </h2>

              <p className="text-[#ba9cab] mb-4">
                {isVi
                  ? 'Để nâng cấp lên VIP Premium, vui lòng liên hệ qua các kênh sau:'
                  : 'To upgrade to VIP Premium, please contact us via these channels:'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="mailto:support@vgfriend.io.vn"
                  className="flex items-center gap-3 p-4 bg-[#251820]/50 rounded-xl hover:bg-[#2a1d24] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-love/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-love" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-[#ba9cab]">support@vgfriend.io.vn</p>
                  </div>
                </a>

                <a
                  href="https://zalo.me/0123456789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-[#251820]/50 rounded-xl hover:bg-[#2a1d24] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">Zalo</p>
                    <p className="text-sm text-[#ba9cab]">0123-456-789</p>
                  </div>
                </a>
              </div>

              <div className="mt-6 p-4 bg-love/10 rounded-xl border border-love/30">
                <p className="text-sm">
                  <strong className="text-love">{isVi ? 'Lưu ý:' : 'Note:'}</strong>{' '}
                  {isVi
                    ? 'Sau khi thanh toán, gửi ảnh chụp màn hình kèm email đăng ký của bạn. Chúng tôi sẽ kích hoạt VIP trong 24 giờ.'
                    : 'After payment, send your receipt screenshot with the registered email. We will activate VIP within 24 hours.'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
