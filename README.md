# VGfriend - Virtual Girlfriend

Ứng dụng "Người yêu ảo" với AI thông minh.

##  Tính năng

-  **Chat AI thông minh** - Trò chuyện tự nhiên với AI, ghi nhớ ngữ cảnh
-  **Hệ thống độ thân mật** - Xây dựng mối quan hệ theo thời gian
-  **Tặng quà** - Shop quà tặng với nhiều mức hiếm
-  **Nhiệm vụ** - Hoàn thành nhiệm vụ hàng ngày/tuần để nhận thưởng
-  **Kỷ niệm** - Lưu trữ những khoảnh khắc đặc biệt
-  **Tùy chỉnh** - Tùy chỉnh nhân vật và giao diện

##  Tech Stack

### Frontend
- **Next.js 14** - React framework với App Router
- **TailwindCSS** - Utility-first CSS
- **Radix UI** - Headless UI components
- **Framer Motion** - Animations
- **Zustand** - State management
- **TanStack Query** - Data fetching

### Backend
- **Express.js** - Node.js web framework
- **Prisma** - ORM & database toolkit
- **PostgreSQL** - Database
- **Socket.io** - Real-time communication
- **JWT** - Authentication (Access + Refresh tokens)
- **Groq/OpenAI** - AI chat integration (Groq miễn phí, khuyến nghị)

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **GitHub Actions** - CI/CD

##  Cấu trúc dự án

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
├── nginx/                # Nginx configuration
├── docker-compose.yml    # Production compose
├── docker-compose.dev.yml # Development compose
└── .github/workflows/    # CI/CD pipelines
```

##  Bắt đầu

### ⚡ Quick Start (5 phút)

```bash
# 1. Clone và cài đặt
git clone https://github.com/haidonglethqb/VirtualGfriend.git
cd VirtualGfriend

# 2. Start database
docker-compose -f docker-compose.dev.yml up -d

# 3. Setup server
cd server
npm install
cp .env.example .env
# ⚠️ MỞ FILE .env VÀ THÊM GROQ_API_KEY (lấy tại https://console.groq.com - MIỄN PHÍ)
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev

# 4. Setup client (terminal mới)
cd client
npm install
cp .env.example .env.local
npm run dev

# 5. Mở http://localhost:3000 🎉
```

### Yêu cầu

- Node.js 20+
- Docker & Docker Compose
- Groq API Key (miễn phí tại https://console.groq.com)

### Development chi tiết

1. **Clone repository**
```bash
git clone https://github.com/your-username/VirtualGfriend.git
cd VirtualGfriend
```

2. **Start database với Docker**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. **Setup Server**
```bash
cd server
npm install
cp .env.example .env  # Sau đó sửa file .env với API key thật (xem bên dưới)
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

> ⚠️ **Quan trọng**: Mở file `server/.env` và thay `GROQ_API_KEY=your-groq-api-key` bằng key thật từ https://console.groq.com (miễn phí)

4. **Setup Client**
```bash
cd client
npm install
cp .env.example .env.local  # Cấu hình biến môi trường
npm run dev
```

5. **Truy cập**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Adminer (DB): http://localhost:8080

### Environment Variables

#### Server (.env)
```env
# Database - khớp với docker-compose.dev.yml
DATABASE_URL="postgresql://vgfriend:vgfriend123@localhost:5432/vgfriend?schema=public"

# JWT Secrets
JWT_SECRET="your-super-secret-key"
JWT_ACCESS_SECRET="your-super-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# AI Provider - Chọn 1 trong 3: openai, gemini, hoặc groq (khuyến nghị - miễn phí)
AI_PROVIDER=groq
GROQ_API_KEY="your-groq-api-key"  # Lấy tại https://console.groq.com
# OPENAI_API_KEY="your-openai-key"
# GEMINI_API_KEY="your-gemini-key"

PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

#### Client (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
NEXT_PUBLIC_APP_NAME="VGfriend"
```

##  Deployment

### Deploy với GitHub Actions

1. **Cấu hình Secrets** trong GitHub repository (Settings → Secrets and variables → Actions):

   | Secret | Mô tả | Ví dụ |
   |--------|-------|-------|
   | `VPS_HOST` | IP hoặc domain VPS | `123.456.789.0` |
   | `VPS_USER` | SSH username | `root` |
   | `VPS_SSH_KEY` | SSH private key | `-----BEGIN OPENSSH...` |
   | `VPS_PORT` | SSH port (optional) | `22` |
   | `VPS_DEPLOY_PATH` | Thư mục deploy | `/opt/vgfriend` |
   | `POSTGRES_PASSWORD` | Database password | `your-strong-password` |
   | `JWT_SECRET` | JWT secret (32+ chars) | `openssl rand -base64 32` |
   | `JWT_REFRESH_SECRET` | Refresh token secret | `openssl rand -base64 32` |
   | `GROQ_API_KEY` | Groq API key | `gsk_xxx...` |
   | `CORS_ORIGIN` | Frontend domain | `https://yourdomain.com` |
   | `NEXT_PUBLIC_API_URL` | API URL | `https://api.yourdomain.com` |
   | `NEXT_PUBLIC_WS_URL` | WebSocket URL | `https://api.yourdomain.com` |

2. **Trigger deployment**
   - Vào tab Actions
   - Chọn "Deploy to VPS"
   - Click "Run workflow"
   - Chọn environment (production/staging)

### Deploy thủ công

```bash
# Trên VPS
cd /path/to/deploy
git pull origin main

# Tạo file .env với các biến môi trường
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

# Build và deploy
docker-compose pull
docker-compose up -d --force-recreate

# Run migrations
docker-compose exec server npx prisma migrate deploy
```

##  API Endpoints

### Auth
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Đăng xuất

### User
- `GET /api/users/me` - Lấy thông tin user
- `PATCH /api/users/me` - Cập nhật profile

### Character
- `GET /api/character` - Lấy thông tin nhân vật
- `PATCH /api/character` - Cập nhật nhân vật

### Chat
- `GET /api/chat/messages` - Lấy lịch sử chat
- `POST /api/chat/send` - Gửi tin nhắn

### Quests
- `GET /api/quests` - Danh sách nhiệm vụ
- `POST /api/quests/:id/claim` - Nhận thưởng

### Gifts
- `GET /api/gifts` - Danh sách quà
- `POST /api/gifts/:id/send` - Tặng quà

## 🔧 Troubleshooting

### Lỗi "Authentication failed" khi chạy Prisma
```bash
# Kiểm tra Docker đang chạy
docker ps

# Nếu không thấy vgfriend-db-dev, chạy lại:
docker-compose -f docker-compose.dev.yml up -d

# Đợi 5 giây rồi thử lại
npx prisma migrate dev
```

### Lỗi "EADDRINUSE: address already in use"
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

### AI không trả lời / dùng fallback
- Kiểm tra `GROQ_API_KEY` trong `server/.env` có đúng không
- Restart server sau khi sửa `.env`

### Tin nhắn bị duplicate
- Xóa cache: `localStorage.clear()` trong DevTools Console
- Refresh trang

## 🖥️ Chuẩn bị VPS

```bash
# 1. Cài Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Tạo thư mục
mkdir -p /opt/vgfriend/data/postgres
mkdir -p /opt/vgfriend/data/redis
mkdir -p /opt/vgfriend/nginx/ssl
mkdir -p /opt/vgfriend/nginx/logs
cd /opt/vgfriend

# 3. Clone repo
git clone https://github.com/haidonglethqb/VirtualGfriend.git .

# 4. Cấu hình GitHub Secrets và chạy workflow Deploy to VPS
```

##  License

MIT License - see [LICENSE](LICENSE) file.

---

Made with 💕 by VGfriend Team
