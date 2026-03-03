'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Heart, KeyRound, Clock, Send, Home } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';

function LoadingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#030014]/90 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-love border-r-purple-500"
            style={{ width: 80, height: 80 }}
          />
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-love/20 to-purple-500/20 flex items-center justify-center">
            <Send className="w-8 h-8 text-love animate-pulse" />
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-white font-medium">Đang gửi mã OTP</span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-love"
          >
            ...
          </motion.span>
        </div>

        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 bg-gradient-to-r from-love to-purple-500 rounded-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập email',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });

      if (response.success) {
        toast({
          title: 'Thành công',
          description: response.message || 'Mã OTP đã được gửi đến email của bạn',
        });

        router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể gửi mã OTP. Vui lòng thử lại.';
      toast({
        title: 'Lỗi',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingOverlay />}
      </AnimatePresence>

      <div className="min-h-screen bg-[#030014] relative">
        {/* Fixed back button - top left corner */}
        <Link
          href="/"
          className="fixed top-4 left-4 sm:top-6 sm:left-6 z-40 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 group backdrop-blur-sm"
        >
          <Home className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Trang chủ</span>
        </Link>

        <div className="min-h-screen flex items-center justify-center p-4 pt-20 sm:p-6 sm:pt-20">
          {/* Background effects */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-love/10 rounded-full blur-[150px] opacity-60" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] opacity-60" />
          </div>

          {/* Grid pattern */}
          <div
            className="fixed inset-0 opacity-[0.02] pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-md"
          >
            {/* Logo */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-love to-purple-600 text-white shadow-lg shadow-love/30 group-hover:shadow-love/50 transition-all duration-300">
                  <Heart className="w-5 h-5 fill-white" />
                </div>
                <span className="text-xl font-bold">
                  <span className="text-white">Người Yêu</span>
                  <span className="text-love"> Ảo</span>
                </span>
              </Link>
            </div>

            {/* Back to login button */}
            <Link 
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-4 sm:mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Quay lại đăng nhập
            </Link>

            {/* Card */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-love/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-50" />
              
              <div className="relative bg-[#0a0518]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-8">
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-love/20 to-purple-500/20 border border-love/20 flex items-center justify-center mx-auto mb-4 sm:mb-5"
                  >
                    <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-love" />
                  </motion.div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Quên mật khẩu?</h1>
                  <p className="text-gray-500 text-sm sm:text-base">
                    Nhập email để nhận mã OTP đặt lại mật khẩu
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Email</label>
                    <div className={`relative rounded-xl transition-all duration-300 ${
                      focusedField ? 'ring-2 ring-love/50' : ''
                    }`}>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField(true)}
                        onBlur={() => setFocusedField(false)}
                        disabled={isLoading}
                        className="w-full h-11 sm:h-12 pl-12 pr-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-600 outline-none transition-all duration-300 hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-love/30 disabled:opacity-50 text-sm sm:text-base"
                        placeholder="email@example.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-love to-purple-500 text-white font-bold overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-love/25 hover:shadow-love/40"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-love opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative z-10 flex items-center justify-center gap-2 text-sm sm:text-base">
                      <Send className="w-4 h-4" />
                      Gửi mã OTP
                    </span>
                  </button>
                </form>

                {/* Info */}
                <div className="mt-5 sm:mt-6 p-3 sm:p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <p className="text-xs sm:text-sm text-blue-400/80 text-center flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    Mã OTP có hiệu lực trong 10 phút
                  </p>
                </div>

                {/* Help text */}
                <p className="mt-5 sm:mt-6 text-center text-sm text-gray-600">
                  Nhớ mật khẩu rồi?{' '}
                  <Link href="/auth/login" className="text-love hover:text-love/80 font-medium transition-colors">
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
