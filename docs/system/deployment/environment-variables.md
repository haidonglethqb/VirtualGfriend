# Environment Variables

## Server Variables

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://vgfriend:pass@postgres:5432/vgfriend` |
| `JWT_SECRET` | Access token signing key | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | Different from JWT_SECRET |
| `ADMIN_JWT_SECRET` | Admin panel auth key | Separate secret for admin |
| `GROQ_API_KEY` | AI provider API key | `gsk_...` |
| `AI_CONFIG_ENCRYPTION_KEY` | Encrypts API keys saved from Admin AI Settings | `openssl rand -base64 32` |

### Required (Production)
| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | `whsec_...` |
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_USER` | Email username | `app@domain.com` |
| `SMTP_PASS` | Email password | App-specific password |
| `SMTP_FROM_EMAIL` | Verified sender email (optional, recommended for SMTP relays) | `otp@domain.com` |
| `CORS_ORIGIN` | Allowed frontend domain | `https://vgfriend.io.vn` |
| `DO_SPACES_KEY` | DigitalOcean Spaces access key | Spaces IAM key |
| `DO_SPACES_SECRET` | DigitalOcean Spaces secret | Spaces IAM secret |

### Admin
| Variable | Description |
|----------|-------------|
| `ADMIN_USERNAME` | Admin panel username |
| `ADMIN_PASSWORD_HASH` | Bcrypt-hashed admin password |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `DO_SPACES_ENDPOINT` | `https://sgp1.digitaloceanspaces.com` | S3-compatible endpoint |
| `DO_SPACES_BUCKET` | `haichu` | Bucket name |
| `DO_SPACES_REGION` | `sgp1` | Region |
| `AI_MODEL` | `llama-3.3-70b-versatile` | Fallback model when Admin AI Settings uses `system` provider |
| `AI_CONTEXT_MESSAGE_LIMIT` | `300` | Initial fallback for Admin AI Settings context limit, capped at 1000 |
| `AI_CONTEXT_FACT_LIMIT` | `200` | Initial fallback for Admin AI Settings fact limit, capped at 500 |
| `AI_CONTEXT_SUMMARY_LIMIT` | `20` | Initial fallback for Admin AI Settings summary limit, capped at 50 |
| `USER_DEFAULT_AVATAR_BASE_URL` | `/avatars/default` | Default profile avatar base URL; set to Spaces `Avatar/default` only after preset assets are uploaded |

## Client Variables (NEXT_PUBLIC_*)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.vgfriend.io.vn` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `https://api.vgfriend.io.vn` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_live_...` |

## Production vs Development

| Aspect | Development | Production |
|--------|-------------|------------|
| Database | localhost:5432 | Docker service `postgres` |
| Redis | localhost:6379 | Docker service `redis` |
| CORS | `http://localhost:3000` | `https://vgfriend.io.vn` |
| Login rate limit | 100/15min | 5/15min |
| HTTPS | No | Yes (Let's Encrypt) |
| Stripe | Test keys | Live keys |

## Docker Compose Integration
Variables read from `.env` file on VPS. Written by CI/CD pipeline from GitHub secrets during deploy.

The deploy workflow renders `docker compose config` on the VPS after writing `.env` so interpolation and mounted-file dependencies fail fast before containers are recreated.
Secret values containing `$` must be escaped before compose reads `.env`; the deploy workflow now rewrites values to avoid accidental variable interpolation.

## Related
- [Docker Setup](./docker-setup.md)
- [CI/CD](./ci-cd.md)
- [Data Protection](../security/data-protection.md)
- Reference: `.env.production.example`, `docker-compose.yml`
