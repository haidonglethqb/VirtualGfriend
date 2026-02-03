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
# 1. Clone repository
git clone https://github.com/haidonglethqb/VirtualGfriend.git
cd VirtualGfriend

# 2. Start database với Docker
docker-compose -f docker-compose.dev.yml up -d
# Đợi 10 giây để database khởi động hoàn toàn

# 3. Setup Server (Terminal 1)
cd server
npm install
cp .env.example .env
# ⚠️ QUAN TRỌNG: Mở file .env và thêm GROQ_API_KEY (miễn phí tại https://console.groq.com)
# Sau khi sửa .env, chạy:
npx prisma generate        # Tạo Prisma client
npx prisma migrate dev     # Chạy migrations
npx prisma db seed         # Seed dữ liệu mẫu
npm run dev               # Khởi động server tại http://localhost:3001

# 4. Setup Client (Terminal 2 - Terminal mới)
cd client
npm install
cp .env.example .env.local
npm run dev               # Khởi động frontend tại http://localhost:3000

# 5. Mở trình duyệt tại http://localhost:3000 🎉
# Tài khoản test: test@example.com / password123
```

**Lưu ý quan trọng:**
- ✅ Đảm bảo Docker đang chạy trước khi bắt đầu
- ✅ Đợi database khởi động xong (~10s) trước khi chạy `prisma migrate`
- ✅ File `.env` server **PHẢI** có `GROQ_API_KEY` thật (không để `your-groq-api-key`)
- ✅ Nếu gặp lỗi migration, xem phần Troubleshooting bên dưới

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

### ❗ Database không kết nối được
```bash
# 1. Kiểm tra Docker đang chạy
docker ps

# 2. Nếu không thấy container vgfriend-db-dev
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d

# 3. Kiểm tra logs
docker-compose -f docker-compose.dev.yml logs -f postgres

# 4. Đợi 10 giây rồi thử lại
npx prisma migrate dev
```

### ❗ Lỗi "Prisma schema file not found" hoặc lỗi TypeScript
```bash
cd server
npx prisma generate  # Tạo lại Prisma client
npm run dev
```

### ❗ Lỗi "Authentication failed" khi chạy Prisma
- Database chưa khởi động xong → Đợi thêm 10-15 giây
- DATABASE_URL trong `.env` không đúng → Kiểm tra lại
```bash
# Xem logs database
docker-compose -f docker-compose.dev.yml logs postgres
```

### ❗ Lỗi "EADDRINUSE: address already in use :::3001"
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9

# Hoặc đổi PORT trong server/.env sang 3002
```

### ❗ AI không trả lời (dùng fallback response)
1. Kiểm tra `GROQ_API_KEY` trong `server/.env` có đúng không
2. Key phải bắt đầu bằng `gsk_...`
3. Lấy key mới tại https://console.groq.com (miễn phí)
4. Restart server sau khi sửa `.env`

```bash
# Kiểm tra key có được load không
cd server
npm run dev
# Xem console log khi server start
```

### ❗ Tin nhắn bị duplicate hoặc UI lỗi
```bash
# Clear cache và refresh
# Trong DevTools Console (F12):
localStorage.clear()
sessionStorage.clear()
# Sau đó Ctrl+Shift+R (hard refresh)
```

### ❗ Migration bị lỗi
```bash
cd server

# Option 1: Reset database (XÓA TẤT CẢ DỮ LIỆU)
npx prisma migrate reset
npx prisma db seed

# Option 2: Force migration
npx prisma migrate dev --name force_update

# Option 3: Push schema trực tiếp (dev only)
npx prisma db push
```

### ❗ Frontend không kết nối được backend
1. Kiểm tra server đang chạy: http://localhost:3001/health
2. Kiểm tra file `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```
3. Restart client
```bash
cd client
npm run dev
```

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
