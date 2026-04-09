import { Response, NextFunction } from 'express'
import { z } from 'zod'
import type { AdminRequest } from './admin.middleware'
import { getPricingConfig, updatePricingConfig } from '../payment/payment.service'
import { PremiumTier } from '../../lib/prisma'
import { AppError } from '../../middlewares/error.middleware'

const VALID_TIERS: Array<Exclude<PremiumTier, 'FREE'>> = ['BASIC', 'PRO', 'ULTIMATE']

const pricingPatchSchema = z.object({
  monthlyPrice: z.number().int().min(12000).optional(),
  yearlyPrice: z.number().int().min(12000).optional(),
  stripePriceIdMonthly: z.string().optional(),
  stripePriceIdYearly: z.string().optional(),
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
}).strict()

/** GET /admin/pricing */
export async function getAdminPricing(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const config = await getPricingConfig()
    res.json({ success: true, data: config })
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
