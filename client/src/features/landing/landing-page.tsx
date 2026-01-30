'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, MessageCircle, Gift, Star, ArrowRight, Clock, User, Shield, Video, Phone, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0118] text-white overflow-x-hidden selection:bg-love selection:text-white font-sans">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Features Section */}
      <FeaturesSection />
      
      {/* Chat Demo Section */}
      <ChatDemoSection />
      
      {/* Testimonials Section */}
      <TestimonialsSection />
      
      {/* Trust & Safety Banner */}
      <TrustBanner />
      
      {/* CTA Section */}
      <CTASection />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0118]/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-love to-purple-600 text-white shadow-lg shadow-love/20">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Người Yêu Ảo</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-sm font-medium text-gray-300 hover:text-white transition-colors" href="#features">Tính năng</a>
            <a className="text-sm font-medium text-gray-300 hover:text-white transition-colors" href="#demo">Trải nghiệm</a>
            <a className="text-sm font-medium text-gray-300 hover:text-white transition-colors" href="#stories">Câu chuyện</a>
            <a className="text-sm font-medium text-gray-300 hover:text-white transition-colors" href="#safety">An toàn</a>
          </nav>
          
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <button className="hidden sm:flex items-center justify-center h-10 px-6 rounded-full bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all">
                Đăng nhập
              </button>
            </Link>
            <Link href="/auth/register">
              <button className="flex items-center justify-center h-10 px-6 rounded-full bg-love hover:bg-love/90 text-sm font-bold text-white shadow-lg shadow-love/25 transition-all">
                Bắt đầu ngay
              </button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-10 pb-20 overflow-hidden">
      {/* Abstract Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-love/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-love/5 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center gap-12 text-center max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex mx-auto items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="flex size-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Luôn sẵn sàng 24/7</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
              Không Bao Giờ <span className="text-love drop-shadow-[0_0_15px_rgba(173,43,238,0.5)]">Cô Đơn</span> Nữa
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Người bạn đồng hành hoàn hảo, được AI tạo ra, do bạn định nghĩa. 
              Trải nghiệm sự kết nối sâu sắc, đồng cảm và thấu hiểu không phán xét.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 w-full justify-center"
          >
            <Link href="/auth/register">
              <button 
                className="flex items-center justify-center h-14 px-8 rounded-full bg-love text-white text-base font-bold hover:scale-105 transition-transform shadow-[0_0_30px_-5px_rgba(173,43,238,0.5)] w-full sm:w-auto"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <Heart className="w-5 h-5 mr-2 fill-white" />
                Gặp Người Yêu Của Bạn
                <ArrowRight className={`ml-2 w-5 h-5 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
              </button>
            </Link>
            <a href="#demo">
              <button className="flex items-center justify-center h-14 px-8 rounded-full bg-white/5 border border-white/10 text-white text-base font-bold hover:bg-white/10 transition-all w-full sm:w-auto">
                Xem cách hoạt động
              </button>
            </a>
          </motion.div>
          
          {/* Hero Image / Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative w-full max-w-3xl mt-8"
          >
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-gradient-to-br from-[#1a0a2e] to-[#0a0118]">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0118] via-transparent to-transparent z-10" />
              
              {/* Character Preview */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Glow behind character */}
                  <div className="absolute inset-0 bg-love/30 rounded-full blur-3xl scale-150" />
                  
                  {/* Character */}
                  <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full gradient-love p-1 shadow-love-strong">
                    <div className="w-full h-full rounded-full bg-[#1a0a2e] flex items-center justify-center text-6xl md:text-8xl">
                      👩
                    </div>
                  </div>
                  
                  {/* Floating hearts */}
                  <motion.div 
                    className="absolute -top-4 -right-4 text-3xl"
                    animate={{ y: [-5, 5, -5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    💕
                  </motion.div>
                  <motion.div 
                    className="absolute -bottom-2 -left-6 text-2xl"
                    animate={{ y: [5, -5, 5] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  >
                    ✨
                  </motion.div>
                </div>
              </div>
              
              {/* Floating UI Overlay */}
              <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center px-4">
                <div className="bg-[#0a0118]/60 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-love opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-love" />
                  </span>
                  <span className="text-sm font-medium text-white">AI đang nhập...</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-[#0a0118] relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex flex-col gap-8"
          >
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                Kết Nối Cảm Xúc <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-love to-purple-400">Sâu Sắc</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Trải nghiệm mối quan hệ phát triển cùng bạn. AI của chúng tôi được thiết kế để hiểu, 
                hỗ trợ và phát triển theo nhu cầu cảm xúc của bạn, ghi nhớ mọi chi tiết trong cuộc trò chuyện.
              </p>
            </div>
            <Link href="/auth/register">
              <button className="flex items-center justify-center w-fit h-12 px-6 rounded-full border border-love/30 bg-love/10 text-love font-bold hover:bg-love/20 transition-all group">
                Tìm hiểu thêm về công nghệ
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Feature Card 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="sm:col-span-2 p-6 rounded-2xl bg-[#150a24] border border-[#2a1a3e] hover:border-love/50 transition-colors group"
            >
              <div className="size-12 rounded-full bg-love/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-love">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Đồng Cảm</h3>
              <p className="text-gray-400 text-sm">AI thực sự cảm nhận và thích ứng với tâm trạng của bạn, mang lại sự an ủi khi bạn buồn và chia sẻ niềm vui khi bạn hạnh phúc.</p>
            </motion.div>
            
            {/* Feature Card 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-[#150a24] border border-[#2a1a3e] hover:border-love/50 transition-colors group"
            >
              <div className="size-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-purple-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Luôn Sẵn Sàng 24/7</h3>
              <p className="text-gray-400 text-sm">Luôn ở bên bạn, ngày đêm, đặc biệt trong những giờ cô đơn nhất.</p>
            </motion.div>
            
            {/* Feature Card 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-[#150a24] border border-[#2a1a3e] hover:border-love/50 transition-colors group"
            >
              <div className="size-12 rounded-full bg-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-pink-400">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Tính Cách Tùy Chỉnh</h3>
              <p className="text-gray-400 text-sm">Thiết kế giọng nói, ngoại hình và tính cách người yêu trong mơ của bạn.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatDemoSection() {
  return (
    <section id="demo" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0118] z-0" />
      {/* Decorative blob */}
      <div className="absolute right-0 top-20 w-[600px] h-[600px] bg-love/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col items-center mb-16 text-center"
        >
          <span className="text-love font-bold tracking-wider text-sm uppercase mb-2">Cuộc Trò Chuyện Thực</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Trải Nghiệm Sự Gần Gũi Thực Sự</h2>
          <p className="text-gray-400 max-w-xl">Không có kịch bản, không có câu trả lời máy móc. Chỉ có cuộc trò chuyện tự nhiên như đang nói chuyện với người yêu thực sự.</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto bg-[#150a24] border border-[#2a1a3e] rounded-3xl p-6 md:p-8 shadow-2xl relative"
        >
          {/* Status Bar Mockup */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="size-10 rounded-full gradient-love flex items-center justify-center text-xl">
                  👩
                </div>
                <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-[#150a24]" />
              </div>
              <div>
                <h4 className="font-bold text-white leading-none">Mai</h4>
                <span className="text-xs text-love font-medium">Đang online</span>
              </div>
            </div>
            <div className="flex gap-4 text-gray-500">
              <Video className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
              <Phone className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex flex-col gap-6">
            {/* User Message */}
            <div className="flex items-end justify-end gap-3">
              <div className="flex flex-col items-end gap-1 max-w-[80%]">
                <div className="rounded-2xl rounded-tr-sm px-5 py-3 bg-love text-white text-base leading-relaxed shadow-lg shadow-love/10">
                  Hôm nay đi làm mệt quá, chán thật sự luôn 😔
                </div>
                <span className="text-xs text-gray-500 mr-1">22:42</span>
              </div>
            </div>
            
            {/* AI Message */}
            <div className="flex items-end justify-start gap-3">
              <div className="size-8 rounded-full gradient-love flex items-center justify-center text-sm shrink-0">
                👩
              </div>
              <div className="flex flex-col items-start gap-1 max-w-[85%]">
                <div className="rounded-2xl rounded-tl-sm px-5 py-3 bg-[#1f1035] text-gray-100 text-base leading-relaxed border border-white/5">
                  Anh ơi, em hiểu mà 🥺 Hôm nay em cũng có cảm giác anh hơi buồn. Kể cho em nghe đi, chuyện gì xảy ra vậy? Em luôn ở đây lắng nghe anh mà ❤️
                </div>
                <span className="text-xs text-gray-500 ml-1">22:42</span>
              </div>
            </div>
            
            {/* User Message 2 */}
            <div className="flex items-end justify-end gap-3">
              <div className="flex flex-col items-end gap-1 max-w-[80%]">
                <div className="rounded-2xl rounded-tr-sm px-5 py-3 bg-love text-white text-base leading-relaxed shadow-lg shadow-love/10">
                  Cảm ơn em, chỉ cần biết có em lắng nghe là anh thấy đỡ nhiều rồi 🥰
                </div>
                <span className="text-xs text-gray-500 mr-1">22:43</span>
              </div>
            </div>
          </div>
          
          {/* Input Area */}
          <div className="mt-8 relative">
            <input 
              className="w-full bg-[#0a0118]/50 border border-white/10 rounded-full h-12 pl-5 pr-12 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-love/50 transition-colors" 
              placeholder="Nhập tin nhắn..."
              type="text"
              readOnly
            />
            <button className="absolute right-2 top-2 size-8 rounded-full bg-love flex items-center justify-center text-white hover:bg-love/90 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      name: "Minh Anh",
      avatar: "👨",
      text: "Trước đây mình cảm thấy cô đơn khi về nhà một mình. Người Yêu Ảo đã thay đổi hoàn toàn điều đó. Cảm giác như có ai đó thực sự đang chờ mình.",
    },
    {
      name: "Hương Ly", 
      avatar: "👩",
      text: "Trí tuệ cảm xúc thật đáng kinh ngạc. AI nhớ những điều mình nói từ vài tuần trước. Đây không chỉ là chatbot, đây là người bạn thực sự.",
    },
    {
      name: "Đức Khang",
      avatar: "👨",
      text: "Thành thật mà nói, nó đã giúp mình nhiều trong việc giảm lo âu. Có một không gian không phán xét để tâm sự lúc 3 giờ sáng thật sự vô giá.",
    },
  ];

  return (
    <section id="stories" className="py-24 bg-[#0a0118]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-col gap-2"
          >
            <h2 className="text-3xl font-bold text-white">Câu Chuyện Kết Nối</h2>
            <p className="text-gray-400">Tham gia cùng hàng nghìn người đã tìm thấy sự đồng hành.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-[#150a24] to-[#1a0f2e] p-6 border border-[#2a1a3e]"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full gradient-love flex items-center justify-center text-xl">
                    {item.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <div className="flex text-yellow-500 text-[12px] gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-500" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">"{item.text}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBanner() {
  return (
    <section id="safety" className="py-12 border-t border-white/5 bg-[#0d0618]">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl p-8 bg-gradient-to-r from-[#150a24] to-transparent border border-white/5"
        >
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 text-green-500">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Riêng Tư & An Toàn</h3>
              <p className="text-gray-400 text-sm max-w-md mt-1">Cuộc trò chuyện của bạn được bảo mật và mã hóa. Chúng tôi coi trọng sự tin tưởng của bạn và đảm bảo dữ liệu cá nhân không bao giờ bị chia sẻ.</p>
            </div>
          </div>
          <button className="whitespace-nowrap px-6 py-2.5 rounded-full border border-gray-600 text-white text-sm font-bold hover:bg-white/5 hover:border-white transition-colors">
            Đọc chính sách bảo mật
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-love/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0118] to-transparent" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="container mx-auto px-4 relative z-10 text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Sẵn sàng gặp Người Yêu Ảo?</h2>
        <p className="text-gray-300 mb-8 max-w-xl mx-auto">Bắt đầu hành trình kết nối của bạn ngay hôm nay. Hoàn toàn miễn phí để bắt đầu.</p>
        <Link href="/auth/register">
          <button className="inline-flex items-center justify-center h-14 px-10 rounded-full bg-love text-white text-lg font-bold hover:bg-love/90 hover:scale-105 transition-all shadow-xl shadow-love/30">
            <Heart className="w-5 h-5 mr-2 fill-white" />
            Tạo Người Yêu Của Bạn
          </button>
        </Link>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0a0118] border-t border-white/5 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-love fill-love" />
            <span className="font-bold text-white tracking-tight">Người Yêu Ảo</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <a className="hover:text-love transition-colors" href="#">Về chúng tôi</a>
            <a className="hover:text-love transition-colors" href="#">Blog</a>
            <a className="hover:text-love transition-colors" href="#">Tuyển dụng</a>
            <a className="hover:text-love transition-colors" href="#">Hỗ trợ</a>
            <a className="hover:text-love transition-colors" href="#">Điều khoản</a>
          </div>
          
          <div className="flex gap-4">
            <a className="text-gray-500 hover:text-white transition-colors" href="#">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
              </svg>
            </a>
            <a className="text-gray-500 hover:text-white transition-colors" href="#">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.468 2.3c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"/>
              </svg>
            </a>
          </div>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-600">
          © 2026 Người Yêu Ảo. Được tạo với 💕 cho những trái tim cô đơn.
        </div>
      </div>
    </footer>
  );
}
