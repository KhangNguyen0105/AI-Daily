import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DiffResult } from '../../src/pipeline/article-diff';

// Track db.insert mock calls
const mockReturning = vi.fn();
const mockOnConflictDoUpdate = vi.fn(() => ({ returning: mockReturning }));
const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

// Mock modules before imports
vi.mock('@/src/pipeline/article-diff', () => ({
  computeDiff: vi.fn(),
}));

vi.mock('@/src/pipeline/article-generator', () => ({
  generateArticle: vi.fn(),
}));

vi.mock('@/src/db/index', () => ({
  db: {
    insert: mockInsert,
  },
}));

vi.mock('bullmq', () => {
  class MockWorker {
    constructor(
      _name: string,
      private handler: (job: { data: { extractionIds: number[] } }) => Promise<unknown>,
      _opts?: Record<string, unknown>,
    ) {}
    on(_event: string, _fn: (...args: unknown[]) => void) {
      return this;
    }
    async run(job: { data: { extractionIds: number[] } }) {
      return this.handler(job);
    }
  }
  return { Worker: MockWorker };
});

vi.mock('@/src/pipeline/connection', () => ({
  redisConnection: { host: 'localhost', port: 6379 },
}));

import { computeDiff } from '@/src/pipeline/article-diff';
import { generateArticle } from '@/src/pipeline/article-generator';

const mockComputeDiff = vi.mocked(computeDiff);
const mockGenerateArticle = vi.mocked(generateArticle);

const sampleDiff: DiffResult = {
  newModels: [
    {
      modelName: 'gpt-4o',
      inputPricePer1m: 2.5,
      outputPricePer1m: 10.0,
      contextWindow: 128000,
      sourceName: 'openai',
    },
  ],
  priceChanges: [],
  newPromotions: [],
  totalModelsToday: 10,
};

const sampleArticle = {
  title: 'AI Daily - 2026-06-14',
  summary: 'No changes detected today.',
  content: '# AI Daily - 2026-06-14\n\nNo changes detected today.',
};

describe('createGenerateWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComputeDiff.mockResolvedValue(sampleDiff);
    mockGenerateArticle.mockResolvedValue(sampleArticle);
    mockReturning.mockResolvedValue([{ id: 42 }]);
  });

  it('runs the full pipeline: computeDiff -> generateArticle -> db upsert', async () => {
    const { createGenerateWorker } = await import('../../src/pipeline/workers/generate');
    const worker = createGenerateWorker();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (worker as any).run({ data: { extractionIds: [1, 2, 3] } });

    // Verify computeDiff was called with today/yesterday dates
    expect(mockComputeDiff).toHaveBeenCalledTimes(1);
    const calls = mockComputeDiff.mock.calls as unknown as [Date, Date][];
    const [todayArg, yesterdayArg] = calls[0];
    expect(todayArg).toBeInstanceOf(Date);
    expect(yesterdayArg).toBeInstanceOf(Date);
    // yesterday should be exactly 1 day before today
    const diffMs = todayArg.getTime() - yesterdayArg.getTime();
    expect(diffMs).toBe(24 * 60 * 60 * 1000);

    // Verify generateArticle was called with the diff result
    expect(mockGenerateArticle).toHaveBeenCalledTimes(1);
    expect(mockGenerateArticle).toHaveBeenCalledWith(sampleDiff);

    // Verify db.insert was called (upsert into articles)
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledTimes(1);

    // Verify the upsert values include generated content
    const valuesCalls = mockValues.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const upsertValues = valuesCalls[0][0];
    expect(upsertValues.title).toBe(sampleArticle.title);
    expect(upsertValues.summary).toBe(sampleArticle.summary);
    expect(upsertValues.content).toBe(sampleArticle.content);
    expect(upsertValues.publishedAt).toBeInstanceOf(Date);

    // Verify the worker returns the article ID
    expect(result).toEqual({ articleId: 42 });
  });

  it('formats today date as YYYY-MM-DD for the date column', async () => {
    const { createGenerateWorker } = await import('../../src/pipeline/workers/generate');
    const worker = createGenerateWorker();
    await (worker as any).run({ data: { extractionIds: [] } });

    const valuesCalls = mockValues.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const upsertValues = valuesCalls[0][0];
    // Date should match YYYY-MM-DD format
    expect(upsertValues.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses onConflictDoUpdate for date-based deduplication', async () => {
    const { createGenerateWorker } = await import('../../src/pipeline/workers/generate');
    const worker = createGenerateWorker();
    await (worker as any).run({ data: { extractionIds: [] } });

    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
    const conflictCalls = mockOnConflictDoUpdate.mock.calls as unknown as Array<[{ set: Record<string, unknown> }]>;
    const conflictConfig = conflictCalls[0][0];
    expect(conflictConfig.set.title).toBe(sampleArticle.title);
    expect(conflictConfig.set.updatedAt).toBeInstanceOf(Date);
  });

  it('propagates errors from computeDiff', async () => {
    mockComputeDiff.mockRejectedValueOnce(new Error('DB connection failed'));

    const { createGenerateWorker } = await import('../../src/pipeline/workers/generate');
    const worker = createGenerateWorker();
    await expect((worker as any).run({ data: { extractionIds: [] } })).rejects.toThrow(
      'DB connection failed',
    );
  });

  it('propagates errors from generateArticle', async () => {
    mockGenerateArticle.mockRejectedValueOnce(new Error('AI provider unavailable'));

    const { createGenerateWorker } = await import('../../src/pipeline/workers/generate');
    const worker = createGenerateWorker();
    await expect((worker as any).run({ data: { extractionIds: [] } })).rejects.toThrow(
      'AI provider unavailable',
    );
  });

  it('returns the correct articleId from the upsert result', async () => {
    mockReturning.mockResolvedValue([{ id: 999 }]);

    const { createGenerateWorker } = await import('../../src/pipeline/workers/generate');
    const worker = createGenerateWorker();
    const result = await (worker as any).run({ data: { extractionIds: [] } });

    expect(result).toEqual({ articleId: 999 });
  });
});
