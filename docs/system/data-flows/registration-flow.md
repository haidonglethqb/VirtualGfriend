# Registration Flow

## Overview
Two-step registration: data + OTP verification → JWT tokens → Zustand store.

## Flow Diagram

```mermaid
sequenceDiagram
    participant Client
    participant AuthRouter
    participant AuthService
    participant Redis
    participant Email
    participant DB

    Client->>AuthRouter: POST /api/auth/register
    Note over Client,AuthRouter: {email, password, username?, displayName?}
    AuthRouter->>AuthService: register(data)
    AuthService->>AuthService: validatePassword()
    AuthService->>DB: Check email/username exists
    AuthService->>AuthService: bcrypt.hash(password, 12)
    AuthService->>Redis: SET pending_registration:{email} (15min)
    AuthService->>Email: Send OTP (Nodemailer SMTP)
    AuthService-->>Client: {status: "OTP_SENT", email}

    Client->>AuthRouter: POST /api/auth/verify-registration
    Note over Client,AuthRouter: {email, otp}
    AuthRouter->>AuthService: verifyRegistration(email, otp)
    AuthService->>AuthService: Verify OTP
    AuthService->>Redis: GET pending_registration:{email}
    AuthService->>DB: CREATE user (coins:100, gems:10, isEmailVerified:true)
    AuthService->>AuthService: Generate JWT pair (access:15min, refresh:7d)
    AuthService->>DB: Store refresh token
    AuthService->>Redis: DEL pending_registration
    AuthService-->>Client: {user, tokens: {accessToken, refreshToken, expiresIn}}
```

## Token Generation

```typescript
ACCESS_TOKEN_EXPIRES = 15 * 60;   // 15 minutes
REFRESH_TOKEN_EXPIRES = 7 * 24 * 60 * 60;  // 7 days

function generateTokens(userId, email) {
  accessToken = jwt.sign({userId, email}, JWT_SECRET, {expiresIn: 900})
  refreshToken = jwt.sign({userId, email, tokenId: uuid()}, JWT_REFRESH_SECRET, {expiresIn: 604800})
}
```

## Email Delivery
- **Transport**: Nodemailer SMTP
- **Config**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- **OTP TTL**: 5-15 minutes (configurable)

## Client-Side (Zustand)
- Tokens stored in Zustand persist middleware
- `accessToken` attached to API requests as `Bearer` header
- `refreshToken` stored in DB, rotated on use

## Related
- [Auth Security](../security/auth-security.md)
- [Chat Flow](./chat-flow.md)
- Source: `server/src/modules/auth/auth.service.ts`, `auth.routes.ts`, `password-reset.service.ts`
