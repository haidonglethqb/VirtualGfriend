'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

        // Navigate to verify OTP page with email
        router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể gửi mã OTP. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
          href="/auth/login"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại đăng nhập
        </Link>

        {/* Card */}
        <div className="bg-[#271b21] border border-[#392830] rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-love to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-love-strong"
            >
              <Mail className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">Quên mật khẩu?</h1>
            <p className="text-white/60 text-sm">
              Nhập email của bạn để nhận mã OTP đặt lại mật khẩu
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-[#181114] border border-[#392830] text-white rounded-xl py-3 pl-12 pr-4 
                           focus:outline-none focus:border-love/50 transition-colors disabled:opacity-50"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-love to-pink-600 text-white font-semibold py-3 rounded-xl
                       hover:shadow-love transition-all disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi mã OTP'
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-400 text-center">
              💡 Mã OTP sẽ được gửi đến email của bạn và có hiệu lực trong 10 phút
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
