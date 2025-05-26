
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { PageWrapper } from '@/components/layout/PageWrapper'; // Import new PageWrapper

export const metadata: Metadata = {
  title: 'BalanceBeam - Smart Expense Sharing',
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
      <head>
        {/* Added meta theme-color, ensure it matches manifest.json */}
        <meta name="theme-color" content="#5DADE2" />
      </head>
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        <ThemeProvider>
          <UserProvider>
            <LanguageProvider>
              <CurrencyProvider>
                <PageWrapper>
                  {children}
                </PageWrapper>
              </CurrencyProvider>
            </LanguageProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
