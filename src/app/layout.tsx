import './globals.css'
import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Zalando_Sans } from 'next/font/google'
import { Providers } from '@/components/providers'
import { getAsyncRuntimeConfig } from '@/lib/server/runtime-config'
import { TouchProvider } from '@/components/ui/hybrid-tooltip'
import { Analytics } from "@vercel/analytics/next"
import { config as appConfig } from "@/lib/config";
import { Suspense } from 'react';
import { RuntimeConfigScript } from '@/components/RuntimeConfigScript';
import { RouteVideoPauseHandler } from '@/components/RouteVideoPauseHandler';
import { SessionManager } from '@/components/session/SessionManager';

const sansFlex = Zalando_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  adjustFontFallback: true,
  fallback: ["Arial", "Times New Roman"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#141414' },
  ],
}

export async function generateMetadata(): Promise<Metadata> {
  const { basePath, appPublicUrl } = await getAsyncRuntimeConfig();
  const url = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`;
  const tagline = "Swipe on what to watch next, by yourself or together.";
  
  return {
    metadataBase: new URL(url),
    title: {
      default: "fanbIQ",
      template: "%s | fanbIQ"
    },
    description: tagline,
    appleWebApp: { capable: true, title: "fanbIQ", statusBarStyle: "black-translucent" },
    icons: {
      icon: `${basePath}/favicon.ico`,     
      shortcut: `${basePath}/icon1.png`,   
      apple: `${basePath}/apple-icon.png`,
    },
    openGraph: {
      title: "fanbIQ – Discover what to watch next",
      description: tagline,
      url: url,
      siteName: "fanbIQ",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "fanbIQ – Discover what to watch next",
      description: tagline,
    },
  };
}


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const useAnalytics = appConfig.USE_ANALYTICS

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Suspense>
          <RuntimeConfigScript />
        </Suspense>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={`${sansFlex.variable} ${jetbrainsMono.variable} overflow-y-hidden`}>
        {useAnalytics && <Analytics/>}

        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TouchProvider>
            <RouteVideoPauseHandler />
            <SessionManager />
            {children}
          </TouchProvider>
        </Providers>

      </body>
    </html>
  )
}
