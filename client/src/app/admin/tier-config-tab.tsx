'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { PremiumTier, PremiumFeatures } from '@/lib/premium';
import { useLanguageStore } from '@/store/language-store';
import { usePremiumStore } from '@/store/premium-store';

interface TierConfigTabProps {
  apiCall: (endpoint: string, options?: RequestInit) => Promise<Response>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

type TierConfigs = Record<PremiumTier, PremiumFeatures>;

const TIERS: PremiumTier[] = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];

type NumberField = 'maxCharacters' | 'maxMessagesPerDay' | 'monthlyCoinBonus' | 'monthlyGemBonus' | 'xpMultiplier' | 'affectionMultiplier' | 'freeTrialDays' | 'maxScenes';
type BooleanField = Exclude<keyof PremiumFeatures, NumberField>;

const NUMBER_FIELDS: NumberField[] = [
  'maxCharacters',
  'maxMessagesPerDay',
  'monthlyCoinBonus',
  'monthlyGemBonus',
  'xpMultiplier',
  'affectionMultiplier',
  'freeTrialDays',
  'maxScenes',
];
const BOOLEAN_FIELDS: BooleanField[] = [
  'adFree',
  'voiceMessages',
  'sendImages',
  'sendVideos',
  'sendStickers',
  'canAccessPremiumScenes',
  'canAccessPremiumGifts',
  'canAccessPremiumQuests',
  'prioritySupport',
  'earlyAccess',
  'exclusiveContent',
  'canCreateExPersonaOnBreakup',
];

const FIELD_LABELS: Record<keyof PremiumFeatures, string> = {
  maxCharacters: 'Số nhân vật',
  maxMessagesPerDay: 'Tin nhắn mỗi ngày',
  monthlyCoinBonus: 'Thưởng xu/tháng',
  monthlyGemBonus: 'Thưởng ngọc/tháng',
  xpMultiplier: 'Nhân XP',
  affectionMultiplier: 'Nhân affection',
  freeTrialDays: 'Dùng thử (ngày)',
  maxScenes: 'Số scene tối đa',
  adFree: 'Ẩn quảng cáo',
  voiceMessages: 'Gửi giọng nói',
  sendImages: 'Gửi ảnh',
  sendVideos: 'Gửi video',
  sendStickers: 'Gửi sticker',
  canAccessPremiumScenes: 'Scene premium',
  canAccessPremiumGifts: 'Quà premium',
  canAccessPremiumQuests: 'Nhiệm vụ premium',
  prioritySupport: 'Hỗ trợ ưu tiên',
  earlyAccess: 'Truy cập sớm',
  exclusiveContent: 'Nội dung độc quyền',
  canCreateExPersonaOnBreakup: 'Tự tạo người cũ sau chia tay',
};

const FIELD_LABELS_EN: Record<keyof PremiumFeatures, string> = {
  maxCharacters: 'Max characters',
  maxMessagesPerDay: 'Messages per day',
  monthlyCoinBonus: 'Monthly coin bonus',
  monthlyGemBonus: 'Monthly gem bonus',
  xpMultiplier: 'XP multiplier',
  affectionMultiplier: 'Affection multiplier',
  freeTrialDays: 'Free trial days',
  maxScenes: 'Max scenes',
  adFree: 'Ad free',
  voiceMessages: 'Voice messages',
  sendImages: 'Send images',
  sendVideos: 'Send videos',
  sendStickers: 'Send stickers',
  canAccessPremiumScenes: 'Premium scenes',
  canAccessPremiumGifts: 'Premium gifts',
  canAccessPremiumQuests: 'Premium quests',
  prioritySupport: 'Priority support',
  earlyAccess: 'Early access',
  exclusiveContent: 'Exclusive content',
  canCreateExPersonaOnBreakup: 'Auto-create ex persona after breakup',
};

function getDefaultTierConfig(): TierConfigs {
  return {
    FREE: {
      maxCharacters: 1,
      maxMessagesPerDay: 20,
      adFree: false,
      voiceMessages: false,
      sendImages: false,
      sendVideos: false,
      sendStickers: false,
      canAccessPremiumScenes: false,
      canAccessPremiumGifts: false,
      canAccessPremiumQuests: false,
      prioritySupport: false,
      earlyAccess: false,
      monthlyCoinBonus: 0,
      monthlyGemBonus: 0,
      xpMultiplier: 1.0,
      affectionMultiplier: 1.0,
      freeTrialDays: 0,
      exclusiveContent: false,
      maxScenes: 3,
      canCreateExPersonaOnBreakup: false,
    },
    BASIC: {
      maxCharacters: 5,
      maxMessagesPerDay: -1,
      adFree: true,
      voiceMessages: true,
      sendImages: true,
      sendVideos: true,
      sendStickers: true,
      canAccessPremiumScenes: true,
      canAccessPremiumGifts: true,
      canAccessPremiumQuests: true,
      prioritySupport: false,
      earlyAccess: false,
      monthlyCoinBonus: 500,
      monthlyGemBonus: 50,
      xpMultiplier: 1.2,
      affectionMultiplier: 1.2,
      freeTrialDays: 7,
      exclusiveContent: false,
      maxScenes: -1,
      canCreateExPersonaOnBreakup: true,
    },
    PRO: {
      maxCharacters: 5,
      maxMessagesPerDay: -1,
      adFree: true,
      voiceMessages: true,
      sendImages: true,
      sendVideos: true,
      sendStickers: true,
      canAccessPremiumScenes: true,
      canAccessPremiumGifts: true,
      canAccessPremiumQuests: true,
      prioritySupport: true,
      earlyAccess: true,
      monthlyCoinBonus: 1500,
      monthlyGemBonus: 150,
      xpMultiplier: 1.5,
      affectionMultiplier: 1.5,
      freeTrialDays: 7,
      exclusiveContent: true,
      maxScenes: -1,
      canCreateExPersonaOnBreakup: true,
    },
    ULTIMATE: {
      maxCharacters: -1,
      maxMessagesPerDay: -1,
      adFree: true,
      voiceMessages: true,
      sendImages: true,
      sendVideos: true,
      sendStickers: true,
      canAccessPremiumScenes: true,
      canAccessPremiumGifts: true,
      canAccessPremiumQuests: true,
      prioritySupport: true,
      earlyAccess: true,
      monthlyCoinBonus: 5000,
      monthlyGemBonus: 500,
      xpMultiplier: 2.0,
      affectionMultiplier: 2.0,
      freeTrialDays: 14,
      exclusiveContent: true,
      maxScenes: -1,
      canCreateExPersonaOnBreakup: true,
    },
  };
}

export function TierConfigTab({ apiCall, showToast }: TierConfigTabProps) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const labels = isVi ? FIELD_LABELS : FIELD_LABELS_EN;

  const { invalidateTierConfigs } = usePremiumStore();
  const [configs, setConfigs] = useState<TierConfigs>(getDefaultTierConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [savingTier, setSavingTier] = useState<PremiumTier | null>(null);

  const isSavingAny = useMemo(() => savingTier !== null, [savingTier]);

  useEffect(() => {
    void fetchTierConfigs();
  }, []);

  async function fetchTierConfigs() {
    setIsLoading(true);
    try {
      const response = await apiCall('/tier-configs');
      const payload = await response.json();

      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error || (isVi ? 'Không thể tải cấu hình gói' : 'Unable to load tier configuration'));
      }

      setConfigs(payload.data as TierConfigs);
    } catch (error) {
      const message = error instanceof Error ? error.message : (isVi ? 'Không thể tải cấu hình gói' : 'Unable to load tier configuration');
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function updateNumberField(tier: PremiumTier, field: NumberField, value: string) {
    const parsed = Number(value);
    setConfigs((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: Number.isNaN(parsed) ? 0 : parsed,
      },
    }));
  }

  function updateBooleanField(
    tier: PremiumTier,
    field: BooleanField,
    checked: boolean,
  ) {
    setConfigs((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: checked,
      },
    }));
  }

  async function saveTierConfig(tier: PremiumTier) {
    setSavingTier(tier);
    try {
      const response = await apiCall(`/tier-configs/${tier}`, {
        method: 'PUT',
        body: JSON.stringify(configs[tier]),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error || (isVi ? `Không thể lưu gói ${tier}` : `Unable to save ${tier} tier`));
      }

      setConfigs(payload.data as TierConfigs);
      invalidateTierConfigs();
      showToast(isVi ? `Đã lưu cấu hình ${tier}` : `${tier} configuration saved`);
    } catch (error) {
      const message = error instanceof Error ? error.message : (isVi ? `Không thể lưu gói ${tier}` : `Unable to save ${tier} tier`);
      showToast(message, 'error');
    } finally {
      setSavingTier(null);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 flex items-center justify-center gap-2 text-gray-300">
        <RefreshCw className="w-5 h-5 animate-spin" />
        {isVi ? 'Đang tải cấu hình VIP...' : 'Loading VIP configuration...'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{isVi ? 'Cấu hình VIP' : 'VIP Configuration'}</h2>
        <button
          onClick={() => void fetchTierConfigs()}
          disabled={isSavingAny}
          className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {TIERS.map((tier) => (
          <div key={tier} className="bg-[#271b21] rounded-2xl p-4 border border-[#392830] text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{tier}</h3>
              <button
                onClick={() => void saveTierConfig(tier)}
                disabled={isSavingAny}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-love/80 hover:bg-love disabled:opacity-50 text-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {savingTier === tier ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu' : 'Save')}
              </button>
            </div>

            <p className="text-[11px] text-[#ba9cab] mb-3">
              {isVi ? '-1 nghĩa là không giới hạn' : '-1 means unlimited'}
            </p>

            <div className="space-y-3">
              {NUMBER_FIELDS.map((field) => (
                <div key={field}>
                  <label className="block text-xs text-[#ba9cab] mb-1">{labels[field]}</label>
                  <input
                    type="number"
                    min={-1}
                    value={configs[tier][field]}
                    onChange={(e) => updateNumberField(tier, field, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1419] border border-[#392830] text-white focus:outline-none focus:border-love"
                  />
                </div>
              ))}

              {BOOLEAN_FIELDS.map((field) => (
                <label key={field} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="text-[#f4e7ee]">{labels[field]}</span>
                  <input
                    type="checkbox"
                    checked={configs[tier][field]}
                    onChange={(e) => updateBooleanField(tier, field, e.target.checked)}
                    className="w-4 h-4 rounded bg-[#1f1419] border-[#392830]"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
