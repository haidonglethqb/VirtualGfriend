# Input Validation

## Overview
All inputs validated server-side using password validation utilities, Zod-equivalent patterns, and type-safe Prisma queries.

## Password Validation

```typescript
// server/src/lib/constants.ts
PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
}

function validatePassword(password: string): { valid: boolean; errors: string[] }
```

Vietnamese error messages for each failed requirement.

## OTP System

### Generation
- 6-digit numeric OTP
- Stored in Redis with TTL (typically 5-15 minutes)
- Rate limited: 3 requests/minute per email

### Verification
- Exact match against stored OTP
- Single-use: deleted after successful verification
- Rate limited: 5 attempts per 15 minutes

## Email Validation
- Standard regex pattern on registration
- Normalized: `email.toLowerCase().trim()`
- Verified via OTP before account activation

## Message Content Validation

```typescript
MESSAGE_LIMITS = {
  MAX_CHAT_MESSAGE_LENGTH: 2000,
  MAX_DM_MESSAGE_LENGTH: 2000,
  MAX_FACT_VALUE_LENGTH: 500,
  MAX_CHARACTER_NAME_LENGTH: 50,
}
```

- Chat messages trimmed and validated before DB insert
- DM content validated in `dmService.sendMessage()`

## File Upload Validation
- Multer middleware for file parsing
- S3/DigitalOcean Spaces for storage
- File type whitelist enforced
- Size limits configured per endpoint

## Affection/Level Ranges

```typescript
VALIDATION = {
  AFFECTION_MIN: 0,
  AFFECTION_MAX: 1000,
  LEVEL_MIN: 1,
  LEVEL_MAX: 100,
  FACT_IMPORTANCE_MIN: 1,
  FACT_IMPORTANCE_MAX: 10,
}
```

All values clamped to these ranges on update.

## Related
- [Auth Security](./auth-security.md)
- [Rate Limiting](./rate-limiting.md)
- Source: `server/src/lib/constants.ts`, `server/src/modules/auth/`
