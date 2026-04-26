'use client';

import { ReactNode, useEffect } from 'react';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { usePremiumStore } from '@/store/premium-store';
import {
  AllTierConfigs,
  PremiumTier,
  PremiumFeatures,
  PremiumBooleanFeature,
  PREMIUM_FEATURES,
  hasTierAccess,
  hasFeatureAccess,
  getMinimumTierForFeature,
  isVipTier,
  TIER_INFO
} from '@/lib/premium';
import { EmojiSvgIcon } from '@/components/ui/emoji-svg-icon';
import Link from 'next/link';

function getTierDisplayName(tier: PremiumTier, isVi: boolean): string {
  const labels = {
    vi: {
      FREE: 'Miễn phí',
      BASIC: 'VIP Cơ bản',
      PRO: 'VIP Pro',
      ULTIMATE: 'VIP Ultimate',
    },
    en: {
      FREE: 'Free',
      BASIC: 'VIP Basic',
      PRO: 'VIP Pro',
      ULTIMATE: 'VIP Ultimate',
    },
  } as const;

  if (isVi) {
    return labels.vi[tier];
  }
  return labels.en[tier];
}

interface PremiumGateProps {
  /** Required tier to access this content */
  requiredTier?: PremiumTier;
  /** Required feature to access this content */
  requiredFeature?: PremiumBooleanFeature;
  /** Content to show if user has access */
  children: ReactNode;
  /** Optional fallback content when locked */
  fallback?: ReactNode;
  /** Show upgrade prompt instead of hiding content */
  showUpgradePrompt?: boolean;
  /** Custom locked message */
  lockedMessage?: string;
}

/**
 * Premium gate component - conditionally renders content based on user's premium tier
 */
export function PremiumGate({
  requiredTier,
  requiredFeature,
  children,
  fallback,
  showUpgradePrompt = true,
  lockedMessage,
}: PremiumGateProps) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { allTierConfigs, fetchTierConfigs, lastFetchedAt } = usePremiumStore();
  const { user } = useAuthStore();
  const userTier = (user?.premiumTier as PremiumTier) || 'FREE';
  const configs: AllTierConfigs = allTierConfigs || PREMIUM_FEATURES;

  useEffect(() => {
    if (!lastFetchedAt) {
      void fetchTierConfigs();
    }
  }, [fetchTierConfigs, lastFetchedAt]);

  // Check access
  let hasAccess = true;
  let targetTier: PremiumTier = 'FREE';

  if (requiredTier) {
    hasAccess = hasTierAccess(userTier, requiredTier);
    targetTier = requiredTier;
  }

  if (requiredFeature && hasAccess) {
    hasAccess = hasFeatureAccess(userTier, requiredFeature, configs);
    targetTier = getMinimumTierForFeature(requiredFeature, configs);
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - show fallback or upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const tierInfo = TIER_INFO[targetTier];
  const tierDisplayName = getTierDisplayName(targetTier, isVi);

  return (
    <div className="relative">
      {/* Blurred/locked content preview */}
      <div className="blur-sm pointer-events-none opacity-50">
        {children}
      </div>
      
      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#181114]/80 backdrop-blur-sm rounded-xl">
        <div className="text-center p-6 max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-love to-purple-600 mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="text-lg font-bold mb-2">
            {lockedMessage || (isVi ? 'Nội dung Premium' : 'Premium Content')}
          </h3>
          
          <p className="text-[#ba9cab] text-sm mb-4">
            {isVi ? 'Nâng cấp lên gói ' : 'Upgrade to '}
            <span className={`inline-flex items-center gap-1 ${tierInfo.color}`}>
              <EmojiSvgIcon emoji={tierInfo.icon} className="w-3.5 h-3.5" />
              {tierDisplayName}
            </span>
            {isVi ? ' để mở khóa' : ' to unlock this feature'}
          </p>
          
          <Link
            href="/subscription"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-love hover:bg-love/90 transition-colors font-medium text-white"
          >
            <Crown className="w-4 h-4" />
            {isVi ? 'Nâng cấp ngay' : 'Upgrade now'}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Premium badge component - shows user's current tier
 */
export function PremiumBadge({ tier, showFree = false }: { tier?: PremiumTier; showFree?: boolean }) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const effectiveTier = tier || 'FREE';
  const info = TIER_INFO[effectiveTier];
  const displayName = getTierDisplayName(effectiveTier, isVi);

  if (effectiveTier === 'FREE' && !showFree) {
    return null;
  }

  const bgColor = effectiveTier === 'FREE' ? 'bg-gray-500/10' : 'bg-love/20';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.color} ${bgColor}`}>
      <EmojiSvgIcon emoji={info.icon} className="w-3.5 h-3.5" />
      <span>{displayName}</span>
    </span>
  );
}

/**
 * Feature lock indicator - shows if a feature is locked
 */
export function FeatureLock({ 
  feature, 
  size = 'sm' 
}: { 
  feature: PremiumBooleanFeature;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { allTierConfigs, fetchTierConfigs, lastFetchedAt } = usePremiumStore();
  const { user } = useAuthStore();
  const userTier = (user?.premiumTier as PremiumTier) || 'FREE';
  const configs: AllTierConfigs = allTierConfigs || PREMIUM_FEATURES;
  const hasAccess = hasFeatureAccess(userTier, feature, configs);

  useEffect(() => {
    if (!lastFetchedAt) {
      void fetchTierConfigs();
    }
  }, [fetchTierConfigs, lastFetchedAt]);

  if (hasAccess) {
    return null;
  }

  const requiredTier = getMinimumTierForFeature(feature, configs);
  const tierInfo = TIER_INFO[requiredTier];
  const requiredTierDisplayName = getTierDisplayName(requiredTier, isVi);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <span
      className={`${tierInfo.color} inline-flex items-center`}
      title={isVi ? `Yêu cầu gói ${requiredTierDisplayName}` : `Requires ${requiredTierDisplayName} plan`}
    >
      <Sparkles className={sizeClasses[size]} />
    </span>
  );
}

/**
 * Hook to check premium access
 */
export function usePremiumAccess() {
  const { allTierConfigs, fetchTierConfigs, lastFetchedAt } = usePremiumStore();
  const { user } = useAuthStore();
  const userTier = (user?.premiumTier as PremiumTier) || 'FREE';
  const configs: AllTierConfigs = allTierConfigs || PREMIUM_FEATURES;

  useEffect(() => {
    if (!lastFetchedAt) {
      void fetchTierConfigs();
    }
  }, [fetchTierConfigs, lastFetchedAt]);

  return {
    tier: userTier,
    isPremium: userTier !== 'FREE',
    isVip: isVipTier(userTier),
    hasTierAccess: (tier: PremiumTier) => hasTierAccess(userTier, tier),
    hasFeatureAccess: (feature: PremiumBooleanFeature) => hasFeatureAccess(userTier, feature, configs),
  };
}
