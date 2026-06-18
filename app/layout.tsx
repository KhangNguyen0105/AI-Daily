import type { Metadata } from 'next';
import './globals.css';
import { TopNav } from '@/app/components/TopNav';
import { ThemeProvider } from '@/app/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'AI Daily - AI Model Pricing Intelligence',
  description:
    'Understand what AI models actually cost in real-world usage — practical cost examples for developers',
};

/**
 * Inline script to prevent flash of wrong theme (FOUC).
 * Runs before React hydration — reads localStorage and system preference,
 * then sets .dark class on <html> synchronously.
 */
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg-primary text-text-primary">
        <ThemeProvider>
          <TopNav />
          <div className="pt-14">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
