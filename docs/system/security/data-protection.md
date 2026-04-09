# Data Protection

## Overview
Multi-layered data protection: CORS, security headers, HTTPS, encrypted secrets, and cloud storage access controls.

## CORS Configuration

```typescript
// server environment
CORS_ORIGIN=https://yourdomain.com  // Single allowed origin
```

- Configured via `CORS_ORIGIN` env var
- Single-origin policy (not wildcard)
- Applied at Express app level

## Helmet Security Headers

Nginx adds security headers at the reverse proxy level:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## HTTPS via Nginx + Let's Encrypt

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    # Modern cipher suite
}

server {
    listen 80;
    # Redirects all HTTP → HTTPS (301)
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
}
```

- Certificates mounted via Docker volume: `./nginx/ssl:/etc/nginx/ssl:ro`
- Auto-renewal via Certbot container (external)

## Database Connection Security
- `DATABASE_URL` constructed from Docker secrets, not hardcoded
- Internal Docker network (`vgfriend-network`) isolates DB from public access
- Port 5432 exposed only for development

## Environment Variables

| Category | Variables |
|----------|-----------|
| Database | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL` |
| Auth | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_JWT_SECRET` |
| AI | `GROQ_API_KEY` |
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Email | `SMTP_USER`, `SMTP_PASS` |
| Storage | `DO_SPACES_KEY`, `DO_SPACES_SECRET` |

**Never committed**: `.env` files gitignored. Use `.env.production.example` as template.

## Stripe Webhook Verification
- `STRIPE_WEBHOOK_SECRET` validates incoming webhook signatures
- Raw body preserved for signature verification
- Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.*`

## DigitalOcean Spaces Access Controls
- `DO_SPACES_KEY` / `DO_SPACES_SECRET` — IAM credentials with bucket-scoped permissions
- Endpoint: `https://sgp1.digitaloceanspaces.com`
- Bucket: configured via `DO_SPACES_BUCKET`

## Related
- [Auth Security](./auth-security.md)
- [Environment Variables](../deployment/environment-variables.md)
- [Nginx Config](../deployment/nginx-config.md)
- Source: `server/src/app.ts`, `nginx/nginx.conf`
