# System Documentation — VirtualGfriend

> Comprehensive technical documentation for the VGfriend AI companion platform.
> Last updated: 2026-04-09 · Version: 1.0.0

## Overview

VirtualGfriend ("Bạn gái ảo") is an AI companion web app where users interact with AI-powered virtual romantic partners through real-time chat, with gamification (quests, gifts, levels, affection), user-to-user DMs, leaderboards, and Stripe subscription monetization.

**Domain**: vgfriend.io.vn · **Primary language**: Vietnamese with gender-aware pronouns

---

## Architecture

| Document | Description |
|---|---|
| [Architecture Overview](architecture/overview.md) | System components, data flow, key architectural decisions |
| [System Design](architecture/system-design.md) | Multi-layer architecture, 3-tier deployment, Docker Compose |
| [Tech Stack](architecture/tech-stack.md) | Complete technology stack, dependencies, packages |
| [Real-Time Architecture](architecture/real-time-architecture.md) | Socket.IO, message dedup, cross-tab sync, rate limiting |

## Authentication

| Document | Description |
|---|---|
| [Auth Flow](auth/auth-flow.md) | JWT-based auth: login, register, refresh, OTP verification |
| [Password Reset](auth/password-reset.md) | Email-based password reset with token expiration |
| [Admin Auth](auth/admin-auth.md) | Admin panel authentication and authorization |

## Database

| Document | Description |
|---|---|
| [Schema](database/schema.md) | Prisma schema: User, Character, Message, Conversation, Quest, Gift |
| [Migrations](database/migrations.md) | Migration strategy and history |
| [Indexes & Performance](database/indexes.md) | Query optimization, index strategy |

## AI Engine

| Document | Description |
|---|---|
| [AI Service](ai/ai-service.md) | Groq AI integration, prompt engineering, response generation |
| [Conversation Summary](ai/conversation-summary.md) | Long-context management via summarization |
| [Facts & Learning](ai/facts-learning.md) | Character fact extraction and persistence |
| [Proactive Notifications](ai/proactive-notifications.md) | AI-initiated messages (morning, night, miss-you) |

## Frontend

| Document | Description |
|---|---|
| [App Structure](frontend/app-structure.md) | Next.js 14 App Router layout and routing |
| [State Management](frontend/state-management.md) | Zustand stores + TanStack Query strategy |
| [Real-Time UI](frontend/real-time-ui.md) | Socket.IO client, optimistic UI, cross-tab sync |
| [UI Components](frontend/ui-components.md) | Radix UI components, Framer Motion animations |

## Backend

| Document | Description |
|---|---|
| [API Reference](backend/api-reference.md) | REST API endpoints documentation |
| [Chat Module](backend/chat-module.md) | Chat service, message processing |
| [DM Module](backend/dm-module.md) | Direct messaging between users |
| [Socket Handlers](backend/socket-handlers.md) | WebSocket event handlers |
| [Middleware Stack](backend/middleware-stack.md) | Auth, rate limiting, premium gating, error handling |

## Gamification

| Document | Description |
|---|---|
| [Quest System](gamification/quest-system.md) | Quest definitions, completion tracking, rewards |
| [Gift System](gamification/gift-system.md) | Virtual gifts, shop, inventory management |
| [Affection & Levels](gamification/affection-levels.md) | Affection progression, level-up mechanics |
| [Leaderboard](gamification/leaderboard.md) | Scoring, caching, ranking algorithms |
| [Relationship Stages](gamification/relationship-stages.md) | 8-stage progression: Stranger → Lover |

## Security

| Document | Description |
|---|---|
| [Rate Limiting](security/rate-limiting.md) | Per-user & per-IP rate limits, Socket.IO limits |
| [Input Validation](security/input-validation.md) | Zod schemas, content sanitization |
| [HTTP Security](security/http-security.md) | Helmet, CORS, XSS, CSRF protection |

## Data Flows

| Document | Description |
|---|---|
| [Chat Flow](data-flows/chat-flow.md) | Message send → AI processing → response delivery |
| [Payment Flow](data-flows/payment-flow.md) | Stripe checkout, webhook handling, subscription activation |
| [Auth Flow](data-flows/auth-flow.md) | Login → JWT issuance → token refresh |

## Deployment

| Document | Description |
|---|---|
| [Docker Compose](deployment/docker-compose.md) | Multi-container setup, health checks, profiles |
| [Nginx Configuration](deployment/nginx-config.md) | SSL, WebSocket proxy, rate limiting, gzip |
| [CI/CD Pipeline](deployment/cicd.md) | GitHub Actions, GHCR, semantic-release |
| [Environment Setup](deployment/environment.md) | Environment variables, secrets management |

---

*For project overview, see [docs/project-overview-pdr.md](../project-overview-pdr.md)*
