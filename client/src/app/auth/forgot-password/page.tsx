'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Heart, KeyRound, Clock, Send, Home } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useLanguageStore } from '@/store/language-store';

function LoadingOverlay({ text }: { text: string }) {
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
          <span className="text-white font-medium">{text}</span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-love"
          >
            ...
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Vui lòng nhập email', 'Please enter your email'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.success) {
        toast({
          title: tr('Thành công', 'Success'),
          description: response.message || tr('Mã OTP đã được gửi đến email của bạn', 'OTP code has been sent to your email'),
        });
        router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : tr('Không thể gửi mã OTP. Vui lòng thử lại.', 'Unable to send OTP code. Please try again.');

      toast({
        title: tr('Lỗi', 'Error'),
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
        {isLoading && <LoadingOverlay text={tr('Đang gửi mã OTP', 'Sending OTP code')} />}
      </AnimatePresence>

      <div className="min-h-screen bg-[#030014] relative">
        <Link
          href="/"
          className="fixed top-4 left-4 sm:top-6 sm:left-6 z-40 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 group backdrop-blur-sm"
        >
          <Home className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">{tr('Trang chủ', 'Home')}</span>
        </Link>

        <div className="min-h-screen flex items-center justify-center p-4 pt-20 sm:p-6 sm:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-md"
          >
            <div className="flex justify-center mb-6 sm:mb-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-love to-purple-600 text-white shadow-lg shadow-love/30 group-hover:shadow-love/50 transition-all duration-300">
                  <Heart className="w-5 h-5 fill-white" />
                </div>
                <span className="text-xl font-bold">
                  <span className="text-white">Amou</span>
                  <span className="text-love">ra</span>
                </span>
              </Link>
            </div>

            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-4 sm:mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              {tr('Quay lại đăng nhập', 'Back to login')}
            </Link>

            <div className="relative bg-[#0a0518]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-love/20 to-purple-500/20 border border-love/20 flex items-center justify-center mx-auto mb-4 sm:mb-5"
                >
                  <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-love" />
                </motion.div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{tr('Quên mật khẩu?', 'Forgot password?')}</h1>
                <p className="text-gray-500 text-sm sm:text-base">
                  {tr('Nhập email để nhận mã OTP đặt lại mật khẩu', 'Enter your email to receive an OTP for password reset')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">{tr('Email', 'Email')}</label>
                  <div className={`relative rounded-xl transition-all duration-300 ${focusedField ? 'ring-2 ring-love/50' : ''}`}>
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
                  className="group relative w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-love to-purple-500 text-white font-bold overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 text-sm sm:text-base">
                    <Send className="w-4 h-4" />
                    {tr('Gửi mã OTP', 'Send OTP code')}
                  </span>
                </button>
              </form>

              <div className="mt-5 sm:mt-6 p-3 sm:p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-xs sm:text-sm text-blue-400/80 text-center flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  {tr('Mã OTP có hiệu lực trong 10 phút', 'OTP code is valid for 10 minutes')}
                </p>
              </div>

              <p className="mt-5 sm:mt-6 text-center text-sm text-gray-600">
                {tr('Nhớ mật khẩu rồi?', 'Remember your password?')}{' '}
                <Link href="/auth/login" className="text-love hover:text-love/80 font-medium transition-colors">
                  {tr('Đăng nhập', 'Sign in')}
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
