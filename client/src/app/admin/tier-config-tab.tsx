'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { PremiumTier, PremiumFeatures } from '@/lib/premium';
import { usePremiumStore } from '@/store/premium-store';

interface TierConfigTabProps {
  apiCall: (endpoint: string, options?: RequestInit) => Promise<Response>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

type TierConfigs = Record<PremiumTier, PremiumFeatures>;

const TIERS: PremiumTier[] = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];
const NUMBER_FIELDS: Array<keyof Pick<PremiumFeatures, 'maxCharacters' | 'maxMessagesPerDay'>> = [
  'maxCharacters',
  'maxMessagesPerDay',
];
const BOOLEAN_FIELDS: Array<Exclude<keyof PremiumFeatures, 'maxCharacters' | 'maxMessagesPerDay'>> = [
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
];

const FIELD_LABELS: Record<keyof PremiumFeatures, string> = {
  maxCharacters: 'So nhan vat',
  maxMessagesPerDay: 'Tin nhan moi ngay',
  adFree: 'An quang cao',
  voiceMessages: 'Gui giong noi',
  sendImages: 'Gui anh',
  sendVideos: 'Gui video',
  sendStickers: 'Gui sticker',
  canAccessPremiumScenes: 'Scene premium',
  canAccessPremiumGifts: 'Qua premium',
  canAccessPremiumQuests: 'Nhiem vu premium',
  prioritySupport: 'Ho tro uu tien',
  earlyAccess: 'Truy cap som',
};

function getDefaultTierConfig(): TierConfigs {
  return {
    FREE: {
      maxCharacters: 1,
      maxMessagesPerDay: -1,
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
    },
  };
}

export function TierConfigTab({ apiCall, showToast }: TierConfigTabProps) {
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
        throw new Error(payload?.error || 'Khong the tai cau hinh tier');
      }

      setConfigs(payload.data as TierConfigs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Khong the tai cau hinh tier';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function updateNumberField(tier: PremiumTier, field: keyof Pick<PremiumFeatures, 'maxCharacters' | 'maxMessagesPerDay'>, value: string) {
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
    field: Exclude<keyof PremiumFeatures, 'maxCharacters' | 'maxMessagesPerDay'>,
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
        throw new Error(payload?.error || `Khong the luu tier ${tier}`);
      }

      setConfigs(payload.data as TierConfigs);
      invalidateTierConfigs();
      showToast(`Da luu cau hinh ${tier}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Khong the luu tier ${tier}`;
      showToast(message, 'error');
    } finally {
      setSavingTier(null);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 flex items-center justify-center gap-2 text-gray-300">
        <RefreshCw className="w-5 h-5 animate-spin" />
        Dang tai cau hinh VIP...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Cau hinh VIP</h2>
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
          <div key={tier} className="bg-[#271b21] rounded-2xl p-4 border border-[#392830] text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{tier}</h3>
              <button
                onClick={() => void saveTierConfig(tier)}
                disabled={isSavingAny}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-love/80 hover:bg-love disabled:opacity-50 text-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {savingTier === tier ? 'Dang luu...' : 'Luu'}
              </button>
            </div>

            <div className="space-y-3">
              {NUMBER_FIELDS.map((field) => (
                <div key={field}>
                  <label className="block text-xs text-[#ba9cab] mb-1">{FIELD_LABELS[field]}</label>
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
                  <span className="text-[#f4e7ee]">{FIELD_LABELS[field]}</span>
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
