# VirtualGfriend Codebase Deep Dive For Report

## Muc tieu tai lieu
Tai lieu nay giup ban:
- Hieu codebase theo luong chay thuc te, khong chi theo ten file
- Co vi du code that de thuyet trinh
- Co cach noi trong bao cao theo goc nhin kien truc + business

Doc theo thu tu 1 -> 12 la hop ly nhat.

## 1) Toan he thong dang lam gi
San pham la AI companion platform gom 3 lop nghiep vu chinh:
- Emotional Core: chat voi AI, mood, affection, level, relationship stage
- Gamification Core: quest, gift, memory, leaderboard, achievements
- Monetization Core: premium tier, checkout Stripe, webhook cap quyen

Kien truc ky thuat:
- Frontend: Next.js App Router + Zustand + React Query
- Backend: Express + module services
- Realtime: Socket.IO
- Data: PostgreSQL qua Prisma
- Cache/coordination: Redis

File diem vao:
- Backend entry: [server/src/index.ts](../server/src/index.ts)
- Frontend entry: [client/src/app/layout.tsx](../client/src/app/layout.tsx)

## 2) Backend duoc to chuc theo module domain
Backend gop router tong, moi domain co routes + controller + service rieng.

Code that (router tong):
~~~ts
// server/src/routes/index.ts
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/character', characterRouter);
router.use('/chat', chatRouter);
router.use('/quests', questRouter);
router.use('/gifts', giftRouter);
router.use('/shop', giftRouter);
router.use('/scenes', sceneRouter);
router.use('/memories', memoryRouter);
router.use('/game', gameRouter);
router.use('/analytics', analyticsRouter);
router.use('/dm', dmRouter);
router.use('/leaderboard', leaderboardRouter);
router.use('/payment', paymentRouter);
router.use('/daily-reward', dailyRewardRoutes);
router.use('/achievements', achievementRoutes);
router.use('/arcs', arcRoutes);
router.use('/energy', energyRoutes);
router.use('/social-stats', socialStatsRoutes);
router.use('/events', eventRoutes);
~~~

Giai thich:
- Router tong chi la map URL -> module
- Business logic nam trong service cua module
- Loi ich: de test, de doc, de bo sung module moi

## 3) Luong Auth va Security
### 3.1 Auth routes
Code that:
~~~ts
// server/src/modules/auth/auth.routes.ts
authRouter.post('/register', authController.register);
authRouter.post('/verify-registration', verifyOtpLimiter, authController.verifyRegistration);
authRouter.post('/resend-registration-otp', otpLimiter, authController.resendRegistrationOTP);
authRouter.post('/login', loginLimiter, authController.login);
authRouter.post('/refresh', authController.refreshToken);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.get('/me', authenticate, authController.getMe);
~~~

Y nghia:
- Register dung OTP, khong tao user active ngay
- Refresh token duoc tach rieng
- Logout va me bat buoc authenticate

### 3.2 JWT middleware + Redis cache-aside
Code that:
~~~ts
// server/src/middlewares/auth.middleware.ts
const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as JwtPayload;

const cacheKey = CacheKeys.userAuth(decoded.userId);
const cached = await cache.get<CachedUser>(cacheKey);
if (cached) return cached;

const user = await prisma.user.findUnique({
  where: { id: decoded.userId },
  select: { id: true, email: true, isPremium: true, premiumTier: true },
});
~~~

Y nghia:
- Verify JWT roi moi cho vao route private
- Lay user tu Redis truoc de giam query DB
- Cache miss thi moi query Prisma

### 3.3 Rate limiting nhieu lop
Code that:
~~~ts
// server/src/index.ts
app.use('/api/auth', publicLimiter);
app.use('/api/', authenticatedLimiter);
~~~

Y nghia:
- Auth endpoints bi gioi han theo IP
- Endpoints da login bi gioi han theo userId (lay tu JWT)
- Giam brute force va giam nghen he thong

## 4) Chat AI la core flow
### 4.1 Route vao chat
Code that:
~~~ts
// server/src/modules/chat/chat.routes.ts
chatRouter.use(authenticate);
chatRouter.use(attachPremiumInfo);
chatRouter.get('/history', chatController.getHistory);
chatRouter.get('/history/:characterId', chatController.getCharacterHistory);
chatRouter.get('/daily-usage', chatController.getDailyUsage);
chatRouter.post('/send', chatController.sendMessage);
~~~

### 4.2 Pipeline xu ly 1 tin nhan
Code that:
~~~ts
// server/src/modules/chat/chat.service.ts
const userMessage = await prisma.message.create({ data: { role: 'USER', content: sanitizedContent, ... } });

const aiResponse = await aiService.generateResponse({
  characterId: character.id,
  personality: character.personality as ...,
  mood: character.mood as ...,
  relationshipStage: character.relationshipStage,
  affection: character.affection,
  level: character.level,
  recentMessages: recentMessages.reverse(),
  facts: character.characterFacts,
  userMessage: sanitizedContent,
});

const aiMessage = await prisma.message.create({ data: { role: 'AI', content: aiResponse.content, ... } });

const affectionResult = await characterService.updateAffection(character.id, aiResponse.affectionChange, userId);
const xpResult = await characterService.addExperience(character.id, xpBonus.total, userId);
~~~

Y nghia:
- Luu USER message truoc de dam bao audit trail
- AI co du context (messages + facts + stage + affection + level)
- Luu AI message sau khi model tra ve
- Side effects: affection, level, milestones, quests

### 4.3 Phong prompt injection
Code that:
~~~ts
// server/src/modules/chat/chat.service.ts
function sanitizeUserContent(content: string): string {
  let sanitized = content;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }
  return sanitized;
}
~~~

Y nghia:
- Loc bieu thuc co xu huong override system prompt
- Khong phai chong duoc 100%, nhung giam ro rui ro obvious attack

## 5) Realtime, optimistic UI, multi-tab
### 5.1 Socket server theo room user
Code that:
~~~ts
// server/src/sockets/index.ts
const userRoom = `user:${userId}`
socket.join(userRoom)
~~~

Y nghia:
- Moi tab cua cung 1 user vao cung room
- Emit vao room la tat ca tab nhan duoc

### 5.2 Chong duplicate send voi Redis setNX
Code that:
~~~ts
// server/src/sockets/index.ts
if (data.clientId) {
  const dedupKey = `dedup:${userId}:${data.clientId}`
  const isNew = await cache.setNX(dedupKey, true, CACHE_TTL.DEDUPLICATION)
  if (!isNew) return
}
~~~

Y nghia:
- Neu user double click send, server khong xu ly lai cung 1 clientId

### 5.3 Optimistic UI tren client
Code that:
~~~ts
// client/src/services/socket.ts
if (message.isOwn && message.clientId) {
  useChatStore.getState().replaceMessage(message.clientId, processedMessage)
} else {
  useChatStore.getState().addMessageIfUnique(processedMessage)
  useChatStore.getState().setTyping(false)
}
~~~

Y nghia:
- UI hien message ngay (temp)
- Server tra message that se thay vao message temp
- Trai nghiem nhanh hon, user khong thay delay

### 5.4 Token sync da tab bang BroadcastChannel
Code that:
~~~ts
// client/src/services/api.ts
this.tokenSyncChannel = new BroadcastChannel('vgfriend-token-sync');
this.tokenSyncChannel.onmessage = (event) => {
  if (event.data?.type === 'token-updated' && event.data?.accessToken) {
    // update localStorage token
  }
};
~~~

Y nghia:
- Tab A refresh token xong, tab B/C cap nhat theo
- Giam tinh trang tab khac bi 401 do token cu

## 6) Frontend state architecture
### 6.1 Auth store
File: [client/src/store/auth-store.ts](../client/src/store/auth-store.ts)

Noi dung chinh:
- Luu user, accessToken, isAuthenticated
- Actions: login, register, completeRegistration, refreshToken, logout, checkAuth
- Persist localStorage key vgfriend-auth

### 6.2 Chat store
File: [client/src/store/chat-store.ts](../client/src/store/chat-store.ts)

Noi dung chinh:
- messages, isTyping, isConnected, currentCharacterId
- replaceMessage de xu ly optimistic
- mergeMessages de sync da tab/reconnect
- gioi han persisted messages = 100

### 6.3 Providers va app bootstrap
Code that:
~~~tsx
// client/src/components/providers.tsx
useEffect(() => {
  checkAuth();
}, [checkAuth]);

useEffect(() => {
  if (isLoading || !isAuthenticated) return;
  api.get('/users/settings').then((res) => {
    const lang = res.data?.language;
    if (lang === 'vi' || lang === 'en') setLanguage(lang);
  });
}, [isAuthenticated, isLoading, setLanguage]);
~~~

Y nghia:
- App khoi dong se validate phien dang nhap
- Sau do dong bo language setting tu server

## 7) Database model can thuoc khi bao cao
File trung tam: [server/prisma/schema.prisma](../server/prisma/schema.prisma)

Model can nam:
- User: thong tin user + premium + energy + social stats
- Character: level, affection, relationshipStage, exPersona flags
- Message: role USER/AI/SYSTEM, content, emotion
- Quest/UserQuest: nhiem vu va tien do user
- Gift/UserGift/GiftHistory: shop va lich su tang qua
- Memory: milestone records
- Conversation/DirectMessage: DM user-user
- Subscription/PaymentHistory: billing

Code that (rut gon):
~~~prisma
model Character {
  affection         Int
  relationshipStage RelationshipStage
  isEnded           Boolean @default(false)
  isExPersona       Boolean @default(false)
  exPersonaSourceId String?
}

model Message {
  role      MessageRole
  content   String
  emotion   String?
  createdAt DateTime @default(now())
}
~~~

Y nghia:
- Character mo hinh hoa lifecycle tinh cam
- Message tach role giup analytics + moderation + replay

## 8) Payment va subscription
### 8.1 Routes
Code that:
~~~ts
// server/src/modules/payment/payment.routes.ts
paymentRouter.get('/pricing', getPricing)
paymentRouter.post('/create-checkout', authenticate, createCheckout)
paymentRouter.get('/status', authenticate, getStatus)
paymentRouter.get('/checkout-session/:sessionId', authenticate, getCheckoutSession)
paymentRouter.post('/cancel', authenticate, cancelSub)
~~~

### 8.2 Webhook mount rieng
Code that:
~~~ts
// server/src/index.ts
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);
~~~

Y nghia:
- Stripe webhook can raw body de verify signature
- Neu dung express.json truoc, signature verification co the sai

## 9) Analytics service (file ban dang mo)
File: [server/src/modules/analytics/analytics.service.ts](../server/src/modules/analytics/analytics.service.ts)

Code that:
~~~ts
const activityData = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
  SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
  FROM "messages"
  WHERE "userId" = ${userId}
  GROUP BY DATE("createdAt")
  ORDER BY date DESC
`;
~~~

Y nghia:
- Tinh heatmap hoat dong bang SQL aggregation
- Tot hon viec load hang tram message vao memory de dem

Code that:
~~~ts
const averageMessagesPerDay = Math.round((totalMessages / daysSinceCreation) * 10) / 10;
~~~

Y nghia:
- Dashboard metric don gian, de hieu voi stakeholder

Code that:
~~~ts
// streak tinh tu message grouped-by-day
const messageCounts = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`...`;
~~~

Y nghia:
- Tinh streak theo ngay co chat, khong phu thuoc client

## 10) Infra local va production
### 10.1 Local dev
- [docker-compose.dev.yml](../docker-compose.dev.yml)
- Chay Postgres + Redis + Adminer

### 10.2 Production
- [docker-compose.yml](../docker-compose.yml)
- Co server + client + postgres + redis + nginx
- Co healthcheck va logging rotation

### 10.3 Nginx
File: [nginx/nginx.conf](../nginx/nginx.conf)

Code that:
~~~nginx
location /api {
  proxy_pass http://server;
}

location /socket.io {
  proxy_pass http://server;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 86400;
}
~~~

Y nghia:
- Tach API HTTP va WebSocket handshake
- Cho phep socket giu ket noi dai

## 11) Khac biet docs va code hien tai
Code hien tai da co them cac module sau:
- achievements
- daily-reward
- arcs
- energy
- social-stats
- events

Nguon xac nhan:
- [server/src/modules](../server/src/modules)
- [server/src/routes/index.ts](../server/src/routes/index.ts)

Khi bao cao, ban nen noi ro day la evolution sau ban docs he thong.

## 12) Demo flow de thuyet trinh 10-15 phut
Trinh bay flow tu dau den cuoi:
1. User login
2. Mo chat voi character
3. Gui 1 message
4. Socket optimistic update + server AI response
5. Affection/level thay doi
6. Quest hoan thanh hoac reward cap nhat
7. Neu user mua VIP: checkout -> webhook -> premium status

## 13) Flow hoat dong he thong theo tung buoc
Muc nay la ban do runtime. Ban cu nhin theo so thu tu la hieu app chay the nao.

### 13.1 App startup flow (tu luc mo web)
1. Browser vao frontend app.
2. Frontend mount providers va goi checkAuth.
3. checkAuth goi /auth/me neu co accessToken trong localStorage.
4. Neu token het han, api client tu dong goi /auth/refresh.
5. Neu refresh thanh cong, cap nhat token local + sync qua cac tab.
6. Neu refresh that bai, clear auth state va quay ve login.

Code that:
~~~tsx
// client/src/components/providers.tsx
useEffect(() => {
  checkAuth();
}, [checkAuth]);
~~~

Code that:
~~~ts
// client/src/services/api.ts
if (response.status === 401 && token && !options.headers?.['X-Retry']) {
  const refreshed = await this.tryRefreshToken();
  if (refreshed) {
    return this.request(endpoint, {
      ...options,
      headers: { ...headers, 'X-Retry': '1' },
    });
  }
}
~~~

Y nghia:
- User cam thay app "tu hoi phuc phien" thay vi bat login lai ngay
- Da tab giu token dong bo

### 13.2 Request lifecycle tren backend
1. Request vao Express.
2. Qua middleware chain: requestId -> security headers -> compression -> cors -> body parser.
3. Qua limiter (public/authenticated).
4. Vao router module theo URL.
5. Neu private route: authenticate middleware verify JWT + cache-aside user.
6. Controller goi service business logic.
7. Service goi Prisma/Redis/external APIs.
8. Response tra ve JSON.

Code that:
~~~ts
// server/src/index.ts
app.use(requestIdMiddleware);
app.use(helmet());
app.use(compression());
app.use('/api/auth', publicLimiter);
app.use('/api/', authenticatedLimiter);
app.use('/api', router);
app.use(errorHandler);
~~~

Y nghia:
- Pipeline ro rang, co boundary giua infra layer va business layer

### 13.3 Chat realtime end-to-end flow
Day la flow quan trong nhat cua san pham.

Step A - Client send:
1. User nhan send.
2. Client tao temp message (optimistic) voi clientId.
3. Client emit socket event message:send.

Step B - Server process:
4. Socket server check rate limit + input validation.
5. Check daily usage theo tier.
6. Dedup bang Redis setNX theo userId + clientId.
7. Goi chatService.sendMessage.
8. chatService luu USER message.
9. chatService goi aiService.generateResponse.
10. chatService luu AI message.
11. chatService update affection/xp/quest/milestone.

Step C - Server emit ve lai:
12. Emit user message that (de replace optimistic).
13. Emit AI message.
14. Emit mood/affection/quest/milestone events neu co.

Step D - Client apply state:
15. Neu la own message + clientId -> replaceMessage.
16. Neu la AI message -> addMessageIfUnique.
17. Update UI popup (affection, level up, relationship upgrade).

Code that:
~~~ts
// server/src/sockets/index.ts
io.to(userRoom).emit('message:receive', {
  ...result.userMessage,
  isOwn: true,
  clientId: data.clientId,
});

io.to(userRoom).emit('message:receive', {
  ...result.aiMessage,
  isOwn: false,
  emotion: result.emotion,
});
~~~

Code that:
~~~ts
// client/src/services/socket.ts
if (message.isOwn && message.clientId) {
  useChatStore.getState().replaceMessage(message.clientId, processedMessage)
} else {
  useChatStore.getState().addMessageIfUnique(processedMessage)
}
~~~

Y nghia:
- UX nhanh vi optimistic
- Data dung vi co replace + dedup + server authoritative
- Da tab sync nho room user:{id}

### 13.4 Payment flow chi tiet
1. Frontend goi /payment/create-checkout.
2. Backend tao Stripe checkout session.
3. Frontend redirect qua Stripe hosted checkout.
4. User thanh toan xong, Stripe goi webhook backend.
5. Backend verify webhook signature.
6. Backend update Subscription + User premium state.
7. Frontend page success goi /payment/checkout-session/:sessionId de verify ownership + activation.

Code that:
~~~ts
// server/src/index.ts
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);
~~~

Y nghia:
- Webhook moi la source of truth ve payment result
- Success page khong duoc tin query params "mu"

## 14) Neu loi, debug o dau truoc
### 14.1 Loi chat khong tra AI
Kiem tra thu tu:
1. Socket connect thanh cong chua.
2. message:send co emit chua.
3. Server co hit rate limit/day limit khong.
4. aiService co loi provider key/model khong.
5. message:receive co emit nguoc lai khong.

File can mo:
- [client/src/services/socket.ts](../client/src/services/socket.ts)
- [server/src/sockets/index.ts](../server/src/sockets/index.ts)
- [server/src/modules/chat/chat.service.ts](../server/src/modules/chat/chat.service.ts)
- [server/src/modules/ai/ai.service.ts](../server/src/modules/ai/ai.service.ts)

### 14.2 Loi login xong van bi day ve login
Kiem tra thu tu:
1. accessToken co duoc luu localStorage khong.
2. /auth/me co 401 khong.
3. /auth/refresh co thanh cong khong.
4. auth-store co set isAuthenticated true khong.

File can mo:
- [client/src/store/auth-store.ts](../client/src/store/auth-store.ts)
- [client/src/services/api.ts](../client/src/services/api.ts)
- [server/src/modules/auth/auth.routes.ts](../server/src/modules/auth/auth.routes.ts)
- [server/src/middlewares/auth.middleware.ts](../server/src/middlewares/auth.middleware.ts)

### 14.3 Loi payment xong nhung chua len VIP
Kiem tra thu tu:
1. Webhook endpoint co nhan event khong.
2. Verify signature co pass khong.
3. DB co update subscription/user premium khong.
4. Frontend co verify checkout-session khong.

File can mo:
- [server/src/index.ts](../server/src/index.ts)
- [server/src/modules/payment/payment.routes.ts](../server/src/modules/payment/payment.routes.ts)
- [server/src/modules/payment](../server/src/modules/payment)

## 15) Cach doc codebase nhanh trong 1 gio
1. 10 phut: doc router map de thay module boundaries.
2. 15 phut: doc index.ts backend de nam middleware + infra lifecycle.
3. 15 phut: doc chat.service + sockets de nam core business.
4. 10 phut: doc schema.prisma de nam domain objects.
5. 10 phut: doc api.ts + auth-store + chat-store de nam state flow client.

Neu nho duoc 5 diem sau la du de bao cao:
1. Kien truc module domain.
2. Chat pipeline voi side effects.
3. Realtime optimistic + dedup + multi-tab room.
4. Auth refresh + cache-aside middleware.
5. Stripe webhook la source of truth.

## 16) Module catalog (lam gi, flow, input, output)
Muc nay map theo [server/src/modules](../server/src/modules).

### 16.1 auth
File chinh:
- [server/src/modules/auth/auth.routes.ts](../server/src/modules/auth/auth.routes.ts)
- [server/src/modules/auth/auth.controller.ts](../server/src/modules/auth/auth.controller.ts)
- [server/src/modules/auth/password-reset.controller.ts](../server/src/modules/auth/password-reset.controller.ts)

Lam gi:
- Dang ky, xac minh OTP, dang nhap, refresh token, dang xuat, doi mat khau.
- Password reset bang OTP email.

Flow:
1. Validate input bang Zod.
2. Goi auth service/password reset service.
3. Set refreshToken vao httpOnly cookie cho login/refresh/verify-registration.

Input chinh:
- POST /auth/register: email, password, username?
- POST /auth/login: email, password
- POST /auth/refresh: cookie refreshToken hoac body refreshToken
- POST /auth/forgot-password: email
- POST /auth/verify-otp: email, otp
- POST /auth/reset-password: email, token, newPassword

Output chinh:
- Pattern: { success, data, message }
- login/refresh/verify-registration tra ve data gom user + tokens
- verify-otp tra ve { success, message, data: { token } }

### 16.2 users
File chinh:
- [server/src/modules/users/users.routes.ts](../server/src/modules/users/users.routes.ts)
- [server/src/modules/users/users.controller.ts](../server/src/modules/users/users.controller.ts)

Lam gi:
- Quan ly profile/settings/privacy/stats/notifications/premium-status cho user dang login.

Flow:
1. authenticate middleware gan req.user.
2. Validate schema update.
3. Goi userService hoac chatService/check DB.

Input chinh:
- PATCH /users/profile
- PATCH /users/settings
- PATCH /users/privacy
- POST /users/notifications/read

Output chinh:
- Pattern: { success: true, data }
- /users/premium-status tra ve data rat day du: tier, features, usage, daysRemaining, cancelAtPeriodEnd.

### 16.3 character
File chinh:
- [server/src/modules/character/character.routes.ts](../server/src/modules/character/character.routes.ts)
- [server/src/modules/character/character.controller.ts](../server/src/modules/character/character.controller.ts)
- [server/src/modules/character/facts.controller.ts](../server/src/modules/character/facts.controller.ts)
- [server/src/modules/character/relationship.controller.ts](../server/src/modules/character/relationship.controller.ts)
- [server/src/modules/character/template.controller.ts](../server/src/modules/character/template.controller.ts)

Lam gi:
- CRUD character active, customize avatar, facts, relationship lifecycle (breakup/reconcile/ex persona), template public.

Flow:
1. /templates la public.
2. Cac route con lai can auth + premium info.
3. createCharacter check maxCharacters theo tier truoc khi tao.
4. relationship controller goi relationshipService de xu ly breakup/reconcile.

Input chinh:
- POST /character: name + optional profile fields
- PATCH /character, PATCH /character/customize
- POST /character/relationship/end: characterId?, reason?, exPersonaConsent?
- POST /character/relationship/reconcile/:characterId

Output chinh:
- Pattern: { success, data } hoac { success, message }
- Facts endpoint tra them grouped facts.
- Relationship endpoints tra data status/history/result.

### 16.4 chat
File chinh:
- [server/src/modules/chat/chat.routes.ts](../server/src/modules/chat/chat.routes.ts)
- [server/src/modules/chat/chat.controller.ts](../server/src/modules/chat/chat.controller.ts)
- [server/src/modules/chat/chat.service.ts](../server/src/modules/chat/chat.service.ts)

Lam gi:
- Lay history, gui message den AI, xoa/search message, track daily usage.

Flow:
1. Validate send payload.
2. Check tier lock cho messageType.
3. Check daily quota.
4. Neu khong co characterId thi fallback active non-ex.
5. Goi chatService.sendMessage.
6. Tra data gom ket qua chat + dailyUsage moi.

Input chinh:
- POST /chat/send: characterId?, content, messageType?, metadata?

Output chinh:
- { success: true, data: { userMessage, aiMessage, moodChange, affectionChange, ... , dailyUsage } }
- /chat/daily-usage tra { tier, isVip, messagesUsed, messagesLimit, messagesRemaining, isUnlimited }

### 16.5 payment
File chinh:
- [server/src/modules/payment/payment.routes.ts](../server/src/modules/payment/payment.routes.ts)
- [server/src/modules/payment/payment.controller.ts](../server/src/modules/payment/payment.controller.ts)

Lam gi:
- Tao checkout Stripe, doc status subscription, verify checkout session, cancel subscription.
- Xu ly webhook Stripe (mounted in index).

Flow:
1. create-checkout validate tier + billingCycle.
2. Goi payment service tao session URL.
3. webhook verify stripe signature bang raw body.
4. service cap nhat subscription/user premium.

Input chinh:
- POST /payment/create-checkout: tier, billingCycle
- GET /payment/checkout-session/:sessionId

Output chinh:
- create-checkout: { success: true, data: { url } }
- status/checkout-session: { success: true, data: ... }
- cancel: { success: true, message: 'Subscription will cancel at period end' }

### 16.6 dm
File chinh:
- [server/src/modules/dm/dm.routes.ts](../server/src/modules/dm/dm.routes.ts)
- [server/src/modules/dm/dm.controller.ts](../server/src/modules/dm/dm.controller.ts)

Lam gi:
- DM 1-1 va group: conversation list/create, message list/send, mark read, user search, unread count.

Flow:
1. Validate query/body bang Zod.
2. Goi dmService.
3. Tra list/data co pagination cursor khi can.

Input chinh:
- POST /dm/conversations { targetUserId }
- POST /dm/conversations/group { name, memberIds[] }
- POST /dm/conversations/:conversationId/messages { content, messageType? }

Output chinh:
- Pattern: { success: true, data }
- unread-count: { success: true, data: { count } }

### 16.7 quest
File chinh:
- [server/src/modules/quest/quest.routes.ts](../server/src/modules/quest/quest.routes.ts)
- [server/src/modules/quest/quest.controller.ts](../server/src/modules/quest/quest.controller.ts)

Lam gi:
- Lay quest catalog, quest progress cua user, start/complete/claim.

Flow:
1. Auth middleware.
2. Goi questService theo action.
3. Tra quest data hoac reward result.

Output chinh:
- { success: true, data: quests | quest | result }

### 16.8 gift
File chinh:
- [server/src/modules/gift/gift.routes.ts](../server/src/modules/gift/gift.routes.ts)
- [server/src/modules/gift/gift.controller.ts](../server/src/modules/gift/gift.controller.ts)

Lam gi:
- Shop gift, inventory, buy gift, send gift cho character, gift history.

Flow:
1. Validate buy/send schema.
2. Neu send khong co characterId thi fallback active character.
3. Goi giftService buy/send/history.

Output chinh:
- Pattern: { success: true, data }

### 16.9 scene
File chinh:
- [server/src/modules/scene/scene.routes.ts](../server/src/modules/scene/scene.routes.ts)
- [server/src/modules/scene/scene.controller.ts](../server/src/modules/scene/scene.controller.ts)

Lam gi:
- List scenes, unlocked scenes, scenes theo stage, unlock, set active.

Output chinh:
- get APIs: { success: true, data }
- set-active: { success: true, message: 'Scene activated' }

### 16.10 memory
File chinh:
- [server/src/modules/memory/memory.routes.ts](../server/src/modules/memory/memory.routes.ts)
- [server/src/modules/memory/memory.controller.ts](../server/src/modules/memory/memory.controller.ts)

Lam gi:
- Quan ly memories/milestones cua user.

Input chinh:
- POST /memories: title, description?, imageUrl?, type, milestone?, metadata?

Output chinh:
- Pattern: { success: true, data }
- delete: { success: true, message: 'Memory deleted' }

### 16.11 analytics
File chinh:
- [server/src/modules/analytics/analytics.routes.ts](../server/src/modules/analytics/analytics.routes.ts)
- [server/src/modules/analytics/analytics.controller.ts](../server/src/modules/analytics/analytics.controller.ts)
- [server/src/modules/analytics/analytics.service.ts](../server/src/modules/analytics/analytics.service.ts)

Lam gi:
- Character analytics va dashboard stats.

Flow:
1. aggregate message theo ngay bang SQL raw query.
2. dem total messages/gifts.
3. tinh average per day, streak.

Output chinh:
- GET /analytics: { success: true, data: { affectionHistory, activityHeatmap, totalMessages, ... } }
- GET /analytics/stats: { success: true, data: { messagesToday, streak, giftsGiven, affectionToday } }

### 16.12 leaderboard
File chinh:
- [server/src/modules/leaderboard/leaderboard.routes.ts](../server/src/modules/leaderboard/leaderboard.routes.ts)
- [server/src/modules/leaderboard/leaderboard.controller.ts](../server/src/modules/leaderboard/leaderboard.controller.ts)

Lam gi:
- Tra bang xep hang theo category + rank cua user hien tai.

Input chinh:
- GET /leaderboard?category=level&limit=20

Output chinh:
- { success: true, data: { category, entries, myRank } }

### 16.13 game
File chinh:
- [server/src/modules/game/game.routes.ts](../server/src/modules/game/game.routes.ts)

Lam gi:
- Daily progress summary + trigger daily login action.

Output chinh:
- /game/daily-progress: { success: true, data: progress }
- /game/daily-login: { success: true, data: { questsCompleted, milestonesUnlocked } }

### 16.14 admin
File chinh:
- [server/src/modules/admin/admin.routes.ts](../server/src/modules/admin/admin.routes.ts)
- [server/src/modules/admin/admin.controller.ts](../server/src/modules/admin/admin.controller.ts)
- [server/src/modules/admin/admin-pricing.controller.ts](../server/src/modules/admin/admin-pricing.controller.ts)
- [server/src/modules/admin/admin-tier-config.controller.ts](../server/src/modules/admin/admin-tier-config.controller.ts)

Lam gi:
- Admin login, user/character/message/quest/template management, system stats, cleanup, broadcast.
- Tier feature config va pricing sync Stripe.

Flow:
1. /admin/login public.
2. Con lai qua adminAuth.
3. Controller tra ve response theo nhu cau dashboard admin (co endpoint khong wrap success).

Output chu y:
- Khong dong nhat 100% format; co endpoint tra truc tiep object/list, co endpoint tra { success, data }.

### 16.15 upload
File chinh:
- [server/src/modules/upload/upload.routes.ts](../server/src/modules/upload/upload.routes.ts)

Lam gi:
- Upload file avatar len DO Spaces cho admin.

Flow:
1. adminAuth.
2. multer memoryStorage, max 5MB.
3. validate file + upload service.

Output chinh:
- success: { success: true, url }
- fail: { error: '...' }

### 16.16 achievement
File chinh:
- [server/src/modules/achievement/achievement.routes.ts](../server/src/modules/achievement/achievement.routes.ts)

Lam gi:
- Lay list achievement, lay points, claim reward achievement.

Output chu y:
- Format khong wrap success dong nhat: co endpoint tra truc tiep service result.

### 16.17 daily-reward
File chinh:
- [server/src/modules/daily-reward/daily-reward.routes.ts](../server/src/modules/daily-reward/daily-reward.routes.ts)

Lam gi:
- Lay status reward theo ngay va claim.

Output chinh:
- /status: tra truc tiep status object.
- /claim: { success: true, ...result } hoac 400 voi { error, code }.

### 16.18 arc
File chinh:
- [server/src/modules/arc/arc.routes.ts](../server/src/modules/arc/arc.routes.ts)

Lam gi:
- Arc list, progress, titles, equip title.

Output chu y:
- Da phan tra object truc tiep hoac result service, khong wrap success dong nhat.

### 16.19 energy
File chinh:
- [server/src/modules/energy/energy.routes.ts](../server/src/modules/energy/energy.routes.ts)

Lam gi:
- Lay energy status, dung item de hoi energy.

Input:
- POST /energy/use-item: { itemId: 'cafe' | 'soda' | 'meal' }

Output:
- status: object status
- use-item: result service, fail 400 voi { error }

### 16.20 social-stats
File chinh:
- [server/src/modules/social-stats/social-stats.routes.ts](../server/src/modules/social-stats/social-stats.routes.ts)

Lam gi:
- Tra social attributes (charm/knowledge/guts/kindness/proficiency) cua user.

Output:
- tra truc tiep stats object

### 16.21 event
File chinh:
- [server/src/modules/event/event.routes.ts](../server/src/modules/event/event.routes.ts)

Lam gi:
- Lay active events va upcoming events.

Output:
- /events/active va /events/upcoming tra list events (hoac { error } neu fail)

## 17) Mau response toan he thong (de doc API nhanh)
Co 3 kieu response dang song song:
1. Kieu chuan:
- { success: true, data: ... }
2. Kieu co message:
- { success: true, data: ..., message: '...' }
- hoac { success: true, message: '...' }
3. Kieu direct object/list (mot so module moi hoac admin):
- tra truc tiep object/list
- loi: { error: '...' } hoac { error: '...', code: '...' }

Khuyen nghi khi tich hop frontend:
1. Co response adapter tai client de normalize 3 kieu nay.
2. Uu tien dua module moi ve 1 format chung { success, data, message? } de de maintain.

Neu bi hoi "diem ky thuat noi bat la gi", tra loi:
- Realtime da tab dung room theo user
- Optimistic + dedup tranh duplicate message
- Auth cache-aside voi Redis
- Data model co relationship lifecycle ro rang
- Module architecture de scale team va feature

## Appendix A - File map nen mo trong luc bao cao
- [server/src/index.ts](../server/src/index.ts)
- [server/src/routes/index.ts](../server/src/routes/index.ts)
- [server/src/middlewares/auth.middleware.ts](../server/src/middlewares/auth.middleware.ts)
- [server/src/modules/chat/chat.service.ts](../server/src/modules/chat/chat.service.ts)
- [server/src/modules/ai/ai.service.ts](../server/src/modules/ai/ai.service.ts)
- [server/src/sockets/index.ts](../server/src/sockets/index.ts)
- [client/src/services/api.ts](../client/src/services/api.ts)
- [client/src/services/socket.ts](../client/src/services/socket.ts)
- [client/src/store/chat-store.ts](../client/src/store/chat-store.ts)
- [server/prisma/schema.prisma](../server/prisma/schema.prisma)
- [server/src/modules/analytics/analytics.service.ts](../server/src/modules/analytics/analytics.service.ts)

## Appendix B - Cau hoi thuong gap va y chinh
Cau hoi: Tai sao vua dung REST vua dung Socket?
Tra loi: REST cho CRUD/history va idempotent operations, Socket cho event realtime va UX ngay lap tuc.

Cau hoi: Neu mat ket noi socket thi sao?
Tra loi: Client co reconnect, va khi reconnect se fetch messages tu server de resync.

Cau hoi: Lam sao tranh gui trung tin?
Tra loi: Dung clientId + Redis setNX dedup key theo user.

Cau hoi: Lam sao scale backend?
Tra loi: Module domain, Redis cache-aside, tachable infra qua docker-compose/nginx, va route boundaries ro rang.
