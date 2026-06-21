import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { PwaServiceWorkerRegistrar } from "@/components/pwa/PwaServiceWorkerRegistrar";
import { buildPageMetadata, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    path: "",
  }),
  manifest: "/manifest.json",
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: "IGFzh1aTQbGiWG5r0UW5ymvH1JKvqrFgxvgj__ubcy4",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#161b26" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("HisabKaro-theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
        <link rel="icon" href="/icons/favicon.ico" />
        <Script
          src="https://webpulse-tgcz.onrender.com/tracker.js?id=6a342c8060a1f825afee8e35&token=99a477cfb3842587d60c538d5b2b2590b50f97838155ebf53eb14b5d06cd7a18"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        <PwaServiceWorkerRegistrar />
        <ThemeProvider>
          <UserProvider>
            <LanguageProvider>
              <CurrencyProvider>
                <NotificationProvider>
                  <PageWrapper>{children}</PageWrapper>
                </NotificationProvider>
              </CurrencyProvider>
            </LanguageProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
