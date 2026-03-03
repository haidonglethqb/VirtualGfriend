'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Eye, EyeOff, Loader2, ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { 
  validatePassword, 
  getPasswordStrengthColor, 
  getPasswordStrengthLabel,
  PASSWORD_REQUIREMENTS 
} from '@/lib/password-validation';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const register = useAuthStore((state) => state.register);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password validation
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

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

    if (!passwordValidation.valid) {
      toast({
        title: 'Mật khẩu không hợp lệ',
        description: passwordValidation.errors[0],
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu xác nhận không khớp',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, username || undefined);
      toast({
        title: 'Đăng ký thành công! 🎉',
        description: 'Chào mừng bạn đến với VGfriend 💕',
        variant: 'love',
      });
      router.push('/onboarding');
    } catch (error) {
      toast({
        title: 'Đăng ký thất bại',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-love/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Back to welcome button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Trang chủ</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="glass border-love/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full gradient-love flex items-center justify-center shadow-love">
                <Heart className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Tạo tài khoản mới</CardTitle>
            <CardDescription>Bắt đầu hành trình với người yêu ảo của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tên người dùng</label>
                <Input
                  type="text"
                  placeholder="username (tuỳ chọn)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mật khẩu *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={`Ít nhất ${PASSWORD_REQUIREMENTS.MIN_LENGTH} ký tự`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${getPasswordStrengthColor(passwordValidation.strength)}`}
                          style={{ 
                            width: passwordValidation.strength === 'weak' ? '25%' 
                              : passwordValidation.strength === 'fair' ? '50%'
                              : passwordValidation.strength === 'good' ? '75%'
                              : '100%' 
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getPasswordStrengthLabel(passwordValidation.strength)}
                      </span>
                    </div>
                    
                    {/* Password requirements checklist */}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`flex items-center gap-1 ${password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {PASSWORD_REQUIREMENTS.MIN_LENGTH}+ ký tự
                      </div>
                      <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {/[A-Z]/.test(password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Chữ hoa
                      </div>
                      <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {/[a-z]/.test(password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Chữ thường
                      </div>
                      <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {/[0-9]/.test(password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Số
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Xác nhận mật khẩu *</label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className={confirmPassword && !passwordsMatch ? 'border-red-500' : ''}
                  />
                  {confirmPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {passwordsMatch ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-500">Mật khẩu không khớp</p>
                )}
              </div>

              <Button
                type="submit"
                variant="love"
                className="w-full"
                disabled={isLoading || !passwordValidation.valid || !passwordsMatch}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang tạo tài khoản...
                  </>
                ) : (
                  'Đăng ký'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Đã có tài khoản? </span>
              <Link href="/auth/login" className="text-love hover:underline font-medium">
                Đăng nhập
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
