# System Audit Safe Fix Plan

Status: Proposed
Priority: High
Scope: backend contracts, E2E harness, deploy workflow, docs drift

## Findings Summary
- P0: local backend breaks after pull until `npx prisma generate` is rerun. Root cause: generated Prisma client can go stale while code already references new ex-persona schema fields.
- P1: E2E API harness is out of sync with OTP registration flow and some current routes, so API tests are no longer trustworthy.
- P1: deploy workflow only syncs `docker-compose.yml` to VPS while production compose mounts local `nginx/nginx.conf`; this creates config drift risk or nginx boot failure on a fresh VPS.
- P2: `docs/system/README.md` and several system docs point to nonexistent or stale paths/contracts, including payment and database docs.
- P3: frontend builds, but there are repeated hook dependency warnings that can hide stale-state bugs in admin, onboarding, chat-adjacent pages, and settings/shop flows.

## Module Risk Map
- Auth: real contract changed to OTP-first registration; tests/docs still assume immediate token issuance.
- Users/Character/Chat/AI: ex-persona feature is wired through API, UI, and background jobs; local dev breakage comes from stale generated Prisma types, not missing schema.
- Scene: route contract drift between E2E `ApiClient` and server routes.
- Payment: frontend uses `/payment/create-checkout` and `/payment/status`; docs still describe older checkout contract.
- Admin/Upload: route wiring is present; main risk is operational drift from deploy assets not being synced.
- Deploy/Docs: highest chance of system-wide regression if changed without phased rollout.

## Phases
1. [Phase 01](./phase-01-stabilize-local-and-test-contracts.md)
2. [Phase 02](./phase-02-fix-deploy-and-docs-drift.md)
3. [Phase 03](./phase-03-module-hardening-and-validation.md)

## Success Criteria
- Fresh pull works with deterministic local bootstrap.
- API/E2E contracts match current auth, scene, and payment routes.
- Deploy workflow syncs every required runtime asset for compose + nginx.
- System docs reflect current routes, schema, and user flows.
- Narrow validation passes before each broader rollout.
