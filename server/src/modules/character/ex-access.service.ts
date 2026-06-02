import { prisma, PremiumTier } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { getTierConfig } from '../admin/tier-config.service';

const VIP_TIERS: PremiumTier[] = ['BASIC', 'PRO', 'ULTIMATE'];

type UserPremiumState = {
  isPremium: boolean;
  premiumTier: PremiumTier;
  premiumExpiresAt: Date | null;
  subscription?: {
    status: string;
    currentPeriodEnd: Date;
  } | null;
};

function isVipActive(user: UserPremiumState) {
  if (!VIP_TIERS.includes(user.premiumTier)) return false;
  if (!user.isPremium) return false;
  if (user.premiumExpiresAt && user.premiumExpiresAt <= new Date()) return false;
  if (!user.subscription) return true;
  return ['ACTIVE', 'TRIALING'].includes(user.subscription.status) &&
    user.subscription.currentPeriodEnd > new Date();
}

export async function getExAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isPremium: true,
      premiumTier: true,
      premiumExpiresAt: true,
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
        },
      },
      settings: {
        select: {
          notificationsEnabled: true,
          allowExPersonaMessages: true,
          allowExComebackEmails: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const isVip = isVipActive(user);
  const tierConfig = await getTierConfig(isVip ? user.premiumTier : 'FREE');
  const exFeatureAllowed = isVip && tierConfig.canCreateExPersonaOnBreakup;
  const messagesEnabled = user.settings?.allowExPersonaMessages !== false;

  return {
    user,
    tier: isVip ? user.premiumTier : 'FREE',
    isVip,
    canChatEx: exFeatureAllowed && messagesEnabled,
    canGiftEx: exFeatureAllowed && messagesEnabled,
    canEmailExComeback:
      exFeatureAllowed &&
      messagesEnabled &&
      user.settings?.notificationsEnabled !== false &&
      user.settings?.allowExComebackEmails !== false,
    requiredTier: 'BASIC' as const,
    lockReason: !isVip
      ? 'VIP_REQUIRED'
      : !tierConfig.canCreateExPersonaOnBreakup
      ? 'EX_FEATURE_DISABLED'
      : !messagesEnabled
      ? 'EX_MESSAGES_DISABLED'
      : null,
  };
}

export async function assertCanUseExRelationship(userId: string, action: 'chat' | 'gift') {
  const access = await getExAccess(userId);
  const canUse = action === 'gift' ? access.canGiftEx : access.canChatEx;

  if (!canUse) {
    throw new AppError(
      action === 'gift'
        ? 'Nâng cấp VIP để tặng quà cho người yêu cũ'
        : 'Nâng cấp VIP để nhắn tin với người yêu cũ',
      403,
      access.lockReason || 'EX_CHAT_PREMIUM_REQUIRED',
    );
  }

  return access;
}
