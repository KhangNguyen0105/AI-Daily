import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { TopNav } from '@/app/components/TopNav';
import { AlertBanner } from '@/app/components/AlertBanner';
import { db } from '@/src/db/index';
import { extractions } from '@/src/db/schema';
import { desc, sql } from 'drizzle-orm';

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
      // Query latest price per model+source using DISTINCT ON
      const rows = await db
        .select({
          modelName: extractions.modelName,
          sourceId: extractions.sourceId,
          inputPricePer1m: extractions.inputPricePer1m,
        })
        .from(extractions)
        .orderBy(
          extractions.modelName,
          extractions.sourceId,
          desc(extractions.collectedAt),
        );

      // Deduplicate: keep latest per modelName+sourceId
      const seen = new Set<string>();
      currentPrices = {};
      for (const row of rows) {
        const key = `${row.modelName}:${row.sourceId}`;
        if (!seen.has(key) && row.inputPricePer1m !== null) {
          seen.add(key);
          currentPrices[key] = row.inputPricePer1m;
        }
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
