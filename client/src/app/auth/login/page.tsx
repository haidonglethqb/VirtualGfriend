'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Eye, EyeOff, ArrowLeft, Mail, Lock, Sparkles, MessageCircle, Gift, ShieldCheck, Home } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
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
            <Heart className="w-8 h-8 text-love fill-love animate-pulse" />
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-white font-medium">Đang đăng nhập</span>
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

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const login = useAuthStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: 'Đăng nhập thành công!',
        description: 'Chào mừng bạn quay lại',
        variant: 'love',
      });
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'Đăng nhập thất bại',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: MessageCircle, text: 'Trò chuyện không giới hạn' },
    { icon: Gift, text: 'Hệ thống quà tặng & nhiệm vụ' },
    { icon: ShieldCheck, text: 'Bảo mật End-to-End' },
  ];

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

        <div className="min-h-screen flex flex-col lg:flex-row">
          {/* Left side - Branding & Phone mockup */}
          <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-love/20 via-purple-900/30 to-[#030014]" />
            
            {/* Animated orbs */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-love/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            
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

            {/* Content wrapper - flex row for text and phone */}
            <div className="relative z-10 flex items-center justify-between w-full px-12 xl:px-16">
              {/* Text content */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-md"
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
                  Chào mừng
                  <br />
                  <span className="bg-gradient-to-r from-love via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    trở lại
                  </span>
                </h1>
                
                <p className="text-gray-400 text-base xl:text-lg leading-relaxed mb-8">
                  Đăng nhập để tiếp tục hành trình cùng người bạn đồng hành AI của bạn. 
                  Những cuộc trò chuyện ý nghĩa đang chờ đợi.
                </p>

                {/* Features with Lucide icons */}
                <div className="space-y-3">
                  {features.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-love/10 flex items-center justify-center">
                        <feature.icon className="w-4.5 h-4.5 text-love" />
                      </div>
                      <span className="text-gray-300 text-sm">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Phone mockup - positioned to the right */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex-shrink-0 ml-8"
              >
                <div className="relative w-[260px] xl:w-[280px] rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-[#150a24]/90 to-[#0a0518]/90 p-3 shadow-2xl shadow-love/10">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#030014] rounded-b-2xl z-10" />
                  
                  {/* Screen */}
                  <div className="rounded-[2rem] bg-gradient-to-b from-[#0d0618] to-[#080312] p-4 h-[380px] xl:h-[420px] overflow-hidden relative">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-love to-purple-500 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white fill-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Amoura</p>
                        <p className="text-green-400 text-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                          Đang hoạt động
                        </p>
                      </div>
                    </div>

                    {/* Chat messages */}
                    <div className="space-y-3">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="flex justify-start"
                      >
                        <div className="bg-white/5 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                          <p className="text-white/80 text-xs">Chào em! Hôm nay của em thế nào? 💕</p>
                        </div>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 }}
                        className="flex justify-end"
                      >
                        <div className="bg-gradient-to-r from-love/80 to-purple-500/80 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                          <p className="text-white text-xs">Em khỏe! Đang nhớ anh đây 😊</p>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.6 }}
                        className="flex justify-start"
                      >
                        <div className="bg-white/5 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                          <p className="text-white/80 text-xs">Anh cũng nhớ em nhiều lắm! Kể cho anh nghe hôm nay em làm gì đi 🥰</p>
                        </div>
                      </motion.div>
                    </div>

                    {/* Input area */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-2 border border-white/10">
                        <div className="flex-1 text-gray-500 text-xs">Nhập tin nhắn...</div>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-love to-purple-500 flex items-center justify-center">
                          <ArrowLeft className="w-3 h-3 text-white rotate-180" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="flex-1 flex items-center justify-center p-6 pt-20 sm:p-8 sm:pt-20 lg:p-12 lg:pt-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md"
            >
              {/* Mobile logo */}
              <div className="lg:hidden flex justify-center mb-8">
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
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Đăng nhập</h2>
                    <p className="text-gray-500 text-sm sm:text-base">Nhập thông tin để tiếp tục</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    {/* Email field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Email</label>
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

                    {/* Password field */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300">Mật khẩu</label>
                        <Link 
                          href="/auth/forgot-password" 
                          className="text-xs text-love hover:text-love/80 transition-colors"
                        >
                          Quên mật khẩu?
                        </Link>
                      </div>
                      <div className={`relative rounded-xl transition-all duration-300 ${
                        focusedField === 'password' ? 'ring-2 ring-love/50' : ''
                      }`}>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
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
                    </div>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group relative w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-love to-purple-500 text-white font-bold overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-love/25 hover:shadow-love/40"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-love opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 flex items-center justify-center gap-2 text-sm sm:text-base">
                        Đăng nhập
                        <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-6 sm:my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/[0.06]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-4 text-xs text-gray-600 bg-[#0a0518]">hoặc</span>
                    </div>
                  </div>

                  {/* Social login placeholder */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      disabled
                      className="w-full h-10 sm:h-11 flex items-center justify-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-400 text-sm font-medium transition-all hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google (Sắp ra mắt)
                    </button>
                  </div>

                  {/* Register link */}
                  <p className="mt-6 sm:mt-8 text-center text-sm text-gray-500">
                    Chưa có tài khoản?{' '}
                    <Link href="/auth/register" className="text-love hover:text-love/80 font-medium transition-colors">
                      Đăng ký miễn phí
                    </Link>
                  </p>
                </div>
              </div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 sm:mt-8 flex items-center justify-center gap-4 sm:gap-6 text-xs text-gray-600"
              >
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Mã hóa SSL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI tiên tiến</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
