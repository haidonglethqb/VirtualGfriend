# Backend Routes

Complete API endpoint reference. Base path: `/api`.

**Reference:** `server/src/routes/index.ts`, `server/src/modules/*/`

## Endpoints by Module

### Auth (`/auth`) — Public except `/me`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Register (returns OTP_SENT) |
| POST | `/login` | Login (user + tokens) |
| POST | `/refresh` | Refresh token (HTTP-only cookie) |
| POST | `/logout` | Yes — Logout |
| POST | `/forgot-password` | Request reset OTP |
| POST | `/verify-otp` | Verify registration OTP |
| POST | `/reset-password` | Reset password with OTP |
| POST | `/verify-registration` | Complete registration (returns tokens) |
| GET | `/me` | Yes — Current user profile |

### Users (`/users`) — Auth required
| Method | Path | Description |
|---|---|---|
| GET/PATCH | `/profile` | Get/update profile |
| GET/PATCH | `/settings` | Get/update settings |
| PATCH | `/privacy` | Update privacy |

### Character (`/character`) — Auth required
| Method | Path | Description |
|---|---|---|
| GET | `/active` | Active character + facts + scenes |
| POST | `/` | Create character |
| PATCH | `/` | Update character |
| PATCH | `/customize` | Avatar customization |
| GET/POST | `/facts` | Get/add facts |
| GET/POST | `/templates` | Template CRUD |
| GET | `/relationship` | Relationship status + progression |

### Chat (`/chat`) — Auth required
| Method | Path | Description |
|---|---|---|
| GET | `/history` | Paginated messages |
| POST | `/send` | Send (REST fallback, socket preferred) |
| GET | `/search` | Search messages |

### Quests (`/quests`), Gifts (`/gifts`), Shop (`/shop`→alias)
| Module | Path | Description |
|---|---|---|
| Quests | `GET /`, `GET /daily` | All/daily quests |
| Quests | `POST /claim/:questId` | Claim reward |
| Gifts | `GET /gifts` | Gift catalog |
| Gifts | `GET /gifts/inventory` | Purchased items |
| Gifts | `POST /gifts/buy` | Buy with coins/gems |
| Gifts | `POST /gifts/send` | Send to character |

### Scenes (`/scenes`), Memories (`/memories`)
| Module | Path | Description |
|---|---|---|
| Scenes | `GET /` | List scenes |
| Scenes | `POST /unlock` | Unlock (level/purchase/quest) |
| Scenes | `PATCH /:id/active` | Set active scene |
| Memories | `GET /` | Paginated list |
| Memories | `POST /` | Create memory |
| Memories | `PATCH /:id/favorite` | Toggle favorite |
| Memories | `DELETE /:id` | Delete memory |

### Game, Analytics, DM, Leaderboard
| Module | Paths | Description |
|---|---|---|
| Game | `POST /daily-login`, `GET /progress` | Daily login reward, progress |
| Analytics | `GET /stats` | User analytics |
| DM | `GET /conversations`, `GET /conversations/:id/messages`, `GET /unread-count` | User messaging |
| Leaderboard | `GET /:category` | `level`, `affection`, `streak`, `achievements` (5-min cache) |

### Admin (`/admin`) — Admin JWT required
| Method | Path | Description |
|---|---|---|
| GET/PATCH | `/pricing` | Pricing tier config |
| GET/POST | `/tier-config` | Tier config CRUD |

### Payment (`/payment`)
| Method | Path | Description |
|---|---|---|
| POST | `/webhook` | Stripe webhook |
| POST | `/subscribe` | Yes — Create subscription |
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
