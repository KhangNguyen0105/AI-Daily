import type { Metadata } from 'next';
import './globals.css';
import { TopNav } from '@/app/components/TopNav';

export const metadata: Metadata = {
  title: 'AI Daily - AI Model Pricing Intelligence',
  description:
    'Understand what AI models actually cost in real-world usage — practical cost examples for developers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <TopNav />
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}
