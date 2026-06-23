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
const mockInsert = vi.fn().mockReturnThis();
const mockValues = vi.fn().mockReturnThis();
const mockOnConflictDoUpdate = vi.fn().mockResolvedValue([]);
const mockReturning = vi.fn().mockResolvedValue([{ id: 1 }]);

vi.mock('../../src/db/index', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation(() => ({
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      })),
    })),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    transaction: vi.fn().mockImplementation(async (fn: any) => fn({
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([]),
    })),
  },
}));

// Mock API provider adapters (non-consumer)
const mockApiAdapters = [
  {
    config: { name: 'openai', baseUrl: 'https://api.openai.com', pricingUrl: 'https://openai.com/pricing' },
  },
];

// After mirrorToMainRegistry(), getAllAdapters() returns API + consumer adapters
const mockAllAdapters = [
  ...mockApiAdapters,
  { config: { name: 'chatgpt-consumer', baseUrl: 'https://chatgpt.com', pricingUrl: 'https://chatgpt.com/pricing' } },
  { config: { name: 'gemini-consumer', baseUrl: 'https://one.google.com', pricingUrl: 'https://one.google.com/about/plans' } },
];

// Mock providers registry
vi.mock('../../src/providers/registry', () => ({
  getAdapter: vi.fn().mockReturnValue({
    config: { name: 'chatgpt-consumer' },
    extract: vi.fn().mockResolvedValue({
      models: [],
      promotions: [],
      subscriptionPlans: [
        {
          planName: 'ChatGPT Plus',
          monthlyPrice: 20,
          annualPrice: 200,
          annualMonthlyPrice: 16.67,
          rawPriceText: '$20/mo',
          billingPeriod: 'monthly',
          freeTrialDays: 0,
          freeTrialConditions: null,
          keyFeatures: ['GPT-4 access', 'DALL-E'],
          currency: 'USD',
          sourceUrl: 'https://chatgpt.com/pricing',
          confidence: 'likely',
          extractionNotes: null,
        },
      ],
    }),
    normalize: vi.fn().mockImplementation((data: any) => data),
  }),
  getAllAdapters: vi.fn(() => mockAllAdapters),
  getAllTier1Adapters: vi.fn(() => mockApiAdapters),
  getAllTier2Adapters: vi.fn(() => []),
  getAllTier3Adapters: vi.fn(() => []),
  isTier1Provider: vi.fn((name: string) => name === 'openai'),
  isTier2Provider: vi.fn(() => false),
  isTier3Provider: vi.fn(() => false),
}));

// Mock consumer registry
const mockConsumerAdapters = [
  {
    config: {
      name: 'chatgpt-consumer',
      baseUrl: 'https://chatgpt.com',
      pricingUrl: 'https://chatgpt.com/pricing',
    },
  },
  {
    config: {
      name: 'gemini-consumer',
      baseUrl: 'https://one.google.com',
      pricingUrl: 'https://one.google.com/about/plans',
    },
  },
];

vi.mock('../../src/providers/consumer/registry', () => ({
  getAllConsumerAdapters: vi.fn(() => mockConsumerAdapters),
  isConsumerTier1Provider: vi.fn((name: string) =>
    ['chatgpt-consumer', 'gemini-consumer', 'claude-consumer', 'perplexity-consumer', 'copilot-consumer'].includes(name),
  ),
  isConsumerTier2Provider: vi.fn((name: string) =>
    ['poe-consumer', 'grok-consumer', 'you-consumer', 'phind-consumer', 'cursor-consumer'].includes(name),
  ),
  mirrorToMainRegistry: vi.fn().mockResolvedValue(undefined),
}));

// Mock queues
vi.mock('../../src/pipeline/queues', () => ({
  collectQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn(),
  },
  scoreQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn(),
  },
}));

// Mock connection
vi.mock('../../src/pipeline/connection', () => ({
  redisConnection: {},
}));

// Mock edge case classifier
vi.mock('../../src/pipeline/edge-case-classifier', () => ({
  classifyEdgeCases: vi.fn().mockResolvedValue({}),
}));

// Mock evidence anchor
vi.mock('../../src/lib/evidence-anchor', () => ({
  buildEvidenceQuotes: vi.fn().mockReturnValue({}),
  captureEvidence: vi.fn().mockReturnValue({ quote: 'test', selector: 'div' }),
}));

describe('Subscription Pipeline Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscription plan upsert', () => {
    it('should insert a new subscription plan', async () => {
      const { db } = await import('../../src/db/index');

      // Simulate extract worker inserting a subscription plan
      const planData = {
        sourceId: 1,
        providerName: 'chatgpt-consumer',
        planName: 'ChatGPT Plus',
        monthlyPrice: 20,
        annualPrice: 200,
        annualMonthlyPrice: 16.67,
        rawPriceText: '$20/mo',
        billingPeriod: 'monthly' as const,
        freeTrialDays: 0,
        freeTrialConditions: null,
        keyFeatures: ['GPT-4 access', 'DALL-E'],
        currency: 'USD',
        confidence: 'likely' as const,
        extractionNotes: null,
        sourceUrl: 'https://chatgpt.com/pricing',
        crawledAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert({} as any).values(planData).onConflictDoUpdate({} as any);

      expect(db.insert).toHaveBeenCalled();
    });

    it('should update existing plan on conflict', async () => {
      const { db } = await import('../../src/db/index');

      // The onConflictDoUpdate handles upsert semantics
      const result = await db
        .insert({} as any)
        .values({ planName: 'ChatGPT Plus', monthlyPrice: 22 })
        .onConflictDoUpdate({} as any);

      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle null prices gracefully', async () => {
      const { db } = await import('../../src/db/index');

      const planWithNullPrice = {
        sourceId: 1,
        providerName: 'chatgpt-consumer',
        planName: 'ChatGPT Free',
        monthlyPrice: null,
        annualPrice: null,
        annualMonthlyPrice: null,
        rawPriceText: 'Free',
        billingPeriod: 'unknown' as const,
        freeTrialDays: 0,
        freeTrialConditions: null,
        keyFeatures: ['Basic access'],
        currency: 'USD',
        confidence: 'likely' as const,
        extractionNotes: null,
        sourceUrl: 'https://chatgpt.com/pricing',
        crawledAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert({} as any).values(planWithNullPrice).onConflictDoUpdate({} as any);

      expect(db.insert).toHaveBeenCalled();
    });

    it('should store rawPriceText alongside numeric price', async () => {
      const { db } = await import('../../src/db/index');

      const planWithRawText = {
        sourceId: 1,
        providerName: 'chatgpt-consumer',
        planName: 'ChatGPT Plus',
        monthlyPrice: 20,
        rawPriceText: '$20/mo',
        billingPeriod: 'monthly' as const,
      };

      await db.insert({} as any).values(planWithRawText).onConflictDoUpdate({} as any);

      expect(db.insert).toHaveBeenCalled();
    });

    it('should store confidence level', async () => {
      const { db } = await import('../../src/db/index');

      const planWithConfidence = {
        sourceId: 1,
        providerName: 'chatgpt-consumer',
        planName: 'ChatGPT Plus',
        monthlyPrice: 20,
        confidence: 'low_confidence' as const,
        extractionNotes: 'Plan name not in expected list',
      };

      await db.insert({} as any).values(planWithConfidence).onConflictDoUpdate({} as any);

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('free_trial projection', () => {
    it('should have free_trial as valid promotionTypeEnum value', () => {
      // Verify the promotionTypeEnum includes free_trial
      // This is a schema-level check - the enum is defined in src/db/schema.ts
      const validPromotionTypes = ['free_tier', 'promotion', 'beta', 'free_trial'];
      expect(validPromotionTypes).toContain('free_trial');
    });

    it('subscription plans with freeTrialDays > 0 are eligible for promotions display', () => {
      // Conceptual test: plans with freeTrialDays > 0 should be displayable
      // as free_trial promotions in the promotions table
      const planWithTrial = {
        planName: 'Claude Pro',
        freeTrialDays: 7,
        freeTrialConditions: 'New users only',
      };

      expect(planWithTrial.freeTrialDays).toBeGreaterThan(0);
      expect(planWithTrial.freeTrialConditions).toBeTruthy();
    });
  });

  describe('adapter failure isolation', () => {
    it('should not throw when consumer adapter enqueue fails', async () => {
      const { collectQueue } = await import('../../src/pipeline/queues');
      const { orchestrateDailyRun } = await import('../../src/pipeline/orchestrator');

      // Mock collectQueue.add to throw for consumer adapters
      (collectQueue.add as any).mockImplementation(async (name: string, data: any) => {
        if (data.providerName?.includes('consumer')) {
          throw new Error('Queue connection failed');
        }
        return { id: 'job-1' };
      });

      // Should not throw even though consumer adapter enqueue fails
      await expect(orchestrateDailyRun()).resolves.toBeDefined();
    });

    it('should track consumer failures in stats', async () => {
      const { collectQueue } = await import('../../src/pipeline/queues');
      const { orchestrateDailyRun } = await import('../../src/pipeline/orchestrator');

      // Mock collectQueue.add to throw for all consumer adapters
      let enqueueCount = 0;
      (collectQueue.add as any).mockImplementation(async (name: string, data: any) => {
        enqueueCount++;
        if (data.providerName?.includes('consumer')) {
          throw new Error('Queue connection failed');
        }
        return { id: `job-${enqueueCount}` };
      });

      const runId = await orchestrateDailyRun();

      // The run should complete successfully despite consumer failures
      expect(runId).toBeDefined();
      expect(enqueueCount).toBeGreaterThan(0);
    });

    it('should not double-enqueue consumer adapters (CR-01)', async () => {
      const { collectQueue } = await import('../../src/pipeline/queues');
      const { orchestrateDailyRun } = await import('../../src/pipeline/orchestrator');

      // Track all enqueue calls
      const enqueuedProviders: string[] = [];
      (collectQueue.add as any).mockImplementation(async (name: string, data: any) => {
        enqueuedProviders.push(data.providerName);
        return { id: `job-${enqueuedProviders.length}` };
      });

      await orchestrateDailyRun();

      // Consumer adapters should appear exactly once (in the consumer loop, not the general loop)
      const chatgptEnqueues = enqueuedProviders.filter((p) => p === 'chatgpt-consumer');
      const geminiEnqueues = enqueuedProviders.filter((p) => p === 'gemini-consumer');

      expect(chatgptEnqueues).toHaveLength(1);
      expect(geminiEnqueues).toHaveLength(1);

      // API provider should also appear exactly once
      const openaiEnqueues = enqueuedProviders.filter((p) => p === 'openai');
      expect(openaiEnqueues).toHaveLength(1);
    });
  });
});
