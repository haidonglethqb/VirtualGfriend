# Phần 6: Minimum Viable Product (MVP) & Tech Stack

|---|

## 6.1. Định nghĩa MVP

MVP của VGfriend được định nghĩa là phiên bản **đã hoạt động đầy đủ luồng nghiệp
vụ cốt lõi**:

> **Người dùng có thể đăng ký → tạo nhân vật → chat real-time với AI → tích lũy
> affection → hoàn thành quest → tặng quà → xem leaderboard**

Tất cả các tính năng trên **đã được triển khai và hoạt động ổn định** trong
phiên bản hiện tại.

|---|

## 6.2. Luồng nghiệp vụ cốt lõi MVP (đã hoàn thành)

```
[Đăng ký] → [Onboarding: Tạo nhân vật 5 bước] → [Dashboard]
                                                        
     
                                                         
     
     
[Chat AI Real-time]    [AI phản hồi + Affection tăng]
                                         
                               [Quest progress auto-update]
                                         
                               [Level up khi đủ XP]
     
      [Gift Shop: Mua + Tặng quà]  [Affection tăng mạnh]
     
      [Leaderboard: Xem xếp hạng]
     
      [DM: Nhắn tin với user khác]
```

|---|

## 6.3. Tình trạng MVP — Tính năng đã hoàn thành

| #  | Tính năng                  | Trạng thái | Ghi chú                              |
|----|----------------------------|------------|--------------------------------------|
| 1  | Đăng ký / Đăng nhập        | Done       | JWT dual-token, bcrypt               |
| 2  | Quên mật khẩu / OTP        | Done       | Nodemailer, OTP 6 số                 |
| 3  | Onboarding — Tạo nhân vật  | Done       | Wizard 5 bước, 5 templates           |
| 4  | Dashboard                  | Done       | Stats, character card, quick actions |
| 5  | Chat AI Real-time          | Done       | Socket.io + Groq LLaMA 3.3 70B       |
| 6  | AI Facts Learning          | Done       | Auto-extract mỗi 10 tin nhắn         |
| 7  | AI Proactive Notifications | Done       | 5 loại thông báo, cooldown Redis     |
| 8  | Affection & Relationship   | Done       | 7 giai đoạn, 0–1000                  |
| 9  | Level & XP System          | Done       | Auto level-up, milestones            |
| 10 | Quest System               | Done       | 5 loại, auto-track, claim reward     |
| 11 | Gift Shop                  | Done       | 5 rarity, inventory, AI reactions    |
| 12 | Scene System               | Done       | 5+ scenes, unlock progression        |
| 13 | Memory System              | Done       | Timeline, filter, favorites          |
| 14 | Leaderboard                | Done       | 4 boards, Redis cache                |
| 15 | DM User-to-User            | Done       | Real-time, typing, read receipt      |
| 16 | Analytics Dashboard        | Done       | Heatmap, charts, stats               |
| 17 | Settings                   | Done       | Profile, privacy, facts manager      |
| 18 | Docker containerization    | Done       | Production ready                     |
| 19 | CI/CD GitHub Actions       | Done       | Auto-deploy to VPS                   |
| 20 | E2E Tests (Playwright)     | Done       | Mobile + desktop                     |

**Tính năng planned (next phase):**

- Voice messages (UC-11, Level 20 unlock)
- Video calls (Level 25 unlock)
- Light theme
- Đa ngôn ngữ (EN, JA)

|---|

## 6.4. Tech Stack & Lý do lựa chọn

### Frontend

| Công nghệ                   | Lý do chọn                                                                   |
|-----------------------------|------------------------------------------------------------------------------|
| **Next.js 14** (App Router) | SSR/SSG tối ưu SEO; App Router cho nested layouts; TypeScript native support |
| **TailwindCSS**             | Development speed cao; Dark mode dễ implement; Consistent design system      |
| **Radix UI**                | Headless components đảm bảo accessibility (WCAG); Không lock-in design       |
| **Framer Motion**           | Animation library mạnh nhất cho React; Smooth transitions                    |
| **Zustand**                 | Nhẹ hơn Redux 10x; Boilerplate ít; Dễ maintain cho team nhỏ                  |
| **Socket.io Client**        | Auto-reconnect; Fallback transport; Tương thích với server-side Socket.io    |

### Backend

| Công nghệ                    | Lý do chọn                                                                                               |
|------------------------------|----------------------------------------------------------------------------------------------------------|
| **Express.js**               | Linh hoạt, ecosystem lớn; Team quen thuộc; Dễ integrate các middleware                                   |
| **Prisma ORM**               | Type-safe queries; Auto-generated types cho TypeScript; Migration system tốt                             |
| **PostgreSQL**               | ACID compliant cho financial data (coins/gems); Complex queries cho leaderboard/analytics                |
| **Redis**                    | In-memory → tốc độ leaderboard cache < 1ms; Rate limiting; AI cooldown tracking                          |
| **Socket.io**                | Bi-directional real-time; Room-based broadcasting (sync multi-tab); Middleware support                   |
| **JWT**                      | Stateless auth → scalable; Dual-token (access 15m + refresh 7d) cho security                             |
| **Groq API (LLaMA 3.3 70B)** | **MIỄN PHÍ** cho tier cơ bản; Tốc độ generate nhanh hơn OpenAI 5x; Chất lượng ngang GPT-4 cho tiếng Việt |

### Infrastructure

| Công nghệ                   | Lý do chọn                                                                |
|-----------------------------|---------------------------------------------------------------------------|
| **Docker + Docker Compose** | Reproducible environments; Dễ deploy one-command; Isolation giữa services |
| **Nginx**                   | Reverse proxy hiệu quả; Load balancing ready; SSL termination             |
| **GitHub Actions**          | Free với GitHub; Tích hợp sâu với repo; Easy secrets management           |

|---|

## 6.5. Minh chứng làm việc nhóm

### Commit History & Collaboration

Dự án được phát triển trong vòng 1 tháng với lịch sử commit công khai trên
GitHub:

**Repository:** `https://github.com/haidonglethqb/VirtualGfriend`

**Các mốc phát triển chính:**

- **Tuần 1:** Setup project structure, Docker, database schema (Prisma), auth
  module
- **Tuần 2:** Character system, Chat AI integration (Groq), Socket.io real-time
- **Tuần 3:** Game engine (Quest, Gift, Level), Leaderboard, Scene system
- **Tuần 4:** DM system, Analytics, E2E tests, CI/CD, MVP polish

### E2E Test Coverage

```
VirtualGfriend E2E Tests (Playwright)
 auth.spec.ts         — Đăng ký, đăng nhập, refresh token
 character.spec.ts    — Onboarding, tạo nhân vật
 chat.spec.ts         — Chat real-time, AI response
 quest.spec.ts        — Quest system, claim reward
 gift.spec.ts         — Gift shop, send gift
 leaderboard.spec.ts  — 4 boards, ranking
 dm.spec.ts           — Direct messaging
```

|---|

## 6.6. UI/UX — Giao diện MVP

### Màn hình chính đã implement

| Màn hình               | Route                             | Mô tả                     |                                  |                            |
|------------------------|-----------------------------------|---------------------------|----------------------------------|----------------------------|
| ---------------------- | --------------------------------- | `/`                       | Giới thiệu sản phẩm, CTA đăng ký |                            |
| Đăng ký / Đăng nhập    | `/register`, `/login`             | Auth forms với validation |                                  |                            |
| -------------------    | ----------------------            | ------------------------- | `/onboarding`                    | Wizard 5 bước tạo nhân vật |
| Dashboard              | `/dashboard`                      | Trang chủ sau đăng nhập   |                                  |                            |
| ----------             | -------------                     | -----------------------   | `/chat`                          | Màn hình chat chính        |
| Quest                  | `/quests`                         | Danh sách nhiệm vụ        |                                  |                            |
| ----------             | ----------                        | ------------------        | `/gifts`                         | Shop + inventory           |
| Leaderboard            | `/leaderboard`                    | 4 bảng xếp hạng           |                                  |                            |
| ------------           | ---------------                   | ---------------           | `/messages`                      | Direct messaging           |
| Memory                 | `/memories`                       | Gallery kỷ niệm           |                                  |                            |
| ----------             | ------------                      | ---------------           | `/analytics`                     | Thống kê                   |
| Settings               | `/settings`                       | Cài đặt tài khoản         |                                  |                            |

### Nguyên tắc UX

- **Mobile-first:** Responsive design, bottom navigation trên mobile
- **Dark theme:** Default dark mode phù hợp use case ban đêm
- **Smooth transitions:** Framer Motion animations trên mọi page
- **No crashes:** Tất cả error cases có proper error handling + user-friendly
  messages
- **Loading states:** Skeleton screens, typing indicators, progress bars
