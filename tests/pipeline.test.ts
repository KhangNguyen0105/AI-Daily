import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Pipeline tests - verify BullMQ queue configuration and worker creation.
 * These are unit tests that verify queue configuration without requiring Redis.
 *
 * Per D-09: Separate queues per pipeline stage.
 * Per D-12: Exponential backoff with max 3 retries.
 */

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
    options,
    on: vi.fn(),
    close: vi.fn(),
  }));

  return {
    Queue: mockQueue,
    Worker: mockWorker,
    Job: vi.fn(),
  };
});

// Mock database to avoid PostgreSQL connection in tests
vi.mock('../src/db/index', () => ({
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

// Mock providers registry
vi.mock('../src/providers/registry', () => ({
  getAdapter: vi.fn().mockReturnValue({
    config: { name: 'openai', baseUrl: 'https://openai.com', pricingUrl: 'https://openai.com/pricing' },
    crawl: vi.fn().mockResolvedValue({
      url: 'https://openai.com/pricing',
      html: '<html></html>',
      crawledAt: new Date(),
    }),
    extract: vi.fn().mockResolvedValue([]),
    normalize: vi.fn().mockReturnValue([]),
  }),
}));

describe('BullMQ Pipeline Queues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('collectQueue has correct name', async () => {
    const { collectQueue } = await import('../src/pipeline/queues');
    expect(collectQueue.name).toBe('collect');
  });

  it('extractQueue has correct name', async () => {
    const { extractQueue } = await import('../src/pipeline/queues');
    expect(extractQueue.name).toBe('extract');
  });

  it('scoreQueue has correct name', async () => {
    const { scoreQueue } = await import('../src/pipeline/queues');
    expect(scoreQueue.name).toBe('score');
  });

  it('generateQueue has correct name', async () => {
    const { generateQueue } = await import('../src/pipeline/queues');
    expect(generateQueue.name).toBe('generate');
  });

  it('each queue has attempts >= 3', async () => {
    const { collectQueue, extractQueue, scoreQueue, generateQueue } = await import('../src/pipeline/queues');
    const queues = [collectQueue, extractQueue, scoreQueue, generateQueue];

    for (const queue of queues) {
      expect(queue.defaultJobOptions.attempts).toBeGreaterThanOrEqual(3);
    }
  });

  it('each queue has exponential backoff', async () => {
    const { collectQueue, extractQueue, scoreQueue, generateQueue } = await import('../src/pipeline/queues');
    const queues = [collectQueue, extractQueue, scoreQueue, generateQueue];

    for (const queue of queues) {
      expect(queue.defaultJobOptions.backoff.type).toBe('exponential');
    }
  });

  it('each queue has backoff delay of 1000ms', async () => {
    const { collectQueue, extractQueue, scoreQueue, generateQueue } = await import('../src/pipeline/queues');
    const queues = [collectQueue, extractQueue, scoreQueue, generateQueue];

    for (const queue of queues) {
      expect(queue.defaultJobOptions.backoff.delay).toBe(1000);
    }
  });
});

describe('Pipeline Workers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createCollectWorker returns a Worker for collect queue', async () => {
    const { createCollectWorker } = await import('../src/pipeline/workers/collect');
    const worker = createCollectWorker();
    expect(worker.name).toBe('collect');
  });

  it('createExtractWorker returns a Worker for extract queue', async () => {
    const { createExtractWorker } = await import('../src/pipeline/workers/extract');
    const worker = createExtractWorker();
    expect(worker.name).toBe('extract');
  });

  it('createScoreWorker returns a Worker for score queue', async () => {
    const { createScoreWorker } = await import('../src/pipeline/workers/score');
    const worker = createScoreWorker();
    expect(worker.name).toBe('score');
  });

  it('createGenerateWorker returns a Worker for generate queue', async () => {
    const { createGenerateWorker } = await import('../src/pipeline/workers/generate');
    const worker = createGenerateWorker();
    expect(worker.name).toBe('generate');
  });

  it('each worker has concurrency of 1', async () => {
    const { createCollectWorker } = await import('../src/pipeline/workers/collect');
    const { createExtractWorker } = await import('../src/pipeline/workers/extract');
    const { createScoreWorker } = await import('../src/pipeline/workers/score');
    const { createGenerateWorker } = await import('../src/pipeline/workers/generate');

    const workers = [
      createCollectWorker(),
      createExtractWorker(),
      createScoreWorker(),
      createGenerateWorker(),
    ];

    for (const worker of workers) {
      expect(worker.options.concurrency).toBe(1);
    }
  });
});
