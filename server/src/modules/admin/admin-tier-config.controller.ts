/**
 * Admin Tier Config Controller
 * Handlers for reading and updating per-tier feature configs.
 */

import { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AdminRequest } from './admin.middleware';
import {
  getAllTierConfigs,
  updateTierConfig,
  TierConfig,
  PremiumTier,
} from './tier-config.service';
import { AppError } from '../../middlewares/error.middleware';

const VALID_TIERS: PremiumTier[] = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];

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
}).strict();

/** GET /admin/tier-configs — return all 4 tier configs */
export async function getTierConfigs(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const configs = await getAllTierConfigs();
    res.json({ success: true, data: configs });
  } catch (error) {
    next(error);
  }
}

/** PUT /admin/tier-configs/:tier — patch one tier's config */
export async function updateTierConfigHandler(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { tier } = req.params as { tier: string };

    if (!VALID_TIERS.includes(tier as PremiumTier)) {
      throw new AppError(`Invalid tier: ${tier}. Must be FREE | BASIC | PRO | ULTIMATE`, 400, 'INVALID_TIER');
    }

    const parsed = tierConfigPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid tier config payload', 400, 'VALIDATION_ERROR');
    }
    const patch = parsed.data as Partial<TierConfig>;

    const updated = await updateTierConfig(tier as PremiumTier, patch);
    res.json({ success: true, data: updated, message: `Tier "${tier}" config updated successfully` });
  } catch (error) {
    next(error);
  }
}
