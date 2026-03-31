'use client'

import { motion } from 'framer-motion'
import { XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useLanguageStore } from '@/store/language-store'

export default function PaymentCancelPage() {
  const { language } = useLanguageStore()
  const isVi = language === 'vi'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#1a0a1f] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="mx-auto w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6"
        >
          <XCircle className="w-10 h-10 text-gray-400" />
        </motion.div>

        <h1 className="text-2xl font-bold text-white mb-2">
          {isVi ? 'Thanh toán bị hủy' : 'Payment Cancelled'}
        </h1>
        <p className="text-gray-400 mb-8">
          {isVi
            ? 'Bạn đã hủy quá trình thanh toán. Không có khoản phí nào được thu.'
            : 'You cancelled the payment process. No charges were made.'}
        </p>

        <Link
          href="/subscription"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          {isVi ? 'Quay lại gói đăng ký' : 'Back to Plans'}
        </Link>
      </motion.div>
    </div>
  )
}
