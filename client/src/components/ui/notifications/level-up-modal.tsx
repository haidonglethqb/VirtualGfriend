'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Star, Sparkles, Gift, Lock, Unlock, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface LevelUpModalProps {
  isOpen: boolean
  onClose: () => void
  newLevel: number
  characterName: string
  unlocks?: string[]
  rewards?: {
    coins?: number
    gems?: number
    affection?: number
  }
}

export function LevelUpModal({ 
  isOpen, 
  onClose, 
  newLevel, 
  characterName,
  unlocks = [],
  rewards
}: LevelUpModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

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
          {/* Confetti effect */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    y: -20, 
                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
                    rotate: 0,
                    opacity: 1 
                  }}
                  animate={{ 
                    y: (typeof window !== 'undefined' ? window.innerHeight : 600) + 20,
                    rotate: Math.random() * 360,
                    opacity: 0
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2,
                    ease: 'linear',
                    delay: Math.random() * 0.5
                  }}
                  className={`absolute w-3 h-3 ${
                    ['bg-love', 'bg-pink-400', 'bg-yellow-400', 'bg-purple-400', 'bg-blue-400'][i % 5]
                  } rounded-sm`}
                />
              ))}
            </div>
          )}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-gradient-to-b from-[#2d1f26] to-[#271b21] border border-love/30 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_60px_rgba(244,37,140,0.3)]"
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-[#ba9cab]" />
            </button>

            {/* Star icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.5)]"
              >
                <Star className="w-12 h-12 text-white fill-white" />
              </motion.div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-black text-white mb-2"
              >
                LEVEL UP!
              </motion.h2>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="text-6xl font-black bg-gradient-to-r from-love to-pink-400 bg-clip-text text-transparent"
              >
                {newLevel}
              </motion.div>
              <p className="text-[#ba9cab] mt-2">
                Mối quan hệ với <span className="text-love font-semibold">{characterName}</span> đã tiến triển!
              </p>
            </div>

            {/* Rewards */}
            {rewards && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center gap-4 mb-6"
              >
                {rewards.coins && rewards.coins > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                    <span className="text-xl">🪙</span>
                    <span className="font-bold text-yellow-400">+{rewards.coins}</span>
                  </div>
                )}
                {rewards.gems && rewards.gems > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
                    <span className="text-xl"></span>
                    <span className="font-bold text-purple-400">+{rewards.gems}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Unlocks */}
            {unlocks.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-6"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Unlock className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-bold text-green-400 uppercase tracking-wide">Mở khóa mới</span>
                </div>
                <div className="space-y-2">
                  {unlocks.map((unlock, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <Sparkles className="w-5 h-5 text-love" />
                      <span className="text-white font-medium">{unlock}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Continue button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={onClose}
              className="w-full h-14 rounded-full bg-gradient-to-r from-love to-pink-500 text-white font-bold text-lg shadow-[0_4px_20px_rgba(244,37,140,0.4)] hover:shadow-[0_4px_30px_rgba(244,37,140,0.6)] transition-all hover:scale-105"
            >
              Tuyệt vời!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
