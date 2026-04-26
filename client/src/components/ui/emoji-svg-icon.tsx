import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Crown,
  Flower2,
  Gamepad2,
  Gem,
  Globe,
  Heart,
  ImageIcon,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Star,
  User,
  Users,
  UtensilsCrossed,
  Zap,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

type IconConfig = {
  icon: LucideIcon
  className?: string
}

const DEFAULT_ICON: IconConfig = {
  icon: Sparkles,
  className: 'text-love'
}

const EMOJI_ICON_MAP: Record<string, IconConfig> = {
  // Relationship & mood
  '💕': { icon: Heart, className: 'text-love' },
  '❤️': { icon: Heart, className: 'text-love' },
  '😍': { icon: Heart, className: 'text-love' },
  '🤗': { icon: Heart, className: 'text-pink-400' },
  '😊': { icon: Sparkles, className: 'text-yellow-300' },
  '🙂': { icon: Sparkles, className: 'text-blue-300' },
  '👋': { icon: Users, className: 'text-blue-300' },
  '😢': { icon: Heart, className: 'text-sky-300' },
  '🤩': { icon: Sparkles, className: 'text-amber-300' },
  '😴': { icon: Sparkles, className: 'text-indigo-300' },
  '😐': { icon: User, className: 'text-gray-300' },
  '😤': { icon: Zap, className: 'text-orange-300' },

  // User/profile
  '👨': { icon: User, className: 'text-blue-300' },
  '👩': { icon: User, className: 'text-pink-300' },
  '🧑': { icon: Users, className: 'text-purple-300' },
  '👨💼': { icon: User, className: 'text-blue-300' },
  '👩💻': { icon: User, className: 'text-pink-300' },
  '🧑🔬': { icon: Sparkles, className: 'text-cyan-300' },
  '👩🎨': { icon: Sparkles, className: 'text-violet-300' },
  '🌈': { icon: Sparkles, className: 'text-fuchsia-300' },
  '🤫': { icon: Shield, className: 'text-gray-300' },

  // Work/lifestyle
  '📚': { icon: BookOpen, className: 'text-emerald-300' },
  '💼': { icon: ShoppingBag, className: 'text-amber-300' },
  '👩🏫': { icon: BookOpen, className: 'text-blue-300' },
  '👩⚕': { icon: Heart, className: 'text-rose-300' },
  '🎨': { icon: Sparkles, className: 'text-purple-300' },
  '💻': { icon: Sparkles, className: 'text-cyan-300' },
  '🛍': { icon: ShoppingBag, className: 'text-fuchsia-300' },
  '🌟': { icon: Star, className: 'text-yellow-300' },

  // Premium
  '🆓': { icon: Sparkles, className: 'text-gray-300' },
  '👑': { icon: Crown, className: 'text-amber-300' },
  '⚡': { icon: Zap, className: 'text-purple-300' },
  '💎': { icon: Gem, className: 'text-cyan-300' },

  // Gifts / arcs
  '🌹': { icon: Flower2, className: 'text-rose-400' },
  '🌷': { icon: Flower2, className: 'text-pink-300' },
  '🍫': { icon: UtensilsCrossed, className: 'text-amber-300' },
  '🎂': { icon: UtensilsCrossed, className: 'text-orange-300' },
  '🍷': { icon: UtensilsCrossed, className: 'text-red-300' },
  '🧸': { icon: Gamepad2, className: 'text-amber-300' },
  '🐻': { icon: Gamepad2, className: 'text-amber-400' },
  '💌': { icon: MessageCircle, className: 'text-pink-300' },
  '📿': { icon: Gem, className: 'text-violet-300' },
  '✈': { icon: Globe, className: 'text-sky-300' },
  '📸': { icon: ImageIcon, className: 'text-blue-300' },
  '💍': { icon: Gem, className: 'text-cyan-300' },
  '🏝': { icon: Globe, className: 'text-emerald-300' }
}

function normalizeEmojiKey (emoji?: string | null): string {
  if (!emoji) return ''
  return emoji.replace(/\uFE0F/g, '').replace(/\u200D/g, '').trim()
}

export function EmojiSvgIcon ({
  emoji,
  className,
  strokeWidth = 2
}: {
  emoji?: string | null
  className?: string
  strokeWidth?: number
}) {
  const iconConfig = EMOJI_ICON_MAP[normalizeEmojiKey(emoji)] || DEFAULT_ICON
  const Icon = iconConfig.icon

  return (
    <Icon
      aria-hidden="true"
      strokeWidth={strokeWidth}
      className={cn('inline-block shrink-0', iconConfig.className, className)}
    />
  )
}
