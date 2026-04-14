# VIP / Subscription System

> Stripe-powered premium subscription system with 4 tiers (FREE, BASIC, PRO, ULTIMATE), dynamic feature configuration, and automated billing.
>
> **Last updated:** 2026-04-14
> **Primary files:** `server/src/modules/payment/`, `server/src/modules/admin/tier-config.*`, `server/src/middlewares/premium.middleware.ts`, `client/src/lib/premium.ts`, `client/src/app/subscription/`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Tier Configuration](#3-tier-configuration)
4. [Pricing Configuration](#4-pricing-configuration)
5. [Admin Management](#5-admin-management)
6. [Feature Enforcement](#6-feature-enforcement)
7. [User Flow](#7-user-flow)
8. [Cron Jobs](#8-cron-jobs)
9. [XP / Affection Multipliers](#9-xp--affection-multipliers)
10. [Known Issues & TODOs](#10-known-issues--todos)

---

## 1. Overview

The VIP/Subscription system enables monetization through 4-tier premium access:

| Tier | Icon | Target |
|---|---|---|
| **FREE** | 🆓 | All new users, basic features only |
| **BASIC** | 👑 | Entry-level paid tier |
| **PRO** | ⚡ | Most popular, full feature set |
| **ULTIMATE** | 💎 | Power users, unlimited everything |

**Key capabilities:**
- **Feature gating** — 19 configurable fields per tier control access to messages, characters, media, gifts, quests, scenes, and progression multipliers
- **Stripe integration** — Monthly/yearly billing in VND, free trial support, webhook-driven activation and lifecycle management
- **Dynamic configuration** — Admins can change any tier config field at runtime; changes are cached in Redis (1-hour TTL) and take effect immediately
- **Auto-expiry** — Expired premium users are automatically downgraded to FREE via middleware (on-request) and cron reconciliation (hourly)
- **Monthly bonuses** — VIP users receive configurable coin/gem bonuses on the 1st of each month

---

## 2. Architecture

### 2.1 Data Flow (High Level)

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│   Client     │────▶│   API Gateway    │────▶│  Premium      │
│ (Next.js)    │◀────│  (Express)       │◀────│  Middleware   │
└──────┬───────┘     └────────┬─────────┘     └───────┬───────┘
       │                      │                        │
       │                      ▼                        ▼
       │               ┌──────────────┐          ┌───────────┐
       │               │  Payment     │          │  Redis    │
       │               │  Service     │          │  Cache    │
       │               └──────┬───────┘          └─────┬─────┘
       │                      │                        │
       │         ┌────────────┼────────────┐           │
       │         ▼            ▼            ▼           │
       │   ┌──────────┐ ┌──────────┐ ┌──────────┐     │
       └──▶│  Stripe  │ │ Postgres │ │  System  │◀────┘
           │  API     │ │ (Prisma) │ │  Config  │
           └──────────┘ └──────────┘ └──────────┘
```

### 2.2 Database Models

**User model fields (subscription-related):**

| Field | Type | Default | Purpose |
|---|---|---|---|
| `isPremium` | Boolean | `false` | Quick check for any premium access |
| `premiumTier` | PremiumTier | `FREE` | Current tier level |
| `premiumExpiresAt` | DateTime? | null | When premium access expires |
| `stripeCustomerId` | String? | null | Stripe customer ID |
| `coins` | Int | `0` | Virtual currency (bonus target) |
| `gems` | Int | `0` | Premium virtual currency |

**Subscription model** (`subscriptions` table):

| Field | Type | Purpose |
|---|---|---|
| `userId` | String @unique | One subscription per user |
| `stripeSubscriptionId` | String @unique | Stripe sub ID for webhook matching |
| `stripePriceId` | String | Stripe price ID that was purchased |
| `tier` | PremiumTier | BASIC / PRO / ULTIMATE |
| `billingCycle` | BillingCycle | MONTHLY or YEARLY |
| `status` | SubscriptionStatus | ACTIVE / PAST_DUE / CANCELED / TRIALING |
| `currentPeriodStart` | DateTime | Current billing period start |
| `currentPeriodEnd` | DateTime | Current billing period end |
| `cancelAtPeriodEnd` | Boolean | User initiated cancel, access continues until end |

**PaymentHistory model** (`payment_history` table):

| Field | Type | Purpose |
|---|---|---|
| `userId` | String | User who paid |
| `stripePaymentIntentId` | String @unique | Idempotency key |
| `stripeInvoiceId` | String? | Stripe invoice reference |
| `amount` | Int | Amount in VND (integer) |
| `currency` | String | Default "vnd" |
| `status` | String | succeeded / failed / refunded |
| `tier` | PremiumTier | Tier purchased |
| `billingCycle` | BillingCycle | MONTHLY or YEARLY |

**SystemConfig model** — stores both tier configs and pricing configs as JSON:

| Config Key | Purpose |
|---|---|
| `premium_tier_configs` | All 4 tier feature configs (19 fields each) |
| `stripe_pricing_config` | Pricing for BASIC/PRO/ULTIMATE (monthly, yearly, Stripe IDs) |

**Resource models with premium gating:**

| Model | Fields | Purpose |
|---|---|---|
| `Quest` | `requiresPremium`, `minimumTier` | Gate quests by tier |
| `Gift` | `requiresPremium`, `minimumTier` | Gate gifts by tier |
| `Scene` | `requiresPremium`, `minimumTier` | Gate scenes by tier |

### 2.3 Backend Architecture

```
server/src/
├── modules/
│   ├── payment/
│   │   ├── payment.controller.ts    # Checkout, status, cancel, webhook, pricing
│   │   ├── payment.service.ts       # Stripe integration, webhook handlers
│   │   └── payment.constants.ts     # Default pricing config, PriceId resolver
│   ├── admin/
│   │   ├── tier-config.service.ts   # Tier config CRUD (DB + Redis cache)
│   │   ├── admin-tier-config.controller.ts  # Admin API for tier configs
│   │   ├── admin-pricing.controller.ts      # Admin API for pricing
│   │   └── admin.routes.ts          # /admin/tier-configs, /admin/pricing
│   ├── chat/
│   │   └── chat.service.ts          # Daily message limit enforcement
│   ├── character/
│   │   ├── character.controller.ts  # Character limit enforcement
│   │   └── character.service.ts     # XP/affection multiplier application
│   ├── gift/
│   │   └── gift.service.ts          # Gift tier gating
│   ├── quest/
│   │   └── quest.service.ts         # Quest tier gating
│   └── scene/
│       └── scene.service.ts         # Scene tier gating
├── middlewares/
│   ├── premium.middleware.ts        # requirePremium, requireTier, requireFeature, attachPremiumInfo
│   └── error.middleware.ts          # AppError handling
├── lib/
│   ├── stripe.ts                    # Stripe client initialization
│   ├── prisma.ts                    # Prisma client + type exports
│   ├── redis.ts                     # Redis cache with getOrSet
│   └── constants.ts                 # Legacy tier defaults (fallback)
└── index.ts                         # Cron job setup (reconciliation, bonuses)
```

### 2.4 Frontend Architecture

```
client/src/
├── lib/
│   └── premium.ts                   # Tier types, defaults, utility functions
├── components/
│   └── PremiumGate.tsx              # Conditional rendering gate, badge, feature lock
├── store/
│   └── premium-store.ts             # Zustand store for tier configs (5-min cache)
└── app/
    ├── subscription/
    │   └── page.tsx                 # User-facing subscription page (4-tier grid)
    └── admin/
        ├── tier-config-tab.tsx      # Admin UI for tier feature configs
        ├── pricing-tab.tsx          # Admin UI for pricing
        └── page.tsx                 # Admin panel with tabs
```

---

## 3. Tier Configuration

All 19 configurable fields per tier. Stored in `SystemConfig` under key `premium_tier_configs`, cached in Redis with 1-hour TTL (`CacheTTL.QUESTS`). Falls back to hardcoded defaults on first load.

### 3.1 Default Values

| Field | Type | FREE | BASIC | PRO | ULTIMATE | Description |
|---|---|---|---|---|---|---|
| `maxCharacters` | number | `1` | `5` | `5` | `-1` | Max characters user can create (`-1` = unlimited) |
| `maxMessagesPerDay` | number | `20` | `-1` | `-1` | `-1` | Daily message limit (`-1` = unlimited) |
| `adFree` | boolean | `false` | `true` | `true` | `true` | Hide ads |
| `voiceMessages` | boolean | `false` | `true` | `true` | `true` | Send voice messages |
| `sendImages` | boolean | `false` | `true` | `true` | `true` | Send image messages |
| `sendVideos` | boolean | `false` | `true` | `true` | `true` | Send video messages |
| `sendStickers` | boolean | `false` | `true` | `true` | `true` | Send stickers |
| `canAccessPremiumScenes` | boolean | `false` | `true` | `true` | `true` | Unlock premium scenes |
| `canAccessPremiumGifts` | boolean | `false` | `true` | `true` | `true` | Send premium gifts |
| `canAccessPremiumQuests` | boolean | `false` | `true` | `true` | `true` | Access premium quests |
| `prioritySupport` | boolean | `false` | `false` | `true` | `true` | Priority support access |
| `earlyAccess` | boolean | `false` | `false` | `true` | `true` | Early access to new features |
| `monthlyCoinBonus` | number | `0` | `500` | `1,500` | `5,000` | Bonus coins distributed monthly |
| `monthlyGemBonus` | number | `0` | `50` | `150` | `500` | Bonus gems distributed monthly |
| `xpMultiplier` | number | `1.0` | `1.2` | `1.5` | `2.0` | XP gain multiplier (1.0 = normal) |
| `affectionMultiplier` | number | `1.0` | `1.2` | `1.5` | `2.0` | Affection gain multiplier |
| `freeTrialDays` | number | `0` | `7` | `7` | `14` | Stripe trial days (0 = no trial) |
| `exclusiveContent` | boolean | `false` | `false` | `true` | `true` | Access exclusive content |
| `maxScenes` | number | `3` | `-1` | `-1` | `-1` | Max scenes (`-1` = unlimited) |

### 3.2 Configuration Storage

**Backend source of truth:** `server/src/modules/admin/tier-config.service.ts`

```typescript
// Hardcoded defaults — seeded into DB on first load
export const DEFAULT_TIER_CONFIGS: AllTierConfigs = {
  FREE: { maxCharacters: 1, maxMessagesPerDay: 20, /* ... */ },
  BASIC: { maxCharacters: 5, maxMessagesPerDay: -1, /* ... */ },
  PRO:   { maxCharacters: 5, maxMessagesPerDay: -1, /* ... */ },
  ULTIMATE: { maxCharacters: -1, maxMessagesPerDay: -1, /* ... */ },
};
```

**Frontend fallback:** `client/src/lib/premium.ts`

```typescript
export const PREMIUM_FEATURES: AllTierConfigs = { /* mirrors backend defaults */ };
```

**Cache strategy:**
1. Request → check Redis cache (1-hour TTL)
2. Cache miss → read from `SystemConfig` DB
3. DB miss → seed DB with hardcoded defaults, return defaults
4. On update → write to DB, delete Redis key

### 3.3 Zod Validation Schema

```typescript
// admin-tier-config.controller.ts
const tierConfigPatchSchema = z.object({
  maxCharacters: z.number().int().min(-1).optional(),
  maxMessagesPerDay: z.number().int().min(-1).optional(),
  adFree: z.boolean().optional(),
  voiceMessages: z.boolean().optional(),
  sendImages: z.boolean().optional(),
  sendVideos: z.boolean().optional(),
  sendStickers: z.boolean().optional(),
  canAccessPremiumScenes: z.boolean().optional(),
  canAccessPremiumGifts: z.boolean().optional(),
  canAccessPremiumQuests: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
  earlyAccess: z.boolean().optional(),
  monthlyCoinBonus: z.number().int().min(0).optional(),
  monthlyGemBonus: z.number().int().min(0).optional(),
  xpMultiplier: z.number().min(1.0).max(5.0).optional(),
  affectionMultiplier: z.number().min(1.0).max(5.0).optional(),
  freeTrialDays: z.number().int().min(0).max(365).optional(),
  exclusiveContent: z.boolean().optional(),
  maxScenes: z.number().int().optional(),
}).strict();
```

---

## 4. Pricing Configuration

Managed separately from tier feature configs. Covers pricing amounts, Stripe Price IDs, and trial settings. Only applies to **BASIC**, **PRO**, and **ULTIMATE** tiers (FREE has no pricing).

### 4.1 Default Pricing

| Tier | Monthly (VND) | Yearly (VND) | Discount | Trial Days |
|---|---|---|---|---|
| **BASIC** | 99,000₫ | 990,000₫ | ~17% | 0 (configurable per-tier) |
| **PRO** | 199,000₫ | 1,990,000₫ | ~17% | 0 (configurable per-tier) |
| **ULTIMATE** | 299,000₫ | 2,990,000₫ | ~17% | 0 (configurable per-tier) |

### 4.2 Pricing Config Structure

```typescript
// server/src/modules/payment/payment.constants.ts
interface StripePricingTier {
  monthlyPrice: number;          // VND, min 12,000
  yearlyPrice: number;           // VND, min 12,000
  stripePriceIdMonthly: string;  // Stripe price ID for monthly
  stripePriceIdYearly: string;   // Stripe price ID for yearly
  displayName: string;           // e.g. "VIP Basic"
  description: string;           // e.g. "Mở khóa tính năng premium cơ bản"
  trialDays: number;             // Stripe free trial days
  discountPercent: number;       // Auto-computed yearly discount %
  stripeTrialPriceId: string;    // Stripe trial price ID
}

type StripePricingConfig = Record<Exclude<PremiumTier, 'FREE'>, StripePricingTier>;
```

### 4.3 Discount Computation

Computed client-side and in admin UI:

```typescript
const computeDiscount = (monthly: number, yearly: number) => {
  const yearlyEquivalent = monthly * 12;
  return Math.round(((yearlyEquivalent - yearly) / yearlyEquivalent) * 100);
};
// Example: (99,000 × 12 - 990,000) / (99,000 × 12) × 100 = 17%
```

### 4.4 Stripe Price ID Resolution

```typescript
// Maps a Stripe Price ID back to { tier, billingCycle }
export function resolvePriceId(
  config: StripePricingConfig,
  priceId: string,
): { tier: PremiumTier; billingCycle: 'MONTHLY' | 'YEARLY' } | null {
  for (const [tier, pricing] of Object.entries(config)) {
    if (pricing.stripePriceIdMonthly === priceId)
      return { tier: tier as PremiumTier, billingCycle: 'MONTHLY' };
    if (pricing.stripePriceIdYearly === priceId)
      return { tier: tier as PremiumTier, billingCycle: 'YEARLY' };
  }
  return null;
}
```

Used by webhook handlers to determine which tier a Stripe event belongs to.

### 4.5 Storage

- **Key:** `stripe_pricing_config` in `SystemConfig` table
- **Cache:** `stripe:pricing_config` in Redis (1-hour TTL)
- **Seeding:** Same pattern as tier configs — DB → cache → hardcoded defaults

---

## 5. Admin Management

### 5.1 Admin Panel UI

The admin panel (`/admin`) has two dedicated tabs for VIP management:

**Tier Config Tab** (`client/src/app/admin/tier-config-tab.tsx`):
- Displays all 4 tiers in a 4-column grid
- Each tier card has 8 number inputs (maxCharacters, maxMessagesPerDay, monthlyCoinBonus, monthlyGemBonus, xpMultiplier, affectionMultiplier, freeTrialDays, maxScenes) and 11 boolean checkboxes
- Per-tier "Save" button sends PUT request
- Bilingual labels (Vietnamese / English)
- Refresh button to reload configs from server

**Pricing Tab** (`client/src/app/admin/pricing-tab.tsx`):
- Displays BASIC / PRO / ULTIMATE in a 3-column grid
- Each tier card has inputs for: display name, description, monthly price, yearly price, trial days, Stripe Price IDs (monthly, yearly, trial)
- Auto-computes and displays yearly discount percentage
- Per-tier "Save" button

### 5.2 Admin API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/tier-configs` | Admin JWT | Get all 4 tier configs |
| `PUT` | `/api/admin/tier-configs/:tier` | Admin JWT | Update one tier's config (PATCH-style, merges) |
| `GET` | `/api/admin/pricing` | Admin JWT | Get pricing for BASIC/PRO/ULTIMATE |
| `PUT` | `/api/admin/pricing/:tier` | Admin JWT | Update one tier's pricing (PATCH-style) |

**Example: Update BASIC tier config**

```bash
PUT /api/admin/tier-configs/BASIC
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "maxMessagesPerDay": -1,
  "monthlyCoinBonus": 1000,
  "xpMultiplier": 1.3
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "FREE": { /* ... */ },
    "BASIC": { /* updated config */ },
    "PRO": { /* ... */ },
    "ULTIMATE": { /* ... */ }
  },
  "message": "Tier \"BASIC\" config updated successfully"
}
```

### 5.3 User-Facing Premium API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/payment/pricing` | Public | Public pricing info (no Stripe IDs) |
| `POST` | `/api/payment/create-checkout` | User JWT | Create Stripe checkout session |
| `GET` | `/api/payment/status` | User JWT | Get current subscription status |
| `POST` | `/api/payment/cancel` | User JWT | Cancel subscription (at period end) |
| `POST` | `/api/payment/webhook` | None (Stripe signature) | Stripe webhook events |
| `GET` | `/api/users/premium-status` | User JWT | Full premium status with usage |

---

## 6. Feature Enforcement

### 6.1 Server-Side Enforcement (Security-Critical)

These are enforced on the backend and **cannot be bypassed** by frontend manipulation.

| Feature | Enforcement Point | File | Mechanism |
|---|---|---|---|
| **Daily message limit** | Before sending chat message | `chat.service.ts:checkDailyLimit()` | Reads `maxMessagesPerDay` from tier config via Redis cache, counts messages in Redis per user per day |
| **Character limit** | Before creating character | `character.controller.ts:createCharacter()` | Counts existing characters, compares with `maxCharacters` from `req.premiumInfo.features` |
| **Premium gift access** | Before purchasing/sending gift | `gift.service.ts` | Checks `requiresPremium` and `minimumTier` on gift, compares with user's `canAccessPremiumGifts` |
| **Premium quest access** | Before starting/claiming quest | `quest.service.ts` | Checks `requiresPremium` and `minimumTier` on quest, compares with user's `canAccessPremiumQuests` |
| **Premium scene access** | Before unlocking/accessing scene | `scene.service.ts` | Checks `requiresPremium` and `minimumTier` on scene, compares with user's `canAccessPremiumScenes` |
| **Minimum tier for resource** | On any tier-gated resource | `premium.middleware.ts:requireTier()` | Compares user tier index vs required tier index in hierarchy `['FREE', 'BASIC', 'PRO', 'ULTIMATE']` |
| **Premium expiry** | On every authenticated request | `premium.middleware.ts:attachPremiumInfo()` | Checks `premiumExpiresAt`, auto-downgrades to FREE if expired, invalidates cache |

### 6.2 Frontend-Only Enforcement (UX)

These are enforced on the frontend for UX purposes but **must not be relied upon for security**.

| Feature | Component | File | Mechanism |
|---|---|---|---|
| **Premium gate rendering** | `PremiumGate` | `PremiumGate.tsx` | Blurs locked content, shows upgrade overlay with lock icon |
| **Feature lock badges** | `FeatureLock` | `PremiumGate.tsx` | Shows sparkle icon next to locked features |
| **Tier badge display** | `PremiumBadge` | `PremiumGate.tsx` | Shows current tier icon + name |
| **Subscription page** | `SubscriptionPage` | `subscription/page.tsx` | 4-tier comparison grid with current status, usage stats, checkout buttons |
| **Upsell prompts** | `usePremiumAccess` hook | `PremiumGate.tsx` | Returns `isPremium`, `isVip`, `hasFeatureAccess()` for conditional rendering |

### 6.3 Middleware Stack

```
Request → auth middleware → attachPremiumInfo → route handler
                                    │
                                    ├── req.premiumInfo.tier
                                    ├── req.premiumInfo.isPremium
                                    ├── req.premiumInfo.isVip
                                    ├── req.premiumInfo.features  (full TierConfig)
                                    ├── req.premiumInfo.expiresAt
                                    └── req.premiumInfo.expired
```

**Available middleware functions:**

```typescript
// Any premium tier required
requirePremium(req, res, next)

// Specific minimum tier (e.g., requireTier('PRO'))
requireTier(minTier: PremiumTier)

// Specific feature required (e.g., requireFeature('voiceMessages'))
requireFeature(feature: keyof TierConfig)

// Attach premium info to request (auto-downgrades expired)
attachPremiumInfo(req, res, next)
```

### 6.4 Message Type Restrictions

FREE tier users cannot send:
- Voice messages (`voiceMessages: false`)
- Image messages (`sendImages: false`)
- Video messages (`sendVideos: false`)
- Stickers (`sendStickers: false`)

These are gated by the `requireFeature()` middleware on the relevant message type endpoints.

---

## 7. User Flow

### 7.1 Complete Lifecycle

```
Registration
    │
    ▼
┌──────────────────┐
│   FREE Tier      │  ← Default for all new users
│  1 character     │
│  20 msg/day      │
│  No premium      │
│  features        │
└────────┬─────────┘
         │
         │ User visits /subscription
         │ Selects tier (BASIC/PRO/ULTIMATE)
         │ Selects billing (MONTHLY/YEARLY)
         ▼
┌──────────────────┐
│ Stripe Checkout  │  ← Redirected to Stripe hosted checkout
│   Session        │     Optional: trial period applied
└────────┬─────────┘
         │
         │ Payment completed
         ▼
┌──────────────────┐     ┌──────────────────────┐
│  Stripe Webhook  │────▶│ checkout.session     │
│  (server)        │     │ .completed handler   │
└────────┬─────────┘     └──────────┬───────────┘
         │                          │
         │ 1. Upsert Subscription   │
         │ 2. Update User           │
         │    (isPremium=true)      │
         │ 3. Invalidate Redis      │
         │    cache                 │
         ▼                          ▼
┌──────────────────────────────────────────────────┐
│              TRIAL PERIOD (if configured)        │
│  • User has full premium access                  │
│  • premiumExpiresAt = trial end date             │
│  • No payment yet charged                        │
│  • Can cancel anytime before trial ends          │
└──────────────────────┬───────────────────────────┘
                       │
                       │ Trial ends (or payment made immediately)
                       ▼
┌──────────────────────────────────────────────────┐
│              ACTIVE PAID SUBSCRIPTION            │
│  • Full tier features active                     │
│  • Monthly coin/gem bonus on 1st of month        │
│  • XP and affection multipliers active           │
│  • currentPeriodEnd tracks expiry                │
└──────────────────────┬───────────────────────────┘
                       │
                       │ User clicks "Cancel"
                       ▼
┌──────────────────────────────────────────────────┐
│          CANCEL AT PERIOD END                    │
│  • cancelAtPeriodEnd = true                      │
│  • User still has full access                    │
│  • Subscription auto-expires at currentPeriodEnd │
│  • No refund                                     │
└──────────────────────┬───────────────────────────┘
                       │
                       │ currentPeriodEnd passes
                       ▼
┌──────────────────────────────────────────────────┐
│              EXPIRED → DOWNGRADE TO FREE         │
│  • User.isPremium = false                        │
│  • User.premiumTier = 'FREE'                     │
│  • User.premiumExpiresAt = null                  │
│  • Subscription.status = 'CANCELED'              │
│  • Redis cache invalidated                       │
│  • Downgrade happens via:                        │
│    1. attachPremiumInfo middleware (on request)  │
│    2. Subscription reconciliation cron (hourly)  │
└──────────────────────────────────────────────────┘
```

### 7.2 Stripe Webhook Event Handling

| Stripe Event | Handler | Action |
|---|---|---|
| `checkout.session.completed` | `handleCheckoutCompleted()` | Upsert Subscription, activate user premium, invalidate cache. Includes idempotency check to skip if already ACTIVE. |
| `invoice.paid` | `handleInvoicePaid()` | Update subscription period dates, renew premium, save PaymentHistory record (idempotent via `stripePaymentIntentId`) |
| `invoice.payment_failed` | `handleInvoicePaymentFailed()` | Set subscription status to `PAST_DUE` |
| `customer.subscription.updated` | `handleSubscriptionUpdated()` | Sync tier/billing cycle from Stripe Price ID, update cancel status, map Stripe status to internal status |
| `customer.subscription.deleted` | `handleSubscriptionDeleted()` | Set subscription to `CANCELED`, downgrade user to `FREE` immediately |

### 7.3 Idempotency Guarantees

- **Checkout webhook:** Checks if subscription already exists with `ACTIVE` status before processing
- **Invoice payment history:** Uses `stripePaymentIntentId` as unique key with Prisma `upsert`
- **Subscription upsert:** Uses `userId` as unique key, creates or updates as needed

---

## 8. Cron Jobs

Two cron jobs run via `setInterval` in `server/src/index.ts`:

### 8.1 Subscription Reconciliation (Hourly)

```typescript
const SUBSCRIPTION_RECONCILE_INTERVAL = 60 * 60 * 1000; // 1 hour
```

**What it does:**
1. Finds all subscriptions where `currentPeriodEnd < now` AND `status != 'CANCELED'`
2. For each expired subscription:
   - Sets `User.isPremium = false`, `User.premiumTier = 'FREE'`
   - Sets `Subscription.status = 'CANCELED'`
3. Cleans up orphaned subscriptions (user is already FREE with expired `premiumExpiresAt`)

**Purpose:** Safety net for cases where the Stripe webhook `subscription.deleted` event was missed or failed.

### 8.2 Monthly Bonus Distribution (Daily, fires on 1st of month)

```typescript
const BONUS_DISTRIBUTE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
```

**What it does:**
1. Runs daily at midnight UTC
2. Checks if current date is the 1st of the month (`now.getUTCDate() === 1`)
3. If yes: finds all active premium users (`isPremium = true`, `premiumTier != 'FREE'`, `premiumExpiresAt > now`)
4. For each user, looks up their tier config and increments:
   - `User.coins` by `config.monthlyCoinBonus`
   - `User.gems` by `config.monthlyGemBonus`
5. Logs distribution count

**Note:** This runs daily but only distributes on the 1st. If the server restarts on the 1st, it may distribute twice. This is a known issue (see [TODOs](#10-known-issues--todos)).

### 8.3 Leaderboard Cache Refresh (Every 30 minutes)

```typescript
const LEADERBOARD_REFRESH_INTERVAL = 30 * 60 * 1000;
```

Clears leaderboard cache keys (`leaderboard:*` pattern). Not directly related to VIP but ensures stale tier data doesn't affect rankings.

---

## 9. XP / Affection Multipliers

### 9.1 How Multipliers Work

Multipliers are applied **server-side** during character progression events. They are **not** frontend-only cosmetic values.

### 9.2 Affection Multiplier

**File:** `server/src/modules/character/character.service.ts:changeAffection()`

```typescript
const config = await getTierConfig(tier);
const multiplier = config.affectionMultiplier || 1.0;
const adjustedAmount = Math.round(amount * multiplier);
```

**Effect:** When affection is changed (e.g., +10 from a gift or +5 from a conversation), the amount is multiplied by the user's tier multiplier before being applied.

| Tier | Multiplier | Example: +10 affection becomes |
|---|---|---|
| FREE | 1.0x | +10 |
| BASIC | 1.2x | +12 |
| PRO | 1.5x | +15 |
| ULTIMATE | 2.0x | +20 |

### 9.3 XP Multiplier

**File:** `server/src/modules/character/character.service.ts:addExperience()`

```typescript
const config = await getTierConfig(tier);
const multiplier = config.xpMultiplier || 1.0;
xp = Math.round(xp * multiplier);
```

**Effect:** When XP is awarded (e.g., from chat, quests, daily login), the XP amount is multiplied before being added to the character.

| Tier | Multiplier | Example: +100 XP becomes |
|---|---|---|
| FREE | 1.0x | +100 |
| BASIC | 1.2x | +120 |
| PRO | 1.5x | +150 |
| ULTIMATE | 2.0x | +200 |

### 9.4 Progression Impact

The multipliers create a tangible progression advantage for paid tiers:
- **FREE** users progress at baseline speed
- **BASIC** users progress 20% faster
- **PRO** users progress 50% faster
- **ULTIMATE** users progress 2x faster

Combined with monthly coin/gem bonuses, paid users accumulate resources significantly faster than free users.

---

## 10. Known Issues & TODOs

### 10.1 Implemented but Needs Attention

| Issue | Severity | Description |
|---|---|---|
| **Monthly bonus double-distribution** | Medium | The bonus cron runs daily and checks if it's the 1st. If the server restarts on the 1st of the month, bonuses may be distributed twice. Should use a "last distributed" timestamp in DB or Redis to prevent duplicates. |
| **freeTrialDays not synced** | Low | `freeTrialDays` exists in tier config but the pricing config has its own `trialDays` field. These should be consolidated or documented as serving different purposes (tier config = display/reference, pricing config = actual Stripe trial). |
| **maxScenes not enforced server-side** | Medium | `maxScenes` is defined in tier config but no server-side enforcement found. Only frontend UI may respect this limit. |
| **exclusiveContent not enforced** | Medium | `exclusiveContent: boolean` exists in tier config but no code references it for gating. Purely informational field currently. |

### 10.2 Not Yet Implemented (Planned)

| Feature | Status | Notes |
|---|---|---|
| **Stripe trial price ID** | Planned | `stripeTrialPriceId` field exists in pricing config but is not used in checkout session creation |
| **Ad system integration** | Planned | `adFree: boolean` exists but no ad system is implemented yet |
| **Priority support routing** | Planned | `prioritySupport: boolean` exists but no support ticket system exists |
| **Early access feature flags** | Planned | `earlyAccess: boolean` exists but no feature flag system to gate features by this flag |
| **Video message support** | Partial | `sendVideos: boolean` exists, gated by middleware, but video message type may not have full frontend implementation |
| **Subscription downgrade path** | Not implemented | No ability to downgrade from ULTIMATE → PRO or PRO → BASIC. Users must cancel and re-subscribe |
| **Proration handling** | Not implemented | Stripe proration for mid-cycle upgrades is not handled. Users are charged full amount for new tier |
| **Refund processing** | Not implemented | No automated refund flow. Requires manual Stripe dashboard intervention |
| **Payment method update** | Not implemented | No UI/API for users to update their payment method |
| **Invoice download** | Not implemented | PaymentHistory stores invoice IDs but no download/receipt feature exists |
| **Grace period for failed payments** | Partial | `PAST_DUE` status exists but no grace period logic (immediate downgrade vs N-day grace) |
| **Tax/VAT handling** | Not implemented | Stripe tax calculation not integrated |
| **Promo codes / coupons** | Not implemented | No discount code system |

### 10.3 Architectural Notes

- **Dual source of truth for defaults:** Both `tier-config.service.ts` (backend) and `premium.ts` (frontend) maintain separate default configs. If a new field is added to one but not the other, the frontend will show stale values until cache refreshes. Consider generating frontend defaults from a single source.
- **Redis cache invalidation:** Cache is invalidated on update but not on Stripe webhook events. If Stripe updates a subscription tier, the tier config cache remains valid (acceptable since tier configs are separate from subscription state, but worth noting).
- **No transaction wrapping:** The checkout webhook handler (`handleCheckoutCompleted`) writes to `Subscription` and `User` tables in separate Prisma calls without a transaction. If the second write fails, the user would have a subscription record but not activated premium. Should use `prisma.$transaction()`.

---

## Appendix A: Complete API Reference

### Payment Routes

```
POST   /api/payment/create-checkout    Body: { tier: "BASIC"|"PRO"|"ULTIMATE", billingCycle: "MONTHLY"|"YEARLY" }
GET    /api/payment/status             → { isPremium, premiumTier, premiumExpiresAt, subscription }
POST   /api/payment/cancel             → Cancels at period end
GET    /api/payment/pricing            → Public pricing (no Stripe IDs)
POST   /api/payment/webhook            → Stripe webhook (raw body, signature verified)
```

### Admin Routes

```
GET    /api/admin/tier-configs              → All 4 tier configs
PUT    /api/admin/tier-configs/:tier        → Update tier config (PATCH)
GET    /api/admin/pricing                   → Pricing for BASIC/PRO/ULTIMATE
PUT    /api/admin/pricing/:tier             → Update pricing (PATCH)
```

### User Routes

```
GET    /api/users/premium-status    → Full premium status with usage stats
```

### Config Routes (public-ish)

```
GET    /api/config/tier-plans       → All tier configs (used by frontend store)
```

## Appendix B: Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes (for payments) | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes (for webhooks) | Webhook signature verification |
| `CORS_ORIGIN` | No | Success/cancel URL base (default: `http://localhost:3000`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string for caching |

## Appendix C: Redis Cache Keys

| Key Pattern | Content | TTL |
|---|---|---|
| `premium:tier_configs` | All 4 tier configs (JSON) | 1 hour (`CacheTTL.QUESTS`) |
| `stripe:pricing_config` | Pricing config (JSON) | 1 hour (`CacheTTL.QUESTS`) |
| `daily_msg_count:{userId}:{date}` | Daily message count (number) | 5 minutes (rolling) |
| `auth:user:{userId}` | Auth cache (invalidated on premium changes) | — |
