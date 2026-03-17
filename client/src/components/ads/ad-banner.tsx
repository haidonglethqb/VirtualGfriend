'use client';

import Link from 'next/link';
import { Crown, Sparkles } from 'lucide-react';
import { usePremiumAccess } from '@/components/PremiumGate';
import { useLanguageStore } from '@/store/language-store';

interface AdBannerProps {
  /** Placement identifier for tracking */
  placement: 'chat-sidebar' | 'dashboard-bottom' | 'shop-between' | 'quests-bottom';
  /** Banner size variant */
  size?: 'small' | 'medium' | 'large';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Ad Banner placeholder component
 * Shows placeholder ad for FREE users, hidden for VIP users
 * Will be replaced with real ad SDK integration later
 */
export function AdBanner({ placement, size = 'medium', className = '' }: AdBannerProps) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { hasFeatureAccess } = usePremiumAccess();

  // Respect dynamic per-tier feature config from backend
  if (hasFeatureAccess('adFree')) {
    return null;
  }

  const sizeClasses = {
    small: 'py-3 px-4',
    medium: 'py-4 px-5',
    large: 'py-6 px-6',
  };

  return (
    <div
      className={`
        bg-[#251820]/60 border border-dashed border-[#3a2832] rounded-xl
        ${sizeClasses[size]} ${className}
      `}
      data-ad-placement={placement}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#3a2832] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#ba9cab]" />
          </div>
          <div>
            <p className="text-xs text-[#ba9cab]">{isVi ? 'Quang cao' : 'Advertisement'}</p>
            <p className="text-[10px] text-[#ba9cab]/60">{isVi ? 'Noi dung quang cao se hien thi o day' : 'Your ad content appears here'}</p>
          </div>
        </div>

        <Link
          href="/subscription"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-love/20 hover:bg-love/30 text-love text-xs font-medium transition-colors"
        >
          <Crown className="w-3 h-3" />
          <span>{isVi ? 'An QC' : 'Hide ads'}</span>
        </Link>
      </div>
    </div>
  );
}

/**
 * Inline ad placeholder - smaller version for between content
 */
export function InlineAd({ className = '' }: { className?: string }) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { hasFeatureAccess } = usePremiumAccess();

  if (hasFeatureAccess('adFree')) {
    return null;
  }

  return (
    <div className={`text-center py-3 ${className}`}>
      <p className="text-xs text-[#ba9cab]/50">
        {isVi ? 'Quang cao' : 'Ads'} •{' '}
        <Link href="/subscription" className="text-love hover:underline">
          {isVi ? 'Nang cap VIP de an' : 'Upgrade VIP to hide'}
        </Link>
      </p>
    </div>
  );
}
