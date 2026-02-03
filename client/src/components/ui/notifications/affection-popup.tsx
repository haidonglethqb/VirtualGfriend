'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Heart, TrendingUp, TrendingDown } from 'lucide-react'

interface AffectionPopupProps {
  change: number
  isVisible: boolean
  onComplete?: () => void
}

export function AffectionPopup({ change, isVisible, onComplete }: AffectionPopupProps) {
  const isPositive = change > 0
  const Icon = isPositive ? TrendingUp : TrendingDown

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && change !== 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="fixed bottom-32 right-6 z-50"
        >
          <div className={`
            flex items-center gap-2 px-4 py-3 rounded-full shadow-lg backdrop-blur-md
            ${isPositive 
              ? 'bg-gradient-to-r from-love/90 to-pink-500/90 text-white shadow-[0_4px_20px_rgba(244,37,140,0.4)]' 
              : 'bg-gradient-to-r from-gray-600/90 to-gray-700/90 text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
            }
          `}>
            <Heart className={`w-5 h-5 ${isPositive ? 'fill-white' : ''}`} />
            <span className="font-bold text-lg">
              {isPositive ? '+' : ''}{change}
            </span>
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">Độ thân mật</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
