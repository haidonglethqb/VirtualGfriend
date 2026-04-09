# Premium Gating

> Stripe subscriptions, tier-based feature access, and automatic expiry handling.
> Last updated: 2026-04-09 · Reference: `server/src/middlewares/premium.middleware.ts`, `server/src/modules/payment/`

## Premium Tiers

```typescript
enum PremiumTier {
  FREE,       // Basic features only
  BASIC,      // Some premium features
  PRO,        // Most premium features
  ULTIMATE    // All features, unlimited
}
```

Tier hierarchy: `FREE < BASIC < PRO < ULTIMATE` (higher tier includes all lower tier features).

## Pricing (VND)

| Tier | Monthly | Yearly | Savings |
|---|---|---|---|
| BASIC | 99,000₫ | 990,000₫ | ~17% |
| PRO | 199,000₫ | 1,990,000₫ | ~17% |
| ULTIMATE | 299,000₫ | 2,990,000₫ | ~17% |

## Stripe Integration

### Models

**Subscription** (one per user):
```prisma
model Subscription {
  userId                String   @unique
  stripeSubscriptionId  String   @unique
  tier                  PremiumTier
  billingCycle          BillingCycle  // MONTHLY or YEARLY
  status                SubscriptionStatus
  currentPeriodEnd      DateTime
  cancelAtPeriodEnd     Boolean  @default(false)
}
```

**PaymentHistory** (one per payment):
```prisma
model PaymentHistory {
  userId                String
  stripePaymentIntentId String   @unique
  amount                Int          // VND (integer, no decimals)
  currency              String   @default("vnd")
  status                String   // succeeded, failed, refunded
  tier                  PremiumTier
  billingCycle          BillingCycle
}
```

### Payment Routes

```
GET    /api/payment/pricing          → Public pricing info
POST   /api/payment/create-checkout  → Stripe checkout session (auth required)
GET    /api/payment/status           → Current subscription status (auth)
POST   /api/payment/cancel           → Cancel subscription (auth)
POST   /api/payment/webhook          → Stripe webhook events (separate body parser)
```

## Premium Middleware

### `requirePremium` — Any paid tier

```typescript
export function requirePremium(req, res, next) {
  if (user.isPremium || user.premiumTier !== 'FREE') return next();
  return next(new AppError('Premium subscription required', 403, 'PREMIUM_REQUIRED'));
}
```

### `requireTier` — Specific minimum tier

```typescript
export function requireTier(minTier: PremiumTier) {
  // Checks tier hierarchy index, rejects if user tier < required tier
  // Also checks premiumExpiresAt for expired subscriptions
}
```

### `requireFeature` — Dynamic feature config

```typescript
export function requireFeature(feature: keyof TierConfig) {
  const config = await getTierConfig(user.premiumTier);
  if (!config[feature]) return next(new AppError('Feature locked', 403));
}
```

### `attachPremiumInfo` — Auto-attach + expiry check

Auto-downgrades expired premium users to FREE silently during request processing:

```typescript
export async function attachPremiumInfo(req, res, next) {
  const expired = await autoDowngradeIfExpired(userId, user.premiumExpiresAt);
  req.premiumInfo = { tier, isPremium, isVip, features, expiresAt, expired };
}
```

## Feature Gating on Resources

Quests, gifts, scenes, and shop items can require minimum tiers:

```prisma
model Quest {
  requiresPremium Boolean      @default(false)
  minimumTier     PremiumTier  @default(FREE)
}

model Gift {
  requiresPremium Boolean      @default(false)
  minimumTier     PremiumTier  @default(FREE)
}

model Scene {
  requiresPremium Boolean      @default(false)
  minimumTier     PremiumTier  @default(FREE)
}
```

## Related

- [Authentication Overview](./authentication-overview.md) — User premium fields in JWT
- [Rate Limiting](./rate-limiting.md) — Per-user rate limits
- [Payment Models](../database/payment-models.md) — Subscription and PaymentHistory schemas
- [Payment Module](../../../server/src/modules/payment/) — Stripe integration source code
- [User Models](../database/user-models.md) — User.isPremium, premiumTier, premiumExpiresAt
