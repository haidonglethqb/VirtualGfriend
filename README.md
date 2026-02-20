# VGfriend - Virtual Girlfriend

Ung dung "Nguoi yeu ao" voi AI thong minh.

## Tinh nang

- **Chat AI thong minh** - Tro chuyen tu nhien voi AI, ghi nho ngu canh
- **He thong do than mat** - Xay dung moi quan he theo thoi gian
- **Tang qua** - Shop qua tang voi nhieu muc hiem
- **Nhiem vu** - Hoan thanh nhiem vu hang ngay/tuan de nhan thuong
- **Ky niem** - Luu tru nhung khoang khac dac biet
- **Tuy chinh** - Tuy chinh nhan vat va giao dien
- **Nhan tin (DM)** - Nhan tin truc tiep voi nguoi dung khac
- **Xep hang** - Bang xep hang theo cap do, do than mat, streak, thanh tuu

## Tech Stack

### Frontend
- **Next.js 14** - React framework voi App Router
- **TailwindCSS** - Utility-first CSS
- **Radix UI** - Headless UI components
- **Framer Motion** - Animations
- **Zustand** - State management
- **Socket.io Client** - Real-time communication

### Backend
- **Express.js** - Node.js web framework
- **Prisma** - ORM & database toolkit
- **PostgreSQL** - Database
- **Redis** - Caching & session management
- **Socket.io** - Real-time communication
- **JWT** - Authentication (Access + Refresh tokens)
- **Groq/OpenAI** - AI chat integration (Groq mien phi, khuyen nghi)

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **GitHub Actions** - CI/CD

## Cau truc du an

```
VirtualGfriend/
├── client/               # NextJS frontend
│   ├── src/
│   │   ├── app/         # App router pages
│   │   ├── components/  # Reusable components
│   │   ├── features/    # Feature components
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities
│   │   ├── services/    # API & socket services
│   │   └── store/       # Zustand stores
│   └── Dockerfile
├── server/               # Express backend
│   ├── src/
│   │   ├── modules/     # Feature modules
│   │   ├── middlewares/ # Express middlewares
│   │   ├── sockets/     # Socket.io handlers
│   │   └── lib/         # Shared utilities
│   ├── prisma/          # Database schema & migrations
│   └── Dockerfile
├── shared/               # Shared TypeScript types
├── e2e/                  # Playwright E2E tests
├── nginx/                # Nginx configuration
├── docker-compose.yml    # Production compose
├── docker-compose.dev.yml # Development compose
└── .github/workflows/    # CI/CD pipelines
```

## Bat dau

### Quick Start (5 phut)

```bash
# 1. Clone repository
git clone https://github.com/haidonglethqb/VirtualGfriend.git
cd VirtualGfriend

# 2. Start database voi Docker
docker-compose -f docker-compose.dev.yml up -d
# Doi 10 giay de database khoi dong hoan toan

# 3. Setup Server (Terminal 1)
cd server
npm install
cp .env.example .env
# QUAN TRONG: Mo file .env va them GROQ_API_KEY (mien phi tai https://console.groq.com)
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev

# 4. Setup Client (Terminal 2)
cd client
npm install
cp .env.example .env.local
npm run dev

# 5. Mo trinh duyet tai http://localhost:3000
# Tai khoan test: test@example.com / password123
```

**Luu y quan trong:**
- Dam bao Docker dang chay truoc khi bat dau
- Doi database khoi dong xong (~10s) truoc khi chay prisma migrate
- File .env server PHAI co GROQ_API_KEY that (khong de your-groq-api-key)
- Neu gap loi migration, xem phan Troubleshooting ben duoi

### Yeu cau

- Node.js 20+
- Docker & Docker Compose
- Groq API Key (mien phi tai https://console.groq.com)

### Development chi tiet

1. **Clone repository**
```bash
git clone https://github.com/haidonglethqb/VirtualGfriend.git
cd VirtualGfriend
```

2. **Start database voi Docker**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. **Setup Server**
```bash
cd server
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

> **Quan trong**: Mo file server/.env va thay GROQ_API_KEY=your-groq-api-key bang key that tu https://console.groq.com (mien phi)

4. **Setup Client**
```bash
cd client
npm install
cp .env.example .env.local
npm run dev
```

5. **Truy cap**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Adminer (DB): http://localhost:8080

### Environment Variables

#### Server (.env)
```env
DATABASE_URL="postgresql://vgfriend:vgfriend123@localhost:5432/vgfriend?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-key"
JWT_ACCESS_SECRET="your-super-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
AI_PROVIDER=groq
GROQ_API_KEY="your-groq-api-key"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

#### Client (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
NEXT_PUBLIC_APP_NAME="VGfriend"
```

## Deployment

### Deploy voi GitHub Actions

1. **Cau hinh Secrets** trong GitHub repository (Settings > Secrets and variables > Actions):

   | Secret | Mo ta | Vi du |
   |--------|-------|-------|
   | VPS_HOST | IP hoac domain VPS | 123.456.789.0 |
   | VPS_USER | SSH username | root |
   | VPS_SSH_KEY | SSH private key | -----BEGIN OPENSSH... |
   | VPS_PORT | SSH port (optional) | 22 |
   | VPS_DEPLOY_PATH | Thu muc deploy | /opt/vgfriend |
   | CR_PAT | GitHub Personal Access Token (packages:read) | ghp_xxx... |
   | POSTGRES_PASSWORD | Database password | your-strong-password |
   | JWT_SECRET | JWT secret (32+ chars) | openssl rand -base64 32 |
   | JWT_REFRESH_SECRET | Refresh token secret | openssl rand -base64 32 |
   | GROQ_API_KEY | Groq API key | gsk_xxx... |
   | CORS_ORIGIN | Frontend domain | https://yourdomain.com |
   | NEXT_PUBLIC_API_URL | API URL | https://api.yourdomain.com |
   | NEXT_PUBLIC_WS_URL | WebSocket URL | https://api.yourdomain.com |

2. **Trigger deployment**
   - Vao tab Actions
   - Chon "Deploy to VPS"
   - Click "Run workflow"
   - Chon environment (production/staging)

### Deploy thu cong

```bash
cd /path/to/deploy
git pull origin main

cat > .env << EOF
POSTGRES_USER=vgfriend
POSTGRES_PASSWORD=your-strong-password
POSTGRES_DB=vgfriend
JWT_SECRET=your-jwt-secret-32-chars-minimum
JWT_REFRESH_SECRET=your-refresh-secret-32-chars
GROQ_API_KEY=gsk_your_groq_api_key
CORS_ORIGIN=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=https://api.yourdomain.com
EOF

docker-compose pull
docker-compose up -d --force-recreate
docker-compose exec server npx prisma migrate deploy
```

## API Endpoints

### Auth
- POST /api/auth/register - Dang ky
- POST /api/auth/login - Dang nhap
- POST /api/auth/refresh - Refresh token
- POST /api/auth/logout - Dang xuat
- POST /api/auth/forgot-password - Quen mat khau
- POST /api/auth/verify-otp - Xac nhan OTP
- POST /api/auth/reset-password - Dat lai mat khau

### User
- GET /api/users/me - Lay thong tin user
- PATCH /api/users/me - Cap nhat profile
- GET /api/users/settings - Lay cai dat
- PATCH /api/users/settings - Cap nhat cai dat

### Character
- GET /api/character - Lay thong tin nhan vat
- POST /api/character - Tao nhan vat
- PATCH /api/character - Cap nhat nhan vat

### Chat (AI)
- GET /api/chat/messages - Lay lich su chat
- POST /api/chat/send - Gui tin nhan

### Direct Messages
- GET /api/dm/conversations - Danh sach cuoc tro chuyen
- POST /api/dm/conversations - Tao cuoc tro chuyen
- GET /api/dm/conversations/:id/messages - Lay tin nhan
- POST /api/dm/conversations/:id/messages - Gui tin nhan
- POST /api/dm/conversations/:id/read - Danh dau da doc
- GET /api/dm/users/search - Tim kiem nguoi dung
- GET /api/dm/unread-count - Tong so tin nhan chua doc

### Quests
- GET /api/quests - Danh sach nhiem vu
- GET /api/quests/daily - Nhiem vu hang ngay
- POST /api/quests/start/:questId - Bat dau nhiem vu
- POST /api/quests/claim/:questId - Nhan thuong

### Gifts / Shop
- GET /api/gifts - Danh sach qua
- GET /api/gifts/inventory - Kho qua
- POST /api/gifts/buy - Mua qua
- POST /api/gifts/send - Tang qua

### Leaderboard
- GET /api/leaderboard/:category - Bang xep hang (level, affection, streak, achievements)

### Scenes
- GET /api/scenes - Danh sach background
- POST /api/scenes/unlock/:id - Mo khoa scene
- POST /api/scenes/set-active/:id - Dat scene hien tai

### Memories
- GET /api/memories - Danh sach ky niem
- POST /api/memories - Tao ky niem

## WebSocket Events

### AI Chat
- message:send - Gui tin nhan cho AI
- message:receive - Nhan phan hoi tu AI
- character:typing - AI dang go
- character:mood_change - Thay doi tam trang
- character:affection_change - Thay doi do than mat

### Direct Messages
- dm:send - Gui tin nhan DM
- dm:receive - Nhan tin nhan DM
- dm:typing - Nguoi dung dang go
- dm:read - Danh dau da doc

## Troubleshooting

### Database khong ket noi duoc
```bash
docker ps
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f postgres
# Doi 10 giay roi thu lai
npx prisma migrate dev
```

### Loi "Prisma schema file not found" hoac loi TypeScript
```bash
cd server
npx prisma generate
npm run dev
```

### Loi "EADDRINUSE: address already in use :::3001"
```bash
# Linux/Mac
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F
```

### AI khong tra loi
1. Kiem tra GROQ_API_KEY trong server/.env co dung khong
2. Key phai bat dau bang gsk_...
3. Lay key moi tai https://console.groq.com (mien phi)
4. Restart server sau khi sua .env

### Migration bi loi
```bash
cd server
# Option 1: Reset database (XOA TAT CA DU LIEU)
npx prisma migrate reset
npx prisma db seed

# Option 2: Push schema truc tiep (dev only)
npx prisma db push
```

### Frontend khong ket noi duoc backend
1. Kiem tra server dang chay: http://localhost:3001/health
2. Kiem tra file client/.env.local co dung NEXT_PUBLIC_API_URL khong
3. Restart client: cd client && npm run dev

## Chuan bi VPS

```bash
# 1. Cai Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Tao thu muc
mkdir -p /opt/vgfriend/data/postgres
mkdir -p /opt/vgfriend/data/redis
mkdir -p /opt/vgfriend/nginx/ssl
mkdir -p /opt/vgfriend/nginx/logs
cd /opt/vgfriend

# 3. Clone repo
git clone https://github.com/haidonglethqb/VirtualGfriend.git .

# 4. Cau hinh GitHub Secrets va chay workflow Deploy to VPS
```

## License

MIT License - see [LICENSE](LICENSE) file.

---

Made by VGfriend Team
