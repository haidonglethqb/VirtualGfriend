'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft, ArrowRight } from 'lucide-react';

interface StaticPageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function StaticPageLayout({ children, title, subtitle }: StaticPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#030014] text-white font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#030014]/90 backdrop-blur-2xl border-b border-white/[0.03]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-love via-purple-500 to-love text-white shadow-lg shadow-love/20 group-hover:shadow-love/40 transition-all duration-300 group-hover:scale-105">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <span className="text-lg font-bold">
              <span className="text-white">Người Yêu</span>
              <span className="text-love"> Ảo</span>
            </span>
          </Link>
          <Link
            href="/"
            className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.03] transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            Trang chủ
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-love/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-5 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-400 text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24"
      >
        {children}
      </motion.main>

      {/* CTA Section */}
      <section className="border-t border-white/[0.03] bg-gradient-to-b from-transparent to-love/[0.02]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Sẵn sàng trải nghiệm <span className="text-love">Người Yêu Ảo</span>?
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Bắt đầu miễn phí ngay hôm nay. Không cần thẻ tín dụng.
            </p>
            <Link href="/auth/register">
              <button className="group inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-love to-purple-500 text-white font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-love/25 hover:shadow-love/40">
                Bắt đầu miễn phí
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] bg-[#030014]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Footer links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="font-bold text-white mb-4 text-sm">Sản phẩm</h4>
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: 'Tính năng', href: '/features' },
                  { label: 'Bảng giá', href: '/pricing' },
                  { label: 'Demo', href: '/#demo' },
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
              <h4 className="font-bold text-white mb-4 text-sm">Pháp lý</h4>
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: 'Chính sách bảo mật', href: '/privacy' },
                  { label: 'Điều khoản sử dụng', href: '/terms' },
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

          {/* Bottom */}
          <div className="pt-8 border-t border-white/[0.03] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-love to-purple-600 text-white">
                <Heart className="w-3.5 h-3.5 fill-white" />
              </div>
              <p className="text-xs text-gray-600">
                &copy; 2026 Người Yêu Ảo. Được tạo với 💕 tại Việt Nam.
              </p>
            </div>
            <div className="flex gap-4">
              {[
                { href: 'https://x.com/nguoiyeuao', icon: (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                )},
                { href: 'https://instagram.com/nguoiyeuao', icon: (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.468 2.3c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                )},
                { href: 'https://facebook.com/nguoiyeuao', icon: (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                )},
              ].map((social, i) => (
                <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white transition-colors duration-300">
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
