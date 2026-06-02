# Gifts & Shop System

## Overview
Users buy gifts with coins/gems, store them in inventory, then send them to a character for affection and AI reactions. VIP tiers also get a monthly claimable gift pack with exact gift preview.

## Gift Rules
- Catalog gifts can be gated by `requiresPremium` and `minimumTier`.
- `GET /api/gifts` and `/api/shop` return lock metadata: `isLocked`, `canBuy`, `requiredTier`, `lockReason`.
- FREE users can see locked VIP gifts in the shop but cannot buy, claim, or send them.
- Buy and send still enforce tier access server-side; UI locks are only presentation.

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
  message, reaction, createdAt
}

VipGiftClaim {
  id, userId, claimMonth, tier,
  grantedGifts, claimedAt
}
```

## VIP Monthly Pack
- `claimMonth` uses UTC `YYYY-MM`; unclaimed packs do not roll over.
- BASIC can claim the BASIC segment.
- PRO can claim BASIC + PRO.
- ULTIMATE can claim BASIC + PRO + ULTIMATE.
- Unique `[userId, claimMonth, tier]` prevents duplicate segment claims.
- Upgrading mid-month grants only newly eligible segments; downgrading does not remove inventory or claim records.
- Claimed gifts are upserted into `UserGift` and increment quantity if already owned.

## Endpoints
- `GET /api/gifts` / `GET /api/shop` - Gift catalog with lock metadata.
- `GET /api/gifts/inventory` - User gift inventory.
- `POST /api/gifts/buy` - Buy with coins/gems using atomic balance debit.
- `POST /api/gifts/send` - Send inventory gift to active/specified character.
- `GET /api/gifts/history?page=&limit=` - Paginated gift history.
- `GET /api/gifts/vip-pack/status` - VIP pack preview, claimed segments, countdown.
- `POST /api/gifts/vip-pack/claim` - Claim unclaimed eligible tier segments.

`/api/shop/*` is an alias for the same gift routes.

## Related
- [Quests](./quests.md)
- [Levels & Affection](./levels-affection.md)
- [Premium Gating](../authentication/premium-gating.md)
- Source: `server/src/modules/gift/`
