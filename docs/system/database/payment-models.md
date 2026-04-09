# Payment Models

> Stripe subscriptions, payment history, and billing configuration.
> Last updated: 2026-04-09 · Reference: `server/prisma/schema.prisma`, `server/src/modules/payment/`

## Subscription Model

One subscription per user (unique `userId`):

```prisma
model Subscription {
  id                    String             @id @default(uuid())
  userId                String             @unique
  stripeSubscriptionId  String             @unique
  stripePriceId         String
  tier                  PremiumTier
  billingCycle          BillingCycle
  status                SubscriptionStatus @default(ACTIVE)
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  cancelAtPeriodEnd     Boolean            @default(false)
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([currentPeriodEnd])
}
```

### Key Fields

| Field | Purpose |
|---|---|
| `stripeSubscriptionId` | Stripe subscription ID for webhook matching |
| `stripePriceId` | Stripe price ID (determines tier + billing cycle) |
| `currentPeriodEnd` | When current billing period expires |
| `cancelAtPeriodEnd` | User canceled but access continues until period end |

## PaymentHistory Model

Immutable record of every payment attempt:

```prisma
model PaymentHistory {
  id                    String   @id @default(uuid())
  userId                String
  stripePaymentIntentId String   @unique
  stripeInvoiceId       String?
  amount                Int          // VND (integer, no decimals)
  currency              String   @default("vnd")
  status                String   // succeeded, failed, refunded
  tier                  PremiumTier
  billingCycle          BillingCycle
  description           String?
  createdAt             DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([status])
}
```

## Enums

### PremiumTier

```prisma
enum PremiumTier {
  FREE        // No subscription
  BASIC       // Entry-level premium
  PRO         // Mid-tier premium
  ULTIMATE    // Full access
}
```

### BillingCycle

```prisma
enum BillingCycle {
  MONTHLY
  YEARLY
}
```

### SubscriptionStatus

```prisma
enum SubscriptionStatus {
  ACTIVE      // Active subscription
  PAST_DUE    // Payment failed, grace period
  CANCELED    // User canceled, still active until period end
  INCOMPLETE  // Initial setup not completed
  TRIALING    // Trial period
}
```

## Pricing Configuration

Default pricing in `server/src/modules/payment/payment.constants.ts`:

```typescript
const DEFAULT_PRICING_CONFIG = {
  BASIC:   { monthlyPrice: 99000,  yearlyPrice: 990000 },
  PRO:     { monthlyPrice: 199000, yearlyPrice: 1990000 },
  ULTIMATE:{ monthlyPrice: 299000, yearlyPrice: 2990000 },
};
```

All amounts are in **VND as integers** (no decimal handling needed).

## Webhook Events

The Stripe webhook (`/api/payment/webhook`) handles:

| Event | Action |
|---|---|
| `checkout.session.completed` | Create Subscription + PaymentHistory records |
| `invoice.payment_succeeded` | Update Subscription period dates |
| `invoice.payment_failed` | Set Subscription status to `PAST_DUE` |
| `customer.subscription.updated` | Sync tier, billing cycle, cancel status |
| `customer.subscription.deleted` | Set `cancelAtPeriodEnd`, auto-downgrade on expiry |

## Related

- [Premium Gating](../authentication/premium-gating.md) — Tier-based feature access
- [Schema Overview](./schema-overview.md) — Full ERD
- [Payment Module](../../../server/src/modules/payment/) — Stripe integration source
- [Payment Flow](../data-flows/payment-flow.md) — Checkout and webhook sequences
- [Prisma Schema](../../../server/prisma/schema.prisma) — Full source
