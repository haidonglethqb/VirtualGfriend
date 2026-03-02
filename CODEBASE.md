# VGfriend - Codebase Summary (AI Reference)

## Tổng quan
VGfriend là ứng dụng web "Virtual Girlfriend" - người dùng tương tác với AI companion qua chat real-time. Có hệ thống gamification (quests, gifts, levels, affection), DM giữa users, leaderboard.

**Tech Stack:** Next.js 14 (App Router) + Express + Socket.IO + PostgreSQL + Redis + Prisma + Zustand + TailwindCSS + Radix UI

---

## Cấu trúc thư mục

```
VirtualGfriend/
├── client/          # Next.js 14 Frontend (port 3000)
├── server/          # Express Backend API (port 3001)  
├── shared/          # Shared TypeScript types
├── e2e/             # Playwright E2E tests
├── nginx/           # Nginx reverse proxy config (production)
├── docker-compose.dev.yml   # Dev: PostgreSQL + Redis + Adminer
└── docker-compose.yml       # Prod: Full stack + Nginx + SSL
```

---

## SERVER (`server/src/`)

### Entry Point - `index.ts`
- Express + HTTP + Socket.IO server
- Middleware chain: requestId → helmet → compression → cors → json(1mb) → cookieParser
- Global rate limiter trên `/api/` (express-rate-limit)
- Health check `/health` (DB + Redis), Readiness `/ready`
- Periodic cleanup: tokens (6h), deleted DMs (24h), leaderboard cache (5min)

### Routes (`routes/index.ts`)
| Path | Module | Auth |
|------|--------|------|
| `/api/auth` | Auth (login, register, reset password) | Partial |
| `/api/users` | User profile, settings, privacy | Yes |
| `/api/character` | Character CRUD, customize, facts | Yes (trừ templates) |
| `/api/chat` | Chat history, send, search | Yes |
| `/api/quests` | Quest catalog, progress, claim | Yes |
| `/api/gifts` `/api/shop` | Gift shop, inventory, buy, send | Yes |
| `/api/scenes` | Scene unlock, set active | Yes |
| `/api/memories` | Memories CRUD, milestones | Yes |
| `/api/game` | Daily login, progress | Yes |
| `/api/analytics` | Stats | Yes |
| `/api/dm` | Direct messages giữa users | Yes |
| `/api/leaderboard` | Rankings | Yes |

### Middleware
- **auth.middleware.ts**: JWT Bearer verification + Redis cache-aside (15min TTL)
- **error.middleware.ts**: Global error handler, custom AppError, Prisma error mapping
- **request-id.middleware.ts**: UUID X-Request-Id mỗi request

### Lib
- **prisma.ts**: Singleton Prisma client
- **redis.ts**: ioredis wrapper, graceful fallback. Cache: get/set/del/delPattern/getOrSet/setNX
- **email.ts**: Nodemailer email (OTP reset password)
- **logger.ts**: Structured logger với module tags
- **constants.ts**: Message limits, cache TTLs, socket rate limits

### Key Modules
- **Auth**: bcrypt(12), JWT access(15min) + refresh(7days) stored in DB. Password reset via OTP email
- **Character**: Virtual companion với personality, mood, level(XP), affection(0-1000), relationship stages
- **Chat**: Paginated history, send message → AI response (Groq API) → mood/affection/quest update
- **AI**: Groq/OpenAI, rich system prompt (personality + relationship + level + mood + facts + 20 recent msgs)
- **Quest**: Daily/Weekly/Story/Achievement quests, reward claiming
- **Gift**: Shop, buy with coins/gems, send → AI reaction → affection boost
- **DM**: User-to-user messaging, 1-on-1 + group (3-50 members)
- **Leaderboard**: Rankings by level/affection/streak/achievements, 5min cache

### Socket.IO (`sockets/index.ts`)
- JWT auth middleware + user room `user:{userId}`
- Events: `message:send`, `dm:send`, `dm:typing`, `dm:read`, `typing:start/stop`, `sync:request/response`
- In-memory rate limiting per user per event type
- Proactive notifications on connect (debounced 5min)

---

## CLIENT (`client/src/`)

### Pages (Next.js App Router)
| Route | Chức năng | API calls on mount |
|-------|-----------|-------------------|
| `/` | Landing / redirect to dashboard | - |
| `/auth/*` | Login, Register, Forgot/Reset Password | Auth APIs |
| `/dashboard` | Dashboard chính | character + quests/daily + chat/history + shop/history + memories |
| `/chat` | Chat với AI | character + chat/history + scenes + WebSocket |
| `/shop` | Gift shop | character + shop items |
| `/messages` | DM giữa users | dm/conversations + WebSocket |
| `/quests` | Nhiệm vụ | quests/all |
| `/memories` | Kỷ niệm | memories |
| `/leaderboard` | Bảng xếp hạng | leaderboard |
| `/settings/*` | Cài đặt | profile/settings/privacy |

### Services
- **api.ts**: `ApiClient` class wrapping fetch, auto Bearer token, auto refresh on 401, BroadcastChannel cross-tab sync
- **socket.ts**: Socket.IO client, handles all real-time events
- **cross-tab-sync.ts**: BroadcastChannel initial state sync

### Stores (Zustand)
| Store | Persisted | Chức năng |
|-------|-----------|-----------|
| auth-store | accessToken | User auth state, login/logout/refresh |
| chat-store | messages (100) | Chat messages, typing, connection |
| character-store | No | Character data, mood, affection |
| notification-store | No | Popups, level up, quest complete |
| scene-store | activeSceneId | Scenes, unlock, set active |

### AppLayout (wraps all authenticated pages)
- Polls **every 30s**: `GET /dm/unread-count` + `GET /quests/daily`
- Hiển thị navbar với badge counts

---

## DATABASE (Prisma - PostgreSQL)

25+ models chính:
- **User**: email, password, username, coins, gems, streak
- **Character**: personality, mood, level, experience, affection, relationshipStage, avatar customization
- **Message**: userId, characterId, role (USER/AI/SYSTEM), content, emotion
- **Quest/UserQuest**: Quests system với progress tracking
- **Gift/UserGift/GiftHistory**: Shop items và inventory
- **Scene/CharacterScene**: Unlockable scenes
- **Memory**: Milestones và kỷ niệm
- **Conversation/ConversationMember/DirectMessage**: DM system
- **PasswordResetOTP/Token**: Password reset flow
- **RefreshToken**: JWT refresh tokens

Enums: Gender, RelationshipStage (7 stages), MessageRole, QuestType, QuestStatus, Rarity (5 tiers)

---

## RATE LIMITING

### Hiện tại
1. **Nginx** (prod): 10 req/s per IP on `/api`, 30 req/s per IP on `/`
2. **Express Global**: 100 req / 15min per IP (from .env)
3. **Auth routes**: login (5/15min prod), OTP (3/1min), verify-otp (5/15min)
4. **Socket**: message(10/10s), dm(20/60s), typing(30/60s) - in-memory per user

### Vấn đề
- Global rate limiter dùng IP → tất cả users cùng IP bị chung limit
- 100 req/15min quá thấp cho authenticated users navigating between tabs
- Không có per-user rate limiting cho authenticated routes
- Client không handle 429 response

---

## INFRASTRUCTURE (Dev)

```yaml
# docker-compose.dev.yml
PostgreSQL: localhost:5432 (vgfriend/vgfriend123/vgfriend)
Redis: localhost:6379
Adminer: localhost:8080
```

Server: `npm run dev` → tsx watch src/index.ts (port 3001)
Client: `npm run dev` → next dev (port 3000)
