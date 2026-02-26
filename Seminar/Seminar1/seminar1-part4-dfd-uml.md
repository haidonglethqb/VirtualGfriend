# Phần 4: Thiết Kế Luồng Dữ Liệu & UML

|---|

## 4.1. Data Flow Diagram (DFD) — Mức 0 (Context Diagram)

**Luồng dữ liệu tổng quan:**

1. Người dùng gửi `Request/Message` cho VGfriend System
2. VGfriend System nhận và xử lý, có thể gọi đến 2 dịch vụ bên ngoài:
   - `Groq API (LLaMA 3.3 70B)`: gửi Prompt lấy AI Response
   - `Email Server (Nodemailer)`: gửi yêu cầu SMTP lấy email OTP
3. Nền tảng VGfriend trả kết quả/phản hồi lại cho Người dùng.

|---|

## 4.2. Data Flow Diagram (DFD) — Mức 1 (Chi tiết các module)

**Quá trình xử lý nội bộ của hệ thống VGfriend:**

1. **Module Auth (Xác thực):**
   - Nhận `Credentials (email, passwrod)` từ Người dùng.
   - Kiểm tra Database PostgreSQL.
   - Trả về `JWT Tokens`.
2. **Module Chat:**
   - Nhận `message text` từ Người dùng.
   - Lưu tin nhắn vào DB, lấy context.
   - Gửi yêu cầu (prompt) sang `AI Service`.
3. **Module AI Service:**
   - Liên lạc với `Groq API (External)` lấy phản hồi AI.
   - Ghi nhận `AI response`.
4. **Module Game Engine:**
   - Chạy ngầm khi User gửi tin nhắn hoặc trigger sự kiện.
   - Cập nhật XP, Level, Quest Progress vào DB.
   - Cache leaderboard và dữ liệu rate limit vào `Redis`.
5. **Module DM (Nhắn tin trực tiếp):**
   - Nhận tin nhắn từ User gửi cho User khác.
   - Lưu DB, và broadcast realtime qua `Socket.io` về người nhận.

|---|

## 4.3. Use-case Diagram (Chức năng hệ thống phân theo Actor)

- **Người dùng mới:** Đăng ký tài khoản (UC-01), Đăng nhập (UC-02), Quên mật
  khẩu/OTP (UC-03).
- **Free User:** Tạo nhân vật (UC-04), Xem Dashboard (UC-05), Chat AI real-time
  (UC-07), Xem thay đổi điểm Affection (UC-10), Level & XP (UC-11), Xem nhiệm vụ
  (UC-12), Mua/tặng quà (UC-13), Lưu kỷ niệm (UC-15).
- **Premium User:** Mọi tính năng Free + Mở toàn bộ thẻ Scene (UC-14) + Nhận
  thông báo AI nhắc nhở (UC-09).
- **Social User:** Nhắn tin chia sẻ (DM - UC-16), Đua top Leaderboard (UC-17).
- **Hệ thống tự động:** AI chủ động tính năng (UC-09), Trích xuất thông tin
  (Facts extract - UC-08), Thu thập Analytics (UC-18).

|---|

## 4.4. Sequence Diagram — Chức năng Chat AI (UC-07)

Quá trình tuần tự khi Người dùng gửi 1 tin nhắn cho AI:

1. **Client** gửi lệnh qua Socket: `emit("message:send")`
2. **Socket.io Controller** tiếp nhận `handleChat`.
3. **Chat Service** lưu `user message` vào PostgreSQL.
4. Lấy 20 tin nhắn gần nhất từ Database làm `Context History`.
5. **AI Service** build AI Prompt dựa vào (Personality, Affection, History,
   Facts).
6. Gọi dịch vụ ngoài **Groq API** bằng Prompt.
7. **Groq API** trả kết quả chuỗi định dạng JSON:
   `{ message, quality_score, affection_change }`.
8. **AI Service** parse JSON, sau đó lưu `AI message` mới vào PostgreSQL.
9. **Game Engine** được trigger để cộng Experience (XP), Affection, và Quest
   Progress. Cập nhật Level nếu cần.
10. **Socket.io Controller** dùng `emit("message:receive")` phát kết quả về
    Client.
11. **Client** hiển thị `"AI đang gõ..."` (typing indicator 1-3 giây) sau đó
    hiện tin nhắn thực sự.

|---|

## 4.5. Sequence Diagram — Đăng nhập & Refresh Token (UC-02)

Quá trình tuần tự luồng Auth:

1. **Client** gửi Gói tin HTTP: `POST /api/auth/login` (email, password)
2. **Auth Controller** queries **PostgreSQL** tìm `user record`.
3. Mã khóa so sánh bcrypt `compare()`. Báo lỗi nếu sai.
4. Generate `Refresh Token`. Lưu vào **Redis** hoặc bảng `refresh_tokens`.
5. Cập nhật trạng thái `lastLoginAt` và chuỗi `Streak` hằng ngày.
6. Server trả HTTP 200 kèm `accessToken` và cookie chứa `refreshToken`. ... 15
   phút sau (AccessToken hêt hạn) ...
7. **Client** gửi request HTTP: `POST /api/auth/refresh` kèm cookie
   `refreshToken`.
8. Server verify token có bị revoked không, sau đó trả AccessToken mới (HTTP
   200).

|---|

## 4.6. Sequence Diagram — Tặng Quà cho AI (UC-13)

Quá trình tuần tự khi tặng quà ảo:

1. **Client** gửi `POST /api/gifts/send` kèm tham số `{ giftId }`.
2. **Gift Controller** check kho hàng (User_GiFs) xem người dùng còn quà không ở
   **PostgreSQL**.
3. Nếu còn (Qty > 0), giảm `Quantity` đi 1 đơn vị. Ghi log mới vào
   `gift_history`.
4. Gọi **Game Engine** trigger `AffectionBonus` để tăng thanh tình cảm
   Relationship.
5. Gọi **AI Service** tạo một lời phản hồi động (AI Reaction) ví dụ: "Cảm ơn anh
   nhiều, em rất thích món này!".
6. Trả API 200 `{ reaction_text, new_affection }` về **Client**. Lên giao diện
   hiển thị hình ảnh quà tặng kèm chữ bay.
