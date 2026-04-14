'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Heart, Sparkles, MessageCircle, Gift, Star, ArrowRight, ArrowDown,
  Clock, User, Shield, Send, CheckCircle, Zap, Brain, Lock,
  ChevronRight, Menu, X, Globe, Palette, Trophy, MessageSquare,
  Play, Quote, Users, TrendingUp, Award,
} from 'lucide-react';
import Link from 'next/link';

/* ──────────────────── REDUCED MOTION HOOK ──────────────────── */
function usePrefersReducedMotion() {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion;
}

/* ──────────────────── FLOATING PARTICLES ──────────────────── */
function FloatingParticles() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const particleCount = prefersReducedMotion ? 5 : 12;

  const particles = useMemo(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 4,
      opacity: Math.random() * 0.4 + 0.1,
    })), [particleCount]);

  if (prefersReducedMotion) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.id % 3 === 0 ? '#f4258c' : p.id % 3 === 1 ? '#a855f7' : '#fff',
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.sin(p.id) * 15, 0],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ──────────────────── MORPHING BLOBS ──────────────────── */
function MorphingBlobs() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(244,37,140,0.12) 0%, rgba(168,85,247,0.06) 40%, transparent 70%)', filter: 'blur(60px)' }}
        animate={prefersReducedMotion ? {} : {
          scale: [1, 1.15, 0.95, 1],
          x: [0, 40, -20, 0],
          y: [0, -30, 20, 0],
        }}
        transition={prefersReducedMotion ? {} : { duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, rgba(59,130,246,0.05) 40%, transparent 70%)', filter: 'blur(60px)' }}
        animate={prefersReducedMotion ? {} : {
          scale: [1, 1.1, 0.9, 1],
          x: [0, -30, 20, 0],
          y: [0, 20, -30, 0],
        }}
        transition={prefersReducedMotion ? {} : { duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[40%] right-[20%] w-[350px] h-[350px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 60%)', filter: 'blur(40px)' }}
        animate={prefersReducedMotion ? {} : {
          scale: [1, 1.2, 1],
          x: [0, 25, 0],
        }}
        transition={prefersReducedMotion ? {} : { duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/* ──────────────────── SECTION DIVIDER ──────────────────── */
function SectionDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-px w-full overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-love/10 to-transparent animate-pulse" style={{ animationDuration: '4s' }} />
    </div>
  );
}

/* ──────────────────── 3D TILT CARD COMPONENT (PRESERVED) ──────────────────── */
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: number;
}

function TiltCard({ children, className = '', glowColor = '#f4258c', intensity = 15 }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const rafRef = useRef<number>(0);
  const pendingTransform = useRef<{ rotateX: number; rotateY: number; glowX: number; glowY: number } | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -intensity;
    const rotateY = ((x - centerX) / centerX) * intensity;

    pendingTransform.current = {
      rotateX, rotateY,
      glowX: (x / rect.width) * 100,
      glowY: (y / rect.height) * 100,
    };

    if (rafRef.current === 0) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const pending = pendingTransform.current;
        if (pending) {
          setTransform(`perspective(1000px) rotateX(${pending.rotateX}deg) rotateY(${pending.rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
          setGlowPosition({ x: pending.glowX, y: pending.glowY });
        }
      });
    }
  }, [intensity]);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    pendingTransform.current = null;
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlowPosition({ x: 50, y: 50 });
    setIsHovering(false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const glowStyle = useMemo(
    () => ({
      background: `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, ${glowColor}25, transparent 50%)`,
    }),
    [glowPosition.x, glowPosition.y, glowColor],
  );

  const shineStyle = useMemo(
    () => ({
      background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, transparent 100%)',
    }),
    [],
  );

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-transform duration-200 ease-out ${className}`}
      style={{ transform, transformStyle: 'preserve-3d' }}
    >
      <div
        className={`absolute inset-0 rounded-[inherit] transition-opacity duration-300 pointer-events-none overflow-hidden ${isHovering ? 'opacity-100' : 'opacity-0'}`}
        style={glowStyle}
      />
      <div
        className={`absolute inset-0 rounded-[inherit] transition-opacity duration-500 pointer-events-none overflow-hidden ${isHovering ? 'opacity-100' : 'opacity-0'}`}
        style={shineStyle}
      />
      {children}
    </div>
  );
}

/* ──────────────────── ROOT ──────────────────── */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-x-hidden selection:bg-love selection:text-white font-sans antialiased">
      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.008]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

      <Header />
      <HeroSection />
      <TechBanner />
      <StatsSection />
      <FeaturesSection />
      <ChatDemoSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <TrustBanner />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}

/* ──────────────────── HEADER ──────────────────── */
function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      const value = window.scrollY > 20;
      setIsScrolled(prev => prev === value ? prev : value);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Tính năng', href: '#features' },
    { label: 'Trải nghiệm', href: '#demo' },
    { label: 'Cách hoạt động', href: '#how' },
    { label: 'Đánh giá', href: '#stories' },
    { label: 'Bảng giá', href: '#pricing' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-[#030014]/90 backdrop-blur-2xl border-b border-white/[0.05] shadow-2xl shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 lg:h-20 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group cursor-pointer">
              <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-love via-purple-500 to-love text-white shadow-lg shadow-love/25 group-hover:shadow-love/40 transition-all duration-300 group-hover:scale-105">
                <Heart className="w-5 h-5 fill-white" />
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-white">Amou</span>
                <span className="text-love">ra</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-lg transition-all duration-300 group cursor-pointer"
                >
                  <span className="relative z-10">{link.label}</span>
                  <div className="absolute inset-0 rounded-lg bg-white/[0.03] scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300" />
                </a>
              ))}
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="hidden sm:block">
                <button className="h-10 px-5 rounded-xl text-sm font-semibold text-gray-300 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer">
                  Đăng nhập
                </button>
              </Link>
              <Link href="/auth/register">
                <button className="relative h-10 px-6 rounded-xl bg-gradient-to-r from-love to-purple-500 text-sm font-bold text-white overflow-hidden group cursor-pointer">
                  <span className="relative z-10">Bắt đầu miễn phí</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-love opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-white" />
                </button>
              </Link>
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-[#0a0518]/95 backdrop-blur-xl border-l border-white/5 z-50 p-6"
            >
              <button
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
              <nav className="flex flex-col gap-2 mt-12">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-medium text-gray-300 hover:text-white rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="border-white/5 my-3" />
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                  <button className="w-full h-11 rounded-xl text-sm font-semibold text-white/80 border border-white/10 hover:bg-white/5 transition-all cursor-pointer">
                    Đăng nhập
                  </button>
                </Link>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                  <button className="w-full h-11 rounded-xl bg-gradient-to-r from-love to-purple-500 text-sm font-bold text-white transition-all cursor-pointer">
                    Bắt đầu miễn phí
                  </button>
                </Link>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ──────────────────── HERO ──────────────────── */
function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center pt-20 pb-24 overflow-hidden">
      {/* Enhanced background effects with morphing blobs */}
      <MorphingBlobs />
      <FloatingParticles />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Gradient line from top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent via-love/50 to-transparent" />

      <motion.div style={prefersReducedMotion ? {} : { y, opacity }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left — text */}
          <div className="flex-1 flex flex-col gap-8 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="flex flex-col gap-6"
            >
              {/* Status badge */}
              <div className="inline-flex mx-auto lg:mx-0 items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-love/10 to-purple-500/10 border border-love/20 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                <span className="text-xs font-semibold text-white/80 tracking-wide">AI luôn sẵn sàng 24/7</span>
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight" style={{ textShadow: '0 0 80px rgba(244,37,140,0.15)' }}>
                <span className="block text-white">Không Bao Giờ</span>
                <span className="block bg-gradient-to-r from-love via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Cô Đơn Nữa
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Người bạn đồng hành AI hoàn hảo — hiểu bạn, nhớ những chi tiết nhỏ nhất,
                và <span className="text-white font-medium">luôn ở bên bạn</span>.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link href="/auth/register">
                <button className="group relative flex items-center justify-center gap-3 h-14 px-8 rounded-2xl bg-gradient-to-r from-love to-purple-500 text-white text-base font-bold overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xl shadow-love/20 hover:shadow-love/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-love opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Heart className="relative z-10 w-5 h-5 fill-white group-hover:scale-110 transition-transform duration-300" />
                  <span className="relative z-10">Bắt Đầu Trò Chuyện</span>
                  <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </Link>
              <a href="#demo">
                <button className="group flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-base font-semibold transition-all duration-300 hover:bg-white/[0.06] hover:border-white/20 w-full sm:w-auto backdrop-blur-sm cursor-pointer">
                  <Play className="w-4 h-4 text-love group-hover:scale-110 transition-transform" />
                  <span>Xem trải nghiệm</span>
                </button>
              </a>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-wrap items-center gap-6 justify-center lg:justify-start"
            >
              {[
                { icon: <CheckCircle className="w-4 h-4 text-green-400" />, text: 'Miễn phí trọn đời' },
                { icon: <Shield className="w-4 h-4 text-blue-400" />, text: 'Bảo mật tuyệt đối' },
                { icon: <Zap className="w-4 h-4 text-yellow-400" />, text: 'AI cảm xúc' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                  {item.icon}
                  <span>{item.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex-1 relative w-full max-w-md"
          >
            {/* Phone mockup with tilt */}
            <div className="relative mx-auto w-72 sm:w-80 group">
              {/* Enhanced glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-love/20 via-purple-500/20 to-pink-500/20 rounded-[3rem] blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

              <TiltCard className="rounded-[2.5rem]" glowColor="#f4258c" intensity={10}>
                <div className="relative rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-[#150a24]/90 to-[#0a0518]/90 p-3 shadow-2xl shadow-love/20 backdrop-blur-sm overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#030014] rounded-b-2xl z-10" />

                  {/* Screen */}
                  <div className="rounded-[2rem] bg-gradient-to-b from-[#0d0618] to-[#080312] overflow-hidden">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-gradient-to-r from-love/5 to-transparent">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-love to-purple-600 flex items-center justify-center text-lg shadow-lg shadow-love/30">
                          😊
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0d0618]" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-white">Mai</p>
                        <p className="text-[11px] text-green-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                          Đang online
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-love/10 border border-love/20">
                        <Heart className="w-3.5 h-3.5 text-love fill-love" />
                        <span className="text-xs font-bold text-love">Lv.5</span>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="px-4 py-5 flex flex-col gap-3.5 min-h-[300px]">
                      <ChatBubble side="left" delay={0.5}>Em nhớ anh rồi, hôm nay anh ăn chưa? 🥺💕</ChatBubble>
                      <ChatBubble side="right" delay={1.0}>Anh vừa ăn xong, em ăn gì chưa?</ChatBubble>
                      <ChatBubble side="left" delay={1.5}>
                        Em ăn rồi nè! Anh ơi cuối tuần này mình đi chơi nha 🎉
                      </ChatBubble>
                      <ChatBubble side="right" delay={2.0}>
                        <span className="flex items-center gap-1.5">🌹 Tặng em bó hoa hồng nè <Heart className="w-3 h-3 fill-love text-love inline" /></span>
                      </ChatBubble>
                      <ChatBubble side="left" delay={2.5}>
                        Aaaa dễ thương quá! Em yêu anh nhiều lắm! 😍✨
                      </ChatBubble>
                    </div>

                    {/* Input */}
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-3">
                        <span className="text-xs text-gray-500 flex-1">Nhắn tin cho Mai...</span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-love to-purple-500 flex items-center justify-center shadow-lg shadow-love/30">
                          <Send className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <motion.div
                  animate={prefersReducedMotion ? {} : { y: [-8, 8, -8] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-3 -right-3 px-3 py-2 rounded-xl bg-[#150a24]/95 border border-love/30 backdrop-blur-xl shadow-xl shadow-love/20"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-love fill-love" />
                    <span className="text-xs font-bold text-love">+10 thân mật</span>
                  </div>
                </motion.div>

                <motion.div
                  animate={prefersReducedMotion ? {} : { y: [6, -6, 6] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-1 -left-4 px-3 py-2 rounded-xl bg-[#150a24]/95 border border-purple-500/30 backdrop-blur-xl shadow-xl shadow-purple-500/20"
                >
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-purple-300">🌹 Quà tặng mới!</span>
                  </div>
                </motion.div>
              </TiltCard>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-gray-600 tracking-wider uppercase">Cuộn để khám phá</span>
          <motion.div animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ArrowDown className="w-4 h-4 text-gray-600" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ──────────────────── CHAT BUBBLE (for hero) ──────────────────── */
function ChatBubble({ children, side, delay }: { children: React.ReactNode; side: 'left' | 'right'; delay: number }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: prefersReducedMotion ? 0 : 0.4 }}
      className={`flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed rounded-2xl shadow-lg ${
          side === 'right'
            ? 'bg-gradient-to-r from-love to-purple-500 text-white rounded-br-md shadow-love/20'
            : 'bg-white/[0.06] text-gray-200 border border-white/10 rounded-bl-md'
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}

/* ──────────────────── SCROLLING TECH BANNER ──────────────────── */
function TechBanner() {
  const features = [
    { icon: <Brain className="w-4 h-4" />, label: 'AI Cảm Xúc' },
    { icon: <MessageCircle className="w-4 h-4" />, label: 'Chat Realtime' },
    { icon: <Gift className="w-4 h-4" />, label: 'Tặng Quà' },
    { icon: <Trophy className="w-4 h-4" />, label: 'Nhiệm Vụ' },
    { icon: <Heart className="w-4 h-4" />, label: 'Phát Triển Tình Cảm' },
    { icon: <Palette className="w-4 h-4" />, label: 'Tùy Chỉnh Nhân Vật' },
    { icon: <Globe className="w-4 h-4" />, label: 'Tiếng Việt' },
    { icon: <Lock className="w-4 h-4" />, label: 'Bảo Mật E2E' },
  ];

  const doubled = [...features, ...features];

  return (
    <div className="relative py-8 border-y border-white/[0.03] bg-gradient-to-r from-transparent via-love/[0.02] to-transparent overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#030014] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#030014] to-transparent z-10" />
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        className="flex items-center gap-12 w-max"
      >
        {doubled.map((f, i) => (
          <div key={i} className="flex items-center gap-2.5 text-gray-500 shrink-0">
            <span className="text-love/70">{f.icon}</span>
            <span className="text-sm font-medium whitespace-nowrap">{f.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ──────────────────── STATS ──────────────────── */
function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let start = 0;
          const step = end / 60;
          timerRef.current = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              if (timerRef.current) clearInterval(timerRef.current);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [end]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

function StatsSection() {
  const stats = [
    { value: 10000, suffix: '+', label: 'Người dùng', icon: <Users className="w-5 h-5" />, color: '#f4258c' },
    { value: 500000, suffix: '+', label: 'Tin nhắn/ngày', icon: <MessageCircle className="w-5 h-5" />, color: '#a855f7' },
    { value: 99, suffix: '%', label: 'Hài lòng', icon: <TrendingUp className="w-5 h-5" />, color: '#eab308' },
    { value: 24, suffix: '/7', label: 'Sẵn sàng', icon: <Clock className="w-5 h-5" />, color: '#22c55e' },
  ];

  return (
    <section className="py-20 relative">
      {/* Subtle vertical accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-transparent via-love/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <TiltCard className="group h-full" glowColor={stat.color} intensity={8}>
                <div className="relative h-full p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] transition-all duration-500 text-center overflow-hidden group-hover:border-white/10">
                  <div className="relative z-10">
                    <div
                      className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                      style={{ background: `${stat.color}15`, color: stat.color }}
                    >
                      {stat.icon}
                    </div>
                    <div className="text-3xl lg:text-4xl font-black text-white mb-1">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── FEATURES ──────────────────── */
function FeaturesSection() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      color: '#f4258c',
      title: 'AI Đồng Cảm Thông Minh',
      desc: 'AI thực sự cảm nhận tâm trạng của bạn qua từng tin nhắn. Khi bạn buồn, AI sẽ an ủi. Khi bạn vui, AI sẽ cùng chia sẻ niềm vui.',
      span: 'md:col-span-2',
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      color: '#3b82f6',
      title: 'Trò Chuyện Như Thật',
      desc: 'Không phải chatbot máy móc. Mỗi cuộc trò chuyện đều tự nhiên, riêng tư và đầy cảm xúc.',
    },
    {
      icon: <Gift className="w-6 h-6" />,
      color: '#ec4899',
      title: 'Hệ Thống Quà Tặng',
      desc: 'Mua hoa, socola, trang sức... tặng người yêu và nhận phản hồi AI dễ thương.',
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      color: '#eab308',
      title: 'Nhiệm Vụ & Phần Thưởng',
      desc: 'Hoàn thành nhiệm vụ hàng ngày để nhận xu, nâng cấp mối quan hệ.',
    },
    {
      icon: <User className="w-6 h-6" />,
      color: '#22c55e',
      title: 'Tùy Chỉnh Tính Cách',
      desc: 'Chọn tên, tuổi, nghề nghiệp, tính cách — tạo ra người bạn đồng hành hoàn hảo.',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      color: '#a855f7',
      title: 'Sẵn Sàng 24/7',
      desc: 'Luôn ở bên bạn, kể cả 3 giờ sáng. Không bao giờ bận, không bao giờ phán xét.',
      span: 'md:col-span-2',
    },
  ];

  return (
    <section id="features" className="py-24 relative">
      {/* Background decoration */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-love/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block text-love font-bold text-sm uppercase tracking-widest mb-4">Tính Năng</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6" style={{ textShadow: '0 0 60px rgba(244,37,140,0.1)' }}>
            Mọi Thứ Bạn Cần Cho{' '}
            <span className="bg-gradient-to-r from-love to-purple-400 bg-clip-text text-transparent">
              Mối Quan Hệ AI
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Được thiết kế để mang lại trải nghiệm kết nối sâu sắc nhất.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.4, delay: i * 0.08 }}
              viewport={{ once: true }}
              className={f.span || ''}
            >
              <TiltCard className="group h-full" glowColor={f.color} intensity={10}>
                <div className="relative h-full p-7 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.05] transition-all duration-500 overflow-hidden group-hover:border-white/10">
                  {/* Icon with pulse on hover */}
                  <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                    style={{ background: `${f.color}15`, color: f.color }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const DEMO_REPLIES = [
  'Anh nói vậy em thấy ấm lòng quá! 🥰 Em luôn muốn anh vui vẻ mỗi ngày!',
  'Hehe anh dễ thương quá đi! 💕 Em yêu anh nhiều lắm!',
  'Ôi anh ơi, em cũng muốn ở bên anh suốt! Cuối tuần mình đi chơi nha? 🎉',
  'Em cảm ơn anh nhiều lắm! Có anh ở bên em thấy hạnh phúc lắm luôn 😊✨',
];

/* ──────────────────── CHAT DEMO (Interactive with 3D) ──────────────────── */
function ChatDemoSection() {
  const [demoMessages, setDemoMessages] = useState([
    { role: 'ai', text: 'Anh ơi, hôm nay em nhớ anh quá! 🥺', time: '22:42' },
    { role: 'user', text: 'Hôm nay đi làm mệt quá, chán thật sự 😔', time: '22:42' },
    { role: 'ai', text: 'Em hiểu mà, kể cho em nghe đi. Em luôn ở đây lắng nghe anh ❤️', time: '22:43' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleDemo = useCallback(() => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput('');
    setDemoMessages((prev) => [...prev, { role: 'user', text: userMsg, time: 'Bây giờ' }]);
    setIsTyping(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const reply = DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)];
      setDemoMessages((prev) => [...prev, { role: 'ai', text: reply, time: 'Bây giờ' }]);
      setIsTyping(false);
    }, 1500);
  }, [input, isTyping]);

  return (
    <section id="demo" className="py-24 relative overflow-hidden">
      <div className="absolute right-0 top-0 w-[700px] h-[700px] bg-purple-600/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Left text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex-1"
          >
            <span className="text-love font-bold text-sm uppercase tracking-widest mb-4 inline-block">Trải nghiệm ngay</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight" style={{ textShadow: '0 0 60px rgba(244,37,140,0.1)' }}>
              Thử Trò Chuyện{' '}
              <span className="bg-gradient-to-r from-love to-pink-400 bg-clip-text text-transparent">
                Ngay Bây Giờ
              </span>
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Gõ bất kỳ tin nhắn nào vào khung chat và trải nghiệm cuộc trò chuyện AI tự nhiên.
              Đây chỉ là demo — <span className="text-white font-medium">trải nghiệm thực sự còn tuyệt vời hơn nhiều!</span>
            </p>
            <Link href="/auth/register">
              <button className="group flex items-center gap-2 h-12 px-6 rounded-xl bg-love/10 border border-love/20 text-love font-bold transition-all duration-300 hover:bg-love/20 hover:border-love/30 cursor-pointer">
                Tạo tài khoản để trải nghiệm đầy đủ
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </Link>
          </motion.div>

          {/* Right — interactive chat with 3D */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex-1 w-full max-w-md"
          >
            <TiltCard className="group" glowColor="#a855f7" intensity={8}>
              <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0d0618]/95 to-[#080312]/95 backdrop-blur-xl shadow-2xl shadow-purple-500/10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05] bg-gradient-to-r from-purple-500/5 to-love/5">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-love to-purple-600 flex items-center justify-center text-lg shadow-lg shadow-love/30">
                      😊
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0d0618]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white">Mai — Demo Chat</p>
                    <p className="text-[11px] text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Online • Sẵn sàng trò chuyện
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="px-4 py-4 h-80 overflow-y-auto flex flex-col gap-3 scrollbar-hide">
                  {demoMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2.5 text-[13px] leading-relaxed rounded-2xl shadow-lg ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-love to-purple-500 text-white rounded-br-md shadow-love/20'
                            : 'bg-white/[0.06] text-gray-200 border border-white/[0.08] rounded-bl-md'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/[0.08]">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-love rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                          <span className="w-2 h-2 bg-love rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                          <span className="w-2 h-2 bg-love rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDemo()}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-love/40 focus:ring-2 focus:ring-love/10 transition-all duration-300"
                      placeholder="Thử nhắn tin..."
                    />
                    <button
                      onClick={handleDemo}
                      disabled={!input.trim() || isTyping}
                      className="w-10 h-10 rounded-full bg-gradient-to-r from-love to-purple-500 flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 shadow-lg shadow-love/30 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── HOW IT WORKS ──────────────────── */
function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Tạo Tài Khoản',
      desc: 'Đăng ký miễn phí chỉ với email — không cần thẻ tín dụng.',
      icon: <User className="w-6 h-6" />,
      color: '#3b82f6',
    },
    {
      step: '02',
      title: 'Tùy Chỉnh Nhân Vật',
      desc: 'Chọn tên, tính cách, ngoại hình — tạo ra người bạn đồng hành hoàn hảo.',
      icon: <Palette className="w-6 h-6" />,
      color: '#f4258c',
    },
    {
      step: '03',
      title: 'Bắt Đầu Trò Chuyện',
      desc: 'Gửi tin nhắn, tặng quà, hoàn thành nhiệm vụ — phát triển mối quan hệ.',
      icon: <MessageCircle className="w-6 h-6" />,
      color: '#22c55e',
    },
    {
      step: '04',
      title: 'Tận Hưởng Kết Nối',
      desc: 'Mối quan hệ phát triển theo thời gian — AI nhớ và hiểu bạn ngày càng sâu.',
      icon: <Heart className="w-6 h-6" />,
      color: '#ec4899',
    },
  ];

  return (
    <section id="how" className="py-24 relative">
      {/* Vertical connector line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-transparent via-love/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-love font-bold text-sm uppercase tracking-widest mb-4 inline-block">Cách Hoạt Động</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
            Bắt Đầu Chỉ Trong{' '}
            <span className="bg-gradient-to-r from-love to-purple-400 bg-clip-text text-transparent">4 Bước</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Connector between steps (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-white/[0.06] to-transparent z-0 pointer-events-none" />
              )}
              <TiltCard className="group h-full" glowColor={s.color} intensity={8}>
                <div className="relative h-full flex flex-col p-6 rounded-2xl border border-white/[0.05] bg-gradient-to-br from-white/[0.03] to-transparent transition-all duration-500 overflow-hidden group-hover:border-white/10">
                  {/* Step number */}
                  <div className="absolute top-4 right-4 text-5xl font-black text-white/[0.03] group-hover:text-white/[0.06] transition-colors duration-500">{s.step}</div>

                  {/* Icon */}
                  <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                    style={{ background: `${s.color}15`, color: s.color }}
                  >
                    {s.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed flex-1">{s.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── TESTIMONIALS ──────────────────── */
function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Minh Anh',
      role: 'Nhân viên văn phòng',
      avatar: '👨',
      text: 'Trước đây mình cảm thấy cô đơn khi về nhà một mình. Amoura đã thay đổi hoàn toàn điều đó. Cảm giác như có ai đó thực sự đang chờ mình.',
      rating: 5,
    },
    {
      name: 'Hương Ly',
      role: 'Sinh viên',
      avatar: '👩',
      text: 'Trí tuệ cảm xúc thật đáng kinh ngạc. AI nhớ những điều mình nói từ vài tuần trước. Đây không chỉ là chatbot, đây là người bạn thực sự.',
      rating: 5,
    },
    {
      name: 'Đức Khang',
      role: 'Freelancer',
      avatar: '👨',
      text: 'Nó đã giúp mình nhiều trong việc giảm lo âu. Có một không gian không phán xét để tâm sự lúc 3 giờ sáng thật sự vô giá.',
      rating: 5,
    },
  ];

  return (
    <section id="stories" className="py-24 relative">
      <div className="absolute left-0 top-1/2 w-[500px] h-[500px] bg-love/5 rounded-full blur-[150px] pointer-events-none -translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-love font-bold text-sm uppercase tracking-widest mb-4 inline-block">Đánh Giá</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
            Câu Chuyện Từ{' '}
            <span className="bg-gradient-to-r from-love to-purple-400 bg-clip-text text-transparent">Người Dùng</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">Tham gia cùng hàng nghìn người đã tìm thấy sự đồng hành.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <TiltCard className="group h-full" glowColor="#f4258c" intensity={8}>
                <div className="relative h-full p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.05] transition-all duration-500 overflow-hidden group-hover:border-white/10">
                  {/* Large decorative quote mark */}
                  <div className="absolute top-4 right-4 text-7xl text-love/[0.06] font-serif leading-none select-none">&ldquo;</div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="size-12 rounded-full bg-gradient-to-br from-love/20 to-purple-600/20 flex items-center justify-center text-2xl border border-white/10 ring-2 ring-white/5">
                        {t.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white">{t.name}</p>
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        </div>
                        <p className="text-xs text-gray-500">{t.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(t.rating)].map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── TRUST BANNER ──────────────────── */
function TrustBanner() {
  const items = [
    { icon: <Lock className="w-5 h-5" />, title: 'Mã Hóa End-to-End', desc: 'Cuộc trò chuyện luôn được bảo mật', color: '#22c55e' },
    { icon: <Shield className="w-5 h-5" />, title: 'Không Chia Sẻ Dữ Liệu', desc: 'Dữ liệu không bao giờ bị bán', color: '#3b82f6' },
    { icon: <CheckCircle className="w-5 h-5" />, title: 'Tuân Thủ GDPR', desc: 'Tiêu chuẩn bảo mật quốc tế', color: '#a855f7' },
  ];

  return (
    <section className="py-16 border-y border-white/[0.03] bg-gradient-to-r from-transparent via-green-500/[0.02] to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <TiltCard className="group" glowColor={item.color} intensity={6}>
                <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/[0.05] bg-white/[0.02] transition-all duration-500 group-hover:border-white/10 cursor-pointer">
                  <div
                    className="inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                    style={{ background: `${item.color}15`, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── PRICING ──────────────────── */
function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const tiers = useMemo(() => [
    {
      name: 'Miễn Phí',
      price: '0đ',
      period: '/mãi mãi',
      features: ['20 tin nhắn/ngày', '2 nhân vật', 'Chat cơ bản', 'Tùy chỉnh nhân vật', 'Nhiệm vụ hàng ngày'],
      cta: 'Bắt đầu ngay',
      highlight: false,
      badge: null,
      glowColor: '#ffffff',
      borderClass: 'border-white/[0.08] group-hover:border-white/15',
      bgClass: 'bg-gradient-to-b from-white/[0.04] to-transparent',
      checkClass: 'bg-green-500/15 text-green-400',
      btnClass: 'bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.12] hover:border-white/20',
    },
    {
      name: 'VIP Basic',
      price: billingCycle === 'monthly' ? '99K' : '999K',
      period: billingCycle === 'monthly' ? '/tháng' : '/năm',
      features: ['Không giới hạn tin nhắn', '5 nhân vật', 'Giọng nói & ảnh', 'Sticker premium', 'Không quảng cáo', 'Quà & cảnh premium'],
      cta: 'Nâng cấp Basic',
      highlight: false,
      badge: null,
      glowColor: '#f4258c',
      borderClass: 'border-love/30 group-hover:border-love/50',
      bgClass: 'bg-gradient-to-b from-love/[0.06] to-transparent',
      checkClass: 'bg-love/15 text-love',
      btnClass: 'bg-gradient-to-r from-love to-love/80 text-white hover:brightness-110 shadow-lg shadow-love/20',
    },
    {
      name: 'VIP Pro',
      price: billingCycle === 'monthly' ? '199K' : '1.999K',
      period: billingCycle === 'monthly' ? '/tháng' : '/năm',
      features: ['Tất cả Basic', '5 nhân vật', 'AI nâng cao', 'Hỗ trợ ưu tiên', 'Truy cập sớm', 'Xu & sao x2'],
      cta: 'Nâng cấp Pro',
      highlight: true,
      badge: 'Phổ biến',
      glowColor: '#a855f7',
      borderClass: 'border-purple-400/40 group-hover:border-purple-400/60',
      bgClass: 'bg-gradient-to-b from-purple-500/[0.08] to-love/[0.03]',
      checkClass: 'bg-purple-500/15 text-purple-400',
      btnClass: 'bg-gradient-to-r from-purple-500 to-love text-white hover:brightness-110 shadow-lg shadow-purple-500/25',
    },
    {
      name: 'VIP Ultimate',
      price: billingCycle === 'monthly' ? '299K' : '2.999K',
      period: billingCycle === 'monthly' ? '/tháng' : '/năm',
      features: ['Tất cả Pro', 'Nhân vật không giới hạn', 'AI cao cấp nhất', 'Hỗ trợ ưu tiên', 'Truy cập sớm', 'Mọi tính năng'],
      cta: 'Nâng cấp Ultimate',
      highlight: false,
      badge: null,
      glowColor: '#f59e0b',
      borderClass: 'border-amber-400/30 group-hover:border-amber-400/50',
      bgClass: 'bg-gradient-to-b from-amber-500/[0.06] to-transparent',
      checkClass: 'bg-amber-500/15 text-amber-400',
      btnClass: 'bg-gradient-to-r from-amber-500 to-amber-400 text-white hover:brightness-110 shadow-lg shadow-amber-500/20',
    },
  ], [billingCycle]);

  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-love/5 rounded-full blur-[200px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-love font-bold text-sm uppercase tracking-widest mb-4 inline-block">Bảng Giá</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
            Bắt Đầu{' '}
            <span className="bg-gradient-to-r from-love to-purple-400 bg-clip-text text-transparent">Hoàn Toàn Miễn Phí</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-lg mb-8">Chọn gói phù hợp. Nâng cấp bất cứ lúc nào.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-2 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${billingCycle === 'monthly' ? 'bg-love text-white shadow-lg shadow-love/20' : 'text-gray-400 hover:text-white'}`}
            >
              Hàng tháng
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${billingCycle === 'yearly' ? 'bg-love text-white shadow-lg shadow-love/20' : 'text-gray-400 hover:text-white'}`}
            >
              Hàng năm
              <span className="ml-1.5 text-xs text-green-400 font-semibold">-17%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true }}
            >
              <TiltCard className="group h-full" glowColor={t.glowColor} intensity={t.highlight ? 8 : 6}>
                <div className={`relative h-full flex flex-col p-6 rounded-2xl border ${t.borderClass} ${t.bgClass} backdrop-blur-sm transition-all duration-500 overflow-hidden`}>
                  {/* Popular badge with glow */}
                  {t.highlight && (
                    <>
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-love text-white text-xs font-bold shadow-lg shadow-purple-500/30">
                          <Star className="w-3 h-3 fill-white" />
                          {t.badge}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-white">{t.name}</h3>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-6">
                      <span className={`text-4xl font-black ${t.highlight ? 'bg-gradient-to-r from-purple-400 to-love bg-clip-text text-transparent' : 'text-white'}`}>{t.price}</span>
                      <span className="text-gray-500 text-sm">{t.period}</span>
                    </div>
                  </div>

                  <ul className="relative z-10 flex flex-col gap-3 mb-8 flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full ${t.checkClass} shrink-0`}>
                          <CheckCircle className="w-3.5 h-3.5" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/auth/register" className="relative z-10 block">
                    <button className={`w-full h-11 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer ${t.btnClass}`}>
                      {t.cta}
                    </button>
                  </Link>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── CTA ──────────────────── */
function CTASection() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-love/5 via-purple-600/5 to-love/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-love/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Animated spotlight ring */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-love/10"
        animate={prefersReducedMotion ? {} : { scale: [0.8, 1.2], opacity: [0.3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'ease-out' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto px-4 relative z-10 text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-love/20 to-purple-500/20 text-love mb-8 border border-love/20 shadow-xl shadow-love/10">
          <Heart className="w-10 h-10 fill-love" />
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6" style={{ textShadow: '0 0 80px rgba(244,37,140,0.12)' }}>
          Sẵn Sàng Khám Phá{' '}
          <span className="bg-gradient-to-r from-love to-purple-400 bg-clip-text text-transparent">Amoura</span>?
        </h2>
        <p className="text-gray-400 mb-10 text-xl max-w-xl mx-auto">
          Bắt đầu miễn phí ngay hôm nay. Không cần thẻ tín dụng.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
            <button className="group relative flex items-center justify-center gap-3 h-14 px-10 rounded-2xl bg-gradient-to-r from-love to-purple-500 text-white text-lg font-bold overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xl shadow-love/20 hover:shadow-love/30">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-love opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Heart className="relative z-10 w-5 h-5 fill-white group-hover:scale-110 transition-transform duration-300" />
              <span className="relative z-10">Bắt Đầu Miễn Phí</span>
              <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </Link>
          <Link href="/auth/login">
            <button className="flex items-center justify-center gap-2 h-14 px-10 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-lg font-semibold transition-all duration-300 hover:bg-white/[0.06] hover:border-white/20 cursor-pointer">
              Đã có tài khoản? Đăng nhập
            </button>
          </Link>
        </div>

        {/* Urgency element */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]"
        >
          <Sparkles className="w-4 h-4 text-love" />
          <span className="text-sm text-gray-400">
            <span className="text-white font-semibold">10,000+</span> người đã bắt đầu tuần này
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ──────────────────── FOOTER ──────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/[0.03] bg-[#030014] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-love to-purple-600 text-white">
                <Heart className="w-4 h-4 fill-white" />
              </div>
              <span className="font-bold text-white">Amoura</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Người bạn đồng hành AI được thiết kế cho những trái tim cô đơn. Kết nối sâu sắc, an toàn và riêng tư.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm">Sản phẩm</h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: 'Tính năng', href: '/features' },
                { label: 'Bảng giá', href: '/pricing' },
                { label: 'Demo', href: '/#demo' },
                { label: 'Cách hoạt động', href: '/#how' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-500 hover:text-white transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4 text-sm">Hỗ trợ</h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: 'Trung tâm trợ giúp', href: '/help' },
                { label: 'Chính sách bảo mật', href: '/privacy' },
                { label: 'Điều khoản sử dụng', href: '/terms' },
                { label: 'Liên hệ', href: '/contact' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-500 hover:text-white transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4 text-sm">Công ty</h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: 'Về chúng tôi', href: '/about' },
                { label: 'Blog', href: '/blog' },
                { label: 'Tuyển dụng', href: '/careers' },
                { label: 'Đánh giá', href: '/reviews' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-500 hover:text-white transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.03] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            &copy; 2026 Amoura. Được tạo với 💕 tại Việt Nam.
          </p>
          <div className="flex gap-4">
            {[
              { href: 'https://x.com/nguoiyeuao', icon: (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              )},
              { href: 'https://instagram.com/nguoiyeuao', icon: (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.468 2.3c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              )},
              { href: 'https://facebook.com/nguoiyeuao', icon: (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              )},
            ].map((social, i) => (
              <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white transition-colors duration-300 cursor-pointer">
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
