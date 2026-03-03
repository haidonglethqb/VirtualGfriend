'use client';

import { ReactNode } from 'react';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { 
  PremiumTier, 
  PremiumFeatures,
  hasTierAccess, 
  hasFeatureAccess, 
  getMinimumTierForFeature,
  TIER_INFO 
} from '@/lib/premium';
import Link from 'next/link';

interface PremiumGateProps {
  /** Required tier to access this content */
  requiredTier?: PremiumTier;
  /** Required feature to access this content */
  requiredFeature?: keyof PremiumFeatures;
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
  const { user } = useAuthStore();
  const userTier = (user?.premiumTier as PremiumTier) || 'FREE';

  // Check access
  let hasAccess = true;
  let targetTier: PremiumTier = 'FREE';

  if (requiredTier) {
    hasAccess = hasTierAccess(userTier, requiredTier);
    targetTier = requiredTier;
  }

  if (requiredFeature && hasAccess) {
    hasAccess = hasFeatureAccess(userTier, requiredFeature);
    targetTier = getMinimumTierForFeature(requiredFeature);
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
            {lockedMessage || 'Nội dung Premium'}
          </h3>
          
          <p className="text-[#ba9cab] text-sm mb-4">
            Nâng cấp lên gói <span className={tierInfo.color}>{tierInfo.icon} {tierInfo.name}</span> để mở khóa
          </p>
          
          <Link
            href="/subscription"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-love hover:bg-love/90 transition-colors font-medium text-white"
          >
            <Crown className="w-4 h-4" />
            Nâng cấp ngay
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Premium badge component - shows user's current tier
 */
export function PremiumBadge({ tier }: { tier?: PremiumTier }) {
  const effectiveTier = tier || 'FREE';
  const info = TIER_INFO[effectiveTier];

  if (effectiveTier === 'FREE') {
    return null;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.color} bg-${info.color.split('-')[1]}-500/10`}>
      <span>{info.icon}</span>
      <span>{info.name}</span>
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
  feature: keyof PremiumFeatures; 
  size?: 'sm' | 'md' | 'lg';
}) {
  const { user } = useAuthStore();
  const userTier = (user?.premiumTier as PremiumTier) || 'FREE';
  const hasAccess = hasFeatureAccess(userTier, feature);

  if (hasAccess) {
    return null;
  }

  const requiredTier = getMinimumTierForFeature(feature);
  const tierInfo = TIER_INFO[requiredTier];
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <span className={`${tierInfo.color} inline-flex items-center`} title={`Yêu cầu gói ${tierInfo.name}`}>
      <Sparkles className={sizeClasses[size]} />
    </span>
  );
}

/**
 * Hook to check premium access
 */
export function usePremiumAccess() {
  const { user } = useAuthStore();
  const userTier = (user?.premiumTier as PremiumTier) || 'FREE';

  return {
    tier: userTier,
    isPremium: userTier !== 'FREE',
    hasTierAccess: (tier: PremiumTier) => hasTierAccess(userTier, tier),
    hasFeatureAccess: (feature: keyof PremiumFeatures) => hasFeatureAccess(userTier, feature),
  };
}
