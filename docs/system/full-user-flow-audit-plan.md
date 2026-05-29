# Ke Hoach Audit Toan He Thong: Code Logic, Phan Quyen, Chat AI Va Subscription

## Muc tieu

Tai lieu nay la checklist/plan de kiem tra toan bo Amoura theo goc nhin nguoi dung va ky thuat. Muc tieu la phat hien loi logic, loi phan quyen, loi premium gating, loi chat/AI, loi subscription/payment, loi realtime va cac diem co the lam user gap flow hong.

Ket qua mong muon sau khi chay plan:

- Moi flow nguoi dung chinh co trang thai `pass/fail/blocked`.
- Moi API va page nhay cam co ket luan ro: public, authenticated, owner-only, premium-only, admin-only, webhook-only.
- Moi loi duoc ghi voi muc do uu tien `P0/P1/P2/P3`, buoc tai hien, expected, actual, file lien quan va de xuat fix.
- Co danh sach test can bo sung sau audit.

## Pham vi kiem tra

### Frontend

- Landing, pricing, reviews, static pages.
- Auth pages: register, OTP verify, login, forgot password, reset password, logout.
- App pages: dashboard, onboarding, chat, messages, shop, inventory, quests, daily rewards, memories, achievements, leaderboard, arc, analytics, subscription, settings.
- Route guard va state: `useAuthStore`, `useAuthGuard`, `AppLayout`, `PremiumGate`, socket connect/disconnect.
- UI states: loading, empty, error, unauthenticated, access denied, payment success/cancel, mobile layout.

### Backend

- Express route mounting trong `server/src/routes/index.ts`.
- Auth middleware, premium middleware, admin middleware, error middleware, rate limiting, request monitoring.
- Modules: auth, users, character, chat, ai, memory, dm, payment, admin, gift/shop, scene, quest, daily reward, achievement, arc, energy, social stats, event, leaderboard, analytics.
- Prisma schema, migrations, seed, transaction logic, ownership checks theo `userId`.
- Redis/cache, JWT/session, Stripe webhook/payment lifecycle, Socket.IO auth.

### Khong nam trong pham vi

- Refactor UI lon.
- Doi business model/pricing.
- Doi schema neu khong phat hien bug can fix.
- Audit ha tang production thuc te ngoai nhung gi repo cau hinh.

## Ma tran phan quyen can xac minh

| Nhom quyen | Duoc phep | Khong duoc phep | Diem can test |
| --- | --- | --- | --- |
| Guest | Xem landing/static/pricing public, register, login, forgot password | Vao dashboard/chat/shop/settings/API private | Truy cap truc tiep URL private phai redirect login hoac tra 401 |
| User da dang nhap | Dung dashboard, onboarding, chat co character cua minh, shop, quests, memories, settings | Doc/sua/xoa du lieu user khac | Doi `characterId`, `chatId`, `memoryId`, `conversationId` cua user khac |
| Free tier | Dung tinh nang free, xem upsell premium | Dung feature VIP neu bi khoa | UI gate va API gate phai cung chan |
| BASIC/PRO/ULTIMATE | Dung dung feature theo tier config | Vuot gioi han tier thap hon | Test tier hierarchy, dynamic config, downgrade khi het han |
| Admin | Vao `/admin`, quan ly tier/pricing/config/upload neu co token admin hop le | Admin API khi thieu token, token user thuong, token het han | `adminAuth`, env admin missing, localStorage admin token |
| Stripe webhook | Cap nhat subscription/payment bang webhook trusted | User goi truc tiep webhook gia mao | Signature validation, idempotency, duplicate event |
| Socket user | Connect socket bang token hop le, nhan event cua minh | Nghe event cua user khac | Token het han, logout, multi-tab, room isolation |

## Full user-flow checklist

### 1. Guest va landing

- Mo `/` khi chua login: hien landing, CTA dung link den register/login.
- Mo `/pricing`, `/features`, `/about`, `/privacy`, `/terms`, `/reviews`: khong can token.
- Mo page private truc tiep khi chua login: redirect `/auth/login` hoac hien null/loading ngan ro ri du lieu.
- Kiem tra mobile/desktop khong tran layout, khong bi overlay che CTA.

### 2. Register, OTP va login

- Register email/password hop le: tao pending registration, gui OTP, dieu huong `/auth/verify-otp?type=registration`.
- Register email trung: error ro, khong tao duplicate.
- Password yeu/sai format: validation frontend va backend dong nhat.
- OTP dung: hoan tat user, luu token, vao onboarding.
- OTP sai/het han/resend: message dung, rate limit khong bi bypass.
- Login dung: luu `accessToken`, load `/auth/me`, redirect dashboard.
- Login sai password/user khong ton tai: khong leak thong tin nhay cam qua message.
- Forgot/reset password: OTP reset, token reset, password moi, login lai thanh cong.
- Logout: clear auth store, clear chat/character stores, disconnect socket, route ve landing.
- Cross-tab: logout/login o tab khac sync dung, token invalid khong lam app treo loading.

### 3. Onboarding va character

- User moi login chua co character: dashboard/chat phai dieu huong onboarding.
- Tao character voi du lieu hop le: tao record gan dung `userId`, redirect chat voi `characterId`.
- Validation: ten, tuoi, personality, dating preference, gender preference.
- User A khong doc/sua/xoa character cua User B bang cach sua URL/API payload.
- Ex-persona/breakup flow neu co: chi user so huu moi thay va chat duoc.
- Character templates public/private neu co: khong expose du lieu khong can thiet.

### 4. Dashboard va app layout

- Dashboard load thong tin user, character, stats, notification, balance.
- Neu API loi: hien retry/error state, khong crash.
- App navigation khong hien action premium/admin sai doi tuong.
- Socket connect sau khi authenticated va disconnect khi logout.
- Language/theme/settings duoc sync dung sau auth resolve.

### 5. Chat, AI va realtime

- Vao `/chat` khi da co character: load messages, scenes, character state.
- Gui message thanh cong: user message luu DB, AI reply luu DB, UI cap nhat dung thu tu.
- Gui message khi token het han: tra 401, UI xu ly login/refresh hop ly.
- User A khong fetch/send message vao conversation/character cua User B.
- Rate limit chat: spam nhieu request lien tiep khong lam qua tai server/AI.
- AI service:
  - Prompt dung character/personality/context.
  - Khong dua memory cua user khac vao context.
  - Khi OpenAI/API key loi/timeout: co fallback/error message ro, khong mat user message.
  - Emotion detection/facts learning/conversation summary khong crash main chat.
  - PII va secret khong ghi log raw khong can thiet.
- Socket:
  - Message/notification chi emit den room/user dung.
  - Multi-tab khong duplicate message qua muc.
  - Disconnect/reconnect khong lam mat state.

### 6. Memory, facts va personalization

- Memory list/create/update/delete chi theo `userId`.
- Auto-memory chi tao tu conversation cua user hien tai.
- Facts manager trong settings chi hien facts cua user.
- Delete memory/fact xong khong con duoc dua vao AI context.
- Conversation summary khong doc nham character/user.

### 7. Shop, gifts, economy va energy

- Shop load gifts/items dung tier va balance.
- Mua gift/item:
  - Du tien: tru coin/gem dung, tao inventory/event dung.
  - Thieu tien: khong tru tien, error ro.
  - Race condition: double click/double request khong tru hai lan neu khong hop le.
- Tang gift trong chat: cap nhat affection/social stats, tao message/event neu co.
- Inventory chi hien item cua user.
- Energy use/recharge: khong am energy, khong bypass cooldown.

### 8. Quest, daily reward, achievement, arc, leaderboard

- Daily reward:
  - Claim lan dau thanh cong.
  - Claim lai cung ngay bi chan.
  - Streak/timezone/cooldown dung.
- Quest:
  - Fetch quest dung user.
  - Claim chi khi da hoan thanh.
  - Reward khong duplicate khi spam claim.
- Achievement:
  - Points va claim dung dieu kien.
  - User khac khong claim achievement cua nhau.
- Arc/title:
  - Progress dung du lieu user.
  - Equip title chi title da unlock.
- Leaderboard:
  - Public/private theo yeu cau san pham.
  - Khong leak email/token/PII.

### 9. Subscription, premium va payment

- Pricing page load tier config public tu `/api/config/tier-plans`.
- Free user bam upgrade: tao Stripe checkout session dung tier/price.
- Checkout success: `/payment/success` verify session, subscription status cap nhat.
- Checkout cancel: khong cap premium, UI hien cancel state.
- `/subscription`: hien current plan, next billing, cancel/renew neu co.
- Premium gating:
  - UI `PremiumGate` va backend `requirePremium/requireTier/requireFeature` phai dong nhat.
  - User FREE khong bypass bang API direct.
  - BASIC/PRO/ULTIMATE dung hierarchy, khong cap nham feature.
- Expiry/cancel:
  - Het han auto downgrade FREE va clear cache.
  - Cancel subscription khong lap tuc mat quyen neu business rule la het ky moi mat.
  - Duplicate Stripe webhook khong duplicate subscription/payment.
- Payment ownership:
  - User A khong doc checkout session/subscription cua User B.
  - SessionId gia mao/het han duoc xu ly an toan.

### 10. Admin

- Khi env admin thieu: admin API tra 503, UI hien cau hinh thieu, khong bypass.
- Admin login dung: lay token admin, vao dashboard admin.
- Token admin het han/sai: 401, clear local state neu can.
- Token user thuong khong goi duoc admin API.
- Quan ly tier/pricing:
  - Validation gia/tier/limits.
  - Update config khong pha public pricing.
  - Cache invalidation neu co.
- Upload/admin-only endpoint chi admin goi duoc.
- Log hanh dong admin nen co du thong tin de trace nhung khong lo secret.

### 11. DM/messages va social stats

- Conversation list chi cua user.
- Tao/gui DM chi den doi tuong hop le.
- User khong doc message cua conversation khong tham gia.
- Socket DM emit dung recipient.
- Block/privacy setting neu co phai duoc enforce ca frontend va backend.
- Social stats tang/giam dung theo chat/gift/event, khong bi duplicate.

### 12. Settings va privacy

- Profile update: displayName/avatar/bio validation, update store sau API success.
- Character settings: update chi character cua user.
- Language/appearance: persist dung, khong can reload moi co tac dung.
- Privacy settings: update/read dung user.
- Ex-personas/facts/help/about settings pages deu redirect login neu chua auth.
- Password change can old password, logout/token invalidation policy ro.

## Code logic checklist

### Backend route va middleware

- Moi router private co `authenticate` truoc controller.
- Moi route admin co `adminAuth` va khong mount public sau `router.use(adminAuth)` ngoai y muon.
- Moi route premium co backend gate, khong chi gate frontend.
- Controller khong tin `userId` tu body/query; phai lay tu `req.user.id`.
- Moi find/update/delete theo resource cua user phai co ownership filter.
- Error code dong nhat: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 429 rate limit, 500 internal.
- Prisma write nhay cam dung transaction khi can: purchase, reward claim, payment update, gift send.
- Cache auth/premium invalidated khi user tier/balance/profile thay doi.

### Frontend state va guard

- `isLoading` khong lam page treo vo han.
- Protected pages redirect sau khi auth resolve, khong redirect som khi dang hydrate.
- API client gan Authorization dung va xu ly 401/403 nhat quan.
- Stores khong giu du lieu user cu sau logout.
- UI khong hien data cu khi chuyen account.
- Mobile layout khong che CTA/action quan trong.

### AI va data safety

- Prompt khong include secret/env.
- Context builder loc dung user/character.
- Logs khong ghi raw token/password/payment secret.
- AI output loi/empty/timeout co retry/fallback hop ly.
- Moderation/safety policy neu co phai duoc document va test theo input doc hai.

### Database va migration

- Prisma schema co unique/index can thiet cho email, userId-resource, payment session/subscription id.
- Migration apply clean tu DB moi.
- Seed tao du data dev nhung khong tao credential production nguy hiem.
- Cascade/delete behavior khong xoa nham du lieu user khac.

## Lenh kiem tra de chay

Chay tu root repo:

```powershell
git status --short
```

Client:

```powershell
cd client
npm ci
npm run typecheck
npm run build
```

Server:

```powershell
cd server
npm ci
npx prisma validate
npm run typecheck
npm run build
```

E2E/API:

```powershell
cd e2e
npm ci
npm run test:api
npm run test:ui-tests
npm run test:mobile
```

Security/dependency snapshot:

```powershell
cd client
npm audit --audit-level=moderate
cd ../server
npm audit --audit-level=moderate
cd ../e2e
npm audit --audit-level=moderate
```

## Tai khoan/du lieu can chuan bi de audit

- Guest chua login.
- User A FREE moi tao, chua onboarding.
- User B FREE da co character, messages, memories, inventory.
- User C BASIC.
- User D PRO.
- User E ULTIMATE.
- User F premium da het han.
- Admin hop le.
- Admin token het han/sai.
- Stripe test session success, cancel, webhook duplicate, webhook invalid signature.

## Mau ghi ket qua audit

| Area | Test case | Expected | Actual | Status | Priority | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Auth | Register OTP dung | Tao user va redirect onboarding | TBD | TBD | TBD | URL/log/screenshot |
| Permission | User A doc chat User B | 403/404, khong leak data | TBD | TBD | TBD | Request/response |
| Payment | Duplicate webhook | Khong duplicate subscription | TBD | TBD | TBD | Stripe event/log |

Priority:

- `P0`: mat data, leak data, bypass payment/admin, app khong dung duoc.
- `P1`: loi flow chinh, bypass premium, crash API/page quan trong.
- `P2`: loi edge case, UX fail co workaround.
- `P3`: polish, text, layout nho, log/doc gap.

## Acceptance criteria

- Tat ca protected API da duoc gan nhom quyen ro.
- Tat ca full user flow chinh co ket qua pass/fail va evidence.
- Khong co duong direct API nao bypass auth, owner check, premium gate hoac admin gate.
- Chat/AI khong dung nham data user khac va co fallback khi AI loi.
- Subscription/payment khong cap quyen sai, khong duplicate, khong bypass bang client.
- Co danh sach fix uu tien va danh sach test can bo sung sau audit.
