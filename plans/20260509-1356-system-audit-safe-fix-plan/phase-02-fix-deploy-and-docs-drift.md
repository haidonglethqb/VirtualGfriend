# Phase 02 Fix Deploy And Docs Drift

## Goal
Eliminate operational drift so deploys match repository state and docs stop misleading future fixes.

## Changes
1. Harden VPS deploy sync:
   - sync `nginx/nginx.conf` alongside `docker-compose.yml`
   - optionally sync any other required runtime assets under `nginx/`
   - validate mounted files exist before `docker compose --profile production up`
2. Update system docs to current reality:
   - fix `docs/system/README.md` links to real file paths
   - update payment flow/routes docs to `/payment/create-checkout`, `/payment/status`, `/payment/cancel`
   - update database docs with ex-persona fields in `Character`, `UserSettings`, and `RelationshipEventType`
3. Update E2E README/examples so local test setup uses current ports and auth flow

## Validation
- `docker compose config`
- manual dry review of `.github/workflows/deploy.yml` mounts vs copied files
- docs path existence check via `find docs/system -maxdepth 2 -type f`

## Blast Radius Control
- no app runtime refactor here
- deploy logic changed only around asset sync and preflight validation
