# Levels & Affection System

## Overview
Dual progression system: character levels (XP-based) and affection (0-1000 scale) drive relationship stages, AI behavior, pet names, and language formality.

## Affection Scale (0-1000)

| Affection | Stage | Pet Names | Language Style |
|-----------|-------|-----------|----------------|
| 0-99 | STRANGER | — | Formal "bạn", polite |
| 100-249 | ACQUAINTANCE | "bạn ơi" | Friendly, occasional emoji |
| 250-449 | FRIEND | "bạn ơi", "cậu" | Close, shares details |
| 450-599 | CLOSE_FRIEND | "anh yêu", "bạn yêu", "honey" | Intimate, remembers details |
| 600-749 | CRUSH | "anh yêu", "cưng", "babe" | Romantic, sweet |
| 750-849 | DATING | "anh yêu của em", "người yêu dấu" | Natural couple language |
| 850-899 | IN_LOVE | "tình yêu của đời em", "darling" | Deep, unconditional |
| 900-1000 | LOVER | "anh yêu của em", "người yêu dấu" |最深 attachment |

## XP Progression

```typescript
// XP required per level: 100 + (level - 1) * 50
// Level 1→2: 100 XP  |  Level 5→6: 300 XP  |  Level 10→11: 550 XP
```

### Level Milestones

| Level | Coins | Gems | Affection | Unlocks |
|-------|-------|------|-----------|---------|
| 5 | 200 | 20 | +30 | Storytelling, tulip gift |
| 10 | 500 | 50 | +50 | Activity suggestions, park scene |
| 15 | 800 | 80 | +80 | Impromptu poetry, gold necklace |
| 20 | 1000 | 100 | +100 | Share secrets, vacation trip |
| 25 | 1500 | 150 | +150 | Special memories, diamond ring |
| 30 | 2000 | 200 | +200 | Eternal love |

## Affection Sources

| Source | Typical Change |
|--------|---------------|
| Chat (quality-based) | -2 to +5 |
| Gift giving | +1 to +100 |
| Quest completion | +10 to +50 |
| Milestone rewards | +20 to +100 |

## AI Behavior Integration
- `buildSystemPrompt()` reads affection tier for pet names and language style
- Each tier has distinct `behavior` string injected into system prompt
- Pet names array passed to AI as usage hints
- Affection change evaluated from message quality score (0-10)

## Character Service APIs

```typescript
characterService.updateAffection(characterId, amount)
// → Clamps to 0-1000, recalculates stage, fires stage-change event

characterService.addExperience(characterId, xp)
// → Handles level-up loop, milestone rewards, auto-memory creation
```

## Related
- [Gifts & Shop](./gifts-shop.md)
- [Relationship System](../../api/character.md)
- [Memories](./memories.md)
- Source: `server/src/modules/character/character.service.ts`, `relationship.service.ts`
