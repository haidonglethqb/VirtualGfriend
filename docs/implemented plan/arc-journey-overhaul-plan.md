# Arc Journey Overhaul — Implementation Plan

> **Ngày tạo:** 2026-06-02  
> **Scope:** Cải thiện trang Hành Trình (Arc) — logic quest, progress tracking, rewards, UI trang chi tiết  
> **Trạng thái:** 🔄 Planning

---

## 1. Tổng quan mục tiêu

Trang Arc (`/arc`) hiện tại chỉ hiển thị danh sách Arc + tên quest, nhưng:
- ❌ Không có nút bắt đầu / hoàn thành quest trong Arc
- ❌ Quest trong Arc không được link với `arcId` (seed chưa có Arc nào)
- ❌ Không có trang chi tiết cho từng Arc
- ❌ `reach_affection` và `reach_level` không auto-track được progress
- ❌ Không có cơ chế unlock Arc tuần tự
- ❌ Phần thưởng hoàn thành Arc chưa rõ ràng

**Mục tiêu sau khi hoàn thành:**
- ✅ 5 Arc tuần tự với quest khả thi, có thể hoàn thành thực sự
- ✅ Trang chi tiết từng Arc hiển thị progress từng quest
- ✅ Auto-start tất cả quest khi vào Arc, auto-claim quest nhỏ, manual claim quest cuối
- ✅ Unlock Arc tiếp theo khi hoàn thành Arc trước
- ✅ Thưởng: Coins + Gems + XP + Affection + Title + Scene khi hoàn thành Arc
- ✅ Schema có `prerequisiteArcId` để enforce thứ tự

---

## 2. Quyết định đã thống nhất (từ Grill Session)

| # | Vấn đề | Quyết định |
|---|--------|-----------|
| 1 | Scope | Chỉnh sửa trang hiện tại (không rebuild) |
| 2 | Arc data | Tạo mới 5 Arc, xóa arc cũ nếu có |
| 3 | Quest actions | Dùng action có sẵn + thêm fix cho `reach_affection`, `reach_level` |
| 4 | Quest flow | Auto-start tất cả quest khi mở arc, phải xong hết arc mới qua arc mới |
| 5 | Claim | Auto-claim quest nhỏ (positions 1-N-1), manual claim quest cuối arc |
| 6 | Rewards | Coins + Gems + XP + Affection mỗi quest; hoàn thành arc → thêm Title + Scene unlock |
| 7 | UI | Tạo trang chi tiết `/arc/[arcId]` mới |
| 8 | Unlock order | Arc tuần tự (Arc 1 xong → Arc 2 mở) |
| 9 | Language | Song ngữ vi/en như hiện tại |
| 10 | Schema | Thêm `prerequisiteArcId` vào model Arc |
| 11 | Content | 5 Arc: Làm quen → Tình bạn → Rung động → Tình yêu → Mãi bên nhau |
| 12 | Seed | Tạo seed cho Arc + chuyển/thêm quest STORY vào Arc tương ứng |

---

## 3. Thiết kế 5 Arc và Quest

### Arc 1 — "Làm Quen" 🌱
- **Level:** 1–3 | **Tier:** FREE | **orderIndex:** 1
- **prerequisiteArcId:** null (Arc đầu tiên)
- **Icon:** 🌱
- **Reward hoàn thành:** Title "Người Mới Đến", 500 coins, 50 gems, 100 affection, unlock scene "Thư viện"

| # | Quest Title | Action | Count | Type | Reward | isLast |
|---|------------|--------|-------|------|--------|--------|
| 1 | Cuộc gặp gỡ đầu tiên | `send_message` | 1 | STORY | 100 coins, 10 gems, 20 affection, 50 XP | Không |
| 2 | Ngày đầu tiên bên nhau | `daily_login` | 3 | STORY | 150 coins, 15 gems, 25 affection, 75 XP | Không |
| 3 | Câu chuyện mở đầu | `send_message` | 20 | STORY | 200 coins, 20 gems, 30 affection, 100 XP | Không |
| 4 | Lời chào buổi sáng | `morning_greeting` | 2 | STORY | 300 coins, 30 gems, 50 affection, 150 XP | **Có (manual claim)** |

### Arc 2 — "Xây Dựng Tình Bạn" 🤝
- **Level:** 3–7 | **Tier:** FREE | **orderIndex:** 2
- **prerequisiteArcId:** Arc 1
- **Icon:** 🤝
- **Reward hoàn thành:** Title "Người Bạn Tốt", 800 coins, 80 gems, 150 affection, unlock scene "Trung tâm thương mại"

| # | Quest Title | Action | Count | Type | Reward | isLast |
|---|------------|--------|-------|------|--------|--------|
| 1 | Món quà đầu tiên | `send_gift` | 1 | STORY | 150 coins, 15 gems, 30 affection, 75 XP | Không |
| 2 | Cùng nhau trò chuyện | `send_message` | 50 | STORY | 200 coins, 20 gems, 40 affection, 100 XP | Không |
| 3 | Chúc ngủ ngon | `goodnight_message` | 3 | STORY | 200 coins, 20 gems, 40 affection, 100 XP | Không |
| 4 | Người bạn đồng hành | `send_gift` | 3 | STORY | 250 coins, 25 gems, 50 affection, 125 XP | Không |
| 5 | Kết nối sâu hơn | `send_message` | 100 | STORY | 500 coins, 50 gems, 100 affection, 250 XP | **Có (manual claim)** |

### Arc 3 — "Rung Động" 💫
- **Level:** 7–12 | **Tier:** FREE | **orderIndex:** 3
- **prerequisiteArcId:** Arc 2
- **Icon:** 💫
- **Reward hoàn thành:** Title "Trái Tim Rung Động", 1200 coins, 120 gems, 200 affection, unlock scene "Bãi biển hoàng hôn"

| # | Quest Title | Action | Count | Type | Reward | isLast |
|---|------------|--------|-------|------|--------|--------|
| 1 | Lời nói từ trái tim | `romantic_message` | 3 | STORY | 200 coins, 20 gems, 50 affection, 100 XP | Không |
| 2 | Khoảnh khắc ngọt ngào | `romantic_message` | 10 | STORY | 300 coins, 30 gems, 60 affection, 150 XP | Không |
| 3 | Tặng quà từ trái tim | `send_gift` | 5 | STORY | 300 coins, 30 gems, 60 affection, 150 XP | Không |
| 4 | Ngày tháng bên nhau | `daily_login` | 7 | STORY | 350 coins, 35 gems, 70 affection, 175 XP | Không |
| 5 | Cảm xúc vỡ oà | `send_message` | 200 | STORY | 700 coins, 70 gems, 150 affection, 350 XP | **Có (manual claim)** |

### Arc 4 — "Tình Yêu" ❤️
- **Level:** 12–18 | **Tier:** FREE | **orderIndex:** 4
- **prerequisiteArcId:** Arc 3
- **Icon:** ❤️
- **Reward hoàn thành:** Title "Đôi Tim Yêu Nhau", 1800 coins, 180 gems, 300 affection, unlock scene "Sân thượng"

| # | Quest Title | Action | Count | Type | Reward | isLast |
|---|------------|--------|-------|------|--------|--------|
| 1 | Thổ lộ yêu thương | `romantic_message` | 20 | STORY | 300 coins, 30 gems, 80 affection, 150 XP | Không |
| 2 | Quà tặng tình yêu | `send_gift` | 10 | STORY | 400 coins, 40 gems, 100 affection, 200 XP | Không |
| 3 | Buổi sáng tươi sáng | `morning_greeting` | 7 | STORY | 400 coins, 40 gems, 100 affection, 200 XP | Không |
| 4 | Cuộc trò chuyện dài | `send_message` | 400 | STORY | 500 coins, 50 gems, 120 affection, 250 XP | Không |
| 5 | Tình yêu chân thật | `romantic_message` | 50 | STORY | 1000 coins, 100 gems, 250 affection, 500 XP | **Có (manual claim)** |

### Arc 5 — "Mãi Bên Nhau" 💍
- **Level:** 18–25 | **Tier:** FREE | **orderIndex:** 5
- **prerequisiteArcId:** Arc 4
- **Icon:** 💍
- **Reward hoàn thành:** Title "Tình Yêu Vĩnh Cửu", 3000 coins, 300 gems, 500 affection, unlock scene "Nhà hàng sang trọng"

| # | Quest Title | Action | Count | Type | Reward | isLast |
|---|------------|--------|-------|------|--------|--------|
| 1 | Kiên trì yêu thương | `daily_login` | 14 | STORY | 500 coins, 50 gems, 100 affection, 250 XP | Không |
| 2 | Trăm ngàn lời yêu | `romantic_message` | 100 | STORY | 600 coins, 60 gems, 150 affection, 300 XP | Không |
| 3 | Người hào phóng | `send_gift` | 20 | STORY | 700 coins, 70 gems, 150 affection, 350 XP | Không |
| 4 | Hành trình ngàn tin nhắn | `send_message` | 1000 | STORY | 2000 coins, 200 gems, 400 affection, 1000 XP | **Có (manual claim)** |

---

## 4. Thay đổi Schema Prisma

### 4.1 Model Arc — Thêm `prerequisiteArcId`

```prisma
model Arc {
  id              String    @id @default(uuid())
  name            String
  description     String    @db.Text
  iconEmoji       String    @default("📖")
  minLevel        Int       @default(1)
  maxLevel        Int       @default(5)
  orderIndex      Int       @default(0)
  requiredTier    PremiumTier @default(FREE)
  backgroundImage String?
  isActive        Boolean   @default(true)

  // NEW: prerequisite arc (must complete this arc first)
  prerequisiteArcId String? @unique
  prerequisiteArc   Arc?    @relation("ArcChain", fields: [prerequisiteArcId], references: [id], onDelete: SetNull)
  nextArc           Arc?    @relation("ArcChain")

  // NEW: completion rewards
  rewardCoins      Int      @default(0)
  rewardGems       Int      @default(0)
  rewardAffection  Int      @default(0)
  rewardXp         Int      @default(0)
  rewardTitleName  String?  // Title name to grant on arc completion
  rewardSceneName  String?  // Scene name to unlock on arc completion

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  quests          Quest[]
  arcProgress     ArcProgress[]

  @@unique([name])
  @@index([isActive, orderIndex])
  @@map("arcs")
}
```

### 4.2 Quest model — Thêm `isArcFinalQuest`

```prisma
model Quest {
  // ... existing fields ...
  isArcFinalQuest Boolean @default(false)  // NEW: true = manual claim, false = auto-claim
  // ... rest of existing fields ...
}
```

---

## 5. Danh sách file thay đổi

### Backend (server)

#### [MODIFY] `server/prisma/schema.prisma`
- Thêm `prerequisiteArcId`, `rewardCoins`, `rewardGems`, `rewardAffection`, `rewardXp`, `rewardTitleName`, `rewardSceneName` vào model `Arc`
- Thêm `isArcFinalQuest` vào model `Quest`

#### [MODIFY] `server/prisma/seed.ts`
- Thêm function `upsertArc()` helper
- Seed 5 Arc mới với đầy đủ reward fields
- Seed quest STORY mới + gắn `arcId`, `isArcFinalQuest`, `sortOrder`
- Gắn `prerequisiteArcId` giữa các Arc theo thứ tự

#### [MODIFY] `server/src/modules/arc/arc.service.ts`
- `getAllArcs()`: Thêm check `prerequisiteArc.completedAt` để determine `isUnlocked` (không chỉ dựa tier)
- `getAllArcs()`: Trả thêm quest progress của từng quest trong arc (join với `userQuest`)
- `getArcDetail(userId, arcId)`: Hàm mới — trả chi tiết arc + từng quest kèm progress của user
- `autoStartArcQuests(userId, arcId)`: Hàm mới — tự động start tất cả quest trong arc cho user
- `claimArcCompletion(userId, arcId)`: Hàm mới — claim reward hoàn thành arc (coins, gems, xp, affection, title, scene)
- `updateArcProgress()`: Cập nhật để sau khi arc hoàn thành 100%, tự unlock arc tiếp theo

#### [MODIFY] `server/src/modules/arc/arc.routes.ts`
- `GET /arcs/:arcId` — lấy chi tiết arc + quest với progress
- `POST /arcs/:arcId/start` — auto-start tất cả quest trong arc
- `POST /arcs/:arcId/claim` — claim reward hoàn thành arc (quest cuối)
- `POST /arcs/:arcId/quests/:questId/claim` — manual claim quest cuối arc

#### [MODIFY] `server/src/modules/game/game-event.service.ts`
- Thêm `'reach_affection'` và `'reach_level'` vào `updateQuestProgress()`:
  - Sau khi `characterService.updateAffection()` và `characterService.addExperience()`, kiểm tra xem affection/level mới có đủ điều kiện cho quest nào không, rồi set progress trực tiếp
- Sau khi arc progress được update, phát Socket.IO event `arc:completed` nếu arc vừa đạt 100%

#### [MODIFY] `server/src/modules/game/game.routes.ts`
- Thêm route `POST /game/action` nhận body `{ action, metadata }` nếu chưa có — dùng cho frontend trigger action

### Frontend (client)

#### [MODIFY] `client/src/app/arc/page.tsx`
- Xóa render danh sách quest inline trong ArcCard (sẽ chuyển sang trang chi tiết)
- Thêm logic check `isUnlocked` dựa trên prerequisite arc completion (không chỉ tier)
- Thêm nút "Bắt đầu hành trình" / "Tiếp tục" → navigate đến `/arc/[arcId]`
- Hiển thị progress badge (X/N quests completed) trên mỗi Arc card
- Lock icon + tooltip "Hoàn thành Arc trước để mở khóa" cho arc chưa unlock

#### [NEW] `client/src/app/arc/[arcId]/page.tsx`
- Trang chi tiết Arc — hiển thị:
  - Header: tên arc, description, icon, progress bar tổng
  - Danh sách quest có: progress bar riêng, trạng thái (locked/in-progress/completed/claimed), reward info
  - Nút "Bắt đầu Arc" (auto-start tất cả quest) nếu chưa start
  - Nút "Nhận thưởng" (manual claim) cho quest cuối khi đủ progress
  - Reward section: hiển thị phần thưởng hoàn thành arc (Title, Scene, currencies)
  - Animation confetti/celebration khi claim arc completion

#### [MODIFY] `client/src/services/api.ts`
- Thêm các API call mới cho arc:
  - `getArcDetail(arcId)`
  - `startArc(arcId)`
  - `claimArcCompletion(arcId)`
  - `claimArcQuestReward(arcId, questId)`

---

## 6. Logic chi tiết quan trọng

### 6.1 Unlock Arc Logic (trong `arc.service.ts`)

```typescript
// Arc N chỉ unlock khi:
// 1. User có đủ tier (requiredTier)
// 2. prerequisiteArc === null (Arc đầu tiên)
//    HOẶC prerequisiteArc đã completedAt !== null (đã hoàn thành)

const isUnlocked = 
  userTierIndex >= requiredTierIndex &&
  (!arc.prerequisiteArcId || previousArcProgress?.completedAt !== null);
```

### 6.2 Auto-Start Arc Quests (trong `arc.service.ts`)

```typescript
async autoStartArcQuests(userId: string, arcId: string) {
  // Lấy tất cả quest active trong arc
  const quests = await prisma.quest.findMany({ where: { arcId, isActive: true } });
  
  // Upsert UserQuest cho từng quest (không override nếu đang IN_PROGRESS)
  for (const quest of quests) {
    await prisma.userQuest.upsert({
      where: { userId_questId: { userId, questId: quest.id } },
      update: {}, // Giữ nguyên nếu đã có
      create: {
        userId,
        questId: quest.id,
        maxProgress: (quest.requirements as any).count || 1,
        status: 'IN_PROGRESS',
      }
    });
  }
  
  // Tạo ArcProgress nếu chưa có
  await prisma.arcProgress.upsert({
    where: { userId_arcId: { userId, arcId } },
    update: {},
    create: { userId, arcId, completionPercent: 0 }
  });
}
```

### 6.3 Auto-Claim vs Manual Claim Logic

- **Trong `game-event.service.ts → autoClaimQuest()`:**
  - Check `quest.isArcFinalQuest` — nếu `true`, **KHÔNG auto-claim**, chỉ đổi status thành `COMPLETED`
  - Nếu `false`, auto-claim như hiện tại

- **Manual claim (từ frontend):** 
  - User bấm nút "Nhận thưởng" → gọi `POST /arcs/:arcId/quests/:questId/claim`
  - Service claim quest + cộng reward + gọi `updateArcProgress()` → nếu 100% → phát event + trao Title + unlock Scene

### 6.4 Fix `reach_affection` và `reach_level` tracking

Trong `game-event.service.ts → processAction()`, sau khi `characterService.updateAffection()`:

```typescript
// Sau khi update affection, check quest progress cho reach_affection
const newAffection = updatedCharacter.affection;
await prisma.userQuest.updateMany({
  where: {
    userId,
    status: 'IN_PROGRESS',
    quest: {
      requirements: { path: ['action'], equals: 'reach_affection' }
    }
  },
  data: { /* set progress = newAffection nếu đạt count */ }
});
```

Tương tự cho `reach_level` sau khi `characterService.addExperience()`.

### 6.5 Arc Completion Reward (Title + Scene)

```typescript
async claimArcCompletion(userId: string, arcId: string) {
  const arc = await prisma.arc.findUnique({ where: { id: arcId } });
  
  // Grant coins, gems, xp, affection
  await prisma.user.update({ where: { id: userId }, data: {
    coins: { increment: arc.rewardCoins },
    gems: { increment: arc.rewardGems },
  }});
  
  // Grant Title if specified
  if (arc.rewardTitleName) {
    const title = await prisma.title.findFirst({ where: { name: arc.rewardTitleName } });
    if (title) {
      await prisma.userTitle.upsert({ ... });
    }
  }
  
  // Unlock Scene if specified
  if (arc.rewardSceneName) {
    const scene = await prisma.scene.findFirst({ where: { name: arc.rewardSceneName } });
    if (scene && character) {
      await prisma.characterScene.upsert({ ... });
    }
  }
  
  // Mark arc as completed in ArcProgress
  await prisma.arcProgress.update({
    where: { userId_arcId: { userId, arcId } },
    data: { completedAt: new Date(), completionPercent: 100 }
  });
}
```

---

## 7. Thứ tự thực hiện (Step-by-step)

### Phase 1 — Backend Foundation
- [ ] 1.1 Chạy Prisma migration thêm `prerequisiteArcId`, `rewardCoins`, `rewardGems`, `rewardAffection`, `rewardXp`, `rewardTitleName`, `rewardSceneName` vào Arc
- [ ] 1.2 Chạy Prisma migration thêm `isArcFinalQuest` vào Quest
- [ ] 1.3 Cập nhật `seed.ts` — thêm `upsertArc()` helper + seed 5 Arc + quest STORY gắn arcId

### Phase 2 — Backend Services & Routes
- [ ] 2.1 Cập nhật `arc.service.ts`:
  - `getAllArcs()` — thêm prerequisite logic + quest progress per quest
  - `getArcDetail()` — hàm mới
  - `autoStartArcQuests()` — hàm mới
  - `claimArcCompletion()` — hàm mới
- [ ] 2.2 Cập nhật `arc.routes.ts` — thêm routes mới
- [ ] 2.3 Fix `game-event.service.ts`:
  - `autoClaimQuest()` — check `isArcFinalQuest`
  - `processAction()` — fix tracking `reach_affection`, `reach_level`
  - `updateArcProgress()` — phát event khi arc hoàn thành

### Phase 3 — Frontend
- [ ] 3.1 Cập nhật `api.ts` — thêm arc API helpers
- [ ] 3.2 Cập nhật `arc/page.tsx` — list page với unlock logic + progress badge + navigate to detail
- [ ] 3.3 Tạo `arc/[arcId]/page.tsx` — detail page với quest list, progress bars, claim buttons, reward animation

### Phase 4 — Seed & Test
- [ ] 4.1 Chạy `npx prisma db push` (hoặc migrate) để apply schema
- [ ] 4.2 Chạy seed: `npx ts-node prisma/seed.ts`
- [ ] 4.3 Test flow:
  - Vào `/arc` → thấy 5 arc, arc 1 mở, arc 2-5 lock
  - Click Arc 1 → trang chi tiết
  - Bấm "Bắt đầu" → auto-start 4 quest
  - Gửi tin nhắn → xem progress quest 1 và 3 tăng
  - Hoàn thành quest 1-3 → auto-claim, cộng reward
  - Hoàn thành quest 4 → xuất hiện nút "Nhận thưởng"
  - Claim → nhận Title + unlock Scene + Arc 2 mở
- [ ] 4.4 Kiểm tra i18n vi/en

---

## 8. Các điểm cần chú ý / Risk

| Risk | Xử lý |
|------|-------|
| `reach_affection` quest progress — Prisma JSON path query phức tạp | Dùng `findMany` + filter trong JS thay vì JSON path query |
| `prerequisiteQuestId` conflict với arc quest chain | Không dùng `prerequisiteQuestId` cho arc quests, chỉ dùng `isArcFinalQuest` + `sortOrder` |
| Migration `prerequisiteArcId` là `@unique` → chỉ 1 arc có thể có cùng prerequisite | Đúng với model chain (1-1), oke |
| User đã có quest STORY cũ (không arcId) khi seed mới | Seed dùng `upsert` theo `title+type`, nếu title trùng sẽ update arcId mà không tạo mới |
| Socket.IO event `arc:completed` cần io instance | Import `io` từ `../../index` như achievement hiện tại |
| Scene "Thư viện" v.v. phải tồn tại trước khi seed arc | Seed scene chạy trước arc trong `main()` — đã đúng thứ tự |

---

## 9. Files phụ cần tạo Title

Cần seed 5 Title mới trong seed.ts:
- `"Người Mới Đến"` — category: arc, requirement: `{ type: "arc_complete", arcId: "..." }`
- `"Người Bạn Tốt"` — category: arc
- `"Trái Tim Rung Động"` — category: arc
- `"Đôi Tim Yêu Nhau"` — category: arc
- `"Tình Yêu Vĩnh Cửu"` — category: arc

> **Lưu ý:** Title được seed sau khi Arc được seed (cần arcId thật từ DB). Seed sẽ tạo Arc trước, lấy ID, rồi tạo Title.

---

## 10. API Endpoints mới

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/arcs` | Danh sách arc + progress (đã có, cập nhật response) |
| GET | `/api/arcs/:arcId` | Chi tiết arc + từng quest với user progress |
| POST | `/api/arcs/:arcId/start` | Auto-start tất cả quest trong arc |
| POST | `/api/arcs/:arcId/claim` | Claim reward hoàn thành arc (gồm quest cuối) |
| POST | `/api/arcs/:arcId/quests/:questId/claim` | Claim reward quest cuối arc (manual) |
