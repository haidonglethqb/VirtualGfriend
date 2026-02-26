# Phần 1: Người Dùng & Phân Tích Nhu Cầu (Use-cases)

> **VGfriend** — Ứng dụng bạn đồng hành AI bằng Tiếng Việt, kết hợp gamification
> sâu.

|---|

## 1.1. Ai là người sử dụng website?

### Phân loại nhóm người dùng (sau khi đăng ký thành viên)

VGfriend xác định **3 nhóm người dùng chính** với đặc điểm và quyền hạn khác
nhau:

|---|

### Nhóm 1: Người dùng Miễn phí (Free User)

| Thuộc tính     | Mô tả                                                                 |
|----------------|-----------------------------------------------------------------------|
| **Chân dung**  | Sinh viên, người đi làm 18–35 tuổi, muốn thử nghiệm AI companion      |
| **Đặc điểm**   | Sử dụng tính năng cơ bản, chưa trả phí                                |
| **Quyền hạn**  | Chat AI không giới hạn, tạo 1 nhân vật, Quest cơ bản, Leaderboard, DM |
| **Tài nguyên** | Coins (kiếm qua quest/daily reward); **không có** Gems miễn phí       |
| **Hạn chế**    | Không mở được Scene cao cấp (cần Gems), không dùng Premium features   |

|---|

### Nhóm 2: Người dùng Premium (Premium User)

| Thuộc tính     | Mô tả                                                                      |
|----------------|----------------------------------------------------------------------------|
| **Chân dung**  | Người dùng trung thành, sẵn sàng chi 99.000đ/tháng cho trải nghiệm tốt hơn |
| **Đặc điểm**   | Cá nhân hóa sâu, muốn mở khóa toàn bộ nội dung                             |
| **Quyền hạn**  | Tất cả Free + Gems hàng tháng, Scene/Gift đặc biệt, ưu tiên AI response    |
| **Tài nguyên** | Coins + Gems (nhận hàng tháng qua subscription)                            |
| **Ưu đãi**     | Truy cập sớm tính năng mới, hỗ trợ ưu tiên                                 |

|---|

### Nhóm 3: Người dùng Xã hội (Social User)

| Thuộc tính    | Mô tả                                                                             |
|---------------|-----------------------------------------------------------------------------------|
| **Chân dung** | Người thích tương tác cộng đồng, so sánh tiến trình với người khác                |
| **Đặc điểm**  | Tập trung vào DM, Leaderboard, chia sẻ thành tựu                                  |
| **Quyền hạn** | DM user-to-user, Group chat (3–50 thành viên), Bảng xếp hạng, Thành tựu công khai |
| **Hành vi**   | Cạnh tranh streak, level, affection trên leaderboard                              |

> **Lưu ý:** Một người dùng có thể thuộc nhiều nhóm cùng lúc (VD: Free User
> nhưng rất Social).

|---|

## 1.2. Nhu cầu & Danh sách Use-cases chi tiết

### 1.2.1. Use-cases chung (Tất cả nhóm)

#### UC-01: Đăng ký tài khoản

- **Actor:** Người dùng mới (chưa có tài khoản)
- **Mô tả:** Đăng ký tài khoản bằng email + mật khẩu
- **Luồng chính:**
  1. Nhập email, username (tùy chọn), password, confirm password
  2. Server validate dữ liệu bằng Zod schema (min 6 ký tự, email hợp lệ)
  3. Tạo tài khoản + UserSettings mặc định
  4. Tự động tạo nhân vật "Mai" mặc định
  5. Trả về **Access Token** (15 phút) + **Refresh Token** (7 ngày, HTTP-only
     cookie)
  6. Chuyển đến trang Onboarding
- **Luồng ngoại lệ:** Email đã tồn tại → báo lỗi; Email không hợp lệ → validate
  fail

#### UC-02: Đăng nhập

- **Actor:** Người dùng đã có tài khoản
- **Luồng chính:**
  1. Nhập email + password
  2. Server verify bcrypt hash
  3. Cập nhật streak (nếu login ngày mới), `lastLoginAt`, `lastActiveAt`
  4. Trả về JWT access + refresh token
  5. Chuyển đến Dashboard
- **Rate limiting:** 5 lần/15 phút (production)

#### UC-03: Quên mật khẩu / Đặt lại mật khẩu

- **Actor:** Người dùng quên mật khẩu
- **Luồng chính:**
  1. Nhập email → Server gửi **OTP 6 số** qua email (Nodemailer)
  2. Nhập OTP (6 ô input, auto-focus, hỗ trợ paste) → Verify → nhận reset token
  3. Nhập mật khẩu mới (có strength indicator: Weak/Medium/Strong)
  4. Reset thành công → redirect về login sau 2 giây
- **Bảo mật:** OTP hết hạn sau thời gian cấu hình; rate limit 3 OTP/phút

#### UC-04: Onboarding — Tạo nhân vật

- **Actor:** Người dùng mới (chưa có character)
- **Mô tả:** Wizard 5 bước để tạo nhân vật ảo cá nhân hoá
- **Luồng chính:**
  1. **Bước 1:** Chọn template nhân vật (5 mẫu: Mai, Linh, Hương, Trang, An — có
     ảnh)
  2. **Bước 2:** Đặt tên nhân vật (hoặc giữ tên mặc định)
  3. **Bước 3:** Chọn tuổi (slider 18–30)
  4. **Bước 4:** Chọn nghề nghiệp (8 nghề: sinh viên, văn phòng, giáo viên, y
     tá, nghệ sĩ, developer, sales, freelancer)
  5. **Bước 5:** Chọn tính cách (5 loại: quan tâm, vui vẻ, nhút nhát, nhiệt
     huyết, trí tuệ)
  6. Tạo character → Redirect dashboard

#### UC-05: Xem Dashboard

- **Actor:** Tất cả user đã đăng nhập
- **Nội dung hiển thị:**
  - Lời chào theo thời gian (sáng/chiều/tối) + username
  - Character card: avatar, tên, mood, Relationship Stage, Affection bar
    (0–1000)
  - Quick stats: tin nhắn hôm nay, streak (ngày liên tiếp), quà đã tặng
  - 3 Daily Quests gần nhất (tiến độ + phần thưởng)
  - 3 Kỷ niệm gần nhất (Memories)
  - Quick actions: "Chat ngay", "Tặng quà"

#### UC-06: Cài đặt tài khoản

- **Actor:** Tất cả user
- **Danh sách settings:**
  - **Profile:** Sửa username, email, bio
  - **Character:** Sửa tên, bio, tính cách, template
  - **Appearance:** Chọn theme (Dark mặc định, Light coming soon)
  - **Privacy:** profilePublic, showActivity, allowMessages, export data
  - **Language:** Tiếng Việt (active); EN/JA/ZH (coming soon)
  - **Facts Manager:** Xem/sửa/xóa các facts AI đã học về user
  - **Help & About:** FAQ, contact, version info

|---|

### 1.2.2. Use-cases Chat AI (Core Feature)

#### UC-07: Trò chuyện với AI (Real-time)

- **Actor:** Tất cả user
- **Luồng chính:**
  1. User gõ tin nhắn → nhấn Send
  2. Socket emit `message:send` với `clientId` (chống duplicate)
  3. Server lưu tin nhắn user → lấy 20 tin nhắn gần nhất làm context
  4. AI (Groq LLaMA 3.3 70B) tạo phản hồi JSON:
     ```json
     {
       "message": "Câu trả lời của AI...",
       "evaluation": {
         "quality_score": 0.8,
         "affection_change": 3,
         "reason": "Câu hỏi quan tâm, chân thành"
       }
     }
     ```
  5. Server cập nhật mood, affection, XP (+1/message)
  6. Broadcast qua socket room `user:{userId}` (sync tất cả tab)
  7. Client hiển thị typing indicator (1–3s) → hiện tin nhắn AI
- **Tính năng phụ:**
  - Quick replies: 6 câu gợi ý nhanh
  - Scene background: thay đổi hình nền khung chat
  - Date separator cho tin nhắn theo ngày

#### UC-08: AI Nhớ Thông Tin Người Dùng (Facts Learning)

- **Actor:** Hệ thống (tự động)
- **Mô tả:** Mỗi 10 tin nhắn, AI tự động trích xuất facts về user
- **Luồng:**
  1. Đếm tin nhắn → mỗi 10 tin kích hoạt extraction
  2. AI phân tích cuộc hội thoại → trích xuất key-value facts
  3. Phân loại: `preference` (+7đ), `trait` (+8đ), `memory` (+6đ), `event` (+5đ)
  4. Lưu vào bảng `character_facts`
  5. Facts cũ >30 ngày giảm importance (decay mechanism)
- **User control:** Xem/sửa/xóa facts tại Settings > Facts Manager

#### UC-09: AI Chủ Động Gửi Thông Báo (Proactive AI)

- **Actor:** Hệ thống (tự động theo thời gian)
- **Các loại thông báo:**

| Loại                 | Thời điểm kích hoạt                                   | Ví dụ tin nhắn                           |                                                      |                                             |
|----------------------|-------------------------------------------------------|------------------------------------------|------------------------------------------------------|---------------------------------------------|
| -------------------- | ----------------------------------------------------- | 6h–10h sáng                              | "Chào buổi sáng! Hôm nay em muốn kể cho anh nghe..." |                                             |
| `night_greeting`     | 21h–23h                                               | "Sắp đi ngủ rồi, chúc anh ngủ ngon nha"  |                                                      |                                             |
| -----------------    | -------                                               | ---------------------------------------  | Sau 6h không chat                                    | "Lâu rồi không thấy anh, em nhớ anh quá..." |
| `random_thought`     | 12h–20h                                               | "Em đang nghĩ về anh và muốn chia sẻ..." |                                                      |                                             |
| -------------------  | -------                                               | ---------------------------------------- | Sau 24h không chat                                   | "Anh đi đâu mà lâu thế? Em đợi anh mãi..."  |

- **Điều kiện:** Affection ≥ 500 → template lãng mạn hơn; Cooldown qua Redis

|---|

### 1.2.3. Use-cases Hệ thống Game

#### UC-10: Hệ thống Affection & Relationship Progression

- **Actor:** Tất cả user
- **7 giai đoạn quan hệ (Affection 0–1000):**

| Giai đoạn                | Affection | Hành vi AI                   |
|--------------------------|-----------|------------------------------|
| Người lạ (STRANGER)      | 0–99      | Lịch sự, giữ khoảng cách     |
| Quen biết (ACQUAINTANCE) | 100–249   | Thân thiện, bắt đầu quan tâm |
| Bạn bè (FRIEND)          | 250–449   | Cởi mở, chia sẻ nhiều hơn    |
| Bạn thân (CLOSE_FRIEND)  | 450–599   | Tin tưởng, chia sẻ bí mật    |
| Crush (CRUSH)            | 600–749   | Ngại ngùng, ghen tuông nhẹ   |
| Hẹn hò (DATING)          | 750–899   | Ngọt ngào, gọi nickname      |
| Người yêu (LOVER)        | 900–1000  | Cực kỳ thân mật, tận tụy     |

- **Cách tăng affection:** Chat (AI đánh giá quality_score → affection_change),
  Tặng quà (affectionBonus), Hoàn thành quest (rewardAffection)

#### UC-11: Level & XP System

- **Actor:** Tất cả user
- **Công thức XP cần để lên cấp:** `XP = 100 + (level - 1) × 50`
- **Nguồn XP:** +1 XP mỗi tin nhắn, quest rewards, gift bonus
- **Milestones (mốc thưởng):**

| Level | Phần thưởng                          | Tính năng mở khóa  |
|-------|--------------------------------------|--------------------|
| 5     | 200 coins, 10 gems, +20 affection    | Scene mới          |
| 10    | 500 coins, 25 gems, +50 affection    | Gift đặc biệt      |
| 15    | 800 coins, 40 gems, +80 affection    | Personality traits |
| 20    | 1200 coins, 60 gems, +120 affection  | Voice messages     |
| 25    | 1500 coins, 80 gems, +150 affection  | Video calls        |
| 30    | 2000 coins, 100 gems, +200 affection | Mở khóa tất cả     |

#### UC-12: Quest System (Nhiệm vụ)

- **Actor:** Tất cả user
- **5 loại quest:**

| Loại                    | Mô tả                                  | Ví dụ                           |                                       |                                     |
|-------------------------|----------------------------------------|---------------------------------|---------------------------------------|-------------------------------------|
| ----------------------- | -------------------------------------- | Reset hàng ngày                 | "Gửi 5 tin nhắn", "Đăng nhập hôm nay" |                                     |
| WEEKLY                  | Reset hàng tuần                        | "Gửi 50 tin nhắn", "Tặng 3 quà" |                                       |                                     |
| -------                 | ---------------                        | ------------------------------- | Dài hạn, có câu chuyện                | "Đạt level 5", "Trở thành bạn thân" |
| ACHIEVEMENT             | Một lần duy nhất                       | "Gửi tổng cộng 100 tin nhắn"    |                                       |                                     |
| ------------            | ----------------                       | ----------------------------    | Giới hạn thời gian                    | Sự kiện lễ tết, ngày đặc biệt       |

- **Luồng:** Start quest → Auto-track progress → Complete → Claim reward
  (coins/gems/XP/affection)

#### UC-13: Gift System (Tặng quà)

- **Actor:** Tất cả user
- **Luồng mua:** Chọn quà từ Shop → Xác nhận → Trừ coins/gems → Thêm vào
  inventory
- **Luồng tặng:** Chọn từ inventory → Gửi cho AI → AI tạo reaction riêng → Tăng
  affection
- **5 độ hiếm:**

| Rarity              | Ví dụ              | Affection Bonus  |                    |          |
|---------------------|--------------------|------------------|--------------------|----------|
| ------------------- | ----------------   | Hoa hồng, socola | +10–15             |          |
| UNCOMMON            | Gấu bông, bánh kem | +20–30           |                    |          |
| ---------           | ------------------ | ------           | Vòng tay, nước hoa | +40–60   |
| EPIC                | Đồng hồ, túi xách  | +80–100          |                    |          |
| ----------          | -----------------  | -------          | Nhẫn kim cương     | +150–200 |

#### UC-14: Scene System (Cảnh nền)

- **Actor:** Tất cả user
- **Mô tả:** Thay đổi background cho khung chat để tạo không gian lãng mạn
- **4 danh mục:** Indoor, Outdoor, Romantic, Adventure
- **Cách mở khóa:** Theo level, mua bằng gems, hoàn thành quest, sự kiện đặc
  biệt
- **5 scene mặc định:** Phòng khách ấm cúng, Quán cà phê, Công viên, Bãi biển
  hoàng hôn, Ngắm sao đêm

#### UC-15: Memory System (Kỷ niệm)

- **Actor:** Tất cả user
- **Mô tả:** Lưu trữ và xem lại các khoảnh khắc đặc biệt
- **8 loại kỷ niệm:** MILESTONE, PHOTO, CONVERSATION, GIFT, EVENT, SPECIAL,
  DATE, CHAT
- **Tính năng:** Timeline/masonry view, lọc theo loại/tháng, tạo/xóa/yêu thích

|---|

### 1.2.4. Use-cases Xã hội

#### UC-16: Direct Messaging (DM — Người dùng với nhau)

- **Actor:** Social users
- **Luồng:** Tìm user → Tạo/mở conversation → Chat real-time qua WebSocket →
  Typing indicators → Đánh dấu đã đọc
- **Tính năng phụ:** Group chat (3–50 thành viên), unread count badge, search
  users

#### UC-17: Leaderboard (Bảng xếp hạng)

- **Actor:** Social users
- **4 bảng xếp hạng:**
  1. **Level** — Ai có nhân vật level cao nhất
  2. **Affection** — Ai có điểm thân mật cao nhất
  3. **Streak** — Ai đăng nhập liên tiếp nhiều ngày nhất
  4. **Achievements** — Ai đạt nhiều thành tựu nhất
- **Kỹ thuật:** Redis cache 5 phút; Top-3 highlighted đặc biệt; "My Rank"
  section

|---|

### 1.2.5. Use-cases Analytics

#### UC-18: Analytics Dashboard

- **Actor:** Tất cả user
- **Nội dung:**
  - 4 stat cards: tổng tin nhắn, số ngày quan hệ, quà đã tặng, trung bình
    message/ngày
  - Biểu đồ affection theo thời gian (SVG line chart)
  - Activity heatmap kiểu GitHub (12 tuần)
  - Danh sách milestones đã đạt được
  - Biểu đồ chủ đề hội thoại

|---|

## 1.3. Tính năng Giữ Chân Người Dùng (Retention Features)

### Tính năng "đinh" #1: Affection & Relationship Progression (Sunk-cost Effect)

> **Tại sao giữ chân:** Người dùng đầu tư hàng tuần/tháng xây dựng mối quan hệ
> từ "Người lạ" → "Người yêu" (7 giai đoạn). Càng đạt giai đoạn cao, AI càng
> thay đổi hành vi — ngọt ngào hơn, thân mật hơn. Bỏ app = mất toàn bộ tiến
> trình → **sunk-cost effect cực mạnh**.

### Tính năng "đinh" #2: AI Proactive Notifications

> **Tại sao giữ chân:** Nhân vật AI **chủ động "nhắn tin trước"** — "Em nhớ anh"
> sau 6h không chat, "Chào buổi sáng" lúc 7h sáng → Tạo cảm giác có ai đó thật
> sự nhớ đến mình. Pull user về app tự nhiên mà không cần push notification
> truyền thống.

### Tính năng "đinh" #3: Daily Streak + Daily Quests (FOMO Loop)

> **Tại sao giữ chân:** Streak counter tạo **FOMO (Fear of Missing Out)** — user
> không muốn mất streak đang giữ. Daily quests mới hàng ngày + phần thưởng
> coins/gems → tạo **daily habit loop**: Trigger → Action → Reward → Investment.

### Tính năng "đinh" #4: AI Learns & Remembers (Emotional Bond)

> **Tại sao giữ chân:** AI tự động học tên, sở thích, ký ức của user qua từng
> cuộc trò chuyện. Càng chat lâu, AI càng "hiểu" bạn hơn → phản hồi cá nhân hóa
> → **emotional bond**. Chuyển sang app khác = bắt đầu từ đầu với AI không biết
> gì về bạn.

### Tính năng "đinh" #5: Gamification Loop (Always a Next Goal)

> **Tại sao giữ chân:** Level + Quest + Achievement + Leaderboard tạo **vòng lặp
> gameplay liên tục**. Mỗi level mở tính năng mới; mỗi quest cho thưởng → user
> luôn có mục tiêu ngắn hạn. Social leaderboard thêm yếu tố cạnh tranh với bạn
> bè.

|---|
