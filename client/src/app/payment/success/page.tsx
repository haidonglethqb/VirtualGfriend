'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Sparkles, Loader2, ArrowRight, AlertCircle, Clock3 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useLanguageStore } from '@/store/language-store'
import api from '@/services/api'

type VerificationState = 'loading' | 'success' | 'pending' | 'invalid'

interface CheckoutSessionStatus {
  checkoutCompleted: boolean
  paymentStatus: string | null
  sessionStatus: string | null
  premiumActivated: boolean
  premiumTier: string
  premiumExpiresAt: string | null
  isReady: boolean
}

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
  const [state, setState] = useState<VerificationState>('loading')

  useEffect(() => {
    if (!sessionId) {
      setState('invalid')
      return
    }

    let isCancelled = false
    let attempts = 0
    const maxAttempts = 10
    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    async function pollStatus() {
      try {
        const res = await api.get<CheckoutSessionStatus>(`/payment/checkout-session/${sessionId}`)
        const checkout = res.data

        if (!checkout?.checkoutCompleted) {
          if (!isCancelled) {
            setState('invalid')
          }
          return
        }

        if (checkout.isReady) {
          if (!isCancelled) {
            setState('success')
          }
          return
        }
      } catch {
        if (!isCancelled) {
          setState('invalid')
        }
        return
      }

      attempts++
      if (attempts < maxAttempts) {
        retryTimeout = setTimeout(pollStatus, 2000)
      } else {
        if (!isCancelled) {
          setState('pending')
        }
      }
    }

    void pollStatus()

    return () => {
      isCancelled = true
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
    }
  }, [sessionId])

  const renderContent = () => {
    if (state === 'loading') {
      return (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-love" />
          <p className="text-gray-400">
            {isVi ? 'Đang xác nhận thanh toán...' : 'Verifying payment...'}
          </p>
        </div>
      )
    }

    if (state === 'invalid') {
      return (
        <>
          <div className="mx-auto w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mb-6 border border-red-400/20">
            <AlertCircle className="w-10 h-10 text-red-300" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isVi ? 'Không tìm thấy phiên thanh toán' : 'Payment session not found'}
          </h1>
          <p className="text-gray-400 mb-8">
            {isVi
              ? 'Liên kết này không hợp lệ hoặc đã hết hạn. Hãy quay lại trang gói để thử lại.'
              : 'This link is invalid or expired. Return to subscription plans and try again.'}
          </p>
          <Link
            href="/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2f2028] text-white font-semibold hover:bg-[#3b2831] transition"
          >
            {isVi ? 'Quay lại gói VIP' : 'Back to plans'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )
    }

    if (state === 'pending') {
      return (
        <>
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mb-6 border border-amber-400/20">
            <Clock3 className="w-10 h-10 text-amber-300" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isVi ? 'Đã nhận thanh toán, đang kích hoạt VIP' : 'Payment received, activating VIP'}
          </h1>
          <p className="text-gray-400 mb-8">
            {isVi
              ? 'Webhook Stripe có thể đang xử lý. Vui lòng quay lại sau ít phút để kiểm tra trạng thái gói.'
              : 'Stripe webhook may still be processing. Please check your subscription status again in a moment.'}
          </p>
          <Link
            href="/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:opacity-90 transition"
          >
            {isVi ? 'Xem trạng thái gói' : 'View subscription status'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )
    }

    return (
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
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#1a0a1f] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {renderContent()}
      </motion.div>
    </div>
  )
}
