# Phần 3: Sơ Đồ Kiến Trúc Hệ Thống (System Architecture)

|---|

## 3.1. Sơ đồ tổng quan hệ thống

```

                        NGƯỜI DÙNG (Browser)                          

                                  HTTPS / WSS
                                 

                           NGINX (Reverse Proxy)                       
                Port 80/443 → Route đến Frontend/Backend              

            /                                     /api, /socket.io
                                                 
              
   FRONTEND                            BACKEND (Express.js)        
   Next.js 14         REST+WS   Port 3001                  
   Port 3000                                                       
                                        
                      REST API Routes          
   App Router                         /api/auth                
   Pages/Layouts                      /api/character           
                      /api/chat                
   Components                         /api/quests              
   Features                           /api/gifts               
                      /api/dm                  
   Zustand Store                      /api/leaderboard         
   State Mgmt                         /api/memories            
                      /api/scenes              
   Socket.io                          /api/analytics           
   Client                             
                                                 
                  
                                                 
                                                 Nodemailer (SMTP)         
                                                 (OTP Email)               
                                                 
                                             
```

|---|

## 3.2. Mô tả các module chính

### Frontend — Next.js 14 (App Router)

| Module         | Vị trí                   | Chức năng                                                        |
|----------------|--------------------------|------------------------------------------------------------------|
| **App Router** | `client/src/app/`        | Routing, pages, layouts, middleware                              |
| **Components** | `client/src/components/` | UI components tái sử dụng (Button, Modal, Card...)               |
| **Features**   | `client/src/features/`   | Feature-specific components (chat UI, gift shop...)              |
| **Hooks**      | `client/src/hooks/`      | Custom React hooks                                               |
| **Services**   | `client/src/services/`   | API client (axios), Socket.io client, AI service                 |
| **Store**      | `client/src/store/`      | Zustand stores (auth, character, chat, dm, quest, notifications) |
| **Lib**        | `client/src/lib/`        | Utilities, helpers                                               |

**Công nghệ UI:**

- **TailwindCSS** — Utility-first styling
- **Radix UI** — Headless accessible components
- **Framer Motion** — Animation library
- **Zustand** — Lightweight state management

|---|

### Backend — Express.js (Node.js)

| Module          | Vị trí                            | Chức năng                                                                        |
|-----------------|-----------------------------------|----------------------------------------------------------------------------------|
| **auth**        | `server/src/modules/auth/`        | Đăng ký, đăng nhập, refresh token, OTP reset password                            |
| **users**       | `server/src/modules/users/`       | Quản lý profile, settings, facts manager                                         |
| **character**   | `server/src/modules/character/`   | CRUD nhân vật, templates, customization                                          |
| **chat**        | `server/src/modules/chat/`        | Lịch sử tin nhắn, AI chat core                                                   |
| **ai**          | `server/src/modules/ai/`          | AI service (Groq), facts extraction, proactive notifications, prompt engineering |
| **game**        | `server/src/modules/game/`        | Game event engine (XP, level up, quest tracking, milestones)                     |
| **quest**       | `server/src/modules/quest/`       | Quest management, daily reset, claim rewards                                     |
| **gift**        | `server/src/modules/gift/`        | Shop, inventory, send gift, AI reactions                                         |
| **scene**       | `server/src/modules/scene/`       | Scene catalog, unlock, set active                                                |
| **memory**      | `server/src/modules/memory/`      | Memory CRUD, gallery, filtering                                                  |
| **leaderboard** | `server/src/modules/leaderboard/` | 4 bảng xếp hạng, Redis cache                                                     |
| **dm**          | `server/src/modules/dm/`          | Direct messaging user-to-user, group chat                                        |
| **analytics**   | `server/src/modules/analytics/`   | Stats, charts data, activity heatmap                                             |

**Middlewares:**

- `authenticate` — JWT verify, attach user to request
- `rateLimiter` — Giới hạn request (5 req/15 phút với auth endpoints)
- Error handler toàn cục

|---|

### Database Layer

| Service           | Công nghệ      | Vai trò                                                                                          |
|-------------------|----------------|--------------------------------------------------------------------------------------------------|
| **PostgreSQL 15** | Relational DB  | Lưu trữ chính: users, characters, messages, quests, gifts, memories...                           |
| **Prisma ORM**    | TypeScript ORM | Schema definition, migrations, type-safe queries                                                 |
| **Redis 7**       | In-memory DB   | JWT session store, leaderboard cache (TTL 5 phút), rate limiting counters, AI proactive cooldown |

|---|

### Infrastructure

| Thành phần           | Công nghệ      | Vai trò                                                                     |
|----------------------|----------------|-----------------------------------------------------------------------------|
| **Containerization** | Docker         | Đóng gói client, server, postgres, redis thành containers riêng             |
| **Orchestration**    | Docker Compose | Production: `docker-compose.yml`; Dev: `docker-compose.dev.yml`             |
| **Reverse Proxy**    | Nginx          | Route `/` → Next.js (port 3000); `/api`, `/socket.io` → Express (port 3001) |
| **CI/CD**            | GitHub Actions | Auto-deploy to VPS khi merge vào `main`                                     |
| **E2E Testing**      | Playwright     | Test automation trên Pixel 5, iPhone 12                                     |

|---|

### Third-party Services

| Service          | Nhà cung cấp                       | Mục đích                                                     |
|------------------|------------------------------------|--------------------------------------------------------------|
| **AI Inference** | **Groq** (LLaMA 3.3 70B Versatile) | Chat AI, facts extraction, proactive messages — **miễn phí** |
| **Email**        | Nodemailer (SMTP)                  | Gửi OTP reset password                                       |

|---|

## 3.3. Luồng giao tiếp chính

### 3.3.1. REST API (HTTP)

```
Client → [HTTPS] → Nginx → Express Router → Middleware (Auth + Rate Limit) → Controller → Service → Prisma → PostgreSQL
```

### 3.3.2. Real-time Chat (WebSocket)

```
Client → [WSS] → Nginx → Socket.io Server → Chat Handler → AI Service (Groq) → PostgreSQL → Broadcast → Client
```

### 3.3.3. AI Proactive (Cron-based)

```
Cron Job (Node.js setInterval) → Check users inactive > X hours (Redis) → Groq API → Socket emit → Client
```

|---|

## 3.4. Bảo mật hệ thống

| Kỹ thuật             | Mô tả                                                             |
|----------------------|-------------------------------------------------------------------|
| **JWT dual-token**   | Access token (15 phút) + Refresh token (7 ngày, HTTP-only cookie) |
| **bcrypt**           | Hash password với salt rounds                                     |
| **Rate limiting**    | 5 requests/15 phút cho auth endpoints                             |
| **CORS**             | Chỉ cho phép origin từ frontend domain                            |
| **Helmet.js**        | Security headers (XSS, content-type sniffing...)                  |
| **Input validation** | Zod schema validation ở tất cả API endpoints                      |
| **OTP expiry**       | OTP reset password có thời hạn + rate limit 3 OTP/phút            |
