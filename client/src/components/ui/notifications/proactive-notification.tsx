'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Moon, Sun, MessageCircleHeart, Sparkles } from 'lucide-react';
import { Button } from '../button';
import { cn } from '@/lib/utils';

export interface ProactiveNotificationData {
  characterId: string;
  characterName: string;
  type: 'morning_greeting' | 'night_greeting' | 'miss_you' | 'random_thought' | 'anniversary' | 'comeback_message';
  message: string;
}

interface ProactiveNotificationProps {
  notification: ProactiveNotificationData | null;
  onDismiss: () => void;
  onReply?: (characterId: string) => void;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  morning_greeting: <Sun className="w-5 h-5 text-yellow-400" />,
  night_greeting: <Moon className="w-5 h-5 text-indigo-400" />,
  miss_you: <Heart className="w-5 h-5 text-pink-400" />,
  random_thought: <Sparkles className="w-5 h-5 text-purple-400" />,
  anniversary: <Heart className="w-5 h-5 text-red-500" />,
  comeback_message: <MessageCircleHeart className="w-5 h-5 text-rose-400" />,
};

const NOTIFICATION_TITLES: Record<string, string> = {
  morning_greeting: 'Chào buổi sáng! ☀️',
  night_greeting: 'Chúc ngủ ngon 🌙',
  miss_you: 'Em nhớ anh 💕',
  random_thought: 'Em đang nghĩ...',
  anniversary: 'Ngày đặc biệt ❤️',
  comeback_message: 'Quay lại nào!',
};

const NOTIFICATION_COLORS: Record<string, string> = {
  morning_greeting: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
  night_greeting: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30',
  miss_you: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
  random_thought: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30',
  anniversary: 'from-red-500/20 to-pink-500/20 border-red-500/30',
  comeback_message: 'from-rose-500/20 to-pink-500/20 border-rose-500/30',
};

export function ProactiveNotification({ notification, onDismiss, onReply }: ProactiveNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      // Slight delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [notification]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleReply = () => {
    if (notification && onReply) {
      onReply(notification.characterId);
    }
    handleDismiss();
  };

  if (!notification) return null;

  const icon = NOTIFICATION_ICONS[notification.type];
  const title = NOTIFICATION_TITLES[notification.type];
  const colorClass = NOTIFICATION_COLORS[notification.type] || 'from-gray-500/20 to-gray-600/20';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-50"
        >
          <div
            className={cn(
              'relative bg-gradient-to-br backdrop-blur-lg rounded-2xl border shadow-2xl overflow-hidden',
              colorClass
            )}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded-full">
                    {icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm">{title}</h4>
                    <p className="text-xs text-white/60">{notification.characterName}</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 text-white/40 hover:text-white/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message */}
              <div className="bg-white/5 rounded-xl p-3 mb-3">
                <p className="text-white text-sm leading-relaxed">
                  {notification.message}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
                >
                  Để sau
                </Button>
                <Button
                  size="sm"
                  onClick={handleReply}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                >
                  <MessageCircleHeart className="w-4 h-4 mr-1" />
                  Trả lời
                </Button>
              </div>
            </div>

            {/* Animated hearts for romantic types */}
            {(notification.type === 'miss_you' || notification.type === 'anniversary') && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0, x: Math.random() * 100 }}
                    animate={{
                      opacity: [0, 1, 0],
                      y: [-20, -60],
                      x: Math.random() * 100,
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.5,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                    className="absolute bottom-10 text-pink-400"
                    style={{ left: `${20 + i * 30}%` }}
                  >
                    ❤️
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProactiveNotification;
