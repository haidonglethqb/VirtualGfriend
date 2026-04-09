# Chat Models

> Messages, AI conversation summaries, and prompt templates.
> Last updated: 2026-04-09 · Reference: `server/prisma/schema.prisma`

## Message Model

Core chat messages between user and AI character:

```prisma
model Message {
  id          String      @id @default(uuid())
  userId      String
  characterId String
  role        MessageRole
  content     String      @db.Text
  messageType MessageType @default(TEXT)
  metadata    Json?       // Images, voice, special events
  isRead      Boolean     @default(false)
  emotion     String?     // happy, sad, love, angry, surprised
  createdAt   DateTime    @default(now())

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  character Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@index([userId, characterId, createdAt])
  @@index([characterId, createdAt])
  @@index([userId, createdAt])
}
```

## Enums

### MessageRole

```prisma
enum MessageRole {
  USER    // Message sent by the user
  AI      // Response from AI character
  SYSTEM  // System notifications (level up, gift received, etc.)
}
```

### MessageType

```prisma
enum MessageType {
  TEXT     // Plain text message
  IMAGE    // Image/media message
  VOICE    // Voice message
  GIFT     // Gift sent animation
  STICKER  // Sticker message
  EVENT    // System event (stage change, milestone, etc.)
}
```

## ConversationSummary

AI-generated summaries for long-term memory context (prevents token overflow):

```prisma
model ConversationSummary {
  id            String   @id @default(uuid())
  userId        String
  characterId   String
  summary       String   @db.Text
  keyTopics     String[]
  emotionalTone String?  // positive, neutral, negative, romantic, sad, excited
  messageCount  Int      @default(0)
  createdAt     DateTime @default(now())

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  character Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@index([userId, characterId, createdAt])
}
```

### Usage Pattern

Summaries are appended periodically as conversation grows. When building AI context:

1. Load last N raw messages (recent context)
2. Load latest ConversationSummary (historical context)
3. Inject both into the AI prompt template

## AIPromptTemplate

Configurable system prompts for different character personalities:

```prisma
model AIPromptTemplate {
  id          String   @id @default(uuid())
  name        String   @unique
  personality String   // caring, playful, shy, passionate, intellectual
  template    String   @db.Text
  systemRole  String   @db.Text
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Template Variables

The `template` field supports interpolation:
- `{characterName}` — Character's name
- `{personality}` — Character personality traits
- `{userDisplayName}` — User's display name
- `{facts}` — CharacterFact entries injected as context
- `{summary}` — Latest ConversationSummary

## Index Strategy

| Index | Purpose |
|---|---|
| `[userId, characterId, createdAt]` | Fetch conversation history for a specific user-character pair |
| `[characterId, createdAt]` | Admin/mod queries: all messages for a character |
| `[userId, createdAt]` | User's cross-character message history |

## Related

- [Schema Overview](./schema-overview.md) — Full ERD
- [Character Models](./character-models.md) — Character facts used in prompt context
- [AI Service](../ai/ai-service.md) — Prompt construction and AI response generation
- [Conversation Summary](../ai/conversation-summary.md) — Summarization strategy
- [Prisma Schema](../../../server/prisma/schema.prisma) — Full source
