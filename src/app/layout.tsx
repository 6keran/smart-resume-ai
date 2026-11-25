import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Inter, Newsreader } from 'next/font/google';
import Script from 'next/script';
import { MotionConfig } from 'framer-motion';
import './globals.css';
import './reference-experience.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { ResumeProvider } from '@/context/ResumeContext';
import { CareerProvider } from '@/context/CareerContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { UserProvider } from '@/components/user/UserContext';
import { CareerChatbot } from '@/components/chat/CareerChatbot';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const newsreader = Newsreader({
  variable: '--font-serif',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Smart Resume AI | Turn Your Resume Into Your Next Opportunity',
  description:
    'Structured career workspace for resume building, ATS auditing, skill verification, and application tracking.',
  keywords: [
    'Smart Resume AI',
    'Resume Analyzer',
    'ATS Checker',
    'Resume Builder',
    'Skill Verification',
    'Job Match',
    'Career Intelligence',
  ],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} ${newsreader.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen flex bg-[var(--color-bg)] text-[var(--color-text)] antialiased font-sans" suppressHydrationWarning>
        <Script
          id="smart-resume-theme-init"
          src="/theme-init.js"
          strategy="beforeInteractive"
        />
        <ThemeProvider>
          <MotionConfig reducedMotion="user">
            <ResumeProvider>
              <CareerProvider>
                <UserProvider>
                  <div className="product-shell flex w-full min-h-screen relative z-[1]">
                    <Sidebar />
                    <div className="flex-1 flex flex-col min-w-0">
                      <Header />
                      <main className="flex-1 w-full min-w-0">{children}</main>
                    </div>
                  </div>
                  <CareerChatbot />
                </UserProvider>
              </CareerProvider>
            </ResumeProvider>
          </MotionConfig>
        </ThemeProvider>
      </body>
    </html>
  );
}
