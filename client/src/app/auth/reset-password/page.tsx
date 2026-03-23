'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, Check, X, Heart, KeyRound, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useLanguageStore } from '@/store/language-store';
import { 
  validatePassword, 
  getPasswordStrengthColor, 
  getPasswordStrengthLabel,
  PASSWORD_REQUIREMENTS 
} from '@/lib/password-validation';

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
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-500 border-r-emerald-400"
            style={{ width: 80, height: 80 }}
          />
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-green-400 animate-pulse" />
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-white font-medium">{text}</span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-green-400"
          >
            ...
          </motion.span>
        </div>

        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
  
  const emailFromUrl = searchParams.get('email') || '';
  const tokenFromUrl = searchParams.get('token') || '';
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordValidation = useMemo(() => validatePassword(newPassword, language), [newPassword, language]);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    if (!emailFromUrl || !tokenFromUrl) {
      router.push('/auth/forgot-password');
    }
  }, [emailFromUrl, tokenFromUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordValidation.valid) {
      toast({
        title: tr('Mật khẩu không hợp lệ', 'Invalid password'),
        description: passwordValidation.errors[0],
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Mật khẩu xác nhận không khớp', 'Confirmation password does not match'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        email: emailFromUrl,
        token: tokenFromUrl,
        newPassword,
      });

      if (response.success) {
        toast({
          title: tr('Thành công!', 'Success!'),
          description: tr('Mật khẩu đã được đặt lại thành công', 'Password has been reset successfully'),
          variant: 'love',
        });
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : tr('Không thể đặt lại mật khẩu. Vui lòng thử lại.', 'Unable to reset password. Please try again.');
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
        {isLoading && <LoadingOverlay text={tr('Đang đặt lại mật khẩu', 'Resetting password')} />}
      </AnimatePresence>

      <div className="min-h-screen bg-[#030014] flex items-center justify-center p-4 sm:p-6">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[150px] opacity-60" />
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

          {/* Card */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 via-love/20 to-green-500/20 rounded-3xl blur-xl opacity-50" />
            
            <div className="relative bg-[#0a0518]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 sm:p-10">
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center mx-auto mb-5"
                >
                  <KeyRound className="w-8 h-8 text-green-400" />
                </motion.div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{tr('Đặt lại mật khẩu', 'Reset password')}</h1>
                <p className="text-gray-500">{tr('Tạo mật khẩu mới cho tài khoản của bạn', 'Create a new password for your account')}</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    {tr('Mật khẩu mới', 'New password')} <span className="text-love">*</span>
                  </label>
                  <div className={`relative rounded-xl transition-all duration-300 ${
                    focusedField === 'password' ? 'ring-2 ring-green-500/50' : ''
                  }`}>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      disabled={isLoading}
                      className="w-full h-12 pl-12 pr-12 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-600 outline-none transition-all duration-300 hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-green-500/30 disabled:opacity-50"
                      placeholder={tr(`Ít nhất ${PASSWORD_REQUIREMENTS.MIN_LENGTH} ký tự`, `At least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {newPassword.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 pt-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ 
                              width: passwordValidation.strength === 'weak' ? '25%' 
                                : passwordValidation.strength === 'fair' ? '50%'
                                : passwordValidation.strength === 'good' ? '75%'
                                : '100%' 
                            }}
                            className={`h-full rounded-full transition-colors ${getPasswordStrengthColor(passwordValidation.strength)}`}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-16 text-right">
                          {getPasswordStrengthLabel(passwordValidation.strength, language)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {[
                          { check: newPassword.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH, label: tr(`${PASSWORD_REQUIREMENTS.MIN_LENGTH}+ ký tự`, `${PASSWORD_REQUIREMENTS.MIN_LENGTH}+ characters`) },
                          { check: /[A-Z]/.test(newPassword), label: tr('Chữ hoa', 'Uppercase') },
                          { check: /[a-z]/.test(newPassword), label: tr('Chữ thường', 'Lowercase') },
                          { check: /[0-9]/.test(newPassword), label: tr('Số', 'Number') },
                          { check: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword), label: tr('Ký tự đặc biệt', 'Special character') },
                        ].map((req, i) => (
                          <div 
                            key={i}
                            className={`flex items-center gap-1.5 text-xs transition-colors ${
                              req.check ? 'text-green-400' : 'text-gray-600'
                            }`}
                          >
                            {req.check ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            {req.label}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    {tr('Xác nhận mật khẩu', 'Confirm password')} <span className="text-love">*</span>
                  </label>
                  <div className={`relative rounded-xl transition-all duration-300 ${
                    focusedField === 'confirm' ? 'ring-2 ring-green-500/50' : ''
                  } ${confirmPassword && !passwordsMatch ? 'ring-2 ring-red-500/50' : ''}`}>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirm')}
                      onBlur={() => setFocusedField(null)}
                      disabled={isLoading}
                      className="w-full h-12 pl-12 pr-12 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-600 outline-none transition-all duration-300 hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-green-500/30 disabled:opacity-50"
                      placeholder={tr('Nhập lại mật khẩu mới', 'Re-enter new password')}
                      autoComplete="new-password"
                    />
                    {confirmPassword ? (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {passwordsMatch ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <X className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {tr('Mật khẩu không khớp', 'Passwords do not match')}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !passwordValidation.valid || !passwordsMatch}
                  className="group relative w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 mt-6"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    {tr('Đặt lại mật khẩu', 'Reset password')}
                  </span>
                </button>
              </form>

              {/* Info */}
              <div className="mt-6 p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <p className="text-sm text-green-400/80 text-center flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {tr('Mật khẩu mạnh giúp bảo vệ tài khoản của bạn', 'A strong password helps protect your account')}
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
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-green-400" />
        <span className="text-gray-400">{tr('Đang tải...', 'Loading...')}</span>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
