# VGfriend - Virtual Girlfriend

Ứng dụng "Người yêu ảo" với AI thông minh, hệ thống quan hệ theo thời gian, quà tặng, nhiệm vụ và chat real-time.

## Tính năng

- **Chat AI thông minh** - Trò chuyện tự nhiên, AI ghi nhớ ngữ cảnh và học hỏi về bạn
- **Chế độ người cũ AI** - Sau chia tay, hệ thống có thể tự tạo phiên bản "người cũ" để nhắn lại và tiếp tục cuộc trò chuyện
- **Hệ thống độ thân mật** - Xây dựng mối quan hệ theo thời gian
- **Tặng quà** - Shop quà tặng với nhiều mức hiếm
- **Nhiệm vụ** - Hoàn thành nhiệm vụ hàng ngày/tuần để nhận thưởng
- **Kỷ niệm** - Lưu trữ những khoảnh khắc đặc biệt
- **Tuỳ chỉnh** - Tuỳ chỉnh nhân vật và giao diện
- **Nhắn tin (DM)** - Nhắn tin trực tiếp với người dùng khác
- **Xếp hạng** - Bảng xếp hạng theo cấp độ, độ thân mật, streak, thành tựu

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TailwindCSS, Radix UI, Framer Motion, Zustand, Socket.io Client |
| Backend | Express.js, Prisma ORM, PostgreSQL, Redis, Socket.io, JWT |
| AI | Groq (miễn phí, khuyến nghị), OpenAI, Gemini |
| Infrastructure | Docker, Nginx, GitHub Actions CI/CD |

## Cấu trúc dự án

```
VirtualGfriend/
├── client/                  # Next.js 14 frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Reusable UI components
│   │   ├── features/        # Feature components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API & Socket.io client
│   │   └── store/           # Zustand state management
│   └── Dockerfile
├── server/                  # Express backend
│   ├── src/
│   │   ├── modules/         # Feature modules (auth, chat, character, ...)
│   │   ├── middlewares/     # Auth, error handling
│   │   ├── sockets/         # Socket.io handlers
│   │   └── lib/             # Logger, Redis, Prisma, Email
│   ├── prisma/              # Schema & migrations
│   └── Dockerfile
├── shared/                  # Shared TypeScript types
├── e2e/                     # Playwright E2E tests
├── nginx/                   # Nginx config (production)
├── docker-compose.yml       # Production compose
├── docker-compose.dev.yml   # Development compose (DB only)
└── .github/workflows/       # CI/CD pipeline
```

---

## Chạy Local (Development)

### Yêu cầu

- **Node.js 20+**
- **Docker & Docker Compose** (để chạy PostgreSQL và Redis)
- **Groq API Key** — miễn phí tại [console.groq.com](https://console.groq.com)

### 1. Clone repository

```bash
git clone https://github.com/haidonglethqb/VirtualGfriend.git
cd VirtualGfriend
```

### 2. Khởi động database

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Lệnh này start PostgreSQL (port 5432), Redis (port 6379), và Adminer UI (port 8080).
Chờ khoảng 10 giây để PostgreSQL khởi động xong.

### 3. Cấu hình và khởi động Server

```bash
cd server
npm install
cp .env.example .env
```

Mở file `server/.env` và thay các giá trị sau:

```env
# BẮT BUỘC: Groq AI key (miễn phí tại https://console.groq.com)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# Email cho tính năng OTP (đăng ký + quên mật khẩu)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

Các biến còn lại giữ nguyên default là chạy được local.

```bash
npx prisma generate      # Tạo Prisma Client từ schema
npx prisma migrate dev   # Tạo bảng trong database
npx prisma db seed       # Nhập dữ liệu mẫu (nhân vật, quà, nhiệm vụ...)
npm run dev              # Khởi động server tại http://localhost:3001
```

### 4. Khởi động Client (terminal khác)

```bash
cd client
npm install
npm run dev              # Khởi động frontend tại http://localhost:3000
```

> Client không cần file `.env.local` riêng — giá trị default trong `next.config.js` đã trỏ đúng `localhost:3001`.

### 5. Truy cập

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Health check | http://localhost:3001/health |
| Adminer (DB UI) | http://localhost:8080 |

Tài khoản test sau khi seed: `test@example.com` / `password123`

---

## Cấu hình Email (SMTP)

Email được dùng cho tính năng **OTP đăng ký** và **quên mật khẩu**. Nếu không cấu hình SMTP, người dùng mới sẽ không đăng ký được vì hệ thống bắt buộc xác minh OTP qua email.

### SMTP là gì và tại sao cần nhiều biến?

SMTP là giao thức kết nối TCP để gửi email — khác với REST API chỉ cần 1 token. Nodemailer cần đủ các tham số sau:

| Biến | Ý nghĩa | Default |
|------|---------|---------|
| `SMTP_HOST` | Địa chỉ server SMTP của nhà cung cấp | `smtp.gmail.com` |
| `SMTP_PORT` | Cổng kết nối: `587` (STARTTLS) hoặc `465` (SSL) | `587` |
| `SMTP_SECURE` | `true` nếu dùng port 465, `false` nếu port 587 | `false` |
| `SMTP_USER` | Địa chỉ email đăng nhập vào SMTP server | _(bắt buộc)_ |
| `SMTP_PASS` | Mật khẩu SMTP (Gmail phải dùng App Password) | _(bắt buộc)_ |
| `SMTP_FROM_NAME` | Tên hiển thị trong hộp thư người nhận | `VGfriend` |

Chỉ `SMTP_USER` và `SMTP_PASS` là bắt buộc — 4 biến còn lại có giá trị default hợp lệ cho Gmail.

### Cách cấu hình Gmail

Gmail không cho phép dùng mật khẩu thông thường để gửi SMTP. Phải tạo **App Password**:

1. Bật **2-Step Verification** tại [myaccount.google.com/security](https://myaccount.google.com/security)
2. Vào [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Chọn **App** = "Mail", **Device** = "Other" → đặt tên "VGfriend"
4. Google tạo mật khẩu 16 ký tự — dùng mật khẩu đó cho `SMTP_PASS`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop   # App Password 16 ký tự
SMTP_FROM_NAME=VGfriend
```

### Nhà cung cấp SMTP khác

| Nhà cung cấp | SMTP_HOST | SMTP_PORT | SMTP_SECURE |
|-------------|-----------|-----------|-------------|
| Gmail | smtp.gmail.com | 587 | false |
| Outlook/Hotmail | smtp-mail.outlook.com | 587 | false |
| SendGrid | smtp.sendgrid.net | 587 | false |
| Mailgun | smtp.mailgun.org | 587 | false |

---

## Cấu hình Stripe (Thanh toán VIP)

Stripe được dùng cho tính năng **mua gói VIP** (BASIC / PRO / ULTIMATE). Nếu không cấu hình, tính năng thanh toán bị tắt hoàn toàn — app vẫn chạy bình thường cho các tính năng khác.

### Lấy API key

1. Đăng ký tại [dashboard.stripe.com](https://dashboard.stripe.com)
2. Vào **Developers → API keys**
3. Copy **Secret key** (bắt đầu bằng `sk_test_` cho môi trường test)

```env
# server/.env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx   # cần cho webhook, để trống cũng chạy được local
```

### Thiết lập giá từ Admin Panel

Sau khi có `STRIPE_SECRET_KEY`, mở Admin Panel → tab **Bảng giá**:

1. Điền **giá hàng tháng** và **giá hàng năm** cho từng tier (đơn vị: VND)
2. Nhấn **Sync lên Stripe** — server tự động:
   - Tạo Stripe Product với metadata `vgfriend_tier`
   - Tạo 2 Price (monthly + yearly) với currency `vnd`
   - Lưu price ID vào database
3. Từ đó checkout hoạt động luôn — không cần vào Stripe dashboard

> VND là zero-decimal currency trong Stripe — `unit_amount` = số VND trực tiếp (không nhân 100).

### Webhook (production)

Cần webhook để Stripe thông báo khi thanh toán thành công:

```bash
# Cài Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhook về localhost (dev)
stripe listen --forward-to localhost:3001/api/payment/webhook
```

Copy `whsec_...` từ output vào `STRIPE_WEBHOOK_SECRET`.

---

## Deploy lên VPS

### Yêu cầu VPS

- Ubuntu 20.04+ (hoặc Debian 11+)
- RAM tối thiểu 1GB (khuyến nghị 2GB)
- Docker & Docker Compose đã cài

### Bước 1: Chuẩn bị VPS

SSH vào VPS và chạy:

```bash
# Cài Docker (nếu chưa có)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Tạo thư mục deploy
mkdir -p /opt/vgfriend/nginx/ssl
mkdir -p /opt/vgfriend/nginx/logs
cd /opt/vgfriend

# Clone repository
git clone https://github.com/haidonglethqb/VirtualGfriend.git .
```

### Bước 2: Cấu hình Nginx

Tạo file `nginx/nginx.conf` trên VPS (thay `yourdomain.com`):

```nginx
events {
    worker_connections 1024;
}

http {
    upstream client {
        server client:3000;
    }

    upstream api {
        server server:3001;
    }

    # HTTP → HTTPS redirect
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$host$request_uri;
    }

    # HTTPS
    server {
        listen 443 ssl;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate     /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # Frontend
        location / {
            proxy_pass http://client;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Backend API
        location /api {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # WebSocket (Socket.io)
        location /socket.io {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400;
        }
    }
}
```

> Nếu chưa có SSL, bỏ qua phần HTTPS và chỉ dùng HTTP port 80 để test trước.

### Bước 3: Cấu hình GitHub Secrets

Vào **GitHub repo → Settings → Secrets and variables → Actions**, thêm các secrets sau:

#### VPS Connection

| Secret | Mô tả | Ví dụ |
|--------|-------|-------|
| `VPS_HOST` | IP hoặc domain của VPS | `123.456.789.10` |
| `VPS_USER` | SSH username | `root` hoặc `ubuntu` |
| `VPS_SSH_KEY` | Nội dung SSH private key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_PORT` | SSH port | `22` |
| `VPS_DEPLOY_PATH` | Đường dẫn thư mục deploy trên VPS | `/opt/vgfriend` |

**Tạo SSH key để deploy (nếu chưa có):**
```bash
# Chạy trên máy local
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vgfriend_deploy

# Copy public key lên VPS
ssh-copy-id -i ~/.ssh/vgfriend_deploy.pub user@your-vps-ip

# Nội dung private key → paste vào secret VPS_SSH_KEY
cat ~/.ssh/vgfriend_deploy
```

#### Registry & Database

| Secret | Mô tả | Cách lấy |
|--------|-------|----------|
| `CR_PAT` | GitHub Personal Access Token | GitHub → Settings → Developer settings → Tokens → **New token (classic)** → tick `write:packages` |
| `POSTGRES_PASSWORD` | Mật khẩu database | Tự đặt, ví dụ: `openssl rand -base64 32` |
| `JWT_SECRET` | JWT access token secret (32+ ký tự) | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (32+ ký tự) | `openssl rand -base64 32` |

#### API & URLs

| Secret | Mô tả | Ví dụ |
|--------|-------|-------|
| `GROQ_API_KEY` | Groq AI key (miễn phí) | `gsk_xxx...` |
| `CORS_ORIGIN` | Domain frontend | `https://yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | URL backend API | `https://yourdomain.com/api` hoặc `https://api.yourdomain.com` |
| `NEXT_PUBLIC_WS_URL` | URL WebSocket | `https://yourdomain.com` hoặc `https://api.yourdomain.com` |

#### Email (SMTP) — cho tính năng quên mật khẩu

| Secret | Mô tả | Ví dụ (Gmail) |
|--------|-------|---------------|
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | SSL mode | `false` |
| `SMTP_USER` | Email gửi | `your-email@gmail.com` |
| `SMTP_PASS` | App Password (không phải mật khẩu Google) | `abcd efgh ijkl mnop` |
| `SMTP_FROM_NAME` | Tên hiển thị | `VGfriend` |

> Email gần như **bắt buộc** cho production vì luồng đăng ký cần OTP qua email.

### Bước 4: Chạy pipeline deploy

1. Vào tab **Actions** trong GitHub repo
2. Chọn workflow **"Deploy to VPS"**
3. Click **"Run workflow"**
4. Chọn environment (`production`)
5. Click **"Run workflow"**

Pipeline sẽ tự động:
1. Kiểm tra TypeScript errors
2. Build Docker images và push lên GHCR
3. SSH vào VPS, pull images mới
4. Chạy database migrations
5. Restart tất cả services
6. Verify server healthy

### Deploy thủ công (không dùng GitHub Actions)

SSH vào VPS và chạy:

```bash
cd /opt/vgfriend

# Ghi file .env (thay các giá trị YOUR_*)
cat > .env << 'EOF'
POSTGRES_USER=vgfriend
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD
POSTGRES_DB=vgfriend
JWT_SECRET=YOUR_JWT_SECRET_32_CHARS_MINIMUM
JWT_REFRESH_SECRET=YOUR_REFRESH_SECRET_32_CHARS
GROQ_API_KEY=gsk_YOUR_GROQ_API_KEY
CORS_ORIGIN=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_WS_URL=https://yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=VGfriend
GITHUB_REPOSITORY=haidonglethqb/virtualgfriend
EOF

# Login GHCR (cần Personal Access Token với quyền read:packages)
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull images
docker compose pull

# Start database, chờ healthy
docker compose up -d postgres redis
sleep 15

# Chạy migration TRƯỚC khi start server
docker compose run --rm --no-deps server npx prisma migrate deploy

# Start tất cả services
docker compose --profile production up -d --force-recreate

# Kiểm tra
docker compose ps
docker compose logs --tail=30 server
```

---

## Troubleshooting

### Database không kết nối được

```bash
# Kiểm tra container đang chạy
docker ps

# Xem logs database
docker-compose -f docker-compose.dev.yml logs -f postgres

# Restart nếu cần
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
# Đợi 10-15 giây rồi thử lại
```

### Lỗi "Property X does not exist on PrismaClient" (IDE báo đỏ)

Xảy ra khi schema.prisma thay đổi nhưng Prisma Client chưa được regenerate:

```bash
cd server
npx prisma generate
```

### Lỗi "EADDRINUSE: address already in use :::3001"

```bash
# Linux/Mac
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F
```

### AI không trả lời

1. Kiểm tra `GROQ_API_KEY` trong `server/.env` — phải bắt đầu bằng `gsk_`
2. Lấy key miễn phí tại [console.groq.com](https://console.groq.com)
3. Restart server sau khi sửa `.env`

### Migration bị lỗi

```bash
cd server

# Option 1: Reset database (XÓA TẤT CẢ DỮ LIỆU — chỉ dùng khi dev)
npx prisma migrate reset
npx prisma db seed

# Option 2: Push schema trực tiếp (dev only, bỏ qua migration history)
npx prisma db push
```

### Email OTP không gửi được

1. Kiểm tra `SMTP_USER` và `SMTP_PASS` đã được set
2. Gmail: `SMTP_PASS` phải là **App Password** (16 ký tự), không phải mật khẩu Google thông thường
3. Tạo App Password tại [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (cần bật 2FA trước)
4. Kiểm tra log server: `docker compose logs server | grep -i email`

### VPS: Server không healthy sau deploy

```bash
# Xem logs server
docker compose logs --tail=50 server

# Xem logs tất cả services
docker compose logs --tail=20

# Kiểm tra health endpoint
curl http://localhost:3001/health

# Restart server thủ công
docker compose restart server
```

### VPS: docker compose pull bị lỗi "manifest unknown"

Xảy ra khi `GITHUB_REPOSITORY` trong `.env` bị sai case (phải lowercase):

```bash
# Kiểm tra giá trị trong .env
grep GITHUB_REPOSITORY .env
# Phải là: haidonglethqb/virtualgfriend (tất cả lowercase)

# Sửa nếu cần
sed -i 's/GITHUB_REPOSITORY=.*/GITHUB_REPOSITORY=haidonglethqb\/virtualgfriend/' .env
docker compose pull
```

---

## API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Đăng xuất |
| POST | `/api/auth/forgot-password` | Gửi OTP quên mật khẩu |
| POST | `/api/auth/verify-otp` | Xác nhận OTP |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu |

### Character & Chat
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST/PATCH | `/api/character` | Quản lý nhân vật |
| GET | `/api/chat/messages` | Lịch sử chat |
| POST | `/api/chat/send` | Gửi tin nhắn AI |

### Social
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST | `/api/dm/conversations` | Danh sách / tạo cuộc trò chuyện |
| GET/POST | `/api/dm/conversations/:id/messages` | Tin nhắn trong cuộc trò chuyện |
| GET | `/api/leaderboard/:category` | Bảng xếp hạng (level, affection, streak) |

### Shop & Quests
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/gifts` | Danh sách quà |
| POST | `/api/gifts/buy` | Mua quà |
| POST | `/api/gifts/send` | Tặng quà |
| GET | `/api/quests` | Danh sách nhiệm vụ |
| POST | `/api/quests/claim/:questId` | Nhận thưởng nhiệm vụ |

## WebSocket Events

```
# AI Chat
message:send              → Gửi tin nhắn cho AI
message:receive           ← Nhận phản hồi từ AI
character:typing          ← AI đang gõ
character:mood_change     ← Thay đổi tâm trạng
character:affection_change ← Thay đổi độ thân mật

# Direct Messages
dm:send                   → Gửi tin nhắn DM
dm:receive                ← Nhận tin nhắn DM
dm:typing                 ↔ Đang gõ
dm:read                   → Đánh dấu đã đọc
```

---

## License

MIT License — see [LICENSE](LICENSE) file.

---

Made by VGfriend Team
