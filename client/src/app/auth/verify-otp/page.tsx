'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowLeft, Loader2, RotateCcw, Heart, Clock } from 'lucide-react';
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
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 border-r-love"
            style={{ width: 80, height: 80 }}
          />
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-love/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-purple-400 animate-pulse" />
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-white font-medium">Đang xác thực</span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-purple-400"
          >
            ...
          </motion.span>
        </div>

        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 bg-gradient-to-r from-purple-500 to-love rounded-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const emailFromUrl = searchParams.get('email') || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!emailFromUrl) {
      router.push('/auth/forgot-password');
    }
  }, [emailFromUrl, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const lastIndex = Math.min(index + pastedOtp.length, 5);
      document.getElementById(`otp-${lastIndex}`)?.focus();
      return;
    }

    if (/^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập đầy đủ 6 số OTP',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<{ token?: string }>('/auth/verify-otp', {
        email: emailFromUrl,
        otp: otpString,
      });

      const token = response.data?.token || (response as unknown as Record<string, string>).token;
      
      if (token) {
        toast({
          title: 'Thành công',
          description: 'Mã OTP xác thực thành công',
        });
        router.push(
          `/auth/reset-password?email=${encodeURIComponent(emailFromUrl)}&token=${token}`
        );
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không nhận được token. Vui lòng thử lại.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
      const message = error instanceof Error ? error.message : 'Mã OTP không hợp lệ hoặc đã hết hạn';
      toast({
        title: 'Lỗi',
        description: message,
        variant: 'destructive',
      });
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);

    try {
      const response = await api.post('/auth/forgot-password', { email: emailFromUrl });

      if (response.success) {
        toast({
          title: 'Thành công',
          description: 'Mã OTP mới đã được gửi đến email của bạn',
        });
        setCountdown(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể gửi lại mã OTP';
      toast({
        title: 'Lỗi',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingOverlay />}
      </AnimatePresence>
      
      <div className="min-h-screen bg-[#030014] flex items-center justify-center p-4 sm:p-6">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] opacity-60" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-love/10 rounded-full blur-[120px] opacity-60" />
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
        <div className="flex justify-center mb-8">
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

        {/* Back button */}
        <Link 
          href="/auth/forgot-password"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại
        </Link>

        {/* Card */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-love/20 to-purple-500/20 rounded-3xl blur-xl opacity-50" />
          
          <div className="relative bg-[#0a0518]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-love/20 border border-purple-500/20 flex items-center justify-center mx-auto mb-5"
              >
                <Shield className="w-8 h-8 text-purple-400" />
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Xác thực OTP</h1>
              <p className="text-gray-500">
                Nhập mã 6 số được gửi đến
              </p>
              <p className="text-love font-medium mt-1">{emailFromUrl}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* OTP Inputs */}
              <div className="flex gap-2 sm:gap-3 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                    className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-white/[0.03] border-2 border-white/[0.08] 
                             text-white rounded-xl outline-none transition-all duration-300
                             hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-purple-500/50
                             disabled:opacity-50"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-love text-white font-bold overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-love to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang xác thực...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Xác thực
                    </>
                  )}
                </span>
              </button>

              {/* Resend */}
              <div className="text-center">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="inline-flex items-center gap-2 text-sm text-love hover:text-love/80 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                  </button>
                ) : (
                  <p className="text-sm text-gray-600">
                    Gửi lại mã sau <span className="text-purple-400 font-medium">{countdown}s</span>
                  </p>
                )}
              </div>
            </form>

            {/* Info */}
            <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <p className="text-sm text-amber-400/80 text-center flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Mã OTP có hiệu lực trong 10 phút
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-love" />
        <span className="text-gray-400">Đang tải...</span>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyOTPContent />
    </Suspense>
  );
}
