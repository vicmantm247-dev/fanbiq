'use client';

import ErrorDisplay from '@/components/error-display';
import { JetBrains_Mono } from 'next/font/google';
import '@/app/globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <head />
      <body>
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
          <ErrorDisplay error={error} reset={reset} type="generic" />
        </div>
      </body>
    </html>
  );
}
