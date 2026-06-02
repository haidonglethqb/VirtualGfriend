'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Gift, Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';

type ApiCall = (endpoint: string, options?: RequestInit, authToken?: string) => Promise<Response>;
type Tier = 'BASIC' | 'PRO' | 'ULTIMATE';

interface GiftCatalogItem {
  id: string;
  name: string;
  emoji: string;
  category: string;
  rarity: string;
  minimumTier: string;
  requiresPremium: boolean;
  affectionBonus: number;
  isActive: boolean;
}

interface VipPackItem {
  id?: string;
  giftId: string;
  quantity: number;
  isActive: boolean;
  sortOrder: number;
  gift?: GiftCatalogItem;
}

interface VipPackSegment {
  id: string | null;
  segmentTier: Tier;
  displayName: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  items: VipPackItem[];
}

interface VipGiftPackAdminProps {
  apiCall: ApiCall;
  showToast: (message: string, type?: 'success' | 'error') => void;
  language: 'vi' | 'en';
}

const TIERS: Tier[] = ['BASIC', 'PRO', 'ULTIMATE'];

export function VipGiftPackAdmin({ apiCall, showToast, language }: VipGiftPackAdminProps) {
  const isVi = language === 'vi';
  const tr = useCallback((vi: string, en: string) => (isVi ? vi : en), [isVi]);
  const [segments, setSegments] = useState<VipPackSegment[]>([]);
  const [gifts, setGifts] = useState<GiftCatalogItem[]>([]);
  const [giftSearch, setGiftSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [packRes, giftsRes] = await Promise.all([
        apiCall('/vip-gift-pack'),
        apiCall(`/gift-catalog?isActive=true&take=200${giftSearch ? `&search=${encodeURIComponent(giftSearch)}` : ''}`),
      ]);
      if (packRes.ok) {
        const data = await packRes.json();
        setSegments(data.segments || []);
      }
      if (giftsRes.ok) {
        const data = await giftsRes.json();
        setGifts(data.gifts || []);
      }
    } catch {
      showToast(tr('Không tải được cấu hình quà VIP', 'Failed to load VIP gift pack config'), 'error');
    } finally {
      setLoading(false);
    }
  }, [apiCall, giftSearch, showToast, tr]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const giftById = useMemo(() => new Map(gifts.map((gift) => [gift.id, gift])), [gifts]);

  function updateSegment(tier: Tier, patch: Partial<VipPackSegment>) {
    setSegments((current) =>
      current.map((segment) => segment.segmentTier === tier ? { ...segment, ...patch } : segment)
    );
  }

  function addItem(tier: Tier) {
    const firstGift = gifts.find((gift) => !segments.find((segment) => segment.segmentTier === tier)?.items.some((item) => item.giftId === gift.id));
    if (!firstGift) return;
    setSegments((current) =>
      current.map((segment) =>
        segment.segmentTier === tier
          ? {
              ...segment,
              items: [
                ...segment.items,
                {
                  giftId: firstGift.id,
                  quantity: 1,
                  isActive: true,
                  sortOrder: segment.items.length + 1,
                  gift: firstGift,
                },
              ],
            }
          : segment
      )
    );
  }

  function updateItem(tier: Tier, index: number, patch: Partial<VipPackItem>) {
    setSegments((current) =>
      current.map((segment) =>
        segment.segmentTier === tier
          ? {
              ...segment,
              items: segment.items.map((item, itemIndex) =>
                itemIndex === index
                  ? { ...item, ...patch, gift: patch.giftId ? giftById.get(patch.giftId) : item.gift }
                  : item
              ),
            }
          : segment
      )
    );
  }

  function removeItem(tier: Tier, index: number) {
    setSegments((current) =>
      current.map((segment) =>
        segment.segmentTier === tier
          ? { ...segment, items: segment.items.filter((_, itemIndex) => itemIndex !== index) }
          : segment
      )
    );
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await apiCall('/vip-gift-pack', {
        method: 'PUT',
        body: JSON.stringify({
          segments: segments.map((segment) => ({
            segmentTier: segment.segmentTier,
            displayName: segment.displayName,
            description: segment.description,
            isActive: segment.isActive,
            sortOrder: segment.sortOrder,
            items: segment.items.map((item, index) => ({
              giftId: item.giftId,
              quantity: Number(item.quantity) || 1,
              isActive: item.isActive !== false,
              sortOrder: index + 1,
            })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSegments(data.segments || []);
      showToast(tr('Đã lưu cấu hình quà VIP', 'VIP gift pack saved'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : tr('Lưu cấu hình thất bại', 'Failed to save config'), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-700/60 bg-gray-800/40 p-6">
        <div className="flex items-center gap-2 text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr('Đang tải quà tháng VIP...', 'Loading VIP monthly gifts...')}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-700/60 bg-gray-800/40 p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold text-white">
            <Gift className="h-5 w-5 text-amber-300" />
            {tr('Quà tháng VIP', 'VIP monthly gifts')}
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {tr('Chỉnh quà cụ thể cho BASIC, PRO và ULTIMATE. User claim theo segment chưa nhận trong tháng.', 'Configure concrete gifts for BASIC, PRO and ULTIMATE monthly claim segments.')}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={giftSearch}
            onChange={(event) => setGiftSearch(event.target.value)}
            placeholder={tr('Tìm gift...', 'Search gifts...')}
            className="w-48 rounded-lg border border-gray-600 bg-gray-900/60 px-3 py-2 text-sm text-white"
          />
          <button onClick={fetchConfig} className="rounded-lg bg-gray-700/70 p-2 text-gray-200 hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-400 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {tr('Lưu quà VIP', 'Save VIP gifts')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {TIERS.map((tier) => {
          const segment = segments.find((item) => item.segmentTier === tier);
          if (!segment) return null;

          return (
            <div key={tier} className="rounded-xl border border-gray-700/60 bg-gray-900/40 p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-amber-200">{tier}</div>
                  <input
                    value={segment.displayName}
                    onChange={(event) => updateSegment(tier, { displayName: event.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950/50 px-3 py-2 text-sm font-semibold text-white"
                  />
                </div>
                <button
                  onClick={() => updateSegment(tier, { isActive: !segment.isActive })}
                  className={`rounded-lg px-2 py-1 text-xs font-medium ${segment.isActive ? 'bg-green-500/20 text-green-300' : 'bg-gray-700 text-gray-300'}`}
                >
                  {segment.isActive ? tr('Đang bật', 'Active') : tr('Tắt', 'Off')}
                </button>
              </div>

              <textarea
                value={segment.description || ''}
                onChange={(event) => updateSegment(tier, { description: event.target.value })}
                rows={2}
                className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-950/50 px-3 py-2 text-sm text-gray-200"
              />

              <div className="space-y-3">
                {segment.items.map((item, index) => (
                  <div key={`${tier}-${index}`} className="rounded-lg border border-gray-700/60 bg-gray-950/40 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <select
                        value={item.giftId}
                        onChange={(event) => updateItem(tier, index, { giftId: event.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                      >
                        {gifts.map((gift) => (
                          <option key={gift.id} value={gift.id}>
                            {gift.emoji} {gift.name} · {gift.minimumTier}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) => updateItem(tier, index, { quantity: Number(event.target.value) || 1 })}
                        className="w-20 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                      />
                      <button onClick={() => removeItem(tier, index)} className="rounded-lg bg-red-500/15 p-2 text-red-300 hover:bg-red-500/25">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Check className="h-3.5 w-3.5 text-green-300" />
                      {item.gift?.name || giftById.get(item.giftId)?.name || tr('Gift đang chọn', 'Selected gift')}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addItem(tier)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-600 py-2 text-sm text-gray-300 hover:border-amber-300/50 hover:text-amber-200"
              >
                <Plus className="h-4 w-4" />
                {tr('Thêm gift vào segment', 'Add gift to segment')}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
