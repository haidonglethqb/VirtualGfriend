'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown, MessageCircle, Users, Image, Sparkles,
  Check, X, Mail, ExternalLink, Loader2, Mic, Paperclip
} from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { PremiumBadge } from '@/components/PremiumGate';
import { isVipTier, PREMIUM_FEATURES, TIER_INFO, type PremiumTier } from '@/lib/premium';
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

// Feature comparison data
const PLAN_FEATURES = [
  { key: 'messages', label: 'Tin nhắn/ngày', free: 'Không giới hạn', vip: 'Không giới hạn', icon: MessageCircle },
  { key: 'characters', label: 'Số nhân vật', free: '1', vip: '5', icon: Users },
  { key: 'voice', label: 'Gửi giọng nói', free: 'Không', vip: 'Có', icon: Mic, freeHasX: true },
  { key: 'images', label: 'Gửi ảnh & video', free: 'Không', vip: 'Có', icon: Paperclip, freeHasX: true },
  { key: 'stickers', label: 'Sticker độc quyền', free: 'Không', vip: 'Có', icon: Sparkles, freeHasX: true },
  { key: 'ads', label: 'Quảng cáo', free: 'Có', vip: 'Không', icon: Image, freeHasX: true },
  { key: 'gifts', label: 'Quà tặng Premium', free: 'Không', vip: 'Đầy đủ', icon: Crown, freeHasX: true },
  { key: 'scenes', label: 'Khung cảnh độc quyền', free: 'Không', vip: 'Đầy đủ', icon: Image, freeHasX: true },
];

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPremiumStatus();
  }, []);

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
    return new Date(dateStr).toLocaleDateString('vi-VN', {
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
          <h1 className="text-2xl font-bold mb-2">Gói Đăng Ký</h1>
          <p className="text-[#ba9cab]">Nâng cấp để trải nghiệm đầy đủ tính năng</p>
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
                Trạng thái hiện tại
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tier Info */}
                <div className="bg-[#251820]/50 rounded-xl p-4">
                  <p className="text-sm text-[#ba9cab] mb-1">Gói của bạn</p>
                  <div className="flex items-center gap-2">
                    <PremiumBadge tier={status?.tier} showFree />
                  </div>
                  {status?.expiresAt && (
                    <p className="text-xs text-[#ba9cab] mt-2">
                      {status.expired ? (
                        <span className="text-red-400">Đã hết hạn</span>
                      ) : (
                        <>Hết hạn: {formatDate(status.expiresAt)} ({status.daysRemaining} ngày)</>
                      )}
                    </p>
                  )}
                  {status?.isVip && !status?.expiresAt && (
                    <p className="text-xs text-green-400 mt-2">Vĩnh viễn</p>
                  )}
                </div>

                {/* Message Usage */}
                <div className="bg-[#251820]/50 rounded-xl p-4">
                  <p className="text-sm text-[#ba9cab] mb-1">Tin nhắn hôm nay</p>
                  {status?.usage.isUnlimitedMessages ? (
                    <p className="text-xl font-bold text-love">Không giới hạn</p>
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
                        Còn lại: {status?.usage.messagesRemaining} tin
                      </p>
                    </>
                  )}
                </div>

                {/* Character Usage */}
                <div className="bg-[#251820]/50 rounded-xl p-4">
                  <p className="text-sm text-[#ba9cab] mb-1">Nhân vật</p>
                  {status?.usage.charactersLimit === -1 ? (
                    <p className="text-xl font-bold text-love">Không giới hạn</p>
                  ) : (
                    <>
                      <p className="text-xl font-bold">
                        {status?.usage.charactersUsed}/{status?.usage.charactersLimit}
                      </p>
                      <p className="text-xs text-[#ba9cab] mt-1">
                        Còn lại: {status?.usage.charactersRemaining} slot
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
                  <h3 className="text-xl font-bold mb-2">Miễn Phí</h3>
                  <p className="text-3xl font-bold">0đ</p>
                  <p className="text-sm text-[#ba9cab]">Mãi mãi</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {PLAN_FEATURES.map((feature) => (
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
                    Gói hiện tại
                  </button>
                )}
              </div>

              {/* VIP Plan */}
              <div className="glass rounded-2xl p-6 border-2 border-love relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-love text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                  Khuyên dùng
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-love" />
                    VIP Premium
                  </h3>
                  <p className="text-3xl font-bold text-love">99.000đ</p>
                  <p className="text-sm text-[#ba9cab]">/tháng</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {PLAN_FEATURES.map((feature) => (
                    <li key={feature.key} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-love flex-shrink-0" />
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
                    Đang sử dụng
                  </button>
                ) : (
                  <a
                    href="#contact"
                    className="w-full py-3 rounded-xl bg-love hover:bg-love/90 text-white font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Liên hệ nâng cấp
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
                Liên hệ nâng cấp VIP
              </h2>

              <p className="text-[#ba9cab] mb-4">
                Để nâng cấp lên VIP Premium, vui lòng liên hệ với chúng tôi qua các kênh sau:
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
                  <strong className="text-love">Lưu ý:</strong> Sau khi thanh toán, gửi ảnh chụp màn hình kèm email đăng ký của bạn.
                  Chúng tôi sẽ kích hoạt VIP trong vòng 24 giờ.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
