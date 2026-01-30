// ============================================
// USER & AUTHENTICATION TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  isEmailVerified: boolean;
  isPremium: boolean;
  premiumExpiresAt?: Date;
  coins: number;
  gems: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  language: string;
  theme: 'dark' | 'light' | 'auto';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  autoPlayVoice: boolean;
  chatBubbleStyle: string;
  fontSize: 'small' | 'medium' | 'large';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
  displayName?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ============================================
// CHARACTER TYPES
// ============================================

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type RelationshipStage = 
  | 'STRANGER' 
  | 'ACQUAINTANCE' 
  | 'FRIEND' 
  | 'CLOSE_FRIEND' 
  | 'CRUSH' 
  | 'DATING' 
  | 'LOVER';

export type Personality = 'caring' | 'playful' | 'shy' | 'passionate' | 'intellectual';

export type Mood = 'happy' | 'sad' | 'excited' | 'sleepy' | 'romantic' | 'neutral';

export interface Character {
  id: string;
  userId: string;
  name: string;
  nickname?: string;
  gender: Gender;
  personality: Personality;
  mood: Mood;
  level: number;
  experience: number;
  affection: number;
  relationshipStage: RelationshipStage;
  birthday?: Date;
  bio?: string;
  voiceType: string;
  
  // Avatar customization
  avatarStyle: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  outfit: string;
  accessories: string[];
  
  // AI behavior
  memoryEnabled: boolean;
  responseStyle: string;
  creativityLevel: number;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterFact {
  id: string;
  characterId: string;
  category: 'preference' | 'memory' | 'trait' | 'event';
  key: string;
  value: string;
  importance: number;
}

export interface CreateCharacterRequest {
  name: string;
  nickname?: string;
  gender?: Gender;
  personality?: Personality;
  birthday?: Date;
  bio?: string;
  avatarStyle?: string;
  hairStyle?: string;
  hairColor?: string;
  eyeColor?: string;
  skinTone?: string;
  outfit?: string;
}

export interface UpdateCharacterRequest {
  name?: string;
  nickname?: string;
  personality?: Personality;
  bio?: string;
  avatarStyle?: string;
  hairStyle?: string;
  hairColor?: string;
  eyeColor?: string;
  skinTone?: string;
  outfit?: string;
  accessories?: string[];
  responseStyle?: string;
  creativityLevel?: number;
}

// ============================================
// CHAT & MESSAGE TYPES
// ============================================

export type MessageRole = 'USER' | 'AI' | 'SYSTEM';
export type MessageType = 'TEXT' | 'IMAGE' | 'VOICE' | 'GIFT' | 'STICKER' | 'EVENT';

export interface Message {
  id: string;
  userId: string;
  characterId: string;
  role: MessageRole;
  content: string;
  messageType: MessageType;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  emotion?: string;
  createdAt: Date;
}

export interface SendMessageRequest {
  characterId: string;
  content: string;
  messageType?: MessageType;
  metadata?: Record<string, unknown>;
}

export interface ChatHistoryResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

// Socket Events
export interface SocketEvents {
  // Client to Server
  'message:send': (data: SendMessageRequest) => void;
  'typing:start': (characterId: string) => void;
  'typing:stop': (characterId: string) => void;
  
  // Server to Client
  'message:receive': (message: Message) => void;
  'message:typing': (characterId: string) => void;
  'character:mood_change': (data: { characterId: string; mood: Mood }) => void;
  'notification:new': (notification: Notification) => void;
}

// ============================================
// QUEST TYPES
// ============================================

export type QuestType = 'DAILY' | 'WEEKLY' | 'STORY' | 'ACHIEVEMENT' | 'EVENT';
export type QuestStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  category: string;
  requirements: QuestRequirement;
  rewardXp: number;
  rewardCoins: number;
  rewardGems: number;
  rewardAffection: number;
  rewardItems: string[];
  unlockLevel: number;
  sortOrder: number;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
}

export interface QuestRequirement {
  action: string;
  count: number;
  target?: string;
}

export interface UserQuest {
  id: string;
  userId: string;
  questId: string;
  quest?: Quest;
  progress: number;
  maxProgress: number;
  status: QuestStatus;
  startedAt: Date;
  completedAt?: Date;
  claimedAt?: Date;
}

// ============================================
// GIFT & SHOP TYPES
// ============================================

export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Gift {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  rarity: Rarity;
  priceCoins: number;
  priceGems: number;
  affectionBonus: number;
  unlockLevel: number;
  isLimited: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
}

export interface UserGift {
  id: string;
  userId: string;
  giftId: string;
  gift?: Gift;
  quantity: number;
}

export interface PurchaseGiftRequest {
  giftId: string;
  quantity?: number;
  paymentMethod: 'coins' | 'gems';
}

export interface SendGiftRequest {
  characterId: string;
  giftId: string;
  message?: string;
}

export interface GiftHistory {
  id: string;
  characterId: string;
  giftId: string;
  gift?: Gift;
  message?: string;
  reaction?: string;
  createdAt: Date;
}

// ============================================
// SCENE TYPES
// ============================================

export interface Scene {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  ambiance: string;
  unlockMethod: 'level' | 'purchase' | 'quest' | 'event';
  unlockValue: number;
  priceGems: number;
  isDefault: boolean;
  isUnlocked?: boolean;
}

// ============================================
// MEMORY TYPES
// ============================================

export type MemoryType = 'MILESTONE' | 'PHOTO' | 'CONVERSATION' | 'GIFT' | 'EVENT';

export interface Memory {
  id: string;
  userId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  type: MemoryType;
  milestone?: string;
  metadata?: Record<string, unknown>;
  isFavorite: boolean;
  createdAt: Date;
}

// ============================================
// ACHIEVEMENT TYPES
// ============================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: string;
  requirement: AchievementRequirement;
  rewardXp: number;
  rewardCoins: number;
  rewardGems: number;
  points: number;
  isSecret: boolean;
}

export interface AchievementRequirement {
  action: string;
  count: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement?: Achievement;
  progress: number;
  unlockedAt?: Date;
  claimedAt?: Date;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType = 'SYSTEM' | 'CHAT' | 'QUEST' | 'ACHIEVEMENT' | 'GIFT' | 'EVENT' | 'REWARD';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// AI TYPES
// ============================================

export interface AIContext {
  characterId: string;
  personality: Personality;
  mood: Mood;
  relationshipStage: RelationshipStage;
  affection: number;
  recentMessages: Message[];
  facts: CharacterFact[];
  userName?: string;
}

export interface AIResponse {
  content: string;
  emotion?: string;
  moodChange?: Mood;
  affectionChange?: number;
  suggestedActions?: string[];
}
