'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Crown, Zap, Gem, Save, RefreshCw, Sparkles } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Tier = 'BASIC' | 'PRO' | 'ULTIMATE';

interface PricingTier {
  monthlyPrice: number;
  yearlyPrice: number;
  stripeProductId: string;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  displayName: string;
  description: string;
  trialDays: number;
  discountPercent: number;
  stripeTrialPriceId: string;
}

type PricingConfig = Record<Tier, PricingTier>;

const DEFAULT_PRICING: PricingConfig = {
  BASIC: {
    monthlyPrice: 99000,
    yearlyPrice: 990000,
    stripeProductId: '',
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    displayName: 'VIP Basic',
    description: 'Gói cơ bản cho người mới bắt đầu',
    trialDays: 7,
    discountPercent: 0,
    stripeTrialPriceId: '',
  },
  PRO: {
    monthlyPrice: 199000,
    yearlyPrice: 1990000,
    stripeProductId: '',
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    displayName: 'VIP Pro',
    description: 'Gói phổ biến nhất, đầy đủ tính năng',
    trialDays: 7,
    discountPercent: 0,
    stripeTrialPriceId: '',
  },
  ULTIMATE: {
    monthlyPrice: 299000,
    yearlyPrice: 2990000,
    stripeProductId: '',
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    displayName: 'VIP Ultimate',
    description: 'Gói cao cấp nhất, không giới hạn',
    trialDays: 14,
    discountPercent: 0,
    stripeTrialPriceId: '',
  },
};

const TIER_ICONS: Record<Tier, typeof Crown> = {
  BASIC: Crown,
  PRO: Zap,
  ULTIMATE: Gem,
};

const TIER_COLORS: Record<Tier, string> = {
  BASIC: '#f4258c',
  PRO: '#a855f7',
  ULTIMATE: '#f59e0b',
};

export function PricingTab({
  apiCall,
  showToast,
}: {
  apiCall: (endpoint: string, options?: RequestInit, authToken?: string) => Promise<Response>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}) {
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Tier | null>(null);

  const fetchPricing = useCallback(async () => {
    try {
      // stripe-live fetches from Stripe and writes back to DB, returns live prices
      const res = await apiCall('/pricing/stripe-live');
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        const merged = { ...DEFAULT_PRICING };
        for (const tier of ['BASIC', 'PRO', 'ULTIMATE'] as Tier[]) {
          merged[tier] = { ...DEFAULT_PRICING[tier], ...(data[tier] || {}) };
        }
        setPricing(merged);
      }
    } catch {
      // Silently fail, use defaults
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const handleSyncStripe = async (tier: Tier) => {
    if (!pricing) return;
    setSyncing(tier);
    try {
      // Step 1: save config (displayName, description, trialDays, prices) to DB
      const saveRes = await apiCall(`/pricing/${tier}`, {
        method: 'PUT',
        body: JSON.stringify(pricing[tier]),
      });
      if (!saveRes.ok) {
        const saveData = await saveRes.json();
        showToast(saveData.error?.message || 'Lưu thất bại', 'error');
        return;
      }

      // Step 2: sync to Stripe (will reuse existing price if amount unchanged, or archive+create if changed)
      const res = await apiCall(`/pricing/${tier}/sync-stripe`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Đã lưu & sync Stripe thành công cho ${tier}`, 'success');
        // Reload from Stripe to show actual live price IDs
        await fetchPricing();
      } else {
        showToast(data.error?.message || data.message || 'Sync thất bại', 'error');
      }
    } catch {
      showToast('Lưu & sync thất bại', 'error');
    } finally {
      setSyncing(null);
    }
  };

  const formatVND = (value: number) =>
    new Intl.NumberFormat('vi-VN').format(value) + '₫';

  const computeDiscount = (monthly: number, yearly: number) => {
    if (monthly <= 0 || yearly <= 0) return 0;
    const yearlyEquivalent = monthly * 12;
    return Math.round(((yearlyEquivalent - yearly) / yearlyEquivalent) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-love" />
      </div>
    );
  }

  const config = pricing || DEFAULT_PRICING;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bảng giá VIP</h2>
          <p className="text-gray-400 mt-1">Quản lý giá và khuyến mãi cho từng tier</p>
        </div>
        <button
          onClick={fetchPricing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Tải lại</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(['BASIC', 'PRO', 'ULTIMATE'] as Tier[]).map((tier) => {
          const tierConfig = config[tier];
          const Icon = TIER_ICONS[tier];
          const color = TIER_COLORS[tier];
          const discount = computeDiscount(tierConfig.monthlyPrice, tierConfig.yearlyPrice);

          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-700" style={{ borderTop: `3px solid ${color}` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl" style={{ background: `${color}20` }}>
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{tierConfig.displayName}</h3>
                    <p className="text-sm text-gray-400">{tier}</p>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="p-6 space-y-4">
                {/* Display Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Tên hiển thị</label>
                  <input
                    type="text"
                    value={tierConfig.displayName}
                    onChange={(e) =>
                      setPricing((prev) =>
                        prev
                          ? { ...prev, [tier]: { ...prev[tier], displayName: e.target.value } }
                          : prev,
                      )
                    }
                    className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm focus:border-love/50 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Mô tả</label>
                  <textarea
                    value={tierConfig.description}
                    onChange={(e) =>
                      setPricing((prev) =>
                        prev
                          ? { ...prev, [tier]: { ...prev[tier], description: e.target.value } }
                          : prev,
                      )
                    }
                    rows={2}
                    className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm focus:border-love/50 focus:outline-none resize-none"
                  />
                </div>

                {/* Monthly Price */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Giá hàng tháng (VND)</label>
                  <input
                    type="number"
                    value={tierConfig.monthlyPrice}
                    onChange={(e) =>
                      setPricing((prev) =>
                        prev
                          ? { ...prev, [tier]: { ...prev[tier], monthlyPrice: Number(e.target.value) } }
                          : prev,
                      )
                    }
                    min={12000}
                    className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm focus:border-love/50 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formatVND(tierConfig.monthlyPrice)}/tháng</p>
                </div>

                {/* Yearly Price */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Giá hàng năm (VND)</label>
                  <input
                    type="number"
                    value={tierConfig.yearlyPrice}
                    onChange={(e) =>
                      setPricing((prev) =>
                        prev
                          ? { ...prev, [tier]: { ...prev[tier], yearlyPrice: Number(e.target.value) } }
                          : prev,
                      )
                    }
                    min={12000}
                    className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm focus:border-love/50 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formatVND(tierConfig.yearlyPrice)}/năm
                    {discount > 0 && (
                      <span className="ml-2 text-green-400 font-semibold">-{discount}%</span>
                    )}
                  </p>
                </div>

                {/* Trial Days */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Dùng thử miễn phí (ngày)</label>
                  <input
                    type="number"
                    value={tierConfig.trialDays}
                    onChange={(e) =>
                      setPricing((prev) =>
                        prev
                          ? { ...prev, [tier]: { ...prev[tier], trialDays: Number(e.target.value) } }
                          : prev,
                      )
                    }
                    min={0}
                    max={365}
                    className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm focus:border-love/50 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {tierConfig.trialDays > 0 ? `${tierConfig.trialDays} ngày dùng thử` : 'Không có dùng thử'}
                  </p>
                </div>

                {/* Stripe Product ID — read-only, auto-detected by sync */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Stripe Product ID</label>
                  <div className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-xs font-mono text-gray-400 select-all">
                    {tierConfig.stripeProductId || <span className="text-gray-600 italic">Chưa có — sync sẽ tự tạo</span>}
                  </div>
                </div>

                {/* Stripe Price IDs — read-only, auto-filled by Sync */}
                <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-3 space-y-2">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Stripe IDs (auto-sync)</p>
                  {[
                    { label: 'Monthly', value: tierConfig.stripePriceIdMonthly },
                    { label: 'Yearly', value: tierConfig.stripePriceIdYearly },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
                      {value ? (
                        <span className="text-xs font-mono text-emerald-400 truncate">{value}</span>
                      ) : (
                        <span className="text-xs text-gray-600 italic">Chưa sync</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Save & Sync Stripe Button */}
                <button
                  onClick={() => handleSyncStripe(tier)}
                  disabled={syncing === tier}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 text-white bg-emerald-600/80 hover:bg-emerald-600"
                  title="Lưu giá vào DB rồi cập nhật lên Stripe"
                >
                  {syncing === tier ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {syncing === tier ? 'Đang lưu & sync...' : 'Lưu & Sync Stripe'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
