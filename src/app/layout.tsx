import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Playfair_Display, Inter } from 'next/font/google';
import { site } from '@/config/site';
import './globals.css';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair-display' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: site.ogTitle,
  description: site.description,
  openGraph: {
    title: site.ogTitle,
    description: site.ogDescription ?? site.description,
    url: site.url,
    siteName: site.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: site.ogTitle,
    description: site.ogDescription ?? site.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-heading antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
