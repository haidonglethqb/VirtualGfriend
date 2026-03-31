import { PremiumTier } from '../../lib/prisma'

export interface StripePricingTier {
  monthlyPrice: number       // VND
  yearlyPrice: number        // VND
  stripePriceIdMonthly: string
  stripePriceIdYearly: string
  displayName: string
  description: string
}

export type StripePricingConfig = Record<Exclude<PremiumTier, 'FREE'>, StripePricingTier>

export const DB_PRICING_KEY = 'stripe_pricing_config'
export const CACHE_PRICING_KEY = 'stripe:pricing_config'

export const DEFAULT_PRICING_CONFIG: StripePricingConfig = {
  BASIC: {
    monthlyPrice: 99000,
    yearlyPrice: 990000,
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    displayName: 'VIP Basic',
    description: 'Mở khóa tính năng premium cơ bản',
  },
  PRO: {
    monthlyPrice: 199000,
    yearlyPrice: 1990000,
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    displayName: 'VIP Pro',
    description: 'Trải nghiệm đầy đủ với AI nâng cao',
  },
  ULTIMATE: {
    monthlyPrice: 299000,
    yearlyPrice: 2990000,
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    displayName: 'VIP Ultimate',
    description: 'Tất cả tính năng không giới hạn',
  },
}

// Map Stripe Price ID → { tier, billingCycle }
export function resolvePriceId(
  config: StripePricingConfig,
  priceId: string,
): { tier: PremiumTier; billingCycle: 'MONTHLY' | 'YEARLY' } | null {
  for (const [tier, pricing] of Object.entries(config)) {
    if (pricing.stripePriceIdMonthly === priceId) {
      return { tier: tier as PremiumTier, billingCycle: 'MONTHLY' }
    }
    if (pricing.stripePriceIdYearly === priceId) {
      return { tier: tier as PremiumTier, billingCycle: 'YEARLY' }
    }
  }
  return null
}
