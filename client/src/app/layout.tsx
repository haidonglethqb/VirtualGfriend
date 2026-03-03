import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const font = Plus_Jakarta_Sans({ 
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'Amoura - Bạn Đồng Hành AI',
    template: '%s | Amoura',
  },
  description: 'Khám phá người bạn đồng hành AI thấu hiểu bạn. Trò chuyện tự nhiên, riêng tư và an toàn.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Amoura - Bạn Đồng Hành AI',
    description: 'Khám phá người bạn đồng hành AI thấu hiểu bạn. Trò chuyện tự nhiên, riêng tư và an toàn.',
    siteName: 'Amoura',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ad2bee',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <body className={`${font.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
