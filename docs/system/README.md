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
| [Auth Flow](authentication/auth-flow.md) | JWT-based auth: login, register, refresh, OTP verification |
| [Authentication Overview](authentication/authentication-overview.md) | JWT architecture, cache-aside usage, auth surfaces |
| [Premium Gating](authentication/premium-gating.md) | Paid tier access checks and downgrade behavior |

## Database

| Document | Description |
|---|---|
| [Schema Overview](database/schema-overview.md) | Prisma schema groups and model navigation |
| [User Models](database/user-models.md) | User, settings, tokens, identity fields |
| [Character Models](database/character-models.md) | Character, relationship, ex-persona fields |

## AI Engine

| Document | Description |
|---|---|
| [Character Personality](ai-engine/character-personality.md) | Personality system and prompt shaping |
| [Emotion Detection](ai-engine/emotion-detection.md) | Mood and emotional signal extraction |
| [Memory System](ai-engine/memory-system.md) | Character memory persistence and recall |
| [System Prompt](ai-engine/system-prompt.md) | Prompt contract and safety framing |

## Frontend

| Document | Description |
|---|---|
| [Routing Structure](frontend/routing-structure.md) | Next.js 14 App Router layout and routing |
| [State Management](frontend/state-management.md) | Zustand stores + TanStack Query strategy |
| [Real-Time UI](frontend/real-time.md) | Socket.IO client, optimistic UI, cross-tab sync |
| [UI Components](frontend/ui-components.md) | Radix UI components, Framer Motion animations |
| [API Client](frontend/api-client.md) | Fetch wrapper, auto-refresh, retry behavior |

## Backend

| Document | Description |
|---|---|
| [Routes](backend/routes.md) | REST API endpoints documentation |
| [Modules](backend/modules.md) | Backend module organization and responsibilities |
| [Socket Handlers](backend/socket-handlers.md) | WebSocket event handlers |
| [Middleware Stack](backend/middleware.md) | Auth, rate limiting, premium gating, error handling |

## Gamification

| Document | Description |
|---|---|
| [Quest System](gamification/quests.md) | Quest definitions, completion tracking, rewards |
| [Gift System](gamification/gifts-shop.md) | Virtual gifts, shop, inventory management |
| [Affection & Levels](gamification/levels-affection.md) | Affection progression, level-up mechanics |
| [Leaderboard](gamification/leaderboard.md) | Scoring, caching, ranking algorithms |
| [Scenes](gamification/scenes.md) | Scene unlocks, activation, stage-based availability |

## Security

| Document | Description |
|---|---|
| [Rate Limiting](security/rate-limiting.md) | Per-user & per-IP rate limits, Socket.IO limits |
| [Input Validation](security/input-validation.md) | Zod schemas, content sanitization |
| [Auth Security](security/auth-security.md) | JWT, admin auth, auth boundary protections |
| [Data Protection](security/data-protection.md) | PII, secrets, and storage protections |

## Data Flows

| Document | Description |
|---|---|
| [Chat Flow](data-flows/chat-flow.md) | Message send → AI processing → response delivery |
| [Purchase Flow](data-flows/purchase-flow.md) | Stripe checkout, webhook handling, subscription activation |
| [Registration Flow](data-flows/registration-flow.md) | Registration OTP and account creation flow |
| [DM Flow](data-flows/dm-flow.md) | Direct-message conversation and read/typing flow |

## Deployment

| Document | Description |
|---|---|
| [Docker Setup](deployment/docker-setup.md) | Multi-container setup, health checks, profiles |
| [Nginx Configuration](deployment/nginx-config.md) | SSL, WebSocket proxy, rate limiting, gzip |
| [CI/CD Pipeline](deployment/ci-cd.md) | GitHub Actions, GHCR, semantic-release |
| [Environment Setup](deployment/environment-variables.md) | Environment variables, secrets management |

---

*For project overview, see [docs/project-overview-pdr.md](../project-overview-pdr.md)*
