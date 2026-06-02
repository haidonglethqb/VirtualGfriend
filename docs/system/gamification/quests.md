# Quests System

## Overview
Quests provide structured objectives for XP, coins, gems, and affection. Daily quests start from game events; arc quests start when the user starts an unlocked Arc.

## Quest Model

```prisma
Quest {
  id, title, description, type, category,
  requirements,              // { action: "send_message", count: 10 }
  rewardXp, rewardCoins, rewardGems, rewardAffection,
  rewardItems,               // legacy display compatibility
  requiresPremium, minimumTier,
  arcId, isArcFinalQuest,
  sortOrder, isActive
}

QuestGiftReward {
  id, questId, giftId, quantity, sortOrder
}

UserQuest {
  id, userId, questId,
  progress, maxProgress,
  status,                    // IN_PROGRESS, COMPLETED, CLAIMED, EXPIRED
  startedAt, completedAt, claimedAt
}
```

## Reward Granting
- Quest scalar rewards still use `rewardCoins`, `rewardGems`, `rewardXp`, and `rewardAffection`.
- Concrete gift rewards are stored in `QuestGiftReward` and returned as `giftRewards` plus `rewardSummary`.
- Manual quest claim, auto-claim, Arc final quest claim, VIP pack claim, and admin bulk rewards use `rewardGrantService`.
- Claim state changes and coin/gem/gift grants run transactionally with `COMPLETED -> CLAIMED` to prevent duplicate grant.
- System gift rewards are silent: they create `GiftHistory` with `source=QUEST_REWARD` when an active character exists, otherwise they upsert `UserGift` inventory. They do not create chat `Message`, do not call AI reaction, and do not trigger `SEND_GIFT`.

## Arc Journey
- Arcs are sequential and use `prerequisiteArcId`; the next Arc unlocks only after previous `ArcProgress.completedAt`.
- `POST /api/arcs/:arcId/start` upserts all active quests in the Arc.
- Completion percent is based on claimed Arc quests.
- Non-final Arc quests auto-claim from game events.
- `isArcFinalQuest=true` stays `COMPLETED` until the user manually claims it.
- Arc completion reward is claimed separately after the final quest is claimed.

## Guidance Payload
Arc quest responses include display-safe fields so the client can guide users without guessing:

```typescript
ArcQuest {
  requirementText: { vi, en },
  guidanceText: { vi, en },
  progressText: { vi, en },
  remaining,
  cta: { label: { vi, en }, href, disabled },
  ctaLabel, ctaHref, ctaDisabled,
  lockReason, statusReason,
  isCurrentQuest
}
```

Action mapping:
- `send_message`, `morning_greeting`, `goodnight_message`, `romantic_message` -> `/chat`
- `send_gift` -> `/shop`
- `daily_login` -> `/dashboard`
- `reach_level`, `reach_affection` -> `/chat`

## Endpoints
- `GET /api/quests/*` - Non-arc quest list/start/complete/claim endpoints.
- `GET /api/arcs` - Arc list with unlock state, progress, and quest summaries.
- `GET /api/arcs/:arcId` - Arc detail with quest guidance metadata.
- `POST /api/arcs/:arcId/start` - Auto-start Arc quests.
- `POST /api/arcs/:arcId/quests/:questId/claim` - Claim final manual Arc quest.
- `POST /api/arcs/:arcId/claim` - Claim once-only Arc completion rewards.

## Admin
- `GET /api/admin/quests` supports filters: `search`, `type`, `category`, `isActive`, `action`, `minimumTier`, `rewardType`, `giftId`, `startsAt`, `endsAt`.
- `POST /api/admin/quests` and `PATCH /api/admin/quests/:id` accept `giftRewards: [{ giftId, quantity }]`.
- Quest create/update/toggle/delete invalidates `CacheKeys.quests()`.
- Admin UI shows KPI overview, filters, requirement/action/count, tier gate, scalar reward preview, gift reward preview, and clean active/inactive labels.

## Related
- [Gifts & Shop](./gifts-shop.md)
- [Levels & Affection](./levels-affection.md)
- [Scenes](./scenes.md)
- Source: `server/src/modules/arc/`, `server/src/modules/game/game-event.service.ts`
