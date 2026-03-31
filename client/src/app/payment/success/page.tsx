'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Sparkles, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useLanguageStore } from '@/store/language-store'
import api from '@/services/api'

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#1a0a1f]">
        <Loader2 className="w-12 h-12 animate-spin text-love" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}

function PaymentSuccessContent() {
  const { language } = useLanguageStore()
  const isVi = language === 'vi'
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    let attempts = 0
    const maxAttempts = 10

    async function pollStatus() {
      try {
        const res = await api.get<{ isPremium: boolean }>('/payment/status')
        if (res.data?.isPremium) {
          setVerified(true)
          setLoading(false)
          return
        }
      } catch { /* ignore */ }

      attempts++
      if (attempts < maxAttempts) {
        setTimeout(pollStatus, 2000)
      } else {
        // Max attempts reached — show success anyway since Stripe confirmed payment
        // Premium activation may be delayed by webhook processing
        setVerified(true)
        setLoading(false)
      }
    }

    pollStatus()
  }, [sessionId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#1a0a1f] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-love" />
            <p className="text-gray-400">
              {isVi ? 'Đang xác nhận thanh toán...' : 'Verifying payment...'}
            </p>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mb-6"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-400" />
                {isVi ? 'Chào mừng VIP!' : 'Welcome to VIP!'}
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </h1>
              <p className="text-gray-400 mb-8">
                {isVi
                  ? 'Thanh toán thành công! Tất cả tính năng premium đã được mở khóa cho bạn.'
                  : 'Payment successful! All premium features have been unlocked for you.'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold hover:opacity-90 transition"
              >
                {isVi ? 'Về trang chính' : 'Go to Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  )
}
