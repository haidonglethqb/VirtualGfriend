# Phase 03 Module Hardening And Validation

## Goal
Tackle latent bugs after contracts are trustworthy, starting from highest-user-impact modules.

## Priority Order
1. Auth + Character + Chat + AI
2. Payment + Subscription UI
3. Scene + Memories + Quest/Gift flows
4. Admin + analytics/supporting modules

## Hardening Work
- audit hook dependency warnings on pages with write operations or stateful polling
- verify ex-persona flows end-to-end: breakup, background notifications, reopen chat, mute, delete
- verify payment success polling and premium downgrade/refresh behavior
- verify background jobs do not assume stale route/schema contracts

## Validation Matrix
- backend: `npm run typecheck`
- frontend: `npm run build`
- e2e api: auth, character, chat, features
- targeted manual flows: subscription success, ex-persona settings, admin pricing sync

## Exit Conditions
- no stale contract between server routes, client calls, E2E helpers, and docs
- deploy workflow has no hidden runtime asset dependency
- remaining warnings are triaged with owners and severity
