'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, HelpCircle, MessageSquare, Mail, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';

export default function HelpPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  const faqs = [
    {
      question: tr('Tôi có thể thay đổi tên nhân vật không?', 'Can I change my character name?'),
      answer: tr(
        'Có, bạn có thể thay đổi tên nhân vật bất kỳ lúc nào trong phần "Người yêu ảo của tôi" trong cài đặt.',
        'Yes, you can change your character name at any time in the "My Virtual Partner" section in settings.'
      ),
    },
    {
      question: tr('Làm cách nào để tăng mức độ yêu thích?', 'How can I increase affection level?'),
      answer: tr(
        'Bạn có thể tăng mức độ yêu thích bằng cách trò chuyện thường xuyên, gửi quà tặng, và tương tác với nhân vật.',
        'You can increase affection by chatting regularly, sending gifts, and interacting with your character.'
      ),
    },
    {
      question: tr('Dữ liệu của tôi có an toàn không?', 'Is my data safe?'),
      answer: tr(
        'Tất cả dữ liệu của bạn được mã hóa và lưu trữ an toàn. Bạn có thể xem chi tiết trong phần "Quyền riêng tư".',
        'All your data is encrypted and stored securely. You can check details in the "Privacy" section.'
      ),
    },
    {
      question: tr('Tôi có thể khôi phục tài khoản đã xóa không?', 'Can I recover a deleted account?'),
      answer: tr(
        'Không, khi bạn xóa tài khoản, tất cả dữ liệu sẽ bị xóa vĩnh viễn. Hãy cân nhắc kỹ trước khi xóa.',
        'No, once your account is deleted, all data is permanently removed. Please consider carefully before deleting.'
      ),
    },
    {
      question: tr('Làm thế nào để báo cáo vấn đề?', 'How do I report an issue?'),
      answer: tr(
        'Nếu gặp vấn đề, bạn có thể liên hệ với chúng tôi qua email hoặc sử dụng biểu mẫu báo cáo trong ứng dụng.',
        'If you encounter issues, you can contact us via email or use the in-app report form.'
      ),
    },
  ];

  const contacts = [
    {
      icon: <Mail className="w-5 h-5" />,
      label: tr('Email hỗ trợ', 'Support Email'),
      value: 'support@virtualgfriend.com',
      href: 'mailto:support@virtualgfriend.com',
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      label: 'Discord',
      value: tr('Tham gia máy chủ Discord của chúng tôi', 'Join our Discord server'),
      href: '#',
    },
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Link href="/settings">
            <button className="p-2 rounded-lg hover:bg-[#392830] transition-colors">
              <ArrowLeft className="w-5 h-5 text-love" />
            </button>
          </Link>
          <HelpCircle className="w-6 h-6 text-love" />
          <h1 className="text-2xl font-bold">{tr('Trợ giúp & Hỗ trợ', 'Help & Support')}</h1>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3 mb-8"
        >
          <h2 className="text-lg font-bold">{tr('Liên hệ hỗ trợ', 'Contact Support')}</h2>
          {contacts.map((contact, index) => (
            <a
              key={index}
              href={contact.href}
              className="block rounded-2xl bg-[#271b21] border border-[#392830] p-4 hover:border-love/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-love/10 text-love flex items-center justify-center">
                  {contact.icon}
                </div>
                <div>
                  <p className="text-sm text-[#ba9cab]">{contact.label}</p>
                  <p className="font-medium">{contact.value}</p>
                </div>
              </div>
            </a>
          ))}
        </motion.div>

        {/* FAQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-bold">{tr('Câu hỏi thường gặp', 'Frequently Asked Questions')}</h2>
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="rounded-2xl bg-[#271b21] border border-[#392830] p-4 hover:border-[#392830]/80 transition-colors group cursor-pointer"
            >
              <summary className="flex items-center justify-between font-medium select-none">
                <span>{faq.question}</span>
                <span className="text-love group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[#ba9cab] mt-3 pt-3 border-t border-[#392830]">{faq.answer}</p>
            </details>
          ))}
        </motion.div>

        {/* Report Issue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-2xl bg-[#271b21] border border-[#392830] p-6"
        >
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-2">{tr('Gặp vấn đề?', 'Having an issue?')}</h3>
              <p className="text-[#ba9cab] text-sm mb-4">
                {tr(
                  'Nếu bạn gặp phải bất kỳ vấn đề nào trong quá trình sử dụng ứng dụng, vui lòng liên hệ với chúng tôi. Chúng tôi sẽ cố gắng giải quyết vấn đề của bạn trong thời gian sớm nhất.',
                  'If you encounter any issues while using the app, please contact us. We will do our best to resolve your issue as quickly as possible.'
                )}
              </p>
              <button className="px-4 py-2 rounded-lg bg-love hover:bg-love/90 text-white transition-colors">
                {tr('Báo cáo vấn đề', 'Report an issue')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
