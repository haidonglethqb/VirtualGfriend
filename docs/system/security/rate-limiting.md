# Rate Limiting

## Overview
Layered rate limiting across Nginx, Express, and Socket.IO to protect against abuse while maintaining UX for legitimate users.

## Layer 1: Nginx

```nginx
# Global zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

location /api {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://server;
}

location / {
    limit_req zone=general_limit burst=50 nodelay;
    proxy_pass http://client;
}
```

| Zone | Rate | Burst | Scope |
|------|------|-------|-------|
| `api_limit` | 10 req/s | 20 | `/api/*` |
| `general_limit` | 30 req/s | 50 | All other routes |

## Layer 2: Express (Per-Endpoint)

```typescript
// Login: 5 attempts / 15min (prod), 100 (dev)
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 });

// OTP: 3 attempts / 1min
const otpLimiter = rateLimit({ windowMs: 60*1000, max: 3 });

// Verify OTP: 5 attempts / 15min
const verifyOtpLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 });
```

## Layer 3: Socket.IO

| Event | Limit | Window |
|-------|-------|--------|
| `message:send` | 10 | 10 seconds |
| `dm:send` | 20 | 60 seconds |
| `typing` | 30 | 60 seconds |

Constants defined in `server/src/lib/constants.ts`:
```typescript
RATE_LIMITS = {
  SOCKET_MESSAGE_SEND: { MAX_REQUESTS: 10, WINDOW_MS: 10000 },
  SOCKET_DM_SEND: { MAX_REQUESTS: 20, WINDOW_MS: 60000 },
  SOCKET_TYPING: { MAX_REQUESTS: 30, WINDOW_MS: 60000 },
}
```

## Per-User Rate Limiting
- Authenticated routes decode JWT to extract `userId`
- Rate limit key: `user:{userId}` instead of IP
- Prevents shared-IP false positives (NAT, corporate networks)

## Related
- [Auth Security](./auth-security.md)
- [Input Validation](./input-validation.md)
- Source: `server/src/middlewares/`, `nginx/nginx.conf`, `server/src/lib/constants.ts`
