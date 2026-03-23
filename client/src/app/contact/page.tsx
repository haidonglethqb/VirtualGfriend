'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { useLanguageStore } from '@/store/language-store';

export default function ContactPage() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const tr = (vi: string, en: string) => (isVi ? vi : en);

  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const contactInfo = [
    {
      icon: <Mail className="w-5 h-5" />,
      title: 'Email',
      value: 'support@nguoiyeuao.vn',
      href: 'mailto:support@nguoiyeuao.vn',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: tr('Chat hỗ trợ', 'Support chat'),
      value: tr('Trong ứng dụng', 'In app'),
      href: '/chat',
      color: 'text-[#ad2bee]',
      bg: 'bg-[#ad2bee]/10',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: tr('Giờ hỗ trợ', 'Support hours'),
      value: tr('24/7 (AI) · 9:00-18:00 (Nhân viên)', '24/7 (AI) · 9:00-18:00 (Staff)'),
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: tr('Địa chỉ', 'Address'),
      value: tr('TP. Hồ Chí Minh, Việt Nam', 'Ho Chi Minh City, Vietnam'),
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
  ];

  return (
    <StaticPageLayout
      title={tr('Liên Hệ', 'Contact')}
      subtitle={tr('Chúng tôi luôn sẵn sàng hỗ trợ bạn. Đội ngũ sẽ phản hồi trong 24 giờ.', 'We are always ready to help. Our team will respond within 24 hours.')}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Contact info */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {contactInfo.map((info, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${info.bg} ${info.color} shrink-0`}>
                {info.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-0.5">{info.title}</p>
                {info.href ? (
                  <a href={info.href} className="text-white font-semibold hover:text-[#ad2bee] transition-colors">
                    {info.value}
                  </a>
                ) : (
                  <p className="text-white font-semibold">{info.value}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="lg:col-span-3"
        >
          <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02]">
            {submitted ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Send className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{tr('Đã gửi thành công!', 'Sent successfully!')}</h3>
                <p className="text-gray-400">{tr('Chúng tôi sẽ phản hồi trong vòng 24 giờ qua email.', 'We will respond via email within 24 hours.')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">{tr('Họ tên', 'Full name')}</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 outline-none focus:border-[#ad2bee]/40 focus:shadow-[0_0_15px_-5px_rgba(173,43,238,0.2)] transition-all duration-300"
                      placeholder={tr('Nguyễn Văn A', 'John Doe')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 outline-none focus:border-[#ad2bee]/40 focus:shadow-[0_0_15px_-5px_rgba(173,43,238,0.2)] transition-all duration-300"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{tr('Chủ đề', 'Subject')}</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 outline-none focus:border-[#ad2bee]/40 focus:shadow-[0_0_15px_-5px_rgba(173,43,238,0.2)] transition-all duration-300"
                    placeholder={tr('Hỗ trợ tài khoản, báo lỗi...', 'Account support, bug report...')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{tr('Nội dung', 'Message')}</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 outline-none focus:border-[#ad2bee]/40 focus:shadow-[0_0_15px_-5px_rgba(173,43,238,0.2)] transition-all duration-300 resize-none"
                    placeholder={tr('Mô tả chi tiết vấn đề của bạn...', 'Describe your issue in detail...')}
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 rounded-xl bg-gradient-to-r from-[#ad2bee] to-purple-500 text-white font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#ad2bee]/25 hover:shadow-[0_8px_30px_-6px_rgba(173,43,238,0.4)] hover:brightness-110"
                >
                  <Send className="w-4 h-4 inline mr-2" />
                  {tr('Gửi tin nhắn', 'Send message')}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </StaticPageLayout>
  );
}
