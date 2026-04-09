# Authentication Overview

> JWT-based auth with access + refresh token pattern, Redis cache-aside, and admin isolation.
> Last updated: 2026-04-09 · Reference: `server/src/middlewares/auth.middleware.ts`

## Architecture

VirtualGfriend uses a dual-token JWT strategy:

| Token | Expiry | Storage | Purpose |
|---|---|---|---|
| **Access Token** | 15 minutes | `Authorization: Bearer <token>` header | API request authentication |
| **Refresh Token** | 7 days | DB (`RefreshToken` model) + HTTP-only cookie | Silent token renewal |

Both tokens are persisted in the frontend Zustand persist store (`localStorage`) under key `vgfriend-auth`. Cross-tab synchronization is handled via `BroadcastChannel` + `storage` event listener.

## Token Lifecycle

```
Client                    Server                    Redis
  |                         |                         |
  |-- POST /login --------->|                         |
  |<-- {accessToken,        |                         |
  |     refreshToken} ------|                         |
  |                         |                         |
  |-- GET /api/data --------|                         |
  |  (Bearer accessToken)   |                         |
  |                         |-- cache.get(user:auth)-->|
  |                         |<-- cache hit -----------|
  |<-- 200 OK --------------|                         |
  |                         |                         |
  |-- accessToken expired --|                         |
  |-- POST /refresh ------->|                         |
  |  (cookie: refreshToken) |                         |
  |<-- {accessToken} -------|                         |
```

## Middleware: `authenticate`

Located at `server/src/middlewares/auth.middleware.ts`:

```typescript
export const authenticate = async (req, res, next) => {
  // 1. Extract Bearer token from Authorization header
  const token = authHeader.split(' ')[1];

  // 2. Verify JWT with JWT_SECRET
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

  // 3. Cache-aside: Redis → DB fallback
  const user = await getUserFromCacheOrDb(decoded.userId);

  // 4. Attach user to request
  req.user = user;
  next();
};
```

### Cache-Aside Pattern

```typescript
async function getUserFromCacheOrDb(userId: string): Promise<CachedUser | null> {
  const cacheKey = CacheKeys.userAuth(userId);  // "user:auth:{userId}"
  const cached = await cache.get<CachedUser>(cacheKey);
  if (cached) return cached;

  // Cache miss — query DB
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isPremium: true, premiumTier: true },
  });

  // Store with 15min TTL (matches access token lifetime)
  if (user) {
    await cache.set(cacheKey, user, CacheTTL.USER_AUTH); // 15 * 60 seconds
  }
  return user;
}
```

**TTL alignment**: `CacheTTL.USER_AUTH = 15 * 60` seconds — same as access token expiry, preventing stale premium status.

## Optional Auth

```typescript
export const optionalAuth = async (req, res, next) => { ... }
```

Does not throw on missing/invalid token — attaches `req.user` if valid, otherwise continues. Used for public routes that personalize responses for logged-in users.

## Admin Authentication

Admin routes use a separate middleware with `ADMIN_JWT_SECRET`:

```typescript
const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET!);
```

Admin tokens are issued independently and grant access to `/api/admin/*` routes only.

## Frontend Storage

```typescript
// Zustand persist config
persist({
  name: 'vgfriend-auth',
  storage: createJSONStorage(() => localStorage),
})
```

### Cross-Tab Sync

- **BroadcastChannel**: Real-time sync between open tabs
- **storage event**: Fallback for tabs not sharing the same BroadcastChannel

## Related

- [Auth Flow](./auth-flow.md) — Registration, login, token refresh sequences
- [Rate Limiting](./rate-limiting.md) — Per-user and per-IP rate limits
- [Premium Gating](./premium-gating.md) — Tier-based feature access control
- [Redis Cache](../../backend/middleware-stack.md) — Redis configuration and cache keys
- [Middleware Stack](../../backend/middleware-stack.md) — Full middleware pipeline
