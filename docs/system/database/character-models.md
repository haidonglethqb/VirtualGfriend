# Character Models

> Virtual girlfriend profiles, templates, facts, scenes, and relationship history.
> Last updated: 2026-04-09 · Reference: `server/prisma/schema.prisma`

## Character Model

```prisma
model Character {
  id                String          @id @default(uuid())
  userId            String
  name              String
  nickname          String?
  gender            Gender          @default(FEMALE)
  personality       String          @default("caring")
  mood              String          @default("happy")
  level             Int             @default(1)
  experience        Int             @default(0)
  affection         Int             @default(0)       // 0-1000
  relationshipStage RelationshipStage @default(STRANGER)

  // Timeline
  relationshipStartedAt DateTime?
  firstMetAt         DateTime       @default(now())
  birthday          DateTime?
  bio               String?
  age               Int             @default(22)      // 18-30
  occupation        String          @default("student")
  voiceType         String          @default("soft")

  // Avatar
  avatarUrl         String?
  templateId        String?
  avatarStyle       String          @default("anime")
  hairStyle         String          @default("long")
  hairColor         String          @default("#3b1f0a")
  eyeColor          String          @default("#4a3728")
  skinTone          String          @default("#f5d0c5")
  outfit            String          @default("casual")
  accessories       String[]        @default([])

  // AI behavior
  memoryEnabled     Boolean         @default(true)
  responseStyle     String          @default("romantic")
  creativityLevel   Float           @default(0.7)     // 0-1

  // Status
  isActive          Boolean         @default(true)
  isEnded           Boolean         @default(false)
  endedAt           DateTime?
  endReason         String?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([userId, isActive])
  @@index([isActive, level, experience])   // Leaderboard
  @@index([isActive, affection])           // Leaderboard
}
```

## CharacterTemplate

Pre-built character blueprints users can choose from:

```prisma
model CharacterTemplate {
  id          String   @id @default(uuid())
  name        String   @unique
  description String
  avatarUrl   String
  gender      Gender   @default(FEMALE)
  personality String   @default("caring")
  style       String   @default("anime")   // anime, realistic, chibi
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)

  @@index([isActive, sortOrder])
}
```

## CharacterFact

AI-learned facts about the character with decay semantics:

```prisma
model CharacterFact {
  id          String   @id @default(uuid())
  characterId String
  category    String   // preference, memory, trait, event, personal_info, hobby, emotional
  key         String
  value       String
  importance  Int      @default(5)    // 1-10
  factType    String   @default("evolving")  // permanent, evolving, temporal
  sourceType  String   @default("manual")    // manual, ai_inline, ai_batch
  learnedAt   DateTime @default(now())

  @@unique([characterId, key])
  @@index([characterId, importance])
  @@index([characterId, category])
}
```

## CharacterScene

Unlocked scenes tied to characters:

```prisma
model CharacterScene {
  id          String   @id @default(uuid())
  characterId String
  sceneId     String
  unlockedAt  DateTime @default(now())

  @@unique([characterId, sceneId])
}
```

## RelationshipHistory

Milestone tracking for relationship progression:

```prisma
model RelationshipHistory {
  id          String   @id @default(uuid())
  userId      String
  characterId String
  eventType   RelationshipEventType
  fromStage   RelationshipStage?
  toStage     RelationshipStage?
  note        String?
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([userId, characterId, createdAt])
  @@index([characterId, eventType])
}
```

## Enums

### RelationshipStage (8 stages)

```prisma
enum RelationshipStage {
  STRANGER       // 0-99    - Mới gặp
  ACQUAINTANCE   // 100-249 - Quen biết
  FRIEND         // 250-449 - Bạn bè
  CLOSE_FRIEND   // 450-599 - Bạn thân
  CRUSH          // 600-749 - Thầm thương
  DATING         // 750-849 - Hẹn hò
  IN_LOVE        // 850-899 - Đang yêu
  LOVER          // 900-1000 - Người yêu
}
```

### RelationshipEventType

```prisma
enum RelationshipEventType {
  STAGE_UP, FIRST_DATE, CONFESSION, STARTED_DATING,
  ANNIVERSARY, BREAKUP, RECONCILIATION, SPECIAL_MOMENT
}
```

### Gender

```prisma
enum Gender { MALE, FEMALE, NON_BINARY, OTHER }
```

## Related

- [Schema Overview](./schema-overview.md) — Full ERD
- [User Models](./user-models.md) — User → Character relationship
- [Gamification Models](./gamification-models.md) — Scenes and gift systems
- [Prisma Schema](../../../server/prisma/schema.prisma) — Full source
