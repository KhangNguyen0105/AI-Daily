import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { TopNav } from '@/app/components/TopNav';
import { AlertBanner } from '@/app/components/AlertBanner';
import { db } from '@/src/db/index';
import { sql } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'AI Daily - AI Model Pricing Intelligence',
  description:
    'Understand what AI models actually cost in real-world usage — practical cost examples for developers',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only query current prices if user has alerts set (cookie check)
  let currentPrices: Record<string, number> | undefined;

  try {
    const cookieStore = await cookies();
    const hasAlerts = cookieStore.get('has_alerts')?.value === '1';

    if (hasAlerts) {
      // WR-03: Use DISTINCT ON to get only the latest price per model+source at SQL level
      // This avoids fetching all historical extractions into memory
      const rows = await db.execute<{
        model_name: string;
        source_id: number;
        input_price_per_1m: number;
      }>(
        sql`SELECT DISTINCT ON (model_name, source_id)
              model_name, source_id, input_price_per_1m
            FROM extractions
            WHERE input_price_per_1m IS NOT NULL
            ORDER BY model_name, source_id, collected_at DESC`,
      );

      currentPrices = {};
      for (const row of rows.rows) {
        const key = `${row.model_name}:${row.source_id}`;
        currentPrices[key] = row.input_price_per_1m;
      }
    }
  } catch {
    // DB not available during build — skip alert checking
    currentPrices = undefined;
  }

  return (
    <html lang="en">
      <body>
        <TopNav />
        <div className="pt-14">{children}</div>
        <AlertBanner currentPrices={currentPrices} />
      </body>
    </html>
  );
}
