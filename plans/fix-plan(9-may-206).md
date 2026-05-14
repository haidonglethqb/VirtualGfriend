# Fix Plan (9 May 2026)

Status: In progress
Scope: non-Playwright system audit follow-up
Goal: keep a clear backlog of safe fixes still worth doing after the current deploy/runtime hardening pass

## Done Already
- Stabilized local backend bootstrap by forcing Prisma client regeneration in server scripts
- Hardened deploy workflow to sync `docker-compose.yml` and `nginx/nginx.conf`
- Added deploy preflight checks for runtime files and compose rendering
- Fixed Docker Compose secret interpolation risk for values containing `$`
- Corrected major docs drift in system index, backend routes, deployment docs, and database docs
- Fixed false-success behavior on `/payment/success` by verifying checkout session ownership and activation state
- Unified character slot counting so ended relationships and ex-personas do not consume active slots
- Blocked archived reconciled ex-personas from reappearing as valid chat/history targets
- Normalized expired premium/subscription state so stale cancel-at-period-end data does not leak to client status screens
- Fixed chat daily usage double counting and aligned Socket.IO sends with the same daily quota enforcement
- Cleaned current frontend hook warnings and configured Next.js `metadataBase`
- Replaced stale public pricing content with backend-driven pricing/tier data and refreshed subscription state on tab return
- Hardened cached daily message counting to avoid read-modify-write drift during concurrent sends

## Explicitly Deferred
- Playwright and API-harness flow repair was intentionally skipped per user instruction

## Remaining Fixes To Do Later

### P1 Runtime Bugs / High Value
1. Optional deeper manual ex-persona regression pass:
   - repeated breakup → reconcile → reopen attempts
   - delete-after-opened-thread behavior across tabs
2. Optional deeper premium regression pass with live Stripe state:
   - pending Stripe activation vs premium badge refresh timing
   - live cancel-at-period-end refresh after webhook updates

### P2 Correctness / Consistency
1. Re-audit docs for any remaining stale contract references after the newest payment + quota changes
2. Review any remaining client stale-state risks that are not covered by current build validation

### P3 Operational / Validation Gaps
1. Re-run Docker image build validation on a machine with Docker daemon available
2. Recheck production compose mounts vs actual deployed files after next real deploy
3. Decide whether the skipped API/E2E harness should be repaired in a separate pass

## Safe Order For Next Pass
1. Chat + ex-persona runtime audit
2. Premium lifecycle and payment edge-case audit
3. Frontend hook-warning cleanup on pages with write operations or polling
4. Optional E2E/API harness realignment in a separate isolated pass

## Suggested Validation For Next Pass
- `cd server && npm run typecheck`
- `cd server && npm run build`
- `cd client && npm run build`
- manual verification of subscription success, cancellation, expiry, and ex-persona chat flows
- `docker compose config` on the final deploy bundle

## Notes
- Current non-Playwright fixes are already in working tree and validated locally where possible
- Backend typecheck and build passed after the latest quota and payment verification fixes
- Frontend build passed after pricing and subscription refresh updates
- Docker image build was not fully revalidated locally if Docker daemon is unavailable