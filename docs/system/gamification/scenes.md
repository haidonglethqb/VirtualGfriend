# Scenes System

## Overview
Unlockable environments that set the backdrop for conversations. Scenes unlock through level progression, purchases, quest completion, events, or relationship stage advancement.

## Scene Categories by Stage

| Stage | Unlocked Categories |
|-------|---------------------|
| STRANGER | school_classroom, public_street, bus_stop |
| ACQUAINTANCE | cafe, library, park_day |
| FRIEND | home_living_room, restaurant, movie_theater |
| CLOSE_FRIEND | beach_day, amusement_park, shopping_mall |
| CRUSH | park_sunset, rooftop_view, garden |
| DATING | fancy_restaurant, beach_night, festival |
| IN_LOVE | romantic_getaway, couple_spa, sunset_cruise |
| LOVER | bedroom, vacation_resort, stargazing, proposal_spot |

## Scene Properties

```typescript
Scene {
  id, name, description, imageUrl,
  category, ambiance,
  unlockMethod: "level" | "purchase" | "quest" | "event" | "relationship",
  unlockValue: number,       // Level required or gem cost
  requiredStage: RelationshipStage | null,
  priceGems,
  requiresPremium,
  isDefault, isActive, sortOrder
}
```

## Unlock Logic

```mermaid
sequenceDiagram
    participant User
    participant SceneService
    participant DB
    participant Cache

    User->>SceneService: unlockScene(sceneId)
    SceneService->>DB: Get user (gems, premiumTier)
    SceneService->>DB: Get character (level, affection)
    SceneService->>DB: Get scene details
    alt Already unlocked / isDefault
        SceneService-->>User: 400 SCENE_ALREADY_UNLOCKED
    end
    alt requiresPremium && !canAccessPremiumScenes
        SceneService-->>User: 403 PREMIUM_REQUIRED
    end
    alt requiredStage && !isStageReached
        SceneService-->>User: 400 STAGE_REQUIRED
    end
    alt unlockMethod === "level" && character.level < unlockValue
        SceneService-->>User: 400 LEVEL_REQUIRED
    end
    alt unlockMethod === "purchase" && priceGems > 0
        SceneService->>DB: Deduct gems (transaction)
    end
    SceneService->>DB: Create CharacterScene record
    SceneService-->>User: { scene, unlocked: true }
```

## Active Scene
- Stored in `UserSettings.activeSceneId` via `setActiveScene()`
- Scene validated on activation (unlock + premium + stage checks)
- Used by AI prompt to set conversation ambiance

## Newly Unlocked Notification
`getNewlyUnlockedScenes(userId, newStage)` returns scenes unlocked by stage change — triggers UI notification.

## Related
- [Levels & Affection](./levels-affection.md)
- [Gifts & Shop](./gifts-shop.md)
- Source: `server/src/modules/scene/scene.service.ts`
