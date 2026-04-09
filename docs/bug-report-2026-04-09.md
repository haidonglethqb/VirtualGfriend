# 🐛 Bug Report - VirtualGfriend System

**Date:** 2026-04-09  
**Analyzed By:** Multi-agent code review (debugger, code-reviewer, tester, explorer)  
**Scope:** Full codebase (server/, client/, e2e/, shared/)

---

## 📊 Summary Statistics

| Severity | Count | Priority |
|----------|-------|----------|
| 🔴 CRITICAL | 6 | Fix immediately |
| 🟠 HIGH | 10 | Fix this week |
| 🟡 MEDIUM | 14 | Fix this sprint |
| 🔵 LOW | 20 | Technical debt |
| **TOTAL** | **50** | |

---

## 🔴 CRITICAL BUGS (Fix Immediately)

### C1. Gift Double-Spend Race Condition
- **File:** `server/src/modules/gift/gift.service.ts` - `sendGift()`
- **Issue:** Inventory check (`userGift.quantity < 1`) happens **outside** transaction. Concurrent requests can both pass the check, then both decrement, resulting in negative quantity.
- **Impact:** Users can send gifts they don't have, losing virtual currency
- **Fix:** Move quantity check inside transaction or use atomic `update` with `where: { quantity: { gte: 1 } }`

### C2. Quest Double-Claim Race Condition (TOCTOU)
- **Files:** 
  - `server/src/modules/quest/quest.service.ts` - `claimReward()`
  - `server/src/modules/game/game-event.service.ts` - `autoClaimQuest()`
- **Issue:** Both methods can claim the same quest simultaneously. Classic time-of-check-time-of-use race condition.
- **Impact:** Users receive double rewards
- **Fix:** Use atomic `updateMany` with status guard: `where: { id, status: 'COMPLETED' }` and check `result.count === 0`

### C3. JWT Algorithm Downgrade Vulnerability
- **Files:** 
  - `server/src/sockets/index.ts:57`
  - `server/src/middlewares/auth.middleware.ts:72`
- **Issue:** `jwt.verify(token, process.env.JWT_SECRET!)` without `algorithms` option
- **Impact:** Attacker can forge JWTs by downgrading to `none` algorithm
- **Fix:** Add `{ algorithms: ['HS256'] }` to all `jwt.verify()` calls

### C4. Unbounded Memory Leak - Socket Rate Limiters Map
- **File:** `server/src/sockets/index.ts`
- **Issue:** `rateLimiters` Map stores per-user entries that are **never cleaned up**
- **Impact:** Server memory grows indefinitely, eventual OOM crash
- **Fix:** Add periodic cleanup interval (every 5 min) to delete expired entries

### C5. Zustand Store Stale After Token Refresh
- **File:** `client/src/services/api.ts` - `doRefreshToken()`
- **Issue:** New token written to `localStorage` but Zustand store not notified
- **Impact:** API calls in same tick use old token, causing 401 errors
- **Fix:** Call `useAuthStore.getState().setAccessToken(newToken)` after updating localStorage

### C6. E2E Chat Tests Completely Broken
- **File:** `e2e/pages/ChatPage.ts` (lines 56-57)
- **Issue:** 
  - `messageInput` uses invalid `:near()` pseudo-selector (not supported by Playwright)
  - `sendButton` resolves to `<div>` not `<button>`, causing DOM detachment
- **Impact:** **5 chat tests fail**, entire chat test suite unreliable
- **Fix:** Use `getByRole('textbox')` and `getByRole('button', { name: /send/i })`

---

## 🟠 HIGH SEVERITY BUGS (Fix This Week)

### H1. Missing Transaction in Relationship Reconciliation
- **File:** `server/src/modules/character/relationship.service.ts` - `reconcileRelationship()`
- **Issue:** Multiple DB operations (deactivate, reactivate, deduct gems, create event) without transaction
- **Impact:** Inconsistent state if operation fails midway
- **Fix:** Wrap all operations in `prisma.$transaction()`

### H2. `updateAffection` Missing Authorization Check
- **File:** `server/src/modules/character/character.service.ts`
- **Issue:** `userId` parameter is **optional**, allowing any user to manipulate another's character affection
- **Impact:** Security vulnerability - unauthorized affection manipulation
- **Fix:** Always pass `userId` and make the parameter required

### H3. Stale Cache After Premium Auto-Downgrade
- **File:** `server/src/middlewares/premium.middleware.ts` - `attachPremiumInfo()`
- **Issue:** Auto-downgrade writes to DB but doesn't invalidate auth middleware's cache
- **Impact:** Users retain premium access after expiration until cache expires
- **Fix:** After auto-downgrading, delete cache key: `await cache.del(CacheKeys.userAuth(userId), CacheKeys.user(userId))`

### H4. Redis Milestone Counters Never Initialized
- **File:** `server/src/modules/game/game-event.service.ts` (lines 96-107)
- **Issue:** Counter only increments if already exists (`current !== null`), but never initialized to 0
- **Impact:** Milestone checks for `messageCount === 1` never fire
- **Fix:** Initialize with `cache.setNX(key, 1, 3600)` on first message, or use `INCR`

### H5. `isEvening` Off-By-One Bug
- **File:** `server/src/modules/game/game-event.service.ts` (line 145)
- **Issue:** `currentHour >= 21 && currentHour <= 24` - `getHours()` returns 0-23, so `<= 24` always true
- **Fix:** Change to `currentHour >= 21 && currentHour < 24`

### H6. Password Validation Inconsistency
- **Files:** 
  - `server/src/modules/auth/auth.controller.ts` (changePasswordSchema: min 6)
  - `server/src/lib/constants.ts` (validatePassword: requires 8+ with complexity)
- **Issue:** Controller allows weaker passwords than registration, reset password can be weaker than original
- **Impact:** Users can weaken their passwords after registration
- **Fix:** Align all schemas to use the same validation constants

### H7. Stripe Webhook No Idempotency
- **File:** `server/src/modules/payment/payment.service.ts` - `handleCheckoutCompleted()`
- **Issue:** Stripe retries webhooks for 3 days, `upsert` runs user update on every retry
- **Impact:** Wasteful operations, cache invalidation storms
- **Fix:** Check if subscription already exists with status `ACTIVE` before doing user update

### H8. Console.log Leaks Sensitive Data
- **File:** `server/src/modules/auth/auth.service.ts` - `login()` method
- **Issue:** Logs email addresses and auth attempt details via `console.log` instead of structured logger
- **Impact:** Sensitive data in production logs
- **Fix:** Replace all `console.log` with structured `log.debug()` calls from `createModuleLogger`

### H9. N+1 Query Pattern in Leaderboard
- **File:** `server/src/modules/leaderboard/leaderboard.service.ts`
- **Issue:** `distinct: ['userId']` with nested `user` relation causes per-result queries in PostgreSQL
- **Impact:** Performance degradation with large user base
- **Fix:** Use raw SQL or split query: first get character IDs, then batch-fetch users with `WHERE id IN (...)`

### H10. Chat Message Temp ID Mismatch
- **File:** `client/src/store/chat-store.ts` - `replaceMessage()`
- **Issue:** Optimistic message uses `clientId`, but server may echo different ID, causing duplicate messages
- **Impact:** Chat shows duplicate messages after server response
- **Fix:** Ensure server echo includes original `clientId` as lookup key, or use two-key match

---

## 🟡 MEDIUM SEVERITY BUGS (Fix This Sprint)

### M1. `IN_LOVE` Relationship Stage Unreachable
- **File:** `server/src/modules/character/character.service.ts`
- **Issue:** Threshold checks skip `IN_LOVE` (850): `>= 900` returns `LOVER`, `>= 750` returns `DATING`
- **Fix:** Add `if (affection >= 850) return 'IN_LOVE';` between checks

### M2. Missing Zod Validation on DM Controller
- **File:** `server/src/modules/dm/dm.controller.ts`
- **Issue:** No input validation, accepts arbitrary content/types
- **Impact:** Can cause downstream processing issues
- **Fix:** Add Zod schemas for all DM controller endpoints

### M3. Recursive `processAction` Can Overwhelm DB
- **File:** `server/src/modules/game/game-event.service.ts` - `processAction()`
- **Issue:** `Promise.all` with recursive `autoClaimQuest` calls can spawn unbounded parallel DB transactions
- **Fix:** Use sequential processing or concurrency limiter (`p-limit`)

### M4. `giveMilestoneReward` Not Transactional
- **File:** `server/src/modules/game/game-event.service.ts`
- **Issue:** Balance update and affection update are separate DB calls
- **Impact:** Partial reward if second operation fails
- **Fix:** Wrap in `prisma.$transaction()`

### M5. Daily Quest Auto-Start Data Loss
- **File:** `server/src/modules/game/game-event.service.ts` - `autoStartDailyQuests()`
- **Issue:** `deleteMany` + `create` in transaction loses in-progress quests from other server instances
- **Fix:** Only delete expired quests, use upsert pattern

### M6. Missing Input Sanitization on AI Messages
- **File:** `server/src/modules/chat/chat.service.ts` - `sendMessage()`
- **Issue:** User messages passed directly to AI without sanitization, vulnerable to prompt injection
- **Fix:** Add server-side content filtering for known injection patterns

### M7. 429 Retry Cap Too Low
- **File:** `client/src/services/api.ts`
- **Issue:** Caps retry at 5s even if server requests 30s wait
- **Impact:** Compounds rate limiting issues
- **Fix:** Respect full `Retry-After` header, or cap at 10s

### M8. Socket External Listeners Unbounded
- **File:** `client/src/services/socket.ts` - `on()` method
- **Issue:** Array grows without deduplication if components don't call `off()`
- **Impact:** Memory leak, duplicate event handling
- **Fix:** Deduplicate before pushing, or use WeakMap pattern

### M9. Chat localStorage XSS Risk
- **File:** `client/src/store/chat-store.ts`
- **Issue:** AI-generated content persisted to localStorage, dangerous if `dangerouslySetInnerHTML` used in future
- **Fix:** Document risk, ensure no unsafe HTML rendering with message content

### M10. Character Fact Key Inconsistency
- **Files:** 
  - `server/src/modules/character/facts.controller.ts`
  - `server/src/modules/character/character.service.ts`
- **Issue:** Manual facts don't normalize keys, but AI extraction uses `snake_case`
- **Impact:** Duplicate/conflicting facts under different keys
- **Fix:** Normalize fact keys in service layer using same function as AI extraction

### M11. Missing `isActive` Filter in Gift Service
- **File:** `server/src/modules/gift/gift.service.ts` - `sendGift()`
- **Issue:** Can send gifts to inactive/ended characters
- **Impact:** Wasted resources, confusing UX
- **Fix:** Add `isActive: true` to character ownership check

### M12. E2E Password Reset Navigation Broken
- **File:** `e2e/tests/ui/auth/password-reset.spec.ts`
- **Issue:** "Quay lại" link uses `router.back()` not direct href to `/auth/login`
- **Impact:** Test failure, potential UX issue
- **Fix:** Use `waitForURL` instead of checking `getCurrentUrl()` after click

### M13. Auth Store Flash on Rehydration
- **File:** `client/src/stores/auth-store.ts`
- **Issue:** `partialize` only persists token, not user object
- **Impact:** Flash of unauthenticated state on refresh
- **Fix:** Also persist `user` in `partialize`, or add `isRehydrating` state

### M14. Missing E2E Test Coverage
- **Files:** `e2e/tests/`
- **Gaps:** DM/Messaging, Quests UI, Shop/Gifts UI, Leaderboard, Accessibility, Mobile views
- **Impact:** Untested code paths likely contain bugs
- **Fix:** Add tests for critical user journeys

---

## 🔵 LOW SEVERITY BUGS (Technical Debt)

### L1. Hardcoded Socket Timeout
- **File:** `server/src/sockets/index.ts`
- **Issue:** AI response typing delay uses `1000 + Math.random() * 2000` instead of constants
- **Fix:** Use `TIMINGS.AI_TYPING_DELAY` from constants

### L2. Prisma `$connect()` Runs on Every Hot-Reload
- **File:** `server/src/lib/prisma.ts`
- **Issue:** Connection logging runs on every module reload in dev mode
- **Impact:** Can exhaust database connection pool in dev
- **Fix:** Guard connection attempt or only call `$connect()` explicitly

### L3. Graceful Shutdown Doesn't Drain Socket Connections
- **File:** `server/src/index.ts` - SIGTERM handler
- **Issue:** Closes HTTP server and disconnects DB/Redis but doesn't notify socket clients
- **Fix:** Emit `server:shutting_down` event before closing, wait a few seconds

### L4. Missing Foreign Key on `UserSettings.activeSceneId`
- **File:** `server/prisma/schema.prisma`
- **Issue:** `activeSceneId` has no `@relation` to Scene model
- **Impact:** Orphaned scene IDs can exist if scene is deleted
- **Fix:** Add proper relation with `onDelete: SetNull`

### L5. Duplicate `isVipTier` Function Imports
- **File:** `server/src/middlewares/premium.middleware.ts`
- **Issue:** Imports `isVipTier` from constants but also defines it locally
- **Fix:** Remove duplication, use single source

### L6. Inconsistent Error Response Formats
- **Files:** Multiple controllers
- **Issue:** Some return `{ success: false, error: { code, message } }`, others return `{ success: false, message: string }`
- **Fix:** Standardize all error responses through AppError + error middleware pattern

### L7. `getSubscriptionStatus` Makes 2 Queries When 1 Suffices
- **File:** `server/src/modules/payment/payment.service.ts`
- **Issue:** Queries subscription and user separately
- **Fix:** Use `prisma.user.findUnique({ where: { id: userId }, include: { subscription: true } })`

### L8. `healthCache` Per-Instance
- **File:** `server/src/index.ts` - health endpoint
- **Issue:** In-memory cache with 5s TTL, inconsistent across multiple instances
- **Impact:** Issue for horizontal scaling only

### L9. Unused `distinct` May Cause Incorrect Leaderboard Results
- **File:** `server/src/modules/leaderboard/leaderboard.service.ts`
- **Issue:** `distinct: ['userId']` with ordering can produce unexpected results in PostgreSQL
- **Fix:** Use subquery or raw SQL to get best character per user first

### L10. `BasePage.fillInput()` Uses Deprecated `locator.clear()`
- **File:** `e2e/pages/BasePage.ts`
- **Issue:** `locator.clear()` is deprecated in newer Playwright versions
- **Fix:** Remove `.clear()`, `fill()` already clears automatically

### L11. E2E Password Reset Tests Lack Assertions
- **File:** `e2e/tests/ui/auth/password-reset.spec.ts` (lines 23-33, 114-137)
- **Issue:** Several tests have no assertions, always pass
- **Fix:** Add proper assertions for expected outcomes

### L12. `console.log` in Various Production Files
- **Files:** Multiple
- **Issue:** Unstructured logging leaks sensitive data
- **Fix:** Replace with structured logger throughout

### L13. Chat Page Component 608+ Lines
- **File:** `client/src/app/chat/page.tsx`
- **Issue:** Exceeds 600 lines mixing message rendering, gift modal, scene selector, socket setup, i18n
- **Fix:** Extract sub-components for better maintainability

### L14. AI System Prompt 600+ Lines Hardcoded String
- **File:** `server/src/modules/ai/ai.service.ts` - `buildSystemPrompt()`
- **Issue:** Massive system prompt as template literal
- **Fix:** Extract to config file or template system

### L15. No CSRF Protection
- **Issue:** Uses `credentials: 'include'` with cookies but no CSRF middleware
- **Mitigation:** `sameSite: 'strict'` cookie flag provides basic protection
- **Fix:** Add explicit CSRF tokens for defense-in-depth

### L16. `(req as any).user` Type Cast in Error Middleware
- **File:** `server/src/middlewares/error.middleware.ts`
- **Issue:** Improper type cast instead of using Express type augmentation
- **Fix:** Use properly typed `req.user` from auth middleware augmentation

### L17. Date Serialization Inconsistency in Chat Store
- **File:** `client/src/store/chat-store.ts`
- **Issue:** `createdAt: Date | string` - dates become strings when persisted to localStorage
- **Impact:** Downstream code expecting `Date` objects will break
- **Fix:** Standardize date handling, parse strings back to Date on rehydration

### L18. Socket Error Handler Swallows Errors Silently
- **File:** `client/src/services/socket.ts`
- **Issue:** `this.socket.on('error', () => {})` hides connection failures from users
- **Fix:** Show user-friendly error notification or retry indicator

### L19. `mergeMessages` Can Lose Message Ordering
- **File:** `client/src/store/chat-store.ts` - `mergeMessages()`
- **Issue:** Uses Map keyed by `message.id`, first one wins if same ID
- **Fix:** Use newer `createdAt` timestamp to decide which version wins

### L20. `PremiumGate` Configs Not Awaited on First Render
- **File:** `client/src/components/PremiumGate.tsx`
- **Issue:** Access check runs immediately with potentially stale `allTierConfigs`
- **Fix:** Show loading state while configs are being fetched for first time

---

## 📋 Unresolved Questions

1. **Horizontal Scaling:** Is the server designed for single or multiple instances? Several bugs (Redis debounce, health cache, rate limiter Map) behave differently in multi-instance setups.
2. **Stripe Webhook Secret:** Is `STRIPE_WEBHOOK_SECRET` actually set in production? If not, webhook signature verification is effectively disabled.
3. **Redis Availability:** Is Redis required or truly optional? Several critical features (daily quest debounce, message counting, deduplication) depend on Redis.
4. **AI Service Fallback:** When AI service fails (rate limits, network issues), what's the expected degradation behavior? Some paths have fallbacks, others don't.
5. **Actual Chat Input Element:** What is the real DOM structure for the chat input? Current E2E locator assumes `<input type="text">` but app may use `<textarea>`.

---

*Generated: 2026-04-09*  
*Ready for triage and fix assignment*
