import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import { SITE_CONFIG } from '@/lib/constants';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Atto4',
    template: `%s | Atto4`,
  },
  description: SITE_CONFIG.description,
  keywords: ['streaming', 'movies', 'tv shows', 'entertainment', 'watch online'],
  authors: [
    {
      name: 'Atto4',
      url: SITE_CONFIG.url,
    },
  ],
  creator: 'Atto4',
  metadataBase: new URL(SITE_CONFIG.url),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_CONFIG.url,
    title: 'Atto4',
    description: SITE_CONFIG.description,
    siteName: 'Atto4',
    images: [
      {
        url: SITE_CONFIG.ogImage,
        width: 1200,
        height: 630,
        alt: 'Atto4',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Atto4',
    description: SITE_CONFIG.description,
    images: [SITE_CONFIG.ogImage],
    creator: 'Atto4',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-black text-white antialiased">
        <Header />
        <main className="pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
