import { Response, NextFunction } from 'express'
import { z } from 'zod'
import Stripe from 'stripe'
import type { AdminRequest } from './admin.middleware'
import { getPricingConfig, updatePricingConfig } from '../payment/payment.service'
import { PremiumTier, prisma } from '../../lib/prisma'
import { AppError } from '../../middlewares/error.middleware'
import { stripe } from '../../lib/stripe'
import { DB_PRICING_KEY, DEFAULT_PRICING_CONFIG } from '../payment/payment.constants'

const VALID_TIERS: Array<Exclude<PremiumTier, 'FREE'>> = ['BASIC', 'PRO', 'ULTIMATE']

const pricingPatchSchema = z.object({
  monthlyPrice: z.number().int().min(12000).optional(),
  yearlyPrice: z.number().int().min(12000).optional(),
  stripeProductId: z.string().optional(),
  stripePriceIdMonthly: z.string().optional(),
  stripePriceIdYearly: z.string().optional(),
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  stripeTrialPriceId: z.string().optional(),
})

/** GET /admin/pricing */
export async function getAdminPricing(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const config = await getPricingConfig()
    res.json({ success: true, data: config })
  } catch (error) {
    next(error)
  }
}

/** GET /admin/pricing/stripe-live — read prices directly from Stripe (source of truth) */
export async function getStripeLivePricing(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    // Prevent browser/proxy caching — always fetch live from Stripe
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')

    if (!stripe) {
      throw new AppError('Stripe chưa được cấu hình', 503, 'STRIPE_NOT_CONFIGURED')
    }

    const dbRow = await prisma.systemConfig.findUnique({ where: { key: DB_PRICING_KEY } })
    const dbConfig = (dbRow?.value as typeof DEFAULT_PRICING_CONFIG | null) ?? DEFAULT_PRICING_CONFIG

    const result: Record<string, object> = {}
    const dbUpdates: Array<Promise<void>> = []

    await Promise.all(
      VALID_TIERS.map(async (tier) => {
        const tierCfg = dbConfig[tier]
        result[tier] = { ...tierCfg }

        if (!tierCfg.stripeProductId) return

        try {
          const prices = await stripe!.prices.list({
            product: tierCfg.stripeProductId,
            active: true,
            currency: 'vnd',
            type: 'recurring',
          })
          const monthly = prices.data.find((p) => p.recurring?.interval === 'month')
          const yearly = prices.data.find((p) => p.recurring?.interval === 'year')

          const patch: Record<string, unknown> = {}
          if (monthly) {
            patch.monthlyPrice = monthly.unit_amount ?? tierCfg.monthlyPrice
            patch.stripePriceIdMonthly = monthly.id
          }
          if (yearly) {
            patch.yearlyPrice = yearly.unit_amount ?? tierCfg.yearlyPrice
            patch.stripePriceIdYearly = yearly.id
          }

          if (Object.keys(patch).length > 0) {
            result[tier] = { ...result[tier], ...patch }
            // Write Stripe-sourced prices back to DB so DB stays in sync
            dbUpdates.push(
              updatePricingConfig(tier as Exclude<typeof tier, 'FREE'>, patch as Parameters<typeof updatePricingConfig>[1])
                .then(() => {})
                .catch(() => {}) // non-fatal — don't fail the response
            )
          }
        } catch {
          // Stripe fetch failed — keep DB values
        }
      }),
    )

    // Fire DB writes in parallel (non-blocking — don't await before sending response)
    await Promise.allSettled(dbUpdates)

    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

/** PUT /admin/pricing/:tier */
export async function updateAdminPricing(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { tier } = req.params as { tier: string }

    if (!VALID_TIERS.includes(tier as Exclude<PremiumTier, 'FREE'>)) {
      throw new AppError(`Invalid tier: ${tier}. Must be BASIC | PRO | ULTIMATE`, 400, 'INVALID_TIER');
    }

    const parsed = pricingPatchSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid pricing payload', 400, 'VALIDATION_ERROR');
    }

    const updated = await updatePricingConfig(
      tier as Exclude<PremiumTier, 'FREE'>,
      parsed.data,
    )

    res.json({
      success: true,
      data: updated,
      message: `Pricing for "${tier}" updated successfully`,
    })
  } catch (error) {
    next(error)
  }
}

/** POST /admin/pricing/:tier/sync-stripe */
export async function syncStripePrice(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { tier } = req.params as { tier: string }

    if (!VALID_TIERS.includes(tier as Exclude<PremiumTier, 'FREE'>)) {
      throw new AppError(`Invalid tier: ${tier}. Must be BASIC | PRO | ULTIMATE`, 400, 'INVALID_TIER')
    }

    if (!stripe) {
      throw new AppError('Stripe chưa được cấu hình. Hãy set STRIPE_SECRET_KEY trong .env', 503, 'STRIPE_NOT_CONFIGURED')
    }

    // Bypass cache — read from DB directly so sync always uses fresh data
    const dbRow = await prisma.systemConfig.findUnique({ where: { key: DB_PRICING_KEY } })
    const config = (dbRow?.value as typeof DEFAULT_PRICING_CONFIG | null) ?? DEFAULT_PRICING_CONFIG
    const tierConfig = config[tier as Exclude<PremiumTier, 'FREE'>]

    if (!tierConfig) {
      throw new AppError(`Không tìm thấy config cho tier: ${tier}`, 404, 'TIER_NOT_FOUND')
    }

    const { monthlyPrice, yearlyPrice, displayName, description } = tierConfig

    const s = stripe

    // ─── Step 1: Resolve product from saved price IDs (most reliable — no search needed) ───
    // Retrieve the monthly price and expand its product field directly from Stripe.
    // This guarantees we find the EXACT product that owns the existing prices.
    let product: Stripe.Product | null = null
    const priceIdToResolve = tierConfig.stripePriceIdMonthly || tierConfig.stripePriceIdYearly

    if (priceIdToResolve) {
      try {
        const existingPrice = await s.prices.retrieve(priceIdToResolve, {
          expand: ['product'],
        })
        if (existingPrice.active && typeof existingPrice.product === 'object' && existingPrice.product !== null) {
          const expandedProduct = existingPrice.product as Stripe.Product
          if (!expandedProduct.deleted) {
            product = expandedProduct
            // Update product metadata/name to keep in sync
            await s.products.update(product.id, {
              name: displayName || `VirtualGfriend ${tier}`,
              description: description || undefined,
              metadata: { vgfriend_tier: tier },
            }).catch(() => {})
          }
        }
      } catch {
        // Price ID invalid or deleted — fall through to search
      }
    }

    // ─── Step 2: Fallback search by saved product ID ───
    if (!product && tierConfig.stripeProductId) {
      try {
        const p = await s.products.retrieve(tierConfig.stripeProductId)
        if (!p.deleted) {
          product = await s.products.update(p.id, {
            name: displayName || `VirtualGfriend ${tier}`,
            description: description || undefined,
            metadata: { vgfriend_tier: tier },
          })
        }
      } catch {
        // Product deleted or not found
      }
    }

    // ─── Step 3: Fallback search by metadata/name ───
    if (!product) {
      const metaSearch = await s.products.search({
        query: `metadata['vgfriend_tier']:'${tier}' AND active:'true'`,
      })
      if (metaSearch.data.length > 0) {
        product = await s.products.update(metaSearch.data[0].id, {
          name: displayName || `VirtualGfriend ${tier}`,
          description: description || undefined,
          metadata: { vgfriend_tier: tier },
        }).catch(() => metaSearch.data[0])
      }
    }

    // ─── Step 4: Last resort — create new product ───
    if (!product) {
      product = await s.products.create({
        name: displayName || `VirtualGfriend ${tier}`,
        description: description || undefined,
        metadata: { vgfriend_tier: tier },
      })
    }

    // ─── Sync price: search product's active prices first, create only if truly missing ───
    async function syncPrice(
      amount: number,
      interval: 'month' | 'year',
      nickname: string,
      oldPriceId?: string,
    ): Promise<Stripe.Price> {
      // 1️⃣ List all active prices for this product on Stripe — source of truth
      const activePrices = await s.prices.list({
        product: product!.id,
        active: true,
        currency: 'vnd',
        type: 'recurring',
        limit: 100,
      })

      const match = activePrices.data.find(
        (p) => p.unit_amount === amount && p.recurring?.interval === interval,
      )
      if (match) {
        if (match.nickname !== nickname) {
          await s.prices.update(match.id, { nickname }).catch(() => {})
        }
        return match // ✅ Price already exists on Stripe — reuse
      }

      // 2️⃣ Amount changed — archive old price if we have its ID
      if (oldPriceId) {
        await s.prices.update(oldPriceId, { active: false }).catch(() => {})
      }

      // 3️⃣ Create new price
      return s.prices.create({
        product: product!.id,
        currency: 'vnd',
        unit_amount: amount,
        recurring: { interval },
        nickname,
      })
    }

    const [monthlyStripePrice, yearlyStripePrice] = await Promise.all([
      syncPrice(monthlyPrice, 'month', `${tier} Monthly`, tierConfig.stripePriceIdMonthly),
      syncPrice(yearlyPrice, 'year', `${tier} Yearly`, tierConfig.stripePriceIdYearly),
    ])

    // Persist new price IDs + product ID to DB + clear Redis cache
    const updated = await updatePricingConfig(tier as Exclude<PremiumTier, 'FREE'>, {
      stripeProductId: product.id,
      stripePriceIdMonthly: monthlyStripePrice.id,
      stripePriceIdYearly: yearlyStripePrice.id,
    })

    res.json({
      success: true,
      data: {
        productId: product.id,
        stripePriceIdMonthly: monthlyStripePrice.id,
        stripePriceIdYearly: yearlyStripePrice.id,
        config: updated,
      },
      message: `Stripe prices synced cho ${tier} thành công`,
    })
  } catch (error) {
    next(error)
  }
}
