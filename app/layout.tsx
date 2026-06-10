import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
