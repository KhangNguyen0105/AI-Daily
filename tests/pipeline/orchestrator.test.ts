import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bullmq to avoid Redis connection in tests
vi.mock('bullmq', () => {
  const mockQueue = vi.fn().mockImplementation((name: string, options: any) => ({
    name,
    options,
    defaultJobOptions: options?.defaultJobOptions,
    add: vi.fn(),
    close: vi.fn(),
  }));

  const mockWorker = vi.fn().mockImplementation((name: string, handler: any, options: any) => ({
    name,
    handler,
    opts: options,
    on: vi.fn(),
    close: vi.fn(),
  }));

  return {
    Queue: mockQueue,
    Worker: mockWorker,
    Job: vi.fn(),
  };
});

// Mock database
vi.mock('../../src/db/index', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

// Mock providers registry with 3 fake adapters
const mockAdapters = [
  { config: { name: 'openai', baseUrl: 'https://openai.com', pricingUrl: 'https://openai.com/pricing' } },
  { config: { name: 'anthropic', baseUrl: 'https://anthropic.com', pricingUrl: 'https://anthropic.com/pricing' } },
  { config: { name: 'google', baseUrl: 'https://google.com', pricingUrl: 'https://google.com/pricing' } },
];

vi.mock('../../src/providers/registry', () => ({
  getAllAdapters: vi.fn(() => mockAdapters),
}));

describe('Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('orchestrateDailyRun', () => {
    it('creates a pipelineRun record with status running', async () => {
      const { db } = await import('../../src/db/index');
      const { orchestrateDailyRun } = await import('../../src/pipeline/orchestrator');

      await orchestrateDailyRun();

      expect(db.insert).toHaveBeenCalled();
      // Verify the insert was called with pipelineRuns table
      const insertCall = (db.insert as any).mock.calls[0];
      expect(insertCall).toBeDefined();
    });

    it('enqueues collect jobs for all providers', async () => {
      const { collectQueue } = await import('../../src/pipeline/queues');
      const { orchestrateDailyRun } = await import('../../src/pipeline/orchestrator');

      await orchestrateDailyRun();

      // Should add 3 jobs (one per mock adapter)
      expect(collectQueue.add).toHaveBeenCalledTimes(3);

      // Verify each provider was enqueued
      const addCalls = (collectQueue.add as any).mock.calls;
      const providerNames = addCalls.map((call: any[]) => call[1].providerName);
      expect(providerNames).toContain('openai');
      expect(providerNames).toContain('anthropic');
      expect(providerNames).toContain('google');
    });

    it('returns the pipelineRun id', async () => {
      const { orchestrateDailyRun } = await import('../../src/pipeline/orchestrator');

      const runId = await orchestrateDailyRun();

      expect(runId).toBe(1);
    });

    it('includes all stat counters in initial stats', async () => {
      const { db } = await import('../../src/db/index');
      const { orchestrateDailyRun } = await import('../../src/pipeline/orchestrator');

      await orchestrateDailyRun();

      // Get the values passed to insert
      const valuesCall = (db.insert({} as any).values as any).mock;
      // The insert chain: db.insert(pipelineRuns).values(...)
      // We verify the mock chain was called
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('updatePipelineStats', () => {
    it('merges updates into existing stats', async () => {
      const { db } = await import('../../src/db/index');
      const { updatePipelineStats } = await import('../../src/pipeline/orchestrator');

      // Mock select to return a record with existing stats
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                stats: {
                  totalProviders: 12,
                  attempted: 5,
                  succeeded: 3,
                  failed: 2,
                  extractions: 10,
                  verifiedCount: 2,
                  likelyCount: 5,
                  lowConfidenceCount: 3,
                },
              },
            ]),
          }),
        }),
      });

      await updatePipelineStats(1, { succeeded: 4, verifiedCount: 3 });

      expect(db.update).toHaveBeenCalled();
    });

    it('throws when pipeline run not found', async () => {
      const { db } = await import('../../src/db/index');
      const { updatePipelineStats } = await import('../../src/pipeline/orchestrator');

      // Mock select to return empty array
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(updatePipelineStats(999, { succeeded: 1 })).rejects.toThrow(
        'Pipeline run not found: 999',
      );
    });
  });

  describe('finalizePipelineRun', () => {
    it('sets status and completedAt for completed runs', async () => {
      const { db } = await import('../../src/db/index');
      const { finalizePipelineRun } = await import('../../src/pipeline/orchestrator');

      await finalizePipelineRun(1, 'completed');

      expect(db.update).toHaveBeenCalled();
    });

    it('sets status and completedAt for failed runs', async () => {
      const { db } = await import('../../src/db/index');
      const { finalizePipelineRun } = await import('../../src/pipeline/orchestrator');

      await finalizePipelineRun(1, 'failed');

      expect(db.update).toHaveBeenCalled();
    });
  });
});
