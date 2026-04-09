# Backend Modules

Server-side module organization and key service flows.

**Reference:** `server/src/modules/`

## Module Map

```mermaid
flowchart TB
  subgraph AI
    AI[ai.service]
    CS[conversation-summary]
    FL[facts-learning]
    PN[proactive-notification]
  end
  subgraph Core
    CH[chat.service]
    CHA[character.service]
    MO[mood.service]
  end
  subgraph Features
    Q[quest]
    G[gift]
    SC[scene]
    MEM[memory]
    DM[dm]
  end
  subgraph Business
    LB[leaderboard]
    PAY[payment]
    ANA[analytics]
    TEL[telemetry]
  end
  AI --> CH
  AI --> CHA
  FL --> CHA
  G --> CHA
```

## AI Module (`ai/`)

| Service | Responsibilities |
|---|---|
| `ai.service` | Groq/OpenAI SDK, system prompt, chat processing, emotion detection, inline facts, quality scoring |
| `conversation-summary` | Summaries every 10 messages: `summary`, `keyTopics`, `emotionalTone`, `messageCount` |
| `facts-learning` | Batch fact extraction every 10 msgs, importance (1-10), decay (event: 30d, memory: 60d) |
| `proactive-notification` | AI-initiated msgs (morning, night, miss_you, anniversary), debounced 5min/user |

**Provider:** Groq (OpenAI-compatible), model: `llama-3.3-70b-versatile`.

## Chat Module (`chat/`)

| Feature | Implementation |
|---|---|
| `sendMessage` | AI call → save msgs → update affection/mood/level → extract facts → trigger quests |
| History | Paginated `findMany`, `createdAt DESC` |
| Dedup | Redis setNX `dedup:{userId}:{clientId}` (60s TTL) |

## Character Module (`character/`)

| Service | Responsibilities |
|---|---|
| `character.service` | CRUD, relationship stages, XP/level, milestone rewards, facts, customization |
| `mood.service` | Mood from time since chat, gifts, messages, affection, stage |
| `relationship.service` | Stage transitions |
| `template.service` | Template CRUD with `isDefault`/`isActive` |

**XP formula:** `100 + (level - 1) * 50` per level.

## Gamification Modules

| Module | Key Features |
|---|---|
| **Quest** | Daily/weekly/story quests, auto-tracked via chat, rewards: coins/gems/XP/affection |
| **Gift** | Catalog (coins/gems price), buy → inventory, send → AI reaction + affection boost |
| **Scene** | Unlock by level/purchase/quest/relationship stage. Categories mapped to stages |
| **Memory** | CRUD, favorites, auto-memories for stage change, level up, milestones |

**Memory types:** `MILESTONE`, `PHOTO`, `CONVERSATION`, `GIFT`, `EVENT`, `SPECIAL`, `DATE`, `CHAT`.

## DM Module (`dm/`)

| Feature | Details |
|---|---|
| 1-on-1 + Group | 3-50 members per conversation |
| Typing | Broadcast to other members |
| Read receipts | `markRead()` per user per conversation |

## Business Modules

| Module | Description |
|---|---|
| **Leaderboard** | Rankings: `level`, `affection`, `streak`, `achievements`. 5-min cache |
| **Payment** | Stripe subscriptions, webhooks, auto-downgrade expired premium → FREE |
| **Analytics** | User stats for dashboard |
| **Monitoring** | Telemetry: request, error, auth, socket, job, security, business events |

## Infrastructure Modules

| Module | Description |
|---|---|
| **Upload** | DigitalOcean Spaces (S3) via multer + S3 SDK |
| **Admin** | Tier config CRUD, pricing. Auth: `ADMIN_JWT_SECRET` |

## Related

- [Routes](./routes.md)
- [Middleware](./middleware.md)
- [Socket Handlers](./socket-handlers.md)
