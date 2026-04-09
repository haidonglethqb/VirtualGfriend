# Docker Setup

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Nginx (443/80)                │
│  ┌──────────────┐       ┌──────────────────┐    │
│  │  Client:3000 │       │  Server:3001     │    │
│  │  (Next.js)   │       │  (Express API)   │    │
│  └──────────────┘       └───────┬──────────┘    │
│                                 │                │
│            ┌────────────┐  ┌───┴──────────┐     │
│            │ Postgres   │  │    Redis     │     │
│            │   :5432    │  │    :6379     │     │
│            └────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────┘
```

## Services (Production)

| Service | Image | Port | Health Check |
|---------|-------|------|--------------|
| `postgres` | `postgres:16-alpine` | 5432 | `pg_isready -U vgfriend` |
| `redis` | `redis:7-alpine` | 6379 | `redis-cli ping` |
| `server` | `ghcr.io/{repo}/server:latest` | 3001 | `wget /health` (30s interval) |
| `client` | `ghcr.io/{repo}/client:latest` | 3000 | Depends on server |
| `nginx` | `nginx:alpine` | 80, 443 | — (production profile) |

## Volumes

| Volume | Purpose |
|--------|---------|
| `postgres_data` | PostgreSQL data persistence |
| `redis_data` | Redis data persistence |
| `./nginx/nginx.conf:/etc/nginx/nginx.conf:ro` | Nginx config (read-only) |
| `./nginx/ssl:/etc/nginx/ssl:ro` | SSL certificates (read-only) |

## Network
- Bridge network: `vgfriend-network`
- All services communicate via Docker DNS (e.g., `postgres`, `redis`)

## Development Setup

```bash
# Development (with Adminer)
docker compose -f docker-compose.dev.yml up -d

# Services: postgres (5432), redis (6379), adminer (8080)
# No server/client — run locally with npm run dev
```

## Production Deploy

```bash
# Production (with nginx reverse proxy)
docker compose --profile production up -d --force-recreate
```

## Service Dependencies

```
postgres ──→ server ──→ client ──→ nginx
  │            │
redis ─────────┘
```

1. Postgres + Redis start first (healthy condition)
2. Server starts after both healthy
3. Client starts after server healthy
4. Nginx starts last (production profile only)

## Related
- [Environment Variables](./environment-variables.md)
- [CI/CD](./ci-cd.md)
- [Nginx Config](./nginx-config.md)
- Reference: `docker-compose.yml`, `docker-compose.dev.yml`
