'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Sparkles, X } from 'lucide-react'

interface RelationshipUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  previousStage: string
  newStage: string
  characterName: string
}

const stageInfo: Record<string, { emoji: string, label: string, description: string, color: string }> = {
  STRANGER: { emoji: '👋', label: 'Người lạ', description: 'Mới gặp nhau', color: 'from-gray-400 to-gray-500' },
  ACQUAINTANCE: { emoji: '🙂', label: 'Quen biết', description: 'Bắt đầu làm quen', color: 'from-blue-400 to-blue-500' },
  FRIEND: { emoji: '😊', label: 'Bạn bè', description: 'Trở thành bạn', color: 'from-green-400 to-green-500' },
  CLOSE_FRIEND: { emoji: '🤗', label: 'Bạn thân', description: 'Thân thiết với nhau', color: 'from-yellow-400 to-orange-500' },
  CRUSH: { emoji: '😍', label: 'Crush', description: 'Có tình cảm đặc biệt', color: 'from-pink-400 to-rose-500' },
  DATING: { emoji: '💕', label: 'Hẹn hò', description: 'Đang hẹn hò', color: 'from-love to-pink-500' },
  LOVER: { emoji: '❤️', label: 'Người yêu', description: 'Yêu nhau sâu đậm', color: 'from-red-500 to-love' },
}

export function RelationshipUpgradeModal({
  isOpen,
  onClose,
  previousStage,
  newStage,
  characterName
}: RelationshipUpgradeModalProps) {
  const prevInfo = stageInfo[previousStage] || stageInfo.STRANGER
  const newInfo = stageInfo[newStage] || stageInfo.ACQUAINTANCE

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Hearts floating animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  y: (typeof window !== 'undefined' ? window.innerHeight : 600) + 20,
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
                  opacity: 0.8
                }}
                animate={{ 
                  y: -50,
                  opacity: 0
                }}
                transition={{ 
                  duration: 4 + Math.random() * 3,
                  ease: 'easeOut',
                  delay: Math.random() * 2,
                  repeat: Infinity
                }}
                className="absolute text-2xl"
              >
                {''}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-gradient-to-b from-[#2d1f26] to-[#271b21] border border-love/30 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_80px_rgba(244,37,140,0.4)]"
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-[#ba9cab]" />
            </button>

            {/* Heart icon with pulse */}
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                }}
                className={`w-28 h-28 rounded-full bg-gradient-to-br ${newInfo.color} flex items-center justify-center shadow-[0_0_50px_rgba(244,37,140,0.5)]`}
              >
                <span className="text-5xl">{newInfo.emoji}</span>
              </motion.div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-2 mb-2"
              >
                <Sparkles className="w-5 h-5 text-love" />
                <span className="text-sm font-bold text-love uppercase tracking-wide">Quan hệ tiến triển!</span>
                <Sparkles className="w-5 h-5 text-love" />
              </motion.div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-black text-white mb-4"
              >
                {newInfo.label}
              </motion.h2>

              {/* Progress visualization */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-4 mb-4"
              >
                <div className="flex flex-col items-center">
                  <span className="text-3xl mb-1">{prevInfo.emoji}</span>
                  <span className="text-xs text-[#ba9cab]">{prevInfo.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-0.5 bg-[#392830]" />
                  <Heart className="w-4 h-4 text-love fill-love" />
                  <div className="w-8 h-0.5 bg-love" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl mb-1">{newInfo.emoji}</span>
                  <span className="text-xs text-white font-bold">{newInfo.label}</span>
                </div>
              </motion.div>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-[#ba9cab]"
              >
                Bạn và <span className="text-love font-semibold">{characterName}</span> đã trở nên thân thiết hơn!
              </motion.p>
            </div>

            {/* Description */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6 text-center"
            >
              <p className="text-white/80">{newInfo.description}</p>
            </motion.div>

            {/* Continue button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={onClose}
              className={`w-full h-14 rounded-full bg-gradient-to-r ${newInfo.color} text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105`}
            >
              Tiếp tục bên nhau
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
