# Nginx Configuration

## Overview
Nginx reverse proxy handling SSL termination, gzip compression, rate limiting, WebSocket proxy, and routing to client/server containers.

## SSL Termination

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...;
    ssl_prefer_server_ciphers off;
}
```

Certificates mounted read-only from `./nginx/ssl/` via Docker volume.

## HTTP → HTTPS Redirect

```nginx
server {
    listen 80;
    server_name vgfriend.io.vn www.vgfriend.io.vn;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
```

## Rate Limiting Zones

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;
```

| Zone | Rate | Burst | Applied To |
|------|------|-------|------------|
| `api_limit` | 10r/s | 20 (nodelay) | `/api/*` |
| `general_limit` | 30r/s | 50 (nodelay) | `/` (frontend) |

## Gzip Compression

```nginx
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml application/json
           application/javascript application/rss+xml
           application/atom+xml image/svg+xml;
```

## Reverse Proxy Routes

```nginx
upstream client { server client:3000; }
upstream server { server server:3001; }

# API → Server
location /api {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://server;
    proxy_read_timeout 60s;
}

# WebSocket → Server
location /socket.io {
    proxy_pass http://server;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;  # 24h for persistent WS
}

# Health check → Server
location /health {
    proxy_pass http://server/health;
}

# Frontend → Client
location / {
    limit_req zone=general_limit burst=50 nodelay;
    proxy_pass http://client;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Static assets (long cache)
location /_next/static {
    proxy_pass http://client;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

## Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## Related
- [Rate Limiting](../security/rate-limiting.md)
- [Data Protection](../security/data-protection.md)
- [Docker Setup](./docker-setup.md)
- Reference: `nginx/nginx.conf`
