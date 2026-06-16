
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { buildPageMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    path: '',
  }),
  manifest: '/manifest.json',
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: 'IGFzh1aTQbGiWG5r0UW5ymvH1JKvqrFgxvgj__ubcy4',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#5DADE2" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
        <link rel="icon" href="/icons/favicon.ico" /> 
        </head>
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        <ThemeProvider>
          <UserProvider>
            <LanguageProvider>
              <CurrencyProvider>
                <NotificationProvider>
                  <PageWrapper>
                    {children}
                  </PageWrapper>
                </NotificationProvider>
              </CurrencyProvider>
            </LanguageProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
