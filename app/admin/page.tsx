import { db } from '@/src/db/index';
import { pipelineRuns, extractions, articles } from '@/src/db/schema';
import { desc, sql } from 'drizzle-orm';
import { SummaryCard } from '@/app/components/admin/SummaryCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  let lastRun: { status: string; startedAt: Date } | null = null;
  let modelCount = 0;
  let articleCount = 0;

  try {
    const runs = await db
      .select({ status: pipelineRuns.status, startedAt: pipelineRuns.startedAt })
      .from(pipelineRuns)
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(1);
    lastRun = runs[0] ?? null;
  } catch (error) {
    console.error('Failed to load pipeline runs:', error);
  }

  try {
    const models = await db
      .select({ count: sql<number>`count(distinct ${extractions.modelName})` })
      .from(extractions);
    modelCount = Number(models[0]?.count ?? 0);
  } catch (error) {
    console.error('Failed to load model count:', error);
  }

  try {
    const articlesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(sql`${articles.publishedAt} IS NOT NULL`);
    articleCount = Number(articlesResult[0]?.count ?? 0);
  } catch (error) {
    console.error('Failed to load article count:', error);
  }

  const runStatus = lastRun?.status === 'completed' ? 'healthy' : lastRun?.status === 'failed' ? 'error' : 'unknown';
  const runValue = lastRun ? lastRun.status : 'No runs yet';

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <SummaryCard label="Last Pipeline Run" value={runValue} status={runStatus} />
        <SummaryCard label="Models Tracked" value={modelCount} />
        <SummaryCard label="Articles Published" value={articleCount} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Quick Actions</h2>
        <div className="flex flex-col gap-2">
          <Link href="/admin/articles" className="text-accent-blue hover:text-accent-blue/80 text-sm underline">
            View Articles
          </Link>
          <Link href="/admin/pipeline" className="text-accent-blue hover:text-accent-blue/80 text-sm underline">
            View Pipeline
          </Link>
          <Link href="/admin/sources" className="text-accent-blue hover:text-accent-blue/80 text-sm underline">
            View Sources
          </Link>
        </div>
      </div>
    </div>
  );
}
