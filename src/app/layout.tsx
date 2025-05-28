
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { PageWrapper } from '@/components/layout/PageWrapper';

export const metadata: Metadata = {
  title: 'HisabKaro - Smart Expense Sharing',
  description: 'Effortlessly manage shared expenses with friends and groups.',
  manifest: '/manifest.json', // Link to the manifest file
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><meta name="theme-color" content="#5DADE2" /><link rel="manifest" href="/manifest.json" /><link rel="apple-touch-icon" href="/icons/icon-192x192.png" /><link rel="icon" href="/icons/icon-192x192.png" type="image/png" /></head>
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
