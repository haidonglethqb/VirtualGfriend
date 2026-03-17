/**
 * Admin Tier Config Controller
 * Handlers for reading and updating per-tier feature configs.
 */

import { Response } from 'express';
import type { AdminRequest } from './admin.middleware';
import {
  getAllTierConfigs,
  updateTierConfig,
  TierConfig,
  PremiumTier,
} from './tier-config.service';

const VALID_TIERS: PremiumTier[] = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];

/** GET /admin/tier-configs — return all 4 tier configs */
export async function getTierConfigs(req: AdminRequest, res: Response) {
  const configs = await getAllTierConfigs();
  res.json({ success: true, data: configs });
}

/** PUT /admin/tier-configs/:tier — patch one tier's config */
export async function updateTierConfigHandler(req: AdminRequest, res: Response) {
  const { tier } = req.params as { tier: string };

  if (!VALID_TIERS.includes(tier as PremiumTier)) {
    return res.status(400).json({ success: false, error: `Invalid tier: ${tier}. Must be FREE | BASIC | PRO | ULTIMATE` });
  }

  const patch = req.body as Partial<TierConfig>;

  // Validate numeric fields: must be integer and >= -1
  const numericFields: (keyof TierConfig)[] = ['maxCharacters', 'maxMessagesPerDay'];
  for (const field of numericFields) {
    if (patch[field] !== undefined) {
      const val = Number(patch[field]);
      if (!Number.isInteger(val) || val < -1) {
        return res.status(400).json({ success: false, error: `${field} must be an integer >= -1 (-1 = unlimited)` });
      }
    }
  }

  const updated = await updateTierConfig(tier as PremiumTier, patch);
  res.json({ success: true, data: updated, message: `Tier "${tier}" config updated successfully` });
}
