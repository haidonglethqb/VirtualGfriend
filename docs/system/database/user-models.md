# User Models

> User profiles, settings, authentication tokens, and identity enums.
> Last updated: 2026-04-09 · Reference: `server/prisma/schema.prisma`

## User Model

```prisma
model User {
  id                String        @id @default(uuid())
  email             String        @unique
  password          String                        // bcrypt hash
  username          String?       @unique
  displayName       String?
  avatar            String?
  bio               String?       @db.Text
  isEmailVerified   Boolean       @default(false)
  isPremium         Boolean       @default(false)
  premiumTier       PremiumTier   @default(FREE)
  premiumExpiresAt  DateTime?
  coins             Int           @default(0)
  gems              Int           @default(0)
  streak            Int           @default(0)       // Daily login streak
  lastActiveAt      DateTime?
  lastLoginAt       DateTime?
  userGender        UserGender    @default(NOT_SPECIFIED)
  datingPreference  DatingPreference @default(ALL)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  // Stripe
  stripeCustomerId  String?       @unique
  // ... 20+ relations
}
```

### Indexes

```prisma
@@index([streak])           // Leaderboard: top streaks
@@index([username])         // Search by username
```

## UserSettings

```prisma
model UserSettings {
  id                    String   @id @default(uuid())
  userId                String   @unique
  language              String   @default("vi")
  theme                 String   @default("dark")
  notificationsEnabled  Boolean  @default(true)
  soundEnabled          Boolean  @default(true)
  musicEnabled          Boolean  @default(true)
  autoPlayVoice         Boolean  @default(false)
  chatBubbleStyle       String   @default("modern")
  fontSize              String   @default("medium")
  profilePublic         Boolean  @default(false)
  showActivity          Boolean  @default(false)
  allowMessages         Boolean  @default(true)
  activeSceneId         String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## PasswordResetOTP

```prisma
enum OTPType {
  PASSWORD_RESET
  REGISTRATION
}

model PasswordResetOTP {
  id        String   @id @default(uuid())
  email     String
  otp       String
  type      OTPType  @default(PASSWORD_RESET)
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([email])
}
```

## PasswordResetToken

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  email     String
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([email])
  @@index([token])
}
```

## RefreshToken

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  isRevoked Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt, isRevoked])
}
```

## Enums

```prisma
enum UserGender {
  MALE, FEMALE, NON_BINARY, OTHER, NOT_SPECIFIED
}

enum DatingPreference {
  MALE, FEMALE, NON_BINARY, ALL
}
```

## Related

- [Schema Overview](./schema-overview.md) — Full ERD and model groups
- [Auth Flow](../authentication/auth-flow.md) — Registration and login flows
- [Character Models](./character-models.md) — User → Character relationship
- [Prisma Schema](../../../server/prisma/schema.prisma) — Full source
