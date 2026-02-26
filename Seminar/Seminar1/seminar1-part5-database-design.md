# Phần 5: Thiết Kế Cơ Sở Dữ Liệu

> **Hệ thống sử dụng:** PostgreSQL (RDBMS) với Prisma ORM

|---|

## 5.1. ERD — Entity Relationship Diagram

````

                        USERS & AUTHENTICATION                            
          
# Phần 5: Database Design (PostgreSQL)

|---|

## 5.1. Entity Relationship Diagram (Mô hình quan hệ)

Dưới đây là cấu trúc tóm tắt của các thực thể chính trong hệ thống và các mối quan hệ (Relational Model):

### 5.1.a. Nhóm Người dùng (Users & Auth)
- **`users` (Bảng chính):** Chứa thông tin đăng nhập, coin, gem, streak.
  *(Quan hệ 1-N với hầu hết các bảng khác trong hệ thống)*
- **`refresh_tokens`:** JWT Token. *(Khóa ngoại `userId` tham chiếu `users`)*
- **`user_settings`:** Cài đặt tuỳ chỉnh cá nhân. *(Quan hệ 1-1 với `users`)*
- **`notifications`:** Lưu log các thông báo in-app.
- **`password_reset_otps`:** Lưu mã OTP khi quên pass.

### 5.1.b. Nhóm Nhân vật AI (Characters)
- **`characters`:** (Cốt lõi) Chứa dữ liệu cá nhân hoá AI như Affection, Level, Mood. *(Khóa ngoại `userId`, có quan hệ 1-N với `messages`)*
- **`character_facts`:** Nơi AI lưu thông tin, trí nhớ học được từ user. *(Khóa ngoại `userId`, `characterId`)*
- **`character_templates`:** Bản mẫu nhân vật gốc, AI prompt template.
- **`character_scenes`:** Quản lý bối cảnh/hình nền mà user mở khóa.
- **`scenes`:** Catalog chứa giá tiền, unlock methods.

### 5.1.c. Nhóm Chat & Xã hội
- **`messages`:** Lưu lịch sử mọi tin nhắn của AI và User.
- **`conversations` & `conversation_members`:** Room chat Direct message/Group chat.
- **`direct_messages`:** Lưu log tin nhắn Realtime giữa các User.

### 5.1.d. Nhóm Game/Gamification
- **`quests` & `user_quests`:** Nhiệm vụ (Hành động, Daily, Truyện) và tiến độ cho từng User.
- **`achievements` & `user_achievements`:** Điểm thành tựu.
- **`gifts` & `user_gifts`:** Túi đồ vật phẩm/quà tặng.
- **`gift_history`:** Mọi giao dịch tặng quà (để tính Affection XP Bonus).
- **`memories`:** Cột mốc khoảnh khắc vàng (Memories Timeline).

|---|

## 5.2. Bảng tóm tắt các bảng và quan hệ

| Bảng                       | Mô tả                                | Quan hệ chính                     |                           |                                     |
|----------------------------|--------------------------------------|-----------------------------------|---------------------------|-------------------------------------|
| -------------------------- | ------------------------------------ | Tài khoản người dùng              | 1-N với hầu hết bảng      |                                     |
| `refresh_tokens`           | JWT refresh tokens                   | N-1 với users                     |                           |                                     |
| -----------------          | -------------------                  | -------------                     | Cài đặt cá nhân           | 1-1 với users                       |
| `character_templates`      | Mẫu nhân vật có sẵn                  | 1-N với characters                |                           |                                     |
| ----------------------     | -------------------                  | ------------------                | Nhân vật AI của từng user | N-1 với users; N-1 với templates    |
| `character_facts`          | Facts AI học về user                 | N-1 với characters                |                           |                                     |
| -------------------        | --------------------                 | ------------------                | Scene đã mở khóa          | N-1 với characters, N-1 với scenes  |
| `messages`                 | Lịch sử chat AI                      | N-1 với users, N-1 với characters |                           |                                     |
| -----------                | ---------------                      | --------------------------------- | Định nghĩa nhiệm vụ       | 1-N với user_quests                 |
| `user_quests`              | Tiến độ nhiệm vụ của user            | N-1 với users, N-1 với quests     |                           |                                     |
| --------------             | -------------------------            | -----------------------------     | Catalog quà tặng          | 1-N với user_gifts, gift_history    |
| `user_gifts`               | Inventory quà của user               | N-1 với users, N-1 với gifts      |                           |                                     |
| ---------------            | ----------------------               | ----------------------------      | Lịch sử tặng quà          | N-1 với users, characters, gifts    |
| `scenes`                   | Catalog cảnh nền                     | 1-N với character_scenes          |                           |                                     |
| -----------                | ----------------                     | ------------------------          | Kỷ niệm                   | N-1 với users, N-1 với characters   |
| `achievements`             | Định nghĩa thành tựu                 | 1-N với user_achievements         |                           |                                     |
| --------------------       | --------------------                 | -------------------------         | Thành tựu đạt được        | N-1 với users, N-1 với achievements |
| `notifications`            | Thông báo                            | N-1 với users                     |                           |                                     |
| ----------------           | ---------                            | -------------                     | Phần thưởng hằng ngày     | N-1 với users                       |
| `conversations`            | Cuộc hội thoại DM                    | 1-N với members, messages         |                           |                                     |
| -----------------------    | -----------------                    | -------------------------         | Thành viên conversation   | N-N (users × conversations)         |
| `direct_messages`          | Tin nhắn DM                          | N-1 với conversations, users      |                           |                                     |
| `system_configs`           | Cấu hình hệ thống                    | Standalone (key-value)            |                           |                                     |
| `password_reset_otps`      | OTP đặt lại mật khẩu                 | Standalone (indexed by email)     |                           |                                     |

|---|

## 5.3. Enum Types

| Enum                                                                | Giá trị                                                             |                                                       |
|---------------------------------------------------------------------|---------------------------------------------------------------------|-------------------------------------------------------|
| ------------------------------------------------------------------- | MALE, FEMALE, OTHER                                                 |                                                       |
| `RelationshipStage`                                                 | STRANGER, ACQUAINTANCE, FRIEND, CLOSE_FRIEND, CRUSH, DATING, LOVER  |                                                       |
| --------------------                                                | ------------------------------------------------------------------- | USER, AI, SYSTEM                                      |
| `MessageType`                                                       | TEXT, IMAGE, VOICE, GIFT, STICKER, EVENT                            |                                                       |
| --------------                                                      | -----------------------------------------                           | DAILY, WEEKLY, STORY, ACHIEVEMENT, EVENT              |
| `QuestStatus`                                                       | IN_PROGRESS, COMPLETED, CLAIMED, EXPIRED                            |                                                       |
| --------------                                                      | -----------------------------------------                           | COMMON, UNCOMMON, RARE, EPIC, LEGENDARY               |
| `MemoryType`                                                        | MILESTONE, PHOTO, CONVERSATION, GIFT, EVENT, SPECIAL, DATE, CHAT    |                                                       |
| -------------------                                                 | -----------------------------------------------------------------   | SYSTEM, CHAT, QUEST, ACHIEVEMENT, GIFT, EVENT, REWARD |

|---|

## 5.4. Demo JSON mẫu (quan trọng nhất)

### users record
```json
{
  "id": "a1b2c3d4-uuid",
  "email": "user@example.com",
  "username": "nguyenvana",
  "displayName": "Nguyễn Văn A",
  "isPremium": false,
  "coins": 350,
  "gems": 0,
  "streak": 7,
  "lastActiveAt": "2026-02-26T08:30:00.000Z",
  "createdAt": "2026-01-10T00:00:00.000Z"
}
````

### characters record

```json
{
  "id": "char-uuid-001",
  "userId": "a1b2c3d4-uuid",
  "name": "Mai",
  "gender": "FEMALE",
  "personality": "caring",
  "mood": "happy",
  "level": 8,
  "experience": 420,
  "affection": 612,
  "relationshipStage": "CRUSH",
  "age": 22,
  "occupation": "teacher",
  "avatarStyle": "anime",
  "hairColor": "#3b1f0a",
  "eyeColor": "#4a3728",
  "responseStyle": "romantic",
  "creativityLevel": 0.7,
  "memoryEnabled": true,
  "isActive": true
}
```

### messages record

```json
{
  "id": "msg-uuid-001",
  "userId": "a1b2c3d4-uuid",
  "characterId": "char-uuid-001",
  "role": "AI",
  "content": "Anh đã về rồi à? Em đợi anh lâu lắm rồi đó~ ",
  "messageType": "TEXT",
  "emotion": "happy",
  "metadata": {
    "affection_change": 3,
    "quality_score": 0.85,
    "mood_after": "excited"
  },
  "isRead": true,
  "createdAt": "2026-02-26T09:15:00.000Z"
}
```

### character_facts record

```json
{
  "id": "fact-uuid-001",
  "characterId": "char-uuid-001",
  "category": "preference",
  "key": "favorite_food",
  "value": "phở bò",
  "importance": 7,
  "createdAt": "2026-02-20T14:30:00.000Z"
}
```

### user_quests record

```json
{
  "id": "uq-uuid-001",
  "userId": "a1b2c3d4-uuid",
  "questId": "quest-daily-001",
  "progress": 3,
  "maxProgress": 5,
  "status": "IN_PROGRESS",
  "startedAt": "2026-02-26T00:00:00.000Z",
  "completedAt": null,
  "claimedAt": null
}
```

### direct_messages record

```json
{
  "id": "dm-uuid-001",
  "conversationId": "conv-uuid-001",
  "senderId": "a1b2c3d4-uuid",
  "content": "Bạn đang chơi mấy ngày rồi? Streak của mình đang là 7 ngày ",
  "messageType": "TEXT",
  "isDeleted": false,
  "createdAt": "2026-02-26T10:00:00.000Z"
}
```
