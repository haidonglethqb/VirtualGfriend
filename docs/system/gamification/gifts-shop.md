# Gifts & Shop System

## Overview
Users buy gifts with coins/gems, store them in inventory, then send them to a character for affection and AI reactions. VIP tiers also get a monthly claimable gift pack with exact gift preview.

## Gift Rules
- Catalog gifts can be gated by `requiresPremium` and `minimumTier`.
- `GET /api/gifts` and `/api/shop` return lock metadata: `isLocked`, `canBuy`, `requiredTier`, `lockReason`.
- FREE users can see locked VIP gifts in the shop but cannot buy, claim, or send them.
- Buy and send still enforce tier access server-side; UI locks are only presentation.
- Original ended relationships use the separate VIP-only ex gift flow so normal gift quests, arcs, and game events do not progress.

## Data Model

```prisma
Gift {
  id, name, emoji, description, imageUrl,
  category, rarity,
  requiresPremium, minimumTier,
  priceCoins, priceGems, affectionBonus,
  unlockLevel, isLimited, availableFrom, availableUntil,
  sortOrder, isActive
}

UserGift {
  id, userId, giftId, quantity
}

GiftHistory {
  id, userId, characterId, giftId,
  message, reaction,
  quantity, source, sourceRefId,
  createdAt
}

VipGiftClaim {
  id, userId, claimMonth, tier,
  grantedGifts, claimedAt
}

VipGiftPackSegment {
  id, segmentTier, displayName, description,
  isActive, sortOrder
}

VipGiftPackItem {
  id, segmentId, giftId, quantity,
  isActive, sortOrder
}
```

## VIP Monthly Pack
- `claimMonth` uses UTC `YYYY-MM`; unclaimed packs do not roll over.
- BASIC can claim the BASIC segment.
- PRO can claim BASIC + PRO.
- ULTIMATE can claim BASIC + PRO + ULTIMATE.
- Unique `[userId, claimMonth, tier]` prevents duplicate segment claims.
- Upgrading mid-month grants only newly eligible segments; downgrading does not remove inventory or claim records.
- Pack content is admin-configured in `VipGiftPackSegment` + `VipGiftPackItem`, not hardcoded in `gift.service.ts`.
- Status returns `packPreview[].items[]`, `configWarnings`, claimed segments, claimable segments, and countdown.
- Claim uses the shared reward grant service with inventory delivery forced on. VIP gifts are added to `UserGift` inventory first; affection, chat messages, AI reactions, and `SEND_GIFT` progress happen only when the user later sends a gift from the inventory.
- Inventory reads reconcile legacy VIP claims from the current month that were previously delivered directly by moving those claimed gift quantities into `UserGift` once and marking the claim JSON as migrated.
- `VipGiftClaim.grantedGifts` stores the exact granted items for audit even if admin changes the pack later.

## Admin Gift Pack
- `GET /api/admin/vip-gift-pack` returns BASIC/PRO/ULTIMATE segments with concrete items.
- `PUT /api/admin/vip-gift-pack` saves segment metadata and item lists.
- `GET /api/admin/gift-catalog` is the gift picker endpoint; `/api/admin/gifts` remains gift history.

## Endpoints
- `GET /api/gifts` / `GET /api/shop` - Gift catalog with lock metadata.
- `GET /api/gifts/inventory` - User gift inventory.
- `POST /api/gifts/buy` - Buy with coins/gems using atomic balance debit.
- `POST /api/gifts/send` - Send inventory gift to active/specified character through normal gift flow.
- `POST /api/gifts/send-ex` - Send inventory gift to an original ended character with `GiftHistory(source=EX_GIFT)`, cold/sad reaction messages, and no normal `SEND_GIFT` progress.
- `GET /api/gifts/history?page=&limit=` - Paginated gift history.
- `GET /api/gifts/vip-pack/status` - VIP pack preview, claimed segments, countdown.
- `POST /api/gifts/vip-pack/claim` - Claim unclaimed eligible tier segments.

`/api/shop/*` is an alias for the same gift routes.

## Related
- [Quests](./quests.md)
- [Levels & Affection](./levels-affection.md)
- [Premium Gating](../authentication/premium-gating.md)
- Source: `server/src/modules/gift/`
