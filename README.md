# VGfriend - Virtual Girlfriend

Ứng dụng "Người yêu ảo" với AI thông minh.

## 🌟 Tính năng

- 💬 **Chat AI thông minh** - Trò chuyện tự nhiên với AI, ghi nhớ ngữ cảnh
- 💝 **Hệ thống độ thân mật** - Xây dựng mối quan hệ theo thời gian
- 🎁 **Tặng quà** - Shop quà tặng với nhiều mức hiếm
- 🎯 **Nhiệm vụ** - Hoàn thành nhiệm vụ hàng ngày/tuần để nhận thưởng
- 📸 **Kỷ niệm** - Lưu trữ những khoảnh khắc đặc biệt
- ⚙️ **Tùy chỉnh** - Tùy chỉnh nhân vật và giao diện

## 🛠️ Tech Stack

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
- **OpenAI** - AI chat integration

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **GitHub Actions** - CI/CD

## 📁 Cấu trúc dự án

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

## 🚀 Bắt đầu

### Yêu cầu

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (hoặc dùng Docker)

### Development

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
cp .env.example .env  # Cấu hình biến môi trường
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

4. **Setup Client**
```bash
cd client
npm install
cp .env.example .env.local  # Cấu hình biến môi trường
npm run dev
```

5. **Truy cập**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Adminer (DB): http://localhost:8080

### Environment Variables

#### Server (.env)
```env
DATABASE_URL="postgresql://vgfriend:vgfriend123@localhost:5432/vgfriend"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
OPENAI_API_KEY="your-openai-key"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
```

#### Client (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_WS_URL="http://localhost:4000"
```

## 🐳 Deployment

### Deploy với GitHub Actions

1. **Cấu hình Secrets** trong GitHub repository:
   - `VPS_HOST` - IP hoặc domain của VPS
   - `VPS_USER` - SSH username
   - `VPS_SSH_KEY` - SSH private key
   - `VPS_DEPLOY_PATH` - Đường dẫn deploy trên VPS
   - `JWT_SECRET` - JWT secret key
   - `JWT_REFRESH_SECRET` - Refresh token secret
   - `OPENAI_API_KEY` - OpenAI API key
   - `NEXT_PUBLIC_API_URL` - URL API production
   - `NEXT_PUBLIC_WS_URL` - URL WebSocket production

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

# Build và deploy
docker-compose pull
docker-compose up -d --force-recreate

# Run migrations
docker-compose exec server npx prisma migrate deploy
```

## 📝 API Endpoints

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

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

Made with 💕 by VGfriend Team
