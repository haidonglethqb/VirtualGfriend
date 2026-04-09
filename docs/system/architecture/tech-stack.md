# Tech Stack

> Complete technology stack and dependency inventory for VirtualGfriend.
> Last updated: 2026-04-09

## Technology Stack Overview

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | Next.js | 14.1.0 | App Router, SSR/CSR, routing |
| **UI Library** | React | 18.2.0 | Component rendering |
| **UI Components** | Radix UI | 13 components | Accessible headless UI primitives |
| **Animations** | Framer Motion | 10.18.0 | Page transitions, chat animations |
| **State Management** | Zustand | 4.5.0 | Client-side stores (5 stores) |
| **Data Fetching** | TanStack Query | 5.17.19 | Server state, caching, refetching |
| **Icons** | Lucide React | 0.312.0 | Icon set |
| **Charts** | Chart.js + react-chartjs-2 | 4.5.1 | Analytics dashboard |
| **WebSocket Client** | Socket.IO Client | 4.7.4 | Real-time communication |
| **Backend Framework** | Express.js | 4.18.2 | REST API + HTTP server |
| **WebSocket Server** | Socket.IO | 4.7.4 | Real-time event handling |
| **ORM** | Prisma | 5.22.0 (client) / 5.9.1 (cli) | Type-safe DB queries |
| **Database** | PostgreSQL | 16 (Alpine) | Primary datastore |
| **Cache** | Redis (ioredis) | 7 (Alpine) / 5.9.2 | Cache, dedup, rate limits |
| **AI Provider** | Groq AI (OpenAI SDK) | 4.26.1 | LLM chat completions |
| **Payments** | Stripe | 21.0.1 | Subscriptions, webhooks |
| **Email** | Nodemailer | 8.0.0 | OTP, password reset emails |
| **Auth** | bcryptjs + jsonwebtoken | 2.4.3 + 9.0.2 | Password hashing, JWT |
| **HTTP Security** | Helmet | 7.1.0 | Security headers |
| **CORS** | cors | 2.8.5 | Cross-origin policy |
| **Rate Limiting** | express-rate-limit | 7.1.5 | Per-IP and per-user limits |
| **Validation** | Zod | 3.22.4 | Request validation schemas |
| **Storage** | AWS SDK S3 | 3.1020.0 | DigitalOcean Spaces uploads |
| **File Upload** | Multer | 1.4.5 | Multipart form handling |
| **Containerization** | Docker + Docker Compose | — | Multi-container orchestration |
| **CI/CD** | GitHub Actions | — | Build, test, deploy |
| **Registry** | GHCR | — | Container image hosting |
| **Release** | semantic-release | — | Automated versioning, changelog |
| **E2E Testing** | Playwright | — | 10 test specs |

## Client Dependencies

```
@vgfriend/client (client/package.json)
├── next 14.1.0
├── react 18.2.0 / react-dom 18.2.0
├── Radix UI (13 packages: avatar, dialog, dropdown-menu, label,
│             progress, scroll-area, separator, slider, slot,
│             switch, tabs, toast, tooltip)
├── framer-motion 10.18.0
├── zustand 4.5.0
├── @tanstack/react-query 5.17.19
├── socket.io-client 4.7.4
├── lucide-react 0.312.0
├── chart.js 4.5.1 + react-chartjs-2 5.3.1
├── class-variance-authority 0.7.0
├── clsx 2.1.0 / tailwind-merge 2.2.1
└── tailwindcss 3.4.1 + tailwindcss-animate 1.0.7
```

Stores: `auth-store`, `chat-store`, `character-store`, `notification-store`, `premium-store`, `language-store`, `scene-store`

## Server Dependencies

```
@vgfriend/server (server/package.json)
├── express 4.18.2
├── socket.io 4.7.4
├── @prisma/client 5.22.0
├── ioredis 5.9.2
├── openai 4.26.1 (Groq-compatible)
├── stripe 21.0.1
├── jsonwebtoken 9.0.2
├── bcryptjs 2.4.3
├── helmet 7.1.0
├── cors 2.8.5
├── express-rate-limit 7.1.5
├── zod 3.22.4
├── nodemailer 8.0.0
├── @aws-sdk/client-s3 3.1020.0
├── multer 1.4.5
├── compression 1.8.1
├── cookie-parser 1.4.6
└── uuid 9.0.1
```

Modules: `auth`, `chat`, `dm`, `ai`, `quest`, `gift`, `game`, `character`, `memory`, `scene`, `payment`, `leaderboard`, `analytics`, `admin`, `users`, `upload`

## DevOps Stack

```
GitHub Actions → Build → GHCR Push → Semantic Release → Changelog
       ↓                                                  ↓
   Playwright E2E (10 specs)                         GitHub Releases
       ↓
   Docker Compose (postgres, redis, server, client, nginx)
```

## Related

- [Architecture Overview](overview.md) — System components
- [System Design](system-design.md) — Deployment topology
- [Real-Time Architecture](real-time-architecture.md) — Socket.IO details
