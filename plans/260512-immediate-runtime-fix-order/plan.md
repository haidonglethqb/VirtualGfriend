---
title: "Immediate Runtime Fix Order"
description: "Top 3 locally verifiable runtime fix slices from the existing fix backlog."
status: pending
priority: P1
effort: 3h
branch: main
tags: [planning, runtime, backlog, validation]
created: 2026-05-12
---

# Immediate Runtime Fix Order

Scope: only high-confidence runtime slices with cheap local validation. Excludes Stripe-dependent pricing sync and non-runtime warning cleanup.

## 1. Ex-persona stale-link and archived-thread chat coherence
- Why first: already narrowed by prior handoff + tester report; explicit runtime gap remains around deleted or archived ex chat URLs and send/history behavior after status changes.
- Likely owning files:
  - `server/src/modules/chat/chat.service.ts`
  - `server/src/modules/character/relationship.service.ts`
  - `client/src/app/chat/page.tsx`
  - `client/src/store/chat-store.ts`
  - `client/src/app/settings/ex-personas/page.tsx`
- Smallest discriminating check:
  - Open `/chat?characterId=<exId>` for a known ex persona, then delete or archive that ex persona from settings or reconcile flow.
  - Reload or send one message.
  - Pass condition: client clears thread and redirects to `/settings/ex-personas` or shows a single terminal error state; backend rejects stale send/history instead of serving a fake live shell.

## 2. Breakup -> reopen -> continue ex chat thread consistency
- Why second: same area, but separate behavior slice; validates that repeated breakup/reopen paths still bind the right ex persona and do not mix active-character and explicit-character state.
- Likely owning files:
  - `server/src/modules/character/relationship.service.ts`
  - `server/src/modules/character/ex-persona.service.ts`
  - `client/src/app/chat/page.tsx`
  - `client/src/services/socket.ts`
  - `client/src/services/cross-tab-sync.ts`
- Smallest discriminating check:
  - End a relationship with `exPersonaConsent`, follow the returned ex chat route, send one message, then reconcile or repeat breakup and reopen the ex thread.
  - Pass condition: history and live socket events stay scoped to the reopened `characterId`; no bleed from the active companion thread; no permanent mute/dead-thread regression after repeated breakup.

## 3. Premium cancel/expiry state coherence across backend and subscription UI
- Why third: ownership is clear and validation is local; status contract already exists in one backend controller and one frontend page, with periodic reconciliation as a second control path.
- Likely owning files:
  - `server/src/modules/payment/payment.service.ts`
  - `server/src/modules/users/users.controller.ts`
  - `server/src/index.ts`
  - `client/src/app/subscription/page.tsx`
  - `client/src/app/payment/success/page.tsx`
- Smallest discriminating check:
  - Using a local premium test user, exercise one cancel-at-period-end state and one expired state by hitting `/users/premium-status` and refreshing `/subscription`.
  - If Stripe is available, also confirm `/payment/checkout-session/:sessionId` moves from pending to ready without stale premium badge state.
  - Pass condition: `cancelAtPeriodEnd`, `cancelAt`, tier, and badge/rendered status all agree after refresh; expired users downgrade to `FREE` consistently.

## Deferred From Immediate Order
- Admin/pricing source-of-truth sync should wait until a Stripe-enabled local env is available, because its best discriminating check depends on live Stripe-backed admin sync.