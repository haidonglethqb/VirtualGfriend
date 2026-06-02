# User Profile Avatar Onboarding Plan

> Implementation plan for adding a dedicated user profile avatar flow to onboarding, with DigitalOcean Spaces storage, admin-managed subscription quotas, and post-onboarding management in profile settings.
>
> **Last updated:** 2026-06-02
> **Status:** Planning / Handoff Ready
> **Primary files:** `server/prisma/schema.prisma`, `server/src/modules/upload/upload.service.ts`, `server/src/modules/users/*`, `server/src/modules/admin/tier-config.service.ts`, `client/src/app/onboarding/page.tsx`, `client/src/app/settings/profile/page.tsx`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Confirmed Facts](#2-confirmed-facts)
3. [Product Decisions](#3-product-decisions)
4. [Architecture](#4-architecture)
5. [Backend Plan](#5-backend-plan)
6. [Frontend Plan](#6-frontend-plan)
7. [Implementation Phases](#7-implementation-phases)
8. [Acceptance Criteria](#8-acceptance-criteria)
9. [Risks and Follow-ups](#9-risks-and-follow-ups)
10. [Handoff Checklist](#10-handoff-checklist)

---

## 1. Overview

This plan adds a new profile-avatar flow for the user account while keeping the existing AI character avatar flow unchanged.

The new behavior should let the user:

- choose a default profile avatar during onboarding
- upload a custom profile avatar during onboarding
- continue to choose AI character templates exactly as the app does today
- manage profile avatars later in profile settings
- be limited by a per-tier uploaded-avatar quota that admin can edit in existing tier settings

The design must keep backward compatibility by continuing to use `users.avatar` as the active profile avatar URL for all existing consumers.

---

## 2. Confirmed Facts

These points were confirmed from the current codebase and live storage checks.

### 2.1 Existing onboarding flow

- `client/src/app/onboarding/page.tsx` currently has 7 steps.
- The current onboarding flow already uses step 3 for AI character template selection.
- That step sets `templateId`, `avatarUrl`, `personality`, and character gender for the AI character.
- The onboarding completion flow creates the character first, then patches `/users/profile` only for `userGender` and `datingPreference`.

### 2.2 Existing profile settings flow

- `client/src/app/settings/profile/page.tsx` currently edits `username`, `email`, and `bio` only.
- It already calls `PATCH /users/profile`, so it is the correct post-onboarding reuse point for profile-avatar management.

### 2.3 Existing AI avatar flow

- Character template avatars already exist and are used by onboarding and character settings.
- This logic must remain unchanged.
- AI character avatar data currently flows through character template selection and `character.avatarUrl`.

### 2.4 Existing upload and storage integration

- Backend already has a working S3-compatible DigitalOcean Spaces integration in `server/src/modules/upload/upload.service.ts`.
- Existing upload validation already supports PNG, JPEG, and WebP with a 5 MB limit.
- The current upload route is admin-only and writes into `AI_Template/...`.

### 2.5 Existing tier configuration

- Tier config is already dynamic and admin-editable through `server/src/modules/admin/tier-config.service.ts`.
- The existing admin settings surface already updates tier config through `PUT /api/admin/tier-configs/:tier`.
- `maxUserAvatars` does not exist yet and must be added.

### 2.6 Live DO Spaces verification from this session

- The configured DO Spaces credentials were verified successfully against bucket `haichu`.
- Read access to prefix `Avatar/` works.
- Write, list, and delete under `Avatar/test-user/` were tested successfully end-to-end.
- Current state shows `Avatar/` exists and is usable for this feature.

---

## 3. Product Decisions

The following decisions were explicitly chosen for this feature.

### 3.1 Scope decisions

- This feature applies to the **user profile avatar**, not the AI character avatar.
- Onboarding gets **one new user-avatar step**.
- The existing AI character template step remains intact.
- The same profile-avatar manager should be available after onboarding inside profile settings.

### 3.2 Quota policy

Default uploaded-avatar quota by tier:

| Tier | `maxUserAvatars` |
|---|---:|
| FREE | 1 |
| BASIC | 3 |
| PRO | 10 |
| ULTIMATE | -1 |

`-1` means unlimited.

### 3.3 Downgrade policy

- If the user downgrades and already has more uploaded avatars than the new tier allows, keep all existing uploaded avatars.
- Do not auto-delete user assets.
- Block only **new uploads** until the uploaded-avatar count is back within quota.
- Existing avatars remain selectable.

### 3.4 Default avatar policy

- Shared default user avatars should live under `Avatar/default/`.
- Default avatars do **not** count toward the uploaded-avatar quota.
- V1 should use a small curated catalog, not admin CRUD for preset avatar management.

---

## 4. Architecture

### 4.1 Domain split

This feature must keep two avatar domains separate:

| Domain | Purpose | Existing Source | Planned Changes |
|---|---|---|---|
| User profile avatar | Account identity | `users.avatar` | Add gallery + onboarding step + settings manager |
| AI character avatar | Companion appearance | `character.templateId`, `character.avatarUrl` | No behavioral change |

### 4.2 Storage layout

Recommended DO Spaces layout:

```text
Avatar/
  default/
    user-avatar-01.png
    user-avatar-02.png
    ...
  {userId}/
    {timestamp-or-uuid}-{safeName}.png
    {timestamp-or-uuid}-{safeName}.webp
```

### 4.3 Data model

Keep `users.avatar` as the active selected URL.

Add a new `UserAvatar` table for uploaded assets and gallery metadata.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Unique avatar record ID |
| `userId` | Owner |
| `url` | Public CDN URL |
| `objectKey` | Exact Spaces object key for safe delete |
| `mimeType` | File type |
| `sizeBytes` | File size |
| `createdAt` | Audit / sorting |
| `updatedAt` | Audit |

No `isSelected` flag is required if `users.avatar` remains the source of truth for the active avatar, though it can be added if the implementing agent prefers explicit state.

---

## 5. Backend Plan

### 5.1 Prisma changes

Update `server/prisma/schema.prisma`:

- add `userAvatars UserAvatar[]` relation to `User`
- add `UserAvatar` model
- create migration for the new table

### 5.2 Tier config changes

Update `server/src/modules/admin/tier-config.service.ts`:

- add `maxUserAvatars` to `TierConfig`
- seed defaults for all tiers
- keep merge-with-defaults behavior so existing DB config rows remain safe

Update `server/src/modules/admin/admin-tier-config.controller.ts`:

- validate `maxUserAvatars` with Zod
- allow updates through the existing admin settings path

### 5.3 Upload service changes

Update `server/src/modules/upload/upload.service.ts`:

- reuse the current file validation rules
- add a helper dedicated to user-avatar uploads
- write user uploads to `Avatar/{userId}/...`
- return both `url` and `objectKey` if helpful to avoid reverse-parsing from URL

### 5.4 New user avatar endpoints

Add authenticated endpoints under user routes.

Recommended API surface:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users/avatars` | Load active avatar, uploaded avatars, default avatars, and limits |
| POST | `/api/users/avatars/upload` | Upload a new custom avatar |
| POST | `/api/users/avatars/select-uploaded/:id` | Select one uploaded avatar as active |
| POST | `/api/users/avatars/select-default` | Select one default avatar URL as active |
| DELETE | `/api/users/avatars/:id` | Delete one uploaded avatar |

### 5.5 Response contract

The read endpoint should return a payload shaped like:

```json
{
  "activeAvatarUrl": "https://...",
  "defaultAvatars": [{ "id": "user-avatar-01", "url": "https://..." }],
  "uploadedAvatars": [{ "id": "...", "url": "...", "createdAt": "..." }],
  "limits": {
    "uploadedUsed": 1,
    "uploadedMax": 3,
    "canUpload": true
  }
}
```

### 5.6 Service-layer rules

The backend service must enforce:

- uploaded-avatar quota before upload
- ownership checks on select/delete
- safe delete using stored `objectKey`
- `users.avatar` sync on every active-avatar change
- fallback behavior if the active uploaded avatar is deleted

---

## 6. Frontend Plan

### 6.1 Onboarding changes

Update `client/src/app/onboarding/page.tsx`:

- insert a new step for **user profile avatar**
- keep the current character template step untouched
- separate profile-avatar state from character-avatar state
- update step count accordingly

Recommended onboarding order:

1. User gender
2. Dating preference
3. User profile avatar selection
4. AI character template selection
5. Character name
6. Character age
7. Character occupation
8. Character personality

### 6.2 Onboarding UX requirements

The new profile-avatar step should support:

- selecting from shared default avatars
- uploading one custom image
- showing the current tier upload quota
- showing validation errors for bad file type or file size
- continuing even if the user chooses only a default avatar

### 6.3 Profile settings reuse

Update `client/src/app/settings/profile/page.tsx`:

- display the current profile avatar
- list default avatar presets
- list uploaded avatars
- allow upload, select, and delete
- show quota usage and blocked-upload state

This page should reuse the same backend contract as onboarding.

### 6.4 API integration

Because the current API client is JSON-oriented, the implementing agent should either:

- use direct `fetch` for multipart upload, or
- add a small `FormData`-aware helper to `client/src/services/api.ts`

Do not reuse the admin upload endpoint from the client.

---

## 7. Implementation Phases

### Phase 1: Data and config foundation

1. Add `UserAvatar` Prisma model and relation on `User`.
2. Add `maxUserAvatars` to tier config and admin validation.
3. Generate migration and Prisma client.

### Phase 2: Backend avatar module

1. Extend upload service with user-avatar helper.
2. Add user-avatar service, controller, and routes.
3. Implement list, upload, select-default, select-uploaded, and delete flows.
4. Sync active avatar into `users.avatar`.

### Phase 3: Frontend onboarding and settings

1. Add profile-avatar step into onboarding.
2. Keep current AI character template step behavior unchanged.
3. Add profile-avatar manager to settings/profile.
4. Add quota display and upload-state UX.

### Phase 4: Validation and polish

1. Validate MIME and size both client-side and server-side.
2. Verify downgrade behavior and blocked-upload UX.
3. Verify deleting active uploaded avatar falls back safely.
4. Update system docs after implementation lands.

---

## 8. Acceptance Criteria

The feature is complete when all items below are true.

1. A logged-in user can open onboarding and choose either a default profile avatar or upload a custom one.
2. The user can still choose an AI character template exactly as before.
3. `users.avatar` stores the currently active profile avatar URL.
4. Uploaded profile avatars are persisted in `UserAvatar` and stored under `Avatar/{userId}/...`.
5. Default avatars are stored under `Avatar/default/` and do not count against uploaded-avatar quota.
6. Admin can edit `maxUserAvatars` through existing tier config management.
7. When the user exceeds quota after downgrade, old avatars remain selectable but new uploads are blocked.
8. Profile settings can list, upload, select, and delete profile avatars after onboarding.
9. Existing consumers of `users.avatar` continue to work without broad refactors.
10. Spaces read/write/delete still works under `Avatar/` in the deployed environment.

---

## 9. Risks and Follow-ups

### 9.1 Known risks

- Abandoned onboarding uploads may create temporary orphaned files.
- If delete logic relies on reconstructing object keys from URLs, cleanup can become fragile.
- If onboarding state is not separated cleanly, profile avatar and AI character avatar can be accidentally conflated.

### 9.2 V1 non-goals

- image crop editor
- avatar moderation pipeline
- admin CRUD for the default avatar catalog
- automatic orphan cleanup jobs
- changing the AI character template/avatar system

### 9.3 Suggested future work

- add cleanup job for stale unselected uploads if abandonment becomes common
- add `sourceType`, `selectedAt`, or soft-delete fields if future auditability is needed
- add default avatar catalog management in admin if the preset library will change often

---

## 10. Handoff Checklist

The next implementation agent should start with this order:

1. Confirm the new doc scope: profile-avatar only, AI avatar unchanged.
2. Implement Prisma `UserAvatar` and migration.
3. Extend tier config with `maxUserAvatars`.
4. Add backend avatar endpoints and service logic.
5. Add onboarding profile-avatar step.
6. Add settings/profile avatar manager.
7. Run backend typecheck and relevant frontend checks.
8. Update `docs/system/backend/routes.md`, `docs/system/database/user-models.md`, and relevant onboarding/profile docs after implementation.

Critical handoff notes:

- `client/src/app/onboarding/page.tsx` currently uses step 3 for AI template selection; the new profile-avatar step must be inserted without breaking that flow.
- `client/src/app/settings/profile/page.tsx` is the correct post-onboarding reuse surface.
- `server/src/modules/upload/upload.service.ts` already has working DO Spaces integration and validated file rules.
- DO Spaces under `Avatar/` was verified live in this session for read, upload, list, and delete.
# User Profile Avatar Onboarding Plan

> Implementation plan for adding a dedicated user profile avatar flow to onboarding, backed by DigitalOcean Spaces, tier-based upload quotas, and profile settings reuse.
>
> **Last updated:** 2026-06-02
> **Status:** Planning / handoff-ready
> **Primary files:** `server/prisma/schema.prisma`, `server/src/modules/users/`, `server/src/modules/upload/upload.service.ts`, `server/src/modules/admin/tier-config.service.ts`, `client/src/app/onboarding/page.tsx`, `client/src/app/settings/profile/page.tsx`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Confirmed Product Decisions](#2-confirmed-product-decisions)
3. [Current System Snapshot](#3-current-system-snapshot)
4. [Target User Flow](#4-target-user-flow)
5. [Storage Model](#5-storage-model)
6. [Database Changes](#6-database-changes)
7. [Tier Quota Configuration](#7-tier-quota-configuration)
8. [Backend API Design](#8-backend-api-design)
9. [Onboarding UI Changes](#9-onboarding-ui-changes)
10. [Profile Settings Reuse](#10-profile-settings-reuse)
11. [Downgrade and Quota Policy](#11-downgrade-and-quota-policy)
12. [Implementation Order](#12-implementation-order)
13. [Verification Checklist](#13-verification-checklist)
14. [Handoff Notes](#14-handoff-notes)
15. [Known Risks and Follow-ups](#15-known-risks-and-follow-ups)

---

## 1. Overview

This feature adds a dedicated **user profile avatar** flow to onboarding without changing the existing **AI character template avatar** flow.

The new system must let the user:

- choose a default profile avatar,
- or upload a custom profile avatar,
- persist the selected avatar to `users.avatar`,
- manage uploaded avatars later in profile settings,
- and respect a tier-based upload quota that admins can edit from the existing admin tier config system.

This plan intentionally keeps the current AI companion onboarding and template selection logic intact. The new work is limited to the **user profile avatar** domain.

---

## 2. Confirmed Product Decisions

These decisions were confirmed from the working discussion and should be treated as locked scope for v1:

1. **Profile avatar is separate from AI avatar.**
   The user profile avatar is not the same thing as the AI character template avatar.
2. **Onboarding gets one extra step.**
   Add one dedicated profile-avatar step into onboarding; keep the current AI template step unchanged.
3. **DigitalOcean Spaces pathing uses `Avatar/`.**
   Uploaded user-owned assets live under `Avatar/{userId}/...`.
4. **Default profile avatars are shared assets.**
   Shared defaults live under `Avatar/default/...`.
5. **Quota applies only to uploaded avatars.**
   Default avatars do not count toward the per-tier upload quota.
6. **Tier defaults are:**
   - `FREE = 1`
   - `BASIC = 3`
   - `PRO = 10`
   - `ULTIMATE = -1` (unlimited)
7. **Downgrade policy:**
   Keep existing uploaded avatars and keep them selectable, but block new uploads until the user is back within quota.
8. **Backward compatibility:**
   Continue using `users.avatar` as the active selected profile avatar URL.

---

## 3. Current System Snapshot

### 3.1 Existing avatar behavior

- `users.avatar` already exists as a single profile-avatar URL field.
- `PATCH /api/users/profile` already supports updating `avatar` with a URL.
- Character templates already use `avatarUrl` for AI companion visuals.
- Onboarding currently uses the template picker to set the AI avatar and template metadata.

### 3.2 Existing storage behavior

- DO Spaces access is confirmed working for read, write, and delete.
- Existing upload code uses AWS SDK v3 against DigitalOcean Spaces.
- Existing upload route is admin-only and stores template assets under `AI_Template/...`.

### 3.3 Existing tier config behavior

- Tier configuration is already dynamic and stored in `SystemConfig`.
- Admin can already edit tier fields through the current tier-config endpoints.
- A new avatar quota field can be added with low blast radius.

---

## 4. Target User Flow

### 4.1 Onboarding flow after change

Planned onboarding sequence:

1. User identity
2. Dating preference
3. **Profile avatar selection** (new)
4. AI character template selection (existing behavior)
5. Character name
6. Character age
7. Character occupation
8. Character personality

### 4.2 Profile avatar step behavior

In the new step, the user can:

- select one of the default profile avatars,
- or upload a new avatar image,
- preview the currently selected profile avatar,
- continue even if no upload exists, as long as a valid default avatar or uploaded avatar is selected.

### 4.3 Post-onboarding behavior

After onboarding, the same avatar domain should be manageable from profile settings:

- view active avatar,
- switch between defaults and uploaded avatars,
- upload more avatars if quota allows,
- delete uploaded avatars,
- see quota usage.

---

## 5. Storage Model

### 5.1 Spaces directory structure

```text
Avatar/
  default/
    avatar-01.png
    avatar-02.png
    ...
  {userId}/
    20260602-uuid-1.png
    20260602-uuid-2.webp
```

### 5.2 Rules

- `Avatar/default/` stores shared preset profile avatars.
- `Avatar/{userId}/` stores only user-uploaded profile avatars.
- `objectKey` must be stored in DB for uploaded avatars so deletion does not rely on parsing URLs.
- The active avatar URL must still be copied into `users.avatar`.

### 5.3 File validation

Reuse current upload validation behavior:

- allowed mime types: PNG, JPEG, WebP,
- max file size: 5 MB,
- memory upload is acceptable for v1,
- reject invalid files before touching DB.

---

## 6. Database Changes

### 6.1 New model

Add a new Prisma model for uploaded profile avatars.

Suggested shape:

```prisma
model UserAvatar {
  id        String   @id @default(uuid())
  userId    String
  url       String
  objectKey String
  mimeType  String?
  sizeBytes Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_avatars")
}
```

### 6.2 Existing model kept intact

Keep `User.avatar` unchanged.

Reason:

- many existing consumers likely read this field already,
- it minimizes frontend and backend churn,
- the gallery table becomes the source of truth for uploads,
- `User.avatar` stays the source of truth for the active selected avatar.

### 6.3 What not to do

- do not overload `Character.avatarUrl`,
- do not merge profile avatars into character templates,
- do not store all avatar state only in JSON blobs inside `SystemConfig`.

---

## 7. Tier Quota Configuration

### 7.1 New tier field

Extend `TierConfig` with:

```ts
maxUserAvatars: number;
```

### 7.2 Default values

| Tier | `maxUserAvatars` |
|---|---:|
| `FREE` | `1` |
| `BASIC` | `3` |
| `PRO` | `10` |
| `ULTIMATE` | `-1` |

### 7.3 Admin behavior

Admin should continue using the existing tier-config management surface. This means:

- add the field to `TierConfig`,
- add the field to the default config object,
- add zod validation in admin tier-config controller,
- expose it in the existing admin settings UI.

No separate admin module is needed for v1.

---

## 8. Backend API Design

### 8.1 Proposed endpoints

Under authenticated user routes:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/users/avatars` | Load active avatar, defaults, uploaded avatars, quota summary |
| `POST` | `/api/users/avatars/upload` | Upload a new user-owned avatar |
| `POST` | `/api/users/avatars/select-default` | Select a shared default avatar |
| `POST` | `/api/users/avatars/:id/select` | Select one uploaded avatar |
| `DELETE` | `/api/users/avatars/:id` | Delete one uploaded avatar |

### 8.2 Suggested response shape for `GET /api/users/avatars`

```json
{
  "success": true,
  "data": {
    "activeAvatarUrl": "https://...",
    "defaultAvatars": [
      { "id": "default-01", "url": "https://...", "label": "Avatar 1" }
    ],
    "uploadedAvatars": [
      { "id": "...", "url": "https://...", "createdAt": "..." }
    ],
    "limits": {
      "used": 1,
      "max": 3,
      "canUpload": true,
      "isUnlimited": false
    }
  }
}
```

### 8.3 Service-layer rules

- Quota enforcement happens in service logic before upload.
- Uploaded-avatar delete must verify ownership by `userId`.
- Selecting an avatar must update `users.avatar`.
- Deleting an uploaded avatar must also handle the case where the deleted image is the active one.
- Shared default avatar selection should not create a `UserAvatar` row.

### 8.4 Recommended backend module split

Keep changes local and predictable:

- reuse S3 client + file validation from `upload.service.ts`,
- add a user-avatar helper or service for `Avatar/{userId}/` object keys,
- add controller methods under the users module,
- avoid mixing new gallery behavior into generic `updateProfile` patch logic.

---

## 9. Onboarding UI Changes

### 9.1 Required frontend change

The onboarding page must no longer treat template selection as the only avatar decision.

Add a dedicated step with separate state, for example:

```ts
profileAvatarMode: 'default' | 'upload'
profileAvatarUrl: string
selectedDefaultAvatarId: string
```

This state must be independent from:

```ts
templateId
avatarUrl // current AI companion avatar
```

### 9.2 UX requirements

- show default avatar grid,
- show upload CTA,
- show current selection preview,
- show upload quota summary,
- allow continue only when a profile avatar is selected,
- preserve the current AI template step behavior after this step.

### 9.3 Persistence behavior during onboarding submit

When onboarding completes:

1. persist user profile avatar selection to the user avatar API / profile state,
2. persist AI character creation using the existing character create flow,
3. keep these two writes logically separate even if they happen in the same page flow.

---

## 10. Profile Settings Reuse

The same avatar manager should be reused in profile settings at:

- `client/src/app/settings/profile/page.tsx`

This page currently edits basic profile fields only. It is the correct place to add avatar management for the user profile domain.

Required additions:

- active avatar preview,
- default avatar selector,
- uploaded avatar gallery,
- upload button,
- delete button for uploaded assets,
- quota usage text,
- upload disabled state when over quota.

Do not move this into character settings, because that page belongs to the AI character domain.

---

## 11. Downgrade and Quota Policy

### 11.1 Confirmed rule

If a user downgrades and already has more uploaded avatars than allowed:

- keep existing uploaded avatars,
- keep them selectable,
- do not auto-delete anything,
- block new uploads until `uploadedCount <= maxUserAvatars`.

### 11.2 Why this policy is preferred

- avoids destructive surprise behavior,
- avoids background deletion risk,
- is simpler to implement safely,
- matches the user's confirmed requirement.

### 11.3 Preset avatar interaction

Preset selection must stay available regardless of upload quota status because presets do not consume user-owned upload slots.

---

## 12. Implementation Order

### Phase 1: backend foundations

1. Add `UserAvatar` model and Prisma migration.
2. Add `maxUserAvatars` to dynamic tier config and admin validation.
3. Extend upload service with a user-avatar upload helper.

### Phase 2: backend avatar API

4. Add authenticated avatar routes under users module.
5. Implement list/upload/select/delete service logic.
6. Ensure `users.avatar` sync is correct.

### Phase 3: frontend onboarding and settings

7. Add profile-avatar step to onboarding.
8. Keep AI template step unchanged after the new step.
9. Reuse the avatar manager in profile settings.

### Phase 4: validation and docs

10. Test quota, downgrade, and active-avatar edge cases.
11. Update system docs after implementation is complete.

---

## 13. Verification Checklist

1. Prisma migration applies cleanly and generates client types.
2. Backend typecheck passes after adding the new model and endpoints.
3. `GET /api/users/avatars` returns defaults, uploads, active avatar, and limits correctly.
4. Upload is blocked exactly when the tier quota is reached.
5. Default avatar selection updates `users.avatar` correctly.
6. Uploaded avatar selection updates `users.avatar` correctly.
7. Deleting an uploaded avatar removes the DB row and deletes the Spaces object.
8. Onboarding can complete with selected profile avatar plus unchanged AI template selection.
9. Profile settings can manage the same avatar data after onboarding.
10. Existing consumers that read `users.avatar` still work without broad refactor.

---

## 14. Handoff Notes

### 14.1 Files to modify first

- `server/prisma/schema.prisma`
- `server/src/modules/admin/tier-config.service.ts`
- `server/src/modules/admin/admin-tier-config.controller.ts`
- `server/src/modules/upload/upload.service.ts`
- `server/src/modules/users/users.routes.ts`
- `server/src/modules/users/users.controller.ts`
- `server/src/modules/users/users.service.ts`
- `client/src/app/onboarding/page.tsx`
- `client/src/app/settings/profile/page.tsx`

### 14.2 First safe implementation slice

The smallest safe implementation slice is:

1. add `UserAvatar`,
2. add `maxUserAvatars`,
3. expose `GET /api/users/avatars`,
4. return preset avatars from a static config,
5. keep UI work for the next slice.

That gives a stable backend contract before touching onboarding UI.

### 14.3 Confirmed infrastructure assumption

DO Spaces under bucket `haichu` and prefix `Avatar/` has already been manually verified for:

- read,
- write,
- delete.

This removes storage connectivity as a blocker for implementation.

---

## 15. Known Risks and Follow-ups

### V1 accepted risks

- If the user uploads during onboarding and abandons the flow, the uploaded image may become orphaned.
- Using `FormData` may require a small API client exception or direct `fetch` call on the frontend.
- Preset profile avatar catalog may start as a static list instead of admin-managed content.

### Suggested follow-ups after v1

1. Add cleanup for abandoned uploaded avatars.
2. Add optional image crop/resize flow.
3. Add admin management for default profile avatar catalog.
4. Add moderation / validation hardening if user-generated content becomes sensitive.
