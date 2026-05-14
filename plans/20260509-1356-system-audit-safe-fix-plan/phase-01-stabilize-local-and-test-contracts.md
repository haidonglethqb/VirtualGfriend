# Phase 01 Stabilize Local And Test Contracts

## Goal
Remove false negatives after pull and restore test credibility without touching production behavior.

## Evidence
- `server` typecheck fails before `prisma generate`, then passes immediately after regeneration.
- E2E API specs call `register -> login` directly even though registration is OTP-first.
- E2E helper still contains stale route contracts such as scene activation mismatch.

## Changes
1. Make local backend deterministic:
   - add a safe generation hook (`postinstall` or `pretypecheck`/`prebuild`) in `server/package.json`
   - document `prisma generate` as part of the local bootstrap path only if hooks are intentionally avoided
2. Repair E2E auth contract:
   - update `e2e/api/ApiClient.ts` and API specs to support OTP-first registration
   - avoid tests that assume tokens are returned directly from `/auth/register`
3. Repair stale helper routes:
   - align scene and any other stale E2E endpoints with current server routes
4. Re-run narrow checks:
   - `cd server && npx prisma generate && npm run typecheck`
   - `cd e2e && npm ci && npm run test:api`

## Blast Radius Control
- no schema change in this phase
- no business-logic change in runtime services
- only tooling, harness, and contract-alignment work
