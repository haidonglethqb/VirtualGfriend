# Rate Limiting

> Multi-layer rate limiting: public routes, authenticated users, Socket.IO, and Nginx.
> Last updated: 2026-04-09 · Reference: `server/src/modules/auth/auth.routes.ts`

## Overview

Rate limiting is applied at three layers: **Express middleware** (per-endpoint), **Socket.IO** (per-event), and **Nginx** (per-path).

## Express Rate Limits

### Public / Auth Routes

| Endpoint | Limit | Window | Notes |
|---|---|---|---|
| `POST /api/auth/login` | 5 req | 15 min | Production only (100 in dev) |
| `POST /api/auth/resend-*-otp` | 3 req | 1 min | OTP resend protection |
| `POST /api/auth/verify-*` | 5 req | 15 min | OTP verification attempts |
| `POST /api/auth/forgot-password` | 3 req | 1 min | Password reset OTP |
| General public routes | 100 req | 15 min | Per IP address |

### Authenticated Routes

| Scope | Limit | Window | Key |
|---|---|---|---|
| Per-user API | 200 req | 1 min | `user:{userId}` (JWT-based) |

**Important**: Authenticated rate limiting uses JWT-decoded `userId`, **not** IP address. This ensures consistent limits across network changes (mobile ↔ Wi-Fi).

```typescript
// Rate limit key construction
const key = `user:${decoded.userId}`;  // NOT IP-based
```

## Socket.IO Rate Limits

| Event Category | Limit | Window | Key |
|---|---|---|---|
| General messages | 10 messages | 10 seconds | Per `userId` |
| Direct messages (DM) | 20 messages | 60 seconds | Per `userId` |
| Typing indicators | 30 events | 60 seconds | Per `userId` |

Socket limits prevent spam in real-time channels and are enforced at the socket handler level.

## Nginx Layer

| Path | Limit | Notes |
|---|---|---|
| `/api/*` | 10 req/s | API endpoint protection |
| `/` | 30 req/s | Static/Next.js pages |

Nginx rate limiting is the outermost layer, applied before requests reach the Node.js application.

## Layered Defense

```
Client → Nginx (10 req/s) → Express (per-endpoint) → Socket.IO (per-event) → Handler
```

Each layer provides independent protection:
1. **Nginx**: Broad path-level protection, DDoS mitigation
2. **Express**: Granular per-endpoint limits, IP or user-based
3. **Socket.IO**: Real-time event throttling
4. **Handler**: Business logic validation (Zod schemas, etc.)

## Implementation Details

### Login Limiter (auth.routes.ts)

```typescript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: { success: false, message: 'Too many login attempts...' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### OTP Limiter

```typescript
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 3,
  message: { success: false, message: 'Too many OTP requests...' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

## Response Headers

When `standardHeaders: true` is set, responses include:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1712678400
```

## Related

- [Authentication Overview](./authentication-overview.md) — JWT auth middleware
- [Auth Flow](./auth-flow.md) — Login and registration rate limits
- [Premium Gating](./premium-gating.md) — Feature access control
- [Real-Time Architecture](../architecture/real-time-architecture.md) — Socket.IO limits
- [HTTP Security](../security/http-security.md) — Nginx configuration
