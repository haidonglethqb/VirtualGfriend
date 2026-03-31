import Stripe from 'stripe'
import { prisma, PremiumTier, SubscriptionStatus } from '../../lib/prisma'
import { cache, CacheTTL } from '../../lib/redis'
import { getStripeOrThrow } from '../../lib/stripe'
import { createModuleLogger } from '../../lib/logger'
import {
  StripePricingConfig,
  DEFAULT_PRICING_CONFIG,
  DB_PRICING_KEY,
  CACHE_PRICING_KEY,
  resolvePriceId,
} from './payment.constants'

const log = createModuleLogger('Payment')

// ── Pricing Config (DB + cache) ──

export async function getPricingConfig(): Promise<StripePricingConfig> {
  return cache.getOrSet<StripePricingConfig>(
    CACHE_PRICING_KEY,
    async () => {
      const row = await prisma.systemConfig.findUnique({ where: { key: DB_PRICING_KEY } })
      if (row?.value) {
        return mergeDefaults(row.value as Partial<StripePricingConfig>)
      }
      // Seed defaults
      const serialized = JSON.parse(JSON.stringify(DEFAULT_PRICING_CONFIG))
      await prisma.systemConfig.upsert({
        where: { key: DB_PRICING_KEY },
        update: { value: serialized },
        create: { key: DB_PRICING_KEY, value: serialized },
      })
      return DEFAULT_PRICING_CONFIG
    },
    CacheTTL.QUESTS,
  )
}

export async function updatePricingConfig(
  tier: Exclude<PremiumTier, 'FREE'>,
  patch: Partial<StripePricingConfig[typeof tier]>,
): Promise<StripePricingConfig> {
  const current = await getPricingConfig()
  const updated: StripePricingConfig = {
    ...current,
    [tier]: { ...current[tier], ...patch },
  }
  const serialized = JSON.parse(JSON.stringify(updated))
  await prisma.systemConfig.upsert({
    where: { key: DB_PRICING_KEY },
    update: { value: serialized },
    create: { key: DB_PRICING_KEY, value: serialized },
  })
  await cache.del(CACHE_PRICING_KEY)
  return updated
}

function mergeDefaults(dbConfig: Partial<StripePricingConfig>): StripePricingConfig {
  const tiers: Array<Exclude<PremiumTier, 'FREE'>> = ['BASIC', 'PRO', 'ULTIMATE']
  const result = { ...DEFAULT_PRICING_CONFIG }
  for (const tier of tiers) {
    if (dbConfig[tier]) {
      result[tier] = { ...DEFAULT_PRICING_CONFIG[tier], ...dbConfig[tier] }
    }
  }
  return result
}

// ── Checkout Session ──

export async function createCheckoutSession(
  userId: string,
  email: string,
  tier: Exclude<PremiumTier, 'FREE'>,
  billingCycle: 'MONTHLY' | 'YEARLY',
): Promise<string> {
  const stripe = getStripeOrThrow()
  const pricing = await getPricingConfig()
  const tierPricing = pricing[tier]

  const priceId = billingCycle === 'MONTHLY'
    ? tierPricing.stripePriceIdMonthly
    : tierPricing.stripePriceIdYearly

  if (!priceId) {
    const err = new Error(`Payment not available: Stripe Price ID not configured for ${tier} ${billingCycle}. Please contact support.`) as Error & { statusCode?: number }
    err.statusCode = 503
    throw err
  }

  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomer(userId, email)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/payment/cancel`,
    metadata: { userId, tier, billingCycle },
    subscription_data: {
      metadata: { userId, tier, billingCycle },
    },
  })

  if (!session.url) {
    throw new Error('Failed to create checkout session')
  }

  return session.url
}

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const stripe = getStripeOrThrow()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  })

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}

// ── Subscription Status ──

export async function getSubscriptionStatus(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, premiumTier: true, premiumExpiresAt: true },
  })

  return {
    subscription: sub ? {
      tier: sub.tier,
      billingCycle: sub.billingCycle,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    } : null,
    isPremium: user?.isPremium || false,
    premiumTier: user?.premiumTier || 'FREE',
    premiumExpiresAt: user?.premiumExpiresAt || null,
  }
}

// ── Cancel Subscription ──

export async function cancelSubscription(userId: string): Promise<void> {
  const stripe = getStripeOrThrow()

  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub) {
    throw new Error('No active subscription found')
  }

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  })

  await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: true },
  })

  log.info(`User ${userId} subscription set to cancel at period end`)
}

// ── Helper: get period from subscription items ──

function getSubPeriod(stripeSub: Stripe.Subscription) {
  const item = stripeSub.items.data[0]
  if (item) {
    return {
      start: new Date(item.current_period_start * 1000),
      end: new Date(item.current_period_end * 1000),
    }
  }
  // Fallback: use start_date + 30 days
  return {
    start: new Date(stripeSub.start_date * 1000),
    end: new Date((stripeSub.start_date + 30 * 86400) * 1000),
  }
}

function getSubIdFromInvoice(invoice: Stripe.Invoice): string | null {
  return (invoice.parent?.subscription_details?.subscription as string) || null
}

function getPaymentIntentIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const payment = invoice.payments?.data?.[0]
  if (payment?.payment?.payment_intent) {
    return typeof payment.payment.payment_intent === 'string'
      ? payment.payment.payment_intent
      : payment.payment.payment_intent.id
  }
  return null
}

// ── Webhook Handlers ──

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice)
      break
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break
    default:
      log.info(`Unhandled webhook event: ${event.type}`)
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId || session.mode !== 'subscription') return

  const tier = (session.metadata?.tier || 'BASIC') as PremiumTier
  const billingCycle = (session.metadata?.billingCycle || 'MONTHLY') as 'MONTHLY' | 'YEARLY'
  const stripeSubscriptionId = session.subscription as string

  if (!stripeSubscriptionId) return

  const stripe = getStripeOrThrow()
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const priceId = stripeSub.items.data[0]?.price?.id || ''
  const period = getSubPeriod(stripeSub)

  // Upsert subscription record
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId,
      stripePriceId: priceId,
      tier,
      billingCycle,
      status: 'ACTIVE',
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
    update: {
      stripeSubscriptionId,
      stripePriceId: priceId,
      tier,
      billingCycle,
      status: 'ACTIVE',
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: false,
    },
  })

  // Activate premium on User
  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: true,
      premiumTier: tier,
      premiumExpiresAt: period.end,
    },
  })

  // Invalidate auth cache
  await cache.del(`auth:user:${userId}`)

  log.info(`User ${userId} activated ${tier} ${billingCycle} subscription`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subId = getSubIdFromInvoice(invoice)
  if (!subId) return

  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subId },
  })
  if (!sub) return

  const stripe = getStripeOrThrow()
  const stripeSub = await stripe.subscriptions.retrieve(subId)
  const period = getSubPeriod(stripeSub)

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subId },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  })

  await prisma.user.update({
    where: { id: sub.userId },
    data: {
      isPremium: true,
      premiumTier: sub.tier,
      premiumExpiresAt: period.end,
    },
  })

  // Save payment history (idempotent via unique stripePaymentIntentId)
  const paymentIntentId = getPaymentIntentIdFromInvoice(invoice)
  if (paymentIntentId) {
    await prisma.paymentHistory.upsert({
      where: { stripePaymentIntentId: paymentIntentId },
      create: {
        userId: sub.userId,
        stripePaymentIntentId: paymentIntentId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency || 'vnd',
        status: 'succeeded',
        tier: sub.tier,
        billingCycle: sub.billingCycle,
        description: `${sub.tier} ${sub.billingCycle} subscription payment`,
      },
      update: { status: 'succeeded' },
    })
  }

  await cache.del(`auth:user:${sub.userId}`)
  log.info(`Invoice paid for user ${sub.userId}, subscription renewed`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subId = getSubIdFromInvoice(invoice)
  if (!subId) return

  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subId },
  })
  if (!sub) return

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subId },
    data: { status: 'PAST_DUE' },
  })

  log.warn(`Payment failed for user ${sub.userId}, subscription ${subId}`)
}

async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSub.id },
  })
  if (!sub) return

  const pricing = await getPricingConfig()
  const priceId = stripeSub.items.data[0]?.price?.id || ''
  const resolved = resolvePriceId(pricing, priceId)
  const period = getSubPeriod(stripeSub)

  await prisma.subscription.update({
    where: { stripeSubscriptionId: stripeSub.id },
    data: {
      stripePriceId: priceId,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      status: mapStripeStatus(stripeSub.status),
      ...(resolved ? { tier: resolved.tier, billingCycle: resolved.billingCycle } : {}),
    },
  })

  // Sync user premium status
  if (resolved && stripeSub.status === 'active') {
    await prisma.user.update({
      where: { id: sub.userId },
      data: {
        isPremium: true,
        premiumTier: resolved.tier,
        premiumExpiresAt: period.end,
      },
    })
  }

  await cache.del(`auth:user:${sub.userId}`)
  log.info(`Subscription updated for user ${sub.userId}`)
}

async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSub.id },
  })
  if (!sub) return

  await prisma.subscription.update({
    where: { stripeSubscriptionId: stripeSub.id },
    data: { status: 'CANCELED' },
  })

  await prisma.user.update({
    where: { id: sub.userId },
    data: {
      isPremium: false,
      premiumTier: 'FREE',
      premiumExpiresAt: null,
    },
  })

  await cache.del(`auth:user:${sub.userId}`)
  log.info(`Subscription canceled for user ${sub.userId}, downgraded to FREE`)
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELED,
    incomplete: SubscriptionStatus.INCOMPLETE,
    trialing: SubscriptionStatus.TRIALING,
    incomplete_expired: SubscriptionStatus.CANCELED,
    unpaid: SubscriptionStatus.PAST_DUE,
    paused: SubscriptionStatus.CANCELED,
  }
  return map[status] || SubscriptionStatus.ACTIVE
}
