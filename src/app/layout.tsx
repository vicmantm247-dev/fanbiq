import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter, Poppins } from 'next/font/google';
import { Providers } from '@/components/providers'
import { getAsyncRuntimeConfig } from '@/lib/server/runtime-config'
import { TouchProvider } from '@/components/ui/hybrid-tooltip'
import { Analytics } from "@vercel/analytics/next"
import { config as appConfig } from "@/lib/config";
import { Suspense } from 'react';
import { RuntimeConfigScript } from '@/components/RuntimeConfigScript';
import { RouteVideoPauseHandler } from '@/components/RouteVideoPauseHandler';
import { SessionManager } from '@/components/session/SessionManager';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-poppins',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

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
  
  const ogImageUrl = new URL(`${basePath}/opengraph-image`, url).toString();

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
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "fanbIQ Open Graph Image",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "fanbIQ – Discover what to watch next",
      description: tagline,
      images: [ogImageUrl],
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
    <html lang="en" className={`${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <Suspense>
          <RuntimeConfigScript />
        </Suspense>
      </head>
      <body className="overflow-y-hidden">
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
