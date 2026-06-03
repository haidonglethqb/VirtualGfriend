'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Gift, Loader2, Sparkles, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmojiSvgIcon } from '@/components/ui/emoji-svg-icon';
import { useLanguageStore } from '@/store/language-store';
import { useToast } from '@/hooks/use-toast';
import api, { type VipGiftPackStatus } from '@/services/api';

interface VipGiftPackCardProps {
  compact?: boolean;
  onClaimed?: () => void;
}

function formatCountdown(seconds: number, isVi: boolean) {
  if (seconds <= 0) return isVi ? 'sắp mở lại' : 'reopens soon';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return isVi ? `${days} ngày ${hours} giờ` : `${days}d ${hours}h`;

  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return isVi ? `${hours} giờ ${minutes} phút` : `${hours}h ${minutes}m`;

  return isVi ? `${Math.max(1, minutes)} phút` : `${Math.max(1, minutes)}m`;
}

function segmentLabel(segment: string) {
  return segment === 'ULTIMATE' ? 'Ultimate' : segment === 'PRO' ? 'Pro' : 'Basic';
}

export function VipGiftPackCard({ compact = false, onClaimed }: VipGiftPackCardProps) {
  const { language } = useLanguageStore();
  const { toast } = useToast();
  const isVi = language === 'vi';
  const [status, setStatus] = useState<VipGiftPackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get<VipGiftPackStatus>('/shop/vip-pack/status');
      if (response.success) setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch VIP gift pack:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const claimLabel = useMemo(() => {
    if (!status?.isEligible) return isVi ? 'Nâng cấp VIP' : 'Upgrade VIP';
    if (!status.canClaim) return isVi ? 'Đã nhận hết' : 'Claimed';
    if (status.claimedSegments.length > 0) return isVi ? 'Nhận quà nâng cấp' : 'Claim upgrade gifts';
    return isVi ? 'Nhận quà' : 'Claim';
  }, [isVi, status]);

  async function handleClaim() {
    if (!status?.canClaim) return;

    setClaiming(true);
    try {
      const response = await api.post('/shop/vip-pack/claim');
      if (response.success) {
        toast({
          title: isVi ? 'Đã nhận quà VIP' : 'VIP gifts claimed',
          description: isVi ? 'Quà đã được lưu vào túi đồ của bạn.' : 'Your gifts were saved to your inventory.',
        });
        await fetchStatus();
        onClaimed?.();
      }
    } catch (error) {
      toast({
        title: isVi ? 'Không thể nhận quà' : 'Cannot claim gifts',
        description: error instanceof Error ? error.message : isVi ? 'Vui lòng thử lại.' : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-center gap-3 text-[#ba9cab]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{isVi ? 'Đang tải quà VIP...' : 'Loading VIP gifts...'}</span>
        </div>
      </section>
    );
  }

  if (!status) return null;

  return (
    <section className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Crown className="h-5 w-5 text-amber-300" />
            <h2 className="text-lg font-bold text-white">
              {isVi ? 'Gói quà VIP tháng này' : 'This month VIP gift pack'}
            </h2>
            <span className="rounded-full border border-amber-300/30 px-2 py-0.5 text-xs text-amber-200">
              {status.claimMonth}
            </span>
          </div>
          <p className="text-sm text-[#ba9cab]">
            {status.isEligible
              ? status.canClaim
                ? isVi
                  ? 'Nhận các món quà độc quyền theo tier hiện tại của bạn.'
                  : 'Claim exclusive gifts for your current tier.'
                : isVi
                  ? `Bạn đã nhận đủ quà tháng này. Lần tiếp theo còn ${formatCountdown(status.secondsUntilNextClaim, isVi)}.`
                  : `You claimed this month gifts. Next pack in ${formatCountdown(status.secondsUntilNextClaim, isVi)}.`
              : isVi
                ? 'Nâng cấp VIP để nhận quà độc quyền mỗi tháng.'
                : 'Upgrade VIP to claim exclusive monthly gifts.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          {status.isEligible ? (
            <Button onClick={handleClaim} disabled={!status.canClaim || claiming} className="gap-2">
              {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : status.canClaim ? <Gift className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {claimLabel}
            </Button>
          ) : (
            <Button asChild className="gap-2">
              <Link href="/subscription">
                <Sparkles className="h-4 w-4" />
                {claimLabel}
              </Link>
            </Button>
          )}
          {status.isEligible && (
            <div className="flex items-center justify-center gap-1 text-xs text-[#ba9cab]">
              <Timer className="h-3.5 w-3.5" />
              <span>{formatCountdown(status.secondsUntilNextClaim, isVi)}</span>
            </div>
          )}
        </div>
      </div>

      {status.configWarnings && status.configWarnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-300/25 bg-red-300/10 p-3 text-sm text-red-200">
          {status.configWarnings[0].message}
        </div>
      )}

      <div className={`mt-4 grid gap-3 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {status.packPreview.map((segment) => {
          const packItems = segment.items?.length
            ? segment.items
            : segment.gift
              ? [{ gift: segment.gift, quantity: segment.quantity }]
              : [];

          return (
            <div
              key={segment.segment}
              className={`rounded-xl border p-3 ${
                segment.isClaimable
                  ? 'border-amber-300/35 bg-amber-300/10'
                  : segment.claimedAt
                    ? 'border-green-300/25 bg-green-300/10'
                    : 'border-white/10 bg-white/[0.035]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                  VIP {segmentLabel(segment.segment)}
                </span>
                {segment.claimedAt && <Check className="h-4 w-4 text-green-300" />}
              </div>
              {packItems.length > 0 ? (
                <div className="space-y-2">
                  {packItems.map((item) => (
                    <div key={item.gift.id} className="flex items-center gap-3">
                      <EmojiSvgIcon emoji={item.gift.emoji} className="h-9 w-9 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{item.gift.name}</div>
                        <div className="text-xs text-[#ba9cab]">
                          +{item.gift.affectionBonus} affection · x{item.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-red-300">
                  {isVi ? 'Quà chưa được cấu hình' : 'Gift is not configured'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
