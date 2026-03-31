import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getStripeOrThrow } from '../../lib/stripe'
import { createModuleLogger } from '../../lib/logger'
import {
  createCheckoutSession,
  getSubscriptionStatus,
  cancelSubscription,
  handleWebhookEvent,
  getPricingConfig,
} from './payment.service'

const log = createModuleLogger('PaymentCtrl')

const checkoutSchema = z.object({
  tier: z.enum(['BASIC', 'PRO', 'ULTIMATE']),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
})

/** POST /api/payment/create-checkout */
export async function createCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = checkoutSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { message: parsed.error.issues[0]?.message || 'Invalid input' },
      })
    }

    const { tier, billingCycle } = parsed.data
    const userId = req.user!.id
    const email = req.user!.email

    const url = await createCheckoutSession(userId, email, tier, billingCycle)

    res.json({ success: true, data: { url } })
  } catch (error) {
    next(error)
  }
}

/** GET /api/payment/status */
export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const status = await getSubscriptionStatus(userId)
    res.json({ success: true, data: status })
  } catch (error) {
    next(error)
  }
}

/** POST /api/payment/cancel */
export async function cancelSub(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    await cancelSubscription(userId)
    res.json({ success: true, message: 'Subscription will cancel at period end' })
  } catch (error) {
    next(error)
  }
}

/** GET /api/payment/pricing */
export async function getPricing(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await getPricingConfig()
    // Return pricing without Stripe Price IDs (public endpoint)
    const publicPricing: Record<string, unknown> = {}
    for (const [tier, pricing] of Object.entries(config)) {
      publicPricing[tier] = {
        monthlyPrice: pricing.monthlyPrice,
        yearlyPrice: pricing.yearlyPrice,
        displayName: pricing.displayName,
        description: pricing.description,
      }
    }
    res.json({ success: true, data: publicPricing })
  } catch (error) {
    next(error)
  }
}

/** POST /api/payment/webhook — raw body, no auth */
export async function handleWebhook(req: Request, res: Response) {
  const stripe = getStripeOrThrow()
  const sig = req.headers['stripe-signature'] as string

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' })
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body, // raw body (Buffer)
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    )

    await handleWebhookEvent(event)
    res.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook error'
    log.error(`Webhook signature verification failed: ${message}`)
    res.status(400).json({ error: `Webhook Error: ${message}` })
  }
}
