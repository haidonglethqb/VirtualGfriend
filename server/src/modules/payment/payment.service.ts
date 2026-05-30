import Stripe from 'stripe'
import { prisma, Prisma, PremiumTier, SubscriptionStatus } from '../../lib/prisma'
import { cache, CacheKeys, CacheTTL } from '../../lib/redis'
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
  // Read from DB directly to avoid stale cache overwriting live DB values
  const row = await prisma.systemConfig.findUnique({ where: { key: DB_PRICING_KEY } })
  const current = row?.value
    ? mergeDefaults(row.value as Partial<StripePricingConfig>)
    : DEFAULT_PRICING_CONFIG
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

  let priceId: string | null = billingCycle === 'MONTHLY'
    ? tierPricing.stripePriceIdMonthly
    : tierPricing.stripePriceIdYearly

  if (!priceId) {
    priceId = await recoverMissingPriceId(tier, billingCycle, tierPricing)
  }

  if (!priceId) {
    const err = new Error(`Payment not available: Stripe Price ID not configured for ${tier} ${billingCycle}. Please contact support.`) as Error & { statusCode?: number }
    err.statusCode = 503
    throw err
  }

  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomer(userId, email)

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/payment/cancel`,
    metadata: { userId, tier, billingCycle },
    subscription_data: {
      metadata: { userId, tier, billingCycle },
    },
  }

  // Apply free trial if configured
  if (tierPricing.trialDays && tierPricing.trialDays > 0) {
    sessionParams.subscription_data = {
      ...sessionParams.subscription_data,
      trial_period_days: tierPricing.trialDays,
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  if (!session.url) {
    throw new Error('Failed to create checkout session')
  }

  return session.url
}

async function recoverMissingPriceId(
  tier: Exclude<PremiumTier, 'FREE'>,
  billingCycle: 'MONTHLY' | 'YEARLY',
  tierPricing: StripePricingConfig[Exclude<PremiumTier, 'FREE'>],
): Promise<string | null> {
  if (!tierPricing.stripeProductId) {
    return null
  }

  const stripe = getStripeOrThrow()
  const expectedAmount = billingCycle === 'MONTHLY' ? tierPricing.monthlyPrice : tierPricing.yearlyPrice
  const interval = billingCycle === 'MONTHLY' ? 'month' : 'year'

  try {
    const prices = await stripe.prices.list({
      product: tierPricing.stripeProductId,
      active: true,
      currency: 'vnd',
      type: 'recurring',
      limit: 100,
    })

    const exactMatch = prices.data.find((p) => p.recurring?.interval === interval && p.unit_amount === expectedAmount)
    const intervalMatch = prices.data.find((p) => p.recurring?.interval === interval)
    const resolved = exactMatch ?? intervalMatch

    if (!resolved) {
      return null
    }

    const patch = billingCycle === 'MONTHLY'
      ? { stripePriceIdMonthly: resolved.id }
      : { stripePriceIdYearly: resolved.id }

    await updatePricingConfig(tier, patch)
    log.warn(`Recovered missing Stripe Price ID for ${tier} ${billingCycle}: ${resolved.id}`)

    return resolved.id
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Stripe lookup error'
    log.warn(`Failed to recover Stripe Price ID for ${tier} ${billingCycle}: ${message}`)
    return null
  }
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

async function normalizeSubscriptionState(userId: string, input: {
  user: {
    isPremium: boolean
    premiumTier: PremiumTier
    premiumExpiresAt: Date | null
  } | null
  subscription: {
    tier: PremiumTier
    billingCycle: 'MONTHLY' | 'YEARLY'
    status: SubscriptionStatus
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
  } | null
}) {
  const now = new Date()
  const premiumExpired = !!input.user?.premiumExpiresAt && input.user.premiumExpiresAt <= now
  const subscriptionExpired = !!input.subscription?.currentPeriodEnd && input.subscription.currentPeriodEnd <= now

  if (premiumExpired || subscriptionExpired) {
    const updates = []

    if (input.user && (input.user.isPremium || input.user.premiumTier !== 'FREE')) {
      updates.push(
        prisma.user.update({
          where: { id: userId },
          data: {
            isPremium: false,
            premiumTier: 'FREE',
          },
        })
      )
    }

    if (input.subscription && input.subscription.status !== SubscriptionStatus.CANCELED) {
      updates.push(
        prisma.subscription.update({
          where: { userId },
          data: {
            status: SubscriptionStatus.CANCELED,
            cancelAtPeriodEnd: false,
          },
        })
      )
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates)
      await cache.del(CacheKeys.userAuth(userId), CacheKeys.user(userId))
    }
  }

  return {
    user: input.user
      ? {
          ...input.user,
          isPremium: premiumExpired ? false : input.user.isPremium,
          premiumTier: premiumExpired ? 'FREE' : input.user.premiumTier,
        }
      : null,
    subscription: input.subscription
      ? {
          ...input.subscription,
          status: subscriptionExpired ? SubscriptionStatus.CANCELED : input.subscription.status,
          cancelAtPeriodEnd: subscriptionExpired ? false : input.subscription.cancelAtPeriodEnd,
        }
      : null,
  }
}

export async function getSubscriptionStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      premiumTier: true,
      premiumExpiresAt: true,
      subscription: true,
    },
  })

  const normalized = await normalizeSubscriptionState(userId, {
    user: user ? {
      isPremium: user.isPremium,
      premiumTier: user.premiumTier,
      premiumExpiresAt: user.premiumExpiresAt,
    } : null,
    subscription: user?.subscription ?? null,
  })

  const sub = normalized.subscription
  const normalizedUser = normalized.user

  return {
    subscription: sub ? {
      tier: sub.tier,
      billingCycle: sub.billingCycle,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    } : null,
    isPremium: normalizedUser?.isPremium || false,
    premiumTier: normalizedUser?.premiumTier || 'FREE',
    premiumExpiresAt: normalizedUser?.premiumExpiresAt || null,
  }
}

export async function getCheckoutSessionStatus(userId: string, sessionId: string) {
  const stripe = getStripeOrThrow()
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.mode !== 'subscription') {
    const err = new Error('Invalid checkout session') as Error & { statusCode?: number }
    err.statusCode = 400
    throw err
  }

  if (session.metadata?.userId !== userId) {
    const err = new Error('Checkout session not found') as Error & { statusCode?: number }
    err.statusCode = 404
    throw err
  }

  const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null

  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPremium: true,
        premiumTier: true,
        premiumExpiresAt: true,
      },
    }),
    stripeSubscriptionId
      ? prisma.subscription.findUnique({
          where: { stripeSubscriptionId },
          select: {
            tier: true,
            billingCycle: true,
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        })
      : Promise.resolve(null),
  ])

  const normalized = await normalizeSubscriptionState(userId, {
    user: user ? {
      isPremium: user.isPremium,
      premiumTier: user.premiumTier,
      premiumExpiresAt: user.premiumExpiresAt,
    } : null,
    subscription: subscription ? {
      ...subscription,
    } : null,
  })

  const effectiveUser = normalized.user
  const effectiveSubscription = normalized.subscription
  const checkoutCompleted = session.status === 'complete'
  const paymentCaptured = session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
  const premiumActivated = !!effectiveSubscription && effectiveSubscription.status === 'ACTIVE' && !!effectiveUser?.isPremium

  return {
    sessionId: session.id,
    checkoutCompleted,
    paymentStatus: session.payment_status,
    sessionStatus: session.status,
    premiumActivated,
    premiumTier: effectiveUser?.premiumTier || 'FREE',
    premiumExpiresAt: effectiveUser?.premiumExpiresAt || null,
    cancelAtPeriodEnd: effectiveSubscription?.cancelAtPeriodEnd || false,
    currentPeriodEnd: effectiveSubscription?.currentPeriodEnd || null,
    subscription: effectiveSubscription
      ? {
          tier: effectiveSubscription.tier,
          status: effectiveSubscription.status,
          currentPeriodEnd: effectiveSubscription.currentPeriodEnd,
          cancelAtPeriodEnd: effectiveSubscription.cancelAtPeriodEnd,
        }
      : null,
    isReady: checkoutCompleted && paymentCaptured && premiumActivated,
  }
}

// ── Cancel Subscription ──

export async function cancelSubscription(userId: string): Promise<void> {
  const stripe = getStripeOrThrow()
  const now = new Date()

  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (sub && sub.currentPeriodEnd <= now && sub.status !== 'CANCELED') {
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: false,
      },
    })
  }

  if (!sub || sub.status === 'CANCELED' || sub.currentPeriodEnd <= now) {
    const err = new Error('No active subscription found') as Error & { statusCode?: number }
    err.statusCode = 404
    throw err
  }

  if (sub.cancelAtPeriodEnd) {
    const err = new Error('Subscription is already set to cancel at period end') as Error & { statusCode?: number }
    err.statusCode = 409
    throw err
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

interface StripeEventOrderState {
  lastProcessedAt: number
  eventIds: string[]
  lastPriority: number
}

const STRIPE_EVENT_PRIORITY: Record<string, number> = {
  'checkout.session.completed': 10,
  'invoice.payment_failed': 20,
  'invoice.paid': 30,
  'customer.subscription.updated': 40,
  'customer.subscription.deleted': 50,
}

function getStripeEventPriority(eventType: string): number {
  return STRIPE_EVENT_PRIORITY[eventType] ?? 0
}

function getStripeEventOrderKey(subscriptionId: string): string {
  return `stripe:webhook:last_event_created:${subscriptionId}`
}

function getCheckoutUserOrderKey(userId: string): string {
  return `stripe:webhook:last_checkout_event:${userId}`
}

function parseEventOrderState(raw: unknown): StripeEventOrderState | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { lastProcessedAt: raw, eventIds: [], lastPriority: 0 }
  }

  if (typeof raw === 'object' && raw !== null && 'lastProcessedAt' in raw) {
    const candidate = raw as { lastProcessedAt?: unknown; eventIds?: unknown; lastPriority?: unknown }
    const parsedAt = Number(candidate.lastProcessedAt)
    const parsedIds = Array.isArray(candidate.eventIds)
      ? candidate.eventIds.filter((id): id is string => typeof id === 'string')
      : []
    const parsedPriority = Number(candidate.lastPriority)

    if (Number.isFinite(parsedAt)) {
      return {
        lastProcessedAt: parsedAt,
        eventIds: parsedIds,
        lastPriority: Number.isFinite(parsedPriority) ? parsedPriority : 0,
      }
    }
  }

  const fallback = Number(raw)
  if (Number.isFinite(fallback)) {
    return { lastProcessedAt: fallback, eventIds: [], lastPriority: 0 }
  }

  return null
}

async function isStaleStripeEvent(
  tx: Prisma.TransactionClient,
  orderKey: string,
  eventCreatedAt: Date,
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const row = await tx.systemConfig.findUnique({
    where: { key: orderKey },
    select: { value: true },
  })

  if (!row?.value) {
    return false
  }

  const state = parseEventOrderState(row.value)
  if (!state) {
    return false
  }

  const createdAtMs = eventCreatedAt.getTime()
  if (createdAtMs < state.lastProcessedAt) {
    return true
  }

  if (createdAtMs !== state.lastProcessedAt) {
    return false
  }

  if (state.eventIds.includes(eventId)) {
    return true
  }

  const incomingPriority = getStripeEventPriority(eventType)
  if (incomingPriority < state.lastPriority) {
    return true
  }

  if (incomingPriority > state.lastPriority) {
    return false
  }

  // Same-second, same-priority but different event IDs are allowed (non-duplicate).
  return false
}

async function markStripeEventProcessed(
  tx: Prisma.TransactionClient,
  orderKey: string,
  eventCreatedAt: Date,
  eventId: string,
  eventType: string,
): Promise<void> {
  const existingRow = await tx.systemConfig.findUnique({
    where: { key: orderKey },
    select: { value: true },
  })
  const existingState = existingRow ? parseEventOrderState(existingRow.value) : null
  const createdAtMs = eventCreatedAt.getTime()
  const incomingPriority = getStripeEventPriority(eventType)

  let nextState: StripeEventOrderState
  if (!existingState || createdAtMs > existingState.lastProcessedAt) {
    nextState = {
      lastProcessedAt: createdAtMs,
      eventIds: [eventId],
      lastPriority: incomingPriority,
    }
  } else if (createdAtMs === existingState.lastProcessedAt) {
    nextState = {
      lastProcessedAt: existingState.lastProcessedAt,
      eventIds: Array.from(new Set([...existingState.eventIds, eventId])).slice(-32),
      lastPriority: Math.max(existingState.lastPriority, incomingPriority),
    }
  } else {
    nextState = existingState
  }

  const serializedState = JSON.parse(JSON.stringify(nextState)) as Prisma.InputJsonValue

  await tx.systemConfig.upsert({
    where: { key: orderKey },
    create: { key: orderKey, value: serializedState },
    update: { value: serializedState },
  })
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const eventCreatedAt = new Date(event.created * 1000)
  const eventId = event.id

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, eventCreatedAt, eventId)
      break
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice, eventCreatedAt, eventId)
      break
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, eventCreatedAt, eventId)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, eventCreatedAt, eventId)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, eventCreatedAt, eventId)
      break
    default:
      log.info(`Unhandled webhook event: ${event.type}`)
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventCreatedAt: Date, eventId: string) {
  const userId = session.metadata?.userId
  if (!userId || session.mode !== 'subscription') return

  const stripeSubscriptionId = session.subscription as string

  if (!stripeSubscriptionId) return

  const stripe = getStripeOrThrow()
  const pricing = await getPricingConfig()
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const priceId = stripeSub.items.data[0]?.price?.id || ''
  const resolved = resolvePriceId(pricing, priceId)
  const period = getSubPeriod(stripeSub)

  const tier = (resolved?.tier || session.metadata?.tier || 'BASIC') as PremiumTier
  const billingCycle = (resolved?.billingCycle || session.metadata?.billingCycle || 'MONTHLY') as 'MONTHLY' | 'YEARLY'
  const subOrderKey = getStripeEventOrderKey(stripeSubscriptionId)
  const userCheckoutOrderKey = getCheckoutUserOrderKey(userId)

  const checkoutApplied = await prisma.$transaction(async (tx) => {
    // Serialize all webhook writes for this Stripe subscription ID.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stripe_subscription_id:${stripeSubscriptionId}`}))`;
    // Also serialize cross-subscription checkouts for the same user (upsert target is userId-unique).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stripe_subscription_user:${userId}`}))`;

    if (await isStaleStripeEvent(tx, subOrderKey, eventCreatedAt, eventId, 'checkout.session.completed')) {
      log.warn(`Ignoring stale checkout.session.completed for subscription ${stripeSubscriptionId}`)
      return false
    }

    if (await isStaleStripeEvent(tx, userCheckoutOrderKey, eventCreatedAt, eventId, 'checkout.session.completed')) {
      log.warn(`Ignoring stale checkout.session.completed for user ${userId}`)
      return false
    }

    // Guard against stale/out-of-order checkout events overriding newer subscription state.
    const existingSub = await tx.subscription.findUnique({
      where: { userId },
      select: {
        stripeSubscriptionId: true,
      },
    })

    if (existingSub && existingSub.stripeSubscriptionId === stripeSubscriptionId) {
      log.info(`Ignoring duplicate checkout completion for user ${userId} and subscription ${stripeSubscriptionId}`)
      await markStripeEventProcessed(tx, subOrderKey, eventCreatedAt, eventId, 'checkout.session.completed')
      await markStripeEventProcessed(tx, userCheckoutOrderKey, eventCreatedAt, eventId, 'checkout.session.completed')
      return false
    }

    // Upsert subscription record
    await tx.subscription.upsert({
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
    await tx.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        premiumTier: tier,
        premiumExpiresAt: period.end,
      },
    })

    await markStripeEventProcessed(tx, subOrderKey, eventCreatedAt, eventId, 'checkout.session.completed')
    await markStripeEventProcessed(tx, userCheckoutOrderKey, eventCreatedAt, eventId, 'checkout.session.completed')
    return true
  })

  if (!checkoutApplied) return

  // Invalidate auth cache
  await cache.del(CacheKeys.userAuth(userId))

  log.info(`User ${userId} activated ${tier} ${billingCycle} subscription`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice, eventCreatedAt: Date, eventId: string) {
  const subId = getSubIdFromInvoice(invoice)
  if (!subId) return

  const stripe = getStripeOrThrow()
  const stripeSub = await stripe.subscriptions.retrieve(subId)
  const period = getSubPeriod(stripeSub)
  const paymentIntentId = getPaymentIntentIdFromInvoice(invoice)

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stripe_subscription_id:${subId}`}))`;

    const orderKey = getStripeEventOrderKey(subId)

    if (await isStaleStripeEvent(tx, orderKey, eventCreatedAt, eventId, 'invoice.paid')) {
      log.warn(`Ignoring stale invoice.paid for subscription ${subId}`)
      return { userId: null, skipped: true }
    }

    const sub = await tx.subscription.findUnique({
      where: { stripeSubscriptionId: subId },
      select: { userId: true, tier: true, billingCycle: true },
    })

    if (!sub) {
      return null
    }

    await tx.subscription.update({
      where: { stripeSubscriptionId: subId },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      },
    })

    await tx.user.update({
      where: { id: sub.userId },
      data: {
        isPremium: true,
        premiumTier: sub.tier,
        premiumExpiresAt: period.end,
      },
    })

    // Save payment history (idempotent via unique stripePaymentIntentId)
    if (paymentIntentId) {
      await tx.paymentHistory.upsert({
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

    await markStripeEventProcessed(tx, orderKey, eventCreatedAt, eventId, 'invoice.paid')

    return { userId: sub.userId, skipped: false }
  })

  if (!result) return
  if (!result.userId) return
  await cache.del(CacheKeys.userAuth(result.userId))
  if (!result.skipped) {
    log.info(`Invoice paid for user ${result.userId}, subscription renewed`)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, eventCreatedAt: Date, eventId: string) {
  const subId = getSubIdFromInvoice(invoice)
  if (!subId) return

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stripe_subscription_id:${subId}`}))`;

    const orderKey = getStripeEventOrderKey(subId)

    if (await isStaleStripeEvent(tx, orderKey, eventCreatedAt, eventId, 'invoice.payment_failed')) {
      log.warn(`Ignoring stale invoice.payment_failed for subscription ${subId}`)
      return { userId: null, skipped: true }
    }

    const sub = await tx.subscription.findUnique({
      where: { stripeSubscriptionId: subId },
      select: { userId: true },
    })

    if (!sub) {
      return null
    }

    await tx.subscription.update({
      where: { stripeSubscriptionId: subId },
      data: { status: 'PAST_DUE' },
    })

    await markStripeEventProcessed(tx, orderKey, eventCreatedAt, eventId, 'invoice.payment_failed')

    return { userId: sub.userId, skipped: false }
  })

  if (!result) return
  if (!result.userId) return

  await cache.del(CacheKeys.userAuth(result.userId))

  if (!result.skipped) {
    log.warn(`Payment failed for user ${result.userId}, subscription ${subId}`)
  }
}

async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription, eventCreatedAt: Date, eventId: string) {
  const pricing = await getPricingConfig()
  const priceId = stripeSub.items.data[0]?.price?.id || ''
  const resolved = resolvePriceId(pricing, priceId)
  const period = getSubPeriod(stripeSub)

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stripe_subscription_id:${stripeSub.id}`}))`;

    const orderKey = getStripeEventOrderKey(stripeSub.id)

    if (await isStaleStripeEvent(tx, orderKey, eventCreatedAt, eventId, 'customer.subscription.updated')) {
      log.warn(`Ignoring stale customer.subscription.updated for subscription ${stripeSub.id}`)
      return { userId: null, skipped: true }
    }

    const sub = await tx.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSub.id },
      select: { userId: true },
    })

    if (!sub) {
      return null
    }

    await tx.subscription.update({
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
      await tx.user.update({
        where: { id: sub.userId },
        data: {
          isPremium: true,
          premiumTier: resolved.tier,
          premiumExpiresAt: period.end,
        },
      })
    }

    await markStripeEventProcessed(tx, orderKey, eventCreatedAt, eventId, 'customer.subscription.updated')

    return { userId: sub.userId, skipped: false }
  })

  if (!result) return
  if (!result.userId) return
  await cache.del(CacheKeys.userAuth(result.userId))
  if (!result.skipped) {
    log.info(`Subscription updated for user ${result.userId}`)
  }
}

async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription, eventCreatedAt: Date, eventId: string) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stripe_subscription_id:${stripeSub.id}`}))`;

    const orderKey = getStripeEventOrderKey(stripeSub.id)

    if (await isStaleStripeEvent(tx, orderKey, eventCreatedAt, eventId, 'customer.subscription.deleted')) {
      log.warn(`Ignoring stale customer.subscription.deleted for subscription ${stripeSub.id}`)
      return { userId: null, skipped: true }
    }

    const sub = await tx.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSub.id },
      select: { userId: true },
    })

    if (!sub) {
      return null
    }

    await tx.subscription.update({
      where: { stripeSubscriptionId: stripeSub.id },
      data: { status: 'CANCELED' },
    })

    await tx.user.update({
      where: { id: sub.userId },
      data: {
        isPremium: false,
        premiumTier: 'FREE',
        premiumExpiresAt: null,
      },
    })

    await markStripeEventProcessed(tx, orderKey, eventCreatedAt, eventId, 'customer.subscription.deleted')

    return { userId: sub.userId, skipped: false }
  })

  if (!result) return
  if (!result.userId) return
  await cache.del(CacheKeys.userAuth(result.userId))
  if (!result.skipped) {
    log.info(`Subscription canceled for user ${result.userId}, downgraded to FREE`)
  }
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
