'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Eye, EyeOff, Mail, Lock, User, Check, X, Sparkles, Shield, MessageCircle, Users, Home } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
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
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-love border-r-purple-500"
            style={{ width: 80, height: 80 }}
          />
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-love/20 to-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-love animate-pulse" />
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

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const register = useAuthStore((state) => state.register);
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordValidation = useMemo(() => validatePassword(password, language), [password, language]);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Vui lòng điền đầy đủ thông tin', 'Please fill in all required fields'),
        variant: 'destructive',
      });
      return;
    }

    if (!passwordValidation.valid) {
      toast({
        title: tr('Mật khẩu không hợp lệ', 'Invalid password'),
        description: passwordValidation.errors[0],
        variant: 'destructive',
      });
      return;
    }

    if (username && username.trim().length < 5) {
      toast({
        title: tr('Tên người dùng không hợp lệ', 'Invalid username'),
        description: tr('Tên người dùng phải có ít nhất 5 ký tự', 'Username must be at least 5 characters'),
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Mật khẩu xác nhận không khớp', 'Confirmation password does not match'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, username || undefined);
      toast({
        title: tr('Mã OTP đã được gửi!', 'OTP code sent!'),
        description: tr('Kiểm tra email của bạn để xác nhận đăng ký', 'Check your email to verify registration'),
        variant: 'love',
      });
      router.push(`/auth/verify-otp?type=registration&email=${encodeURIComponent(email)}`);
    } catch (error) {
      toast({
        title: tr('Đăng ký thất bại', 'Sign up failed'),
        description: error instanceof Error ? error.message : tr('Có lỗi xảy ra', 'Something went wrong'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingOverlay text={tr('Đang tạo tài khoản', 'Creating account')} />}
      </AnimatePresence>

      <div className="min-h-screen bg-[#030014] relative">
        {/* Fixed back button - top left corner */}
        <Link
          href="/"
          className="fixed top-4 left-4 sm:top-6 sm:left-6 z-40 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 group backdrop-blur-sm"
        >
          <Home className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">{tr('Trang chủ', 'Home')}</span>
        </Link>

        <div className="min-h-screen flex flex-col lg:flex-row">
          {/* Left side - Form */}
          <div className="flex-1 flex items-center justify-center p-6 pt-20 sm:p-8 sm:pt-20 lg:p-12 lg:pt-12 order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md"
            >
              {/* Mobile logo */}
              <div className="lg:hidden flex justify-center mb-6">
                <Link href="/" className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-love to-purple-600 text-white shadow-lg shadow-love/30">
                    <Heart className="w-5 h-5 fill-white" />
                  </div>
                  <span className="text-xl font-bold">
<span className="text-white">Amou</span>
                  <span className="text-love">ra</span>
                  </span>
                </Link>
              </div>

              {/* Form card */}
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-love/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-50" />
                
                <div className="relative bg-[#0a0518]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{tr('Tạo tài khoản', 'Create account')}</h2>
                    <p className="text-gray-500 text-sm sm:text-base">{tr('Bắt đầu hành trình của bạn', 'Start your journey')}</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    {/* Email field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-300">
                        Email <span className="text-love">*</span>
                      </label>
                      <div className={`relative rounded-xl transition-all duration-300 ${
                        focusedField === 'email' ? 'ring-2 ring-love/50' : ''
                      }`}>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <Mail className="w-5 h-5" />
                        </div>
                        <input
                          type="email"
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isLoading}
                          className="w-full h-11 sm:h-12 pl-12 pr-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-600 outline-none transition-all duration-300 hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-love/30 disabled:opacity-50 text-sm sm:text-base"
                        />
                      </div>
                    </div>

                    {/* Username field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-300">
                        {tr('Tên người dùng', 'Username')} <span className="text-gray-600 text-xs">{tr('(tuỳ chọn, tối thiểu 5 ký tự)', '(optional, at least 5 characters)')}</span>
                      </label>
                      <div className={`relative rounded-xl transition-all duration-300 ${
                        focusedField === 'username' ? 'ring-2 ring-love/50' : ''
                      } ${username && username.trim().length < 5 ? 'ring-2 ring-red-500/50' : ''}`}>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          placeholder={tr('username (tối thiểu 5 ký tự)', 'username (at least 5 characters)')}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          onFocus={() => setFocusedField('username')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isLoading}
                          className="w-full h-11 sm:h-12 pl-12 pr-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-600 outline-none transition-all duration-300 hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-love/30 disabled:opacity-50 text-sm sm:text-base"
                        />
                      </div>
                      {username && username.trim().length < 5 && (
                        <p className="text-xs text-red-400 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          {tr('Tên người dùng phải có ít nhất 5 ký tự', 'Username must be at least 5 characters')} ({username.trim().length}/5)
                        </p>
                      )}
                    </div>

                    {/* Password field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-300">
                        {tr('Mật khẩu', 'Password')} <span className="text-love">*</span>
                      </label>
                      <div className={`relative rounded-xl transition-all duration-300 ${
                        focusedField === 'password' ? 'ring-2 ring-love/50' : ''
                      }`}>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={tr(`Ít nhất ${PASSWORD_REQUIREMENTS.MIN_LENGTH} ký tự`, `At least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`)}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isLoading}
                          className="w-full h-11 sm:h-12 pl-12 pr-12 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-600 outline-none transition-all duration-300 hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-love/30 disabled:opacity-50 text-sm sm:text-base"
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
                      {password.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-2 pt-1"
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
                            <span className="text-xs text-gray-500 w-14 text-right">
                              {getPasswordStrengthLabel(passwordValidation.strength, language)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                            {[
                              { check: password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH, label: tr(`${PASSWORD_REQUIREMENTS.MIN_LENGTH}+ ký tự`, `${PASSWORD_REQUIREMENTS.MIN_LENGTH}+ characters`) },
                              { check: /[A-Z]/.test(password), label: tr('Chữ hoa', 'Uppercase') },
                              { check: /[a-z]/.test(password), label: tr('Chữ thường', 'Lowercase') },
                              { check: /[0-9]/.test(password), label: tr('Số', 'Number') },
                              { check: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), label: tr('Ký tự đặc biệt', 'Special character') },
                            ].map((req, i) => (
                              <div 
                                key={i}
                                className={`flex items-center gap-1 text-xs transition-colors ${
                                  req.check ? 'text-green-400' : 'text-gray-600'
                                }`}
                              >
                                {req.check ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                {req.label}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Confirm password field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-300">
                        {tr('Xác nhận mật khẩu', 'Confirm password')} <span className="text-love">*</span>
                      </label>
                      <div className={`relative rounded-xl transition-all duration-300 ${
                        focusedField === 'confirm' ? 'ring-2 ring-love/50' : ''
                      } ${confirmPassword && !passwordsMatch ? 'ring-2 ring-red-500/50' : ''}`}>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input
                          type="password"
                          placeholder={tr('Nhập lại mật khẩu', 'Re-enter password')}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedField('confirm')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isLoading}
                          className="w-full h-11 sm:h-12 pl-12 pr-12 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-600 outline-none transition-all duration-300 hover:bg-white/[0.05] focus:bg-white/[0.05] focus:border-love/30 disabled:opacity-50 text-sm sm:text-base"
                        />
                        {confirmPassword && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {passwordsMatch ? (
                              <Check className="w-5 h-5 text-green-400" />
                            ) : (
                              <X className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                        )}
                      </div>
                      {confirmPassword && !passwordsMatch && (
                        <p className="text-xs text-red-400 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          {tr('Mật khẩu không khớp', 'Passwords do not match')}
                        </p>
                      )}
                    </div>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={isLoading || !passwordValidation.valid || !passwordsMatch || (!!username && username.trim().length < 5)}
                      className="group relative w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-love to-purple-500 text-white font-bold overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-love/25 hover:shadow-love/40 mt-4"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-love opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 flex items-center justify-center gap-2 text-sm sm:text-base">
                        {tr('Tạo tài khoản', 'Create account')}
                        <Sparkles className="w-4 h-4" />
                      </span>
                    </button>
                  </form>

                  {/* Terms */}
                  <p className="mt-4 sm:mt-6 text-center text-xs text-gray-600 leading-relaxed">
                    {tr('Bằng việc đăng ký, bạn đồng ý với', 'By signing up, you agree to')}{' '}
                    <Link href="/terms" className="text-gray-400 hover:text-white underline-offset-4 hover:underline">
                      {tr('Điều khoản sử dụng', 'Terms of use')}
                    </Link>
                    {' '}{tr('và', 'and')}{' '}
                    <Link href="/privacy" className="text-gray-400 hover:text-white underline-offset-4 hover:underline">
                      {tr('Chính sách bảo mật', 'Privacy policy')}
                    </Link>
                  </p>

                  {/* Login link */}
                  <p className="mt-4 sm:mt-6 text-center text-sm text-gray-500">
                    {tr('Đã có tài khoản?', 'Already have an account?')}{' '}
                    <Link href="/auth/login" className="text-love hover:text-love/80 font-medium transition-colors">
                      {tr('Đăng nhập', 'Sign in')}
                    </Link>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right side - Branding */}
          <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden order-1 lg:order-2">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-bl from-love/20 via-purple-900/30 to-[#030014]" />
            
            {/* Animated orbs */}
            <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-love/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
              }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 mb-10 group">
                  <div className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-love via-purple-500 to-love text-white shadow-lg shadow-love/30 group-hover:shadow-love/50 transition-all duration-300">
                    <Heart className="w-6 h-6 fill-white" />
                  </div>
                  <span className="text-2xl font-bold">
<span className="text-white">Amou</span>
                  <span className="text-love">ra</span>
                  </span>
                </Link>

                <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-5">
                  {tr('Bắt đầu', 'Start')}
                  <br />
                  <span className="bg-gradient-to-r from-love via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    {tr('hành trình mới', 'a new journey')}
                  </span>
                </h1>
                
                <p className="text-gray-400 text-base xl:text-lg leading-relaxed max-w-md mb-8">
                  {tr(
                    'Tạo tài khoản miễn phí và khám phá người bạn đồng hành AI được thiết kế riêng cho bạn. Không cần thẻ tín dụng.',
                    'Create your free account and discover an AI companion tailored just for you. No credit card required.'
                  )}
                </p>

                {/* Benefits with Lucide icons */}
                <div className="space-y-4">
                  {[
                    { 
                      icon: MessageCircle, 
                      title: tr('Chat không giới hạn', 'Unlimited chat'),
                      desc: tr('Trò chuyện 24/7 với AI thông minh', 'Chat with smart AI 24/7')
                    },
                    { 
                      icon: Heart, 
                      title: tr('Tùy chỉnh nhân vật', 'Customize character'),
                      desc: tr('Tạo người yêu ảo theo ý thích', 'Create your ideal virtual partner')
                    },
                    { 
                      icon: Shield, 
                      title: tr('Riêng tư tuyệt đối', 'Total privacy'),
                      desc: tr('Mã hóa End-to-End mọi cuộc trò chuyện', 'End-to-End encryption for all chats')
                    },
                  ].map((benefit, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-love/10 text-love shrink-0">
                        <benefit.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm mb-0.5">{benefit.title}</h3>
                        <p className="text-xs text-gray-500">{benefit.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Social proof */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-8 flex items-center gap-3"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-love/20 to-purple-500/20 border border-white/10">
                    <Users className="w-4 h-4 text-love" />
                  </div>
                  <p className="text-sm text-gray-500">
                    <span className="text-white font-semibold">10,000+</span> {tr('người dùng tin tưởng', 'trusted users')}
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
