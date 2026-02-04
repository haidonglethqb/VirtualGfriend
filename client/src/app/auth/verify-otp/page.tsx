'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';

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

  // Countdown timer
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
      // Paste handling
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);

      // Focus last filled input or next empty
      const lastIndex = Math.min(index + pastedOtp.length, 5);
      document.getElementById(`otp-${lastIndex}`)?.focus();
      return;
    }

    // Single character
    if (/^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
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

      // Token can be in response.data.token OR response.token (at root level)
      const token = (response.data as any)?.token || (response as any).token;
      
      if (token) {
        toast({
          title: 'Thành công',
          description: 'Mã OTP xác thực thành công',
        });

        // Navigate to reset password with token
        router.push(
          `/auth/reset-password?email=${encodeURIComponent(emailFromUrl)}&token=${token}`
        );
      } else {
        // Success response but no token - should not happen
        toast({
          title: 'Lỗi',
          description: 'Không nhận được token. Vui lòng thử lại.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('OTP Verification Error:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Mã OTP không hợp lệ hoặc đã hết hạn',
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
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể gửi lại mã OTP',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a0e15] via-[#2d1a26] to-[#1a0e15] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back button */}
        <Link 
          href="/auth/forgot-password"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>

        {/* Card */}
        <div className="bg-[#271b21] border border-[#392830] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <Shield className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">Xác thực OTP</h1>
            <p className="text-white/60 text-sm">
              Nhập mã OTP được gửi đến<br />
              <span className="text-love font-medium">{emailFromUrl}</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Inputs */}
            <div className="flex gap-2 justify-center">
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
                  className="w-12 h-14 text-center text-2xl font-bold bg-[#181114] border-2 border-[#392830] 
                           text-white rounded-xl focus:outline-none focus:border-love/50 transition-colors
                           disabled:opacity-50"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold py-3 rounded-xl
                       hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang xác thực...
                </>
              ) : (
                'Xác thực'
              )}
            </button>

            {/* Resend */}
            <div className="text-center">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-love hover:underline disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isResending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                </button>
              ) : (
                <p className="text-white/60 text-sm">
                  Gửi lại mã sau {countdown}s
                </p>
              )}
            </div>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-400 text-center">
              ⏱️ Mã OTP có hiệu lực trong 10 phút
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}
