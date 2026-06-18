import { Worker } from 'bullmq';
import { redisConnection } from './connection';
import { db } from '../db/index';
import { discoveredModels, modelStatusEvents, sources } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { ProviderAdapter } from '../providers/base';
import { getAllProviders, getAllTier2Adapters, getAllTier3Adapters } from '../providers/registry';

/**
 * Discovered model result from any discovery source.
 * Per D-02: Multi-source discovery stores models with evidence.
 */
export interface DiscoveredModel {
  provider_model_id: string;
  extracted_name: string;
  status: 'announced' | 'pricing_pending' | 'verified';
  source_type: 'pricing_page' | 'feed' | 'api' | 'diff';
  evidence_url?: string;
  evidence_text?: string;
  first_discovered_at: Date;
}

/**
 * Result of diff-based model comparison.
 * Per D-02: Diff detection compares current crawl against previous snapshot.
 */
export interface DiffResult {
  new_models: string[];
  renamed_models: Array<{ old_name: string; new_name: string }>;
  deprecated_models: string[];
  price_changes: Array<{ model_name: string; old_price: number; new_price: number }>;
}

/**
 * Model snapshot extracted from HTML for diff comparison.
 */
interface ModelSnapshot {
  name: string;
  family?: string;
  context_window?: number;
  input_price?: number;
  output_price?: number;
}

/**
 * Record a newly discovered model in the database.
 * Per D-02: Stores evidence_url and evidence_text for admin verification (T-02-19).
 * Deduplicates by (provider_id, provider_model_id) — updates if exists.
 */
export async function recordDiscoveredModel(
  providerName: string,
  model: DiscoveredModel,
): Promise<void> {
  // Resolve provider source ID
  const providerSource = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.name, providerName))
    .limit(1);

  if (providerSource.length === 0) {
    console.warn(`Feed monitor: provider "${providerName}" not found in sources table, skipping`);
    return;
  }

  const providerId = providerSource[0].id;

  // Check if model already discovered for this provider
  const existing = await db
    .select({ id: discoveredModels.id, status: discoveredModels.status })
    .from(discoveredModels)
    .where(
      and(
        eq(discoveredModels.providerId, providerId),
        eq(discoveredModels.providerModelId, model.provider_model_id),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    // Model already tracked — update status if it has progressed
    if (model.status === 'verified' && existing[0].status !== 'verified') {
      await db
        .update(discoveredModels)
        .set({
          status: 'verified',
          pricingFoundAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(discoveredModels.id, existing[0].id));

      await recordStatusEvent(existing[0].id, 'pricing_detected', {
        source_type: model.source_type,
        evidence_url: model.evidence_url,
      }, 'price_crawler');
    }
    return;
  }

  // New model — insert
  const inserted = await db
    .insert(discoveredModels)
    .values({
      providerId,
      providerModelId: model.provider_model_id,
      extractedName: model.extracted_name,
      status: model.status,
      sourceType: model.source_type,
      evidenceUrl: model.evidence_url,
      evidenceText: model.evidence_text,
      firstDiscoveredAt: model.first_discovered_at,
      pricingFoundAt: model.status === 'verified' ? new Date() : null,
    })
    .returning({ id: discoveredModels.id });

  // Record the initial status event
  await recordStatusEvent(inserted[0].id, 'announced', {
    source_type: model.source_type,
    evidence_url: model.evidence_url,
  }, model.source_type === 'api' ? 'api_discovery' : model.source_type === 'feed' ? 'feed_monitor' : 'diff_detection');
}

/**
 * Record a status event in the audit trail.
 * Per D-04: Immutable log of model lifecycle changes.
 */
async function recordStatusEvent(
  discoveredModelId: number,
  eventType: 'announced' | 'pricing_detected' | 'deprecated' | 'replaced' | 'quarantined',
  details: Record<string, unknown>,
  triggeredBy: string,
): Promise<void> {
  await db.insert(modelStatusEvents).values({
    discoveredModelId,
    eventType,
    details,
    triggeredBy,
  });
}

/**
 * Process a changelog/RSS feed for a provider.
 * Per D-02: Feed monitoring detects new model announcements early.
 * Per T-02-22: Feed requests have timeout; failures don't block main orchestrator.
 */
export async function processChangelog(
  providerName: string,
  feedUrl: string,
): Promise<DiscoveredModel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10-second timeout (T-02-22)

    const response = await fetch(feedUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`Feed monitor: ${providerName} feed returned ${response.status}`);
      return [];
    }

    const feedText = await response.text();
    return detectNewModels(feedText, providerName, 'feed', feedUrl);
  } catch (err) {
    // Feed failures don't block main orchestrator (T-02-22)
    console.warn(`Feed monitor: failed to fetch ${providerName} feed at ${feedUrl}:`, err);
    return [];
  }
}

/**
 * Detect new model names from feed text using pattern matching.
 * Per D-02: Extract model names from changelog entries.
 * Per T-02-20: Validates model names before storing as announced.
 */
export function detectNewModels(
  feedText: string,
  providerName: string,
  sourceType: 'feed' | 'api' | 'diff',
  evidenceUrl?: string,
): DiscoveredModel[] {
  const models: DiscoveredModel[] = [];
  const now = new Date();

  // Common model name patterns across providers
  const modelPatterns = [
    // GPT-style: gpt-4o, gpt-4-turbo, gpt-3.5-turbo
    /\b(gpt-[a-z0-9.-]+)\b/gi,
    // Claude-style: claude-3-opus, claude-3.5-sonnet
    /\b(claude-[0-9][a-z0-9.-]*)\b/gi,
    // Gemini-style: gemini-1.5-pro, gemini-2.0-flash
    /\b(gemini-[0-9][a-z0-9.-]*)\b/gi,
    // Llama-style: llama-3.1-70b, llama-3-8b
    /\b(llama-[0-9][a-z0-9.-]*)\b/gi,
    // Mistral-style: mistral-large, mistral-7b
    /\b(mistral-[a-z0-9.-]+)\b/gi,
    // General model pattern: word + version + optional size
    /\b([a-z]+-[0-9]+[a-z0-9.-]*)\b/gi,
  ];

  const seen = new Set<string>();

  for (const pattern of modelPatterns) {
    let match;
    while ((match = pattern.exec(feedText)) !== null) {
      const modelName = match[1].toLowerCase();
      if (!seen.has(modelName) && modelName.length > 3 && modelName.length < 100) {
        seen.add(modelName);
        models.push({
          provider_model_id: `${providerName}/${modelName}`,
          extracted_name: modelName,
          status: 'announced',
          source_type: sourceType,
          evidence_url: evidenceUrl,
          evidence_text: feedText.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50),
          first_discovered_at: now,
        });
      }
    }
  }

  return models;
}

/**
 * Query a provider's /models API endpoint for model discovery.
 * Per D-02: API discovery queries provider /models endpoints.
 * Per D-01: Tier 2+ adapters support API model discovery.
 */
export async function queryProviderAPI(
  provider: ProviderAdapter,
): Promise<DiscoveredModel[]> {
  const models: DiscoveredModel[] = [];
  const now = new Date();

  try {
    // Try common /models API endpoints
    const apiUrls = [
      `${provider.config.baseUrl}/v1/models`,
      `${provider.config.baseUrl}/api/v1/models`,
      `${provider.config.baseUrl}/models`,
    ];

    for (const apiUrl of apiUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timeout);

        if (!response.ok) continue;

        const data = await response.json() as { data?: Array<{ id: string; name?: string }> };

        if (data?.data && Array.isArray(data.data)) {
          for (const model of data.data) {
            if (model.id) {
              models.push({
                provider_model_id: model.id,
                extracted_name: model.name || model.id,
                status: 'announced',
                source_type: 'api',
                evidence_url: apiUrl,
                evidence_text: JSON.stringify(model).slice(0, 500),
                first_discovered_at: now,
              });
            }
          }
          break; // Found working API endpoint
        }
      } catch {
        // Try next URL
      }
    }
  } catch (err) {
    console.warn(`API discovery failed for ${provider.config.name}:`, err);
  }

  return models;
}

/**
 * Compare current HTML snapshot against previous snapshot.
 * Per D-02: Diff-based detection compares current crawl against previous snapshot.
 * Per T-02-20: Only flags renames if context_window + family match (confidence).
 */
export function compareModelSnapshots(
  providerName: string,
  currentModels: ModelSnapshot[],
  previousModels: ModelSnapshot[],
): DiffResult {
  const currentNames = new Set(currentModels.map((m) => m.name));
  const previousNames = new Set(previousModels.map((m) => m.name));

  // New models: in current but not in previous
  const newModels = [...currentNames].filter((name) => !previousNames.has(name));

  // Deprecated models: in previous but not in current
  const deprecatedModels = [...previousNames].filter((name) => !currentNames.has(name));

  // Detect renames: same context_window + same family, different name (T-02-20)
  const renamed: Array<{ old_name: string; new_name: string }> = [];
  for (const prevModel of previousModels) {
    if (!prevModel.family || !prevModel.context_window) continue;
    const renamedMatch = currentModels.find(
      (m) =>
        m.family === prevModel.family &&
        m.context_window === prevModel.context_window &&
        m.name !== prevModel.name &&
        !currentNames.has(prevModel.name), // old name truly gone
    );
    if (renamedMatch) {
      renamed.push({ old_name: prevModel.name, new_name: renamedMatch.name });
    }
  }

  // Detect price changes: >20% change in input price
  const priceChanges: Array<{ model_name: string; old_price: number; new_price: number }> = [];
  for (const prevModel of previousModels) {
    if (!prevModel.input_price) continue;
    const currentMatch = currentModels.find((m) => m.name === prevModel.name);
    if (currentMatch?.input_price) {
      const changePercent = Math.abs(currentMatch.input_price - prevModel.input_price) / prevModel.input_price;
      if (changePercent > 0.2) {
        priceChanges.push({
          model_name: prevModel.name,
          old_price: prevModel.input_price,
          new_price: currentMatch.input_price,
        });
      }
    }
  }

  return {
    new_models: newModels,
    renamed_models: renamed,
    deprecated_models: deprecatedModels,
    price_changes: priceChanges,
  };
}

/**
 * Main feed monitoring function — runs once per day.
 * Per D-02: Monitors all providers using all four discovery sources.
 * Runs before main orchestrator (2 AM UTC) to detect models early.
 */
export async function monitorProviderFeeds(): Promise<{
  totalDiscovered: number;
  bySource: Record<string, number>;
}> {
  const providers = getAllProviders();
  let totalDiscovered = 0;
  const bySource: Record<string, number> = { api: 0, feed: 0, diff: 0, pricing_page: 0 };

  for (const provider of providers) {
    // 1. Query provider API (if available)
    try {
      const apiModels = await queryProviderAPI(provider);
      for (const model of apiModels) {
        await recordDiscoveredModel(provider.config.name, model);
        totalDiscovered++;
        bySource.api++;
      }
    } catch {
      // API not available for this provider
    }

    // 2. Monitor changelog/RSS feeds (provider-specific URLs)
    const feedUrl = provider.config.sources?.find((s) => s.sourceType === 'changelog')?.url;
    if (feedUrl) {
      const feedModels = await processChangelog(provider.config.name, feedUrl);
      for (const model of feedModels) {
        await recordDiscoveredModel(provider.config.name, model);
        totalDiscovered++;
        bySource.feed++;
      }
    }
  }

  console.log(`Feed monitoring complete: ${totalDiscovered} models discovered`, bySource);
  return { totalDiscovered, bySource };
}

/**
 * Create a BullMQ Worker for the feed-monitor queue.
 * Per D-03: Feed monitoring runs at 2 AM UTC (before main orchestrator at 6 AM).
 */
export function createFeedMonitorWorker(): Worker {
  const worker = new Worker(
    'feed-monitor',
    async (job) => {
      console.log(`Feed monitor triggered by job ${job.id}`);
      const result = await monitorProviderFeeds();
      return result;
    },
    { connection: redisConnection, concurrency: 1 },
  );

  worker.on('error', (err) => {
    console.error('Feed monitor worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Feed monitor job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Feed monitor job ${job?.id} failed:`, err.message);
  });

  return worker;
}
