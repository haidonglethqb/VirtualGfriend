# Backend Routes

Complete API endpoint reference. Base path: `/api`.

**Reference:** `server/src/routes/index.ts`, `server/src/modules/*/`

## Endpoints by Module

### Auth (`/auth`) — Public except `/me`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Start registration and send OTP |
| POST | `/resend-registration-otp` | Resend registration OTP |
| POST | `/login` | Login (user + tokens) |
| POST | `/refresh` | Refresh token (HTTP-only cookie) |
| POST | `/logout` | Yes — Logout |
| POST | `/forgot-password` | Request reset OTP |
| POST | `/verify-otp` | Verify password-reset OTP |
| POST | `/reset-password` | Reset password with OTP/reset token |
| POST | `/verify-registration` | Complete registration after OTP verification |
| POST | `/change-password` | Yes — Change current password |
| GET | `/me` | Yes — Current user profile |

Auth user payloads (`/login`, `/refresh`, `/me`) include premium identity fields used by frontend gates: `isPremium`, `premiumTier`, `userGender`, `datingPreference`.

### Users (`/users`) — Auth required
| Method | Path | Description |
|---|---|---|
| GET/PATCH | `/profile` | Get/update profile |
| GET | `/avatars` | Active profile avatar, defaults, uploads, quota |
| POST | `/avatars/upload` | Upload user profile avatar to `Avatar/{userId}/` |
| POST | `/avatars/select-default` | Select shared default profile avatar |
| POST | `/avatars/:id/select` | Select owned uploaded profile avatar |
| DELETE | `/avatars/:id` | Delete owned uploaded profile avatar |
| GET/PATCH | `/settings` | Get/update settings |
| GET/PATCH | `/privacy` | Get/update privacy (`allowMessages`, `allowExPersonaMessages`, `allowExComebackEmails`, profile visibility) |
| GET | `/stats` | User stats summary |
| GET | `/notifications` | List notifications |
| POST | `/notifications/read` | Mark notifications as read |
| GET | `/premium-status` | Current premium tier, features, expiry |

`/users/avatars` keeps `users.avatar` as the active profile-avatar URL. Uploaded avatars are quota-limited by tier `maxUserAvatars`; defaults do not count.

### Character (`/character`) — Auth required
| Method | Path | Description |
|---|---|---|
| GET | `/` | Current default active character (newest active non-ex). Optional query: `characterId` to load a specific active non-ex character |
| GET | `/me` | Alias for GET `/` (supports optional `characterId` query) |
| POST | `/` | Create character (enforces tier `maxCharacters` by counting only `isEnded=false && isExPersona=false`) |
| PATCH | `/` | Update default active character, or target a specific active non-ex character via optional query `characterId` |
| PATCH | `/update` | Alias for PATCH `/` (supports optional `characterId` query) |
| PATCH | `/customize` | Avatar customization |
| GET/POST | `/facts` | Get/add facts |
| PATCH/DELETE | `/facts/:factId` | Update/delete fact |
| GET | `/templates` | Public template list |
| GET | `/relationship` | Relationship status + progression; if no active relationship, returns `NO_ACTIVE_RELATIONSHIP` plus latest ended relationship summary instead of throwing `NO_CHARACTER` |
| GET | `/relationship/history` | Full relationship list, including active characters, original ended relationships, live ex-personas, and ex access metadata |
| POST | `/relationship/end` | Break up with default active character or `characterId`; requires `reasonPreset`, accepts `reasonNote`, stores the reason on the original character, and returns `chatHref` to the archive |
| POST | `/relationship/reconcile/:characterId` | VIP-only restore for an ended original character once affection is at least 700; no gem cost and no second affection penalty |
| PATCH | `/relationship/ex-personas/:characterId` | Update ex-persona settings such as `exMessagingEnabled` (enabling messaging requires active paid tier with ex-persona feature) |
| DELETE | `/relationship/ex-personas/:characterId` | Permanently delete an ex-persona and its character-bound history |

### Chat (`/chat`) — Auth required
| Method | Path | Description |
|---|---|---|
| GET | `/history` | Legacy default history for newest active non-ex character |
| GET | `/history/:characterId` | Paginated messages for a specific character; ended original characters return basic read-only archive for FREE users and full ex chat metadata for VIP users |
| GET | `/daily-usage` | Premium-aware daily usage counters |
| POST | `/send` | Send (REST fallback, socket preferred). `characterId` is the standard multi-chat target; ended original characters use VIP-only ex chat mode without quest/arc/game progress |
| DELETE | `/message/:messageId` | Delete a message |
| GET | `/search` | Search messages |

### Quests (`/quests`), Gifts (`/gifts`), Shop (`/shop`→alias)
| Module | Path | Description |
|---|---|---|
| Quests | `GET /`, `GET /all`, `GET /me`, `GET /my`, `GET /daily` | Non-arc all/daily/current-user quests |
| Quests | `POST /start/:questId`, `POST /complete/:questId` | Start or complete non-arc quest progress |
| Quests | `POST /claim/:questId` | Claim non-arc quest reward |
| Arcs | `GET /arcs` | Sequential arc list with unlock state, progress, and quest summaries |
| Arcs | `GET /arcs/:arcId` | Arc detail with quest progress and completion rewards |
| Arcs | `POST /arcs/:arcId/start` | Auto-start all active quests in an unlocked arc |
| Arcs | `POST /arcs/:arcId/quests/:questId/claim` | Claim the final manual arc quest |
| Arcs | `POST /arcs/:arcId/claim` | Claim once-only arc completion rewards |
| Gifts | `GET /gifts` | Gift catalog |
| Gifts | `GET /gifts/inventory` | Purchased items |
| Gifts | `POST /gifts/buy` | Buy with coins/gems (atomic debit with balance guard) |
| Gifts | `POST /gifts/send` | Send to active character through normal gift flow |
| Gifts | `POST /gifts/send-ex` | VIP-only ex gift flow for ended original characters; consumes inventory but does not trigger normal `SEND_GIFT` quest/game progress |
| Gifts | `GET /gifts/history` | Gift history |
| Gifts | `GET /gifts/vip-pack/status` | VIP monthly pack preview, claim state, countdown |
| Gifts | `POST /gifts/vip-pack/claim` | Claim unclaimed eligible VIP pack segments |

### Daily Reward (`/daily-reward`) — Auth required
| Method | Path | Description |
|---|---|---|
| GET | `/status` | Current reward day + can-claim status |
| POST | `/claim` | Claim daily reward (UTC-day guard + transaction-safe anti double-claim) |

### Scenes (`/scenes`), Memories (`/memories`)
| Module | Path | Description |
|---|---|---|
| Scenes | `GET /` | List scenes |
| Scenes | `GET /unlocked`, `GET /by-stage` | Unlocked scenes and stage-based availability |
| Scenes | `POST /unlock/:sceneId` | Unlock (level/purchase/quest) |
| Scenes | `POST /set-active/:sceneId` | Set active scene |
| Memories | `GET /` | Paginated list |
| Memories | `POST /` | Create memory |
| Memories | `PATCH /:id/favorite` | Toggle favorite |
| Memories | `DELETE /:id` | Delete memory |

### Game, Analytics, DM, Leaderboard
| Module | Paths | Description |
|---|---|---|
| Game | `POST /daily-login`, `POST /action`, `GET /daily-progress` | Game actions, daily login reward, progress. `/action` accepts canonical actions and quest aliases such as `send_message` |
| Analytics | `GET /stats` | User analytics |
| DM | `GET /conversations`, `GET /conversations/:id/messages`, `GET /unread-count` | User messaging |
| Leaderboard | `GET /:category` | `level`, `affection`, `streak`, `achievements` (5-min cache) |

### Admin (`/admin`) — Admin JWT required
| Method | Path | Description |
|---|---|---|
| POST | `/login` | Admin login |
| GET/PUT | `/pricing/:tier` | Pricing tier config |
| GET | `/pricing/stripe-live` | Live Stripe pricing snapshot |
| POST | `/pricing/:tier/sync-stripe` | Sync one tier to Stripe |
| GET | `/tier-configs` | Tier config list |
| PUT | `/tier-configs/:tier` | Tier config update |
| GET | `/ai-settings` | Masked AI provider/model/key config |
| PUT | `/ai-settings/provider` | Update active AI provider and model |
| PUT | `/ai-settings/context` | Update AI message/fact/summary context limits |
| PUT | `/ai-settings/keys/:provider` | Replace or clear encrypted provider API key |
| POST | `/ai-settings/test` | Test selected AI provider/model/key |
| USE | `/upload` | Admin file uploads |

### Payment (`/payment`)
| Method | Path | Description |
|---|---|---|
| POST | `/webhook` | Stripe webhook |
| GET | `/pricing` | Public pricing config for subscription UI |
| POST | `/create-checkout` | Yes — Create Stripe checkout session |
| GET | `/checkout-session/:sessionId` | Yes — Verify that a checkout session belongs to the current user and has activated premium |
| GET | `/status` | Yes — Current subscription status, normalized if premium already expired but background reconciliation has not run yet |
| POST | `/cancel` | Yes — Cancel subscription |

### Public
| Method | Path | Description |
|---|---|---|
| GET | `/config/tier-plans` | Dynamic tier configs |
| GET | `/health`, `/ready` | Health checks |

## Related

- [Middleware](./middleware.md)
- [Backend Modules](./modules.md)
- [API Client](../frontend/api-client.md)
