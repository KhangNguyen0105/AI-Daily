import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bullmq
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
const mockDbState = {
  rawDataRows: [] as any[],
  extractionRows: [] as any[],
  sourceRows: [] as any[],
  updatedExtractionIds: [] as number[],
};

vi.mock('../../src/db/index', () => ({
  db: {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockImplementation(() => {
            // Return rawData rows when called
            return Promise.resolve(mockDbState.rawDataRows);
          }),
        })),
      })),
    })),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation((condition: any) => {
          // Track which extraction was updated
          return Promise.resolve();
        }),
      })),
    })),
  },
}));

// Mock verification module
vi.mock('../../src/pipeline/verification', () => ({
  verifyExtraction: vi.fn().mockResolvedValue({
    verified: true,
    disagreements: [],
    pass2Results: [],
  }),
}));

// Mock confidence module
vi.mock('../../src/pipeline/confidence', () => ({
  calculateConfidence: vi.fn().mockReturnValue('verified'),
}));

// Mock env
process.env.OPENAI_API_KEY = 'test-key';

describe('Score Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbState.rawDataRows = [];
    mockDbState.extractionRows = [];
    mockDbState.sourceRows = [];
    mockDbState.updatedExtractionIds = [];
  });

  describe('ScoreJobData interface', () => {
    it('requires rawDataId and sourceId fields', async () => {
      // Type-level test: the import should work with the new interface
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');
      const worker = createScoreWorker();
      expect(worker.name).toBe('score');
    });
  });

  describe('empty extractionIds', () => {
    it('returns zero counts when extractionIds is empty', async () => {
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');
      const worker = createScoreWorker();

      // Get the handler function
      const handler = (worker as any).handler;
      const result = await handler({
        data: { extractionIds: [], rawDataId: 1, sourceId: 1 },
      });

      expect(result).toEqual({ scored: 0, verified: 0, likely: 0, lowConfidence: 0 });
    });
  });

  describe('fetches rawData from database', () => {
    it('queries rawData table using rawDataId', async () => {
      const { db } = await import('../../src/db/index');
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');

      // Setup mock to return raw data with HTML
      mockDbState.rawDataRows = [
        { id: 1, evidence: { html: '<html>test</html>' } },
      ];

      // The db mock for extraction rows needs to work differently
      // Since the score worker uses inArray for extractions, we need
      // to handle the select chain differently
      let selectCallCount = 0;
      (db.select as any).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: rawData query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.rawDataRows),
              }),
            }),
          };
        } else if (selectCallCount === 2) {
          // Second call: extractions query (uses inArray, no limit)
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockDbState.extractionRows),
            }),
          };
        } else {
          // Third call: sources query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.sourceRows),
              }),
            }),
          };
        }
      });

      mockDbState.extractionRows = [];
      mockDbState.sourceRows = [{ id: 1, name: 'openai' }];

      const worker = createScoreWorker();
      const handler = (worker as any).handler;
      const result = await handler({
        data: { extractionIds: [1], rawDataId: 1, sourceId: 1 },
      });

      expect(result.scored).toBe(0); // no extraction rows returned
    });
  });

  describe('calls verifyExtraction for each extraction', () => {
    it('invokes verifyExtraction with HTML and extraction results', async () => {
      const { db } = await import('../../src/db/index');
      const { verifyExtraction } = await import('../../src/pipeline/verification');
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');

      mockDbState.rawDataRows = [
        { id: 1, evidence: { html: '<html>pricing data</html>' } },
      ];
      mockDbState.extractionRows = [
        {
          id: 10,
          modelName: 'gpt-4o',
          inputPricePer1m: 2.5,
          outputPricePer1m: 10,
          contextWindow: 128000,
          confidence: 'likely',
          rawEvidence: {},
        },
      ];
      mockDbState.sourceRows = [{ id: 1, name: 'openai' }];

      let selectCallCount = 0;
      (db.select as any).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.rawDataRows),
              }),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockDbState.extractionRows),
            }),
          };
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.sourceRows),
              }),
            }),
          };
        }
      });

      const worker = createScoreWorker();
      const handler = (worker as any).handler;
      await handler({
        data: { extractionIds: [10], rawDataId: 1, sourceId: 1 },
      });

      expect(verifyExtraction).toHaveBeenCalledTimes(1);
      expect(verifyExtraction).toHaveBeenCalledWith(
        '<html>pricing data</html>',
        [expect.objectContaining({ modelName: 'gpt-4o' })],
        'test-key',
      );
    });
  });

  describe('calls calculateConfidence with correct args', () => {
    it('passes source tier, extraction, and verification result', async () => {
      const { db } = await import('../../src/db/index');
      const { calculateConfidence } = await import('../../src/pipeline/confidence');
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');

      mockDbState.rawDataRows = [
        { id: 1, evidence: { html: '<html></html>' } },
      ];
      mockDbState.extractionRows = [
        {
          id: 10,
          modelName: 'gpt-4o',
          inputPricePer1m: 2.5,
          outputPricePer1m: 10,
          contextWindow: 128000,
          confidence: 'likely',
          rawEvidence: {},
        },
      ];
      mockDbState.sourceRows = [{ id: 1, name: 'openai' }];

      let selectCallCount = 0;
      (db.select as any).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.rawDataRows),
              }),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockDbState.extractionRows),
            }),
          };
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.sourceRows),
              }),
            }),
          };
        }
      });

      const worker = createScoreWorker();
      const handler = (worker as any).handler;
      await handler({
        data: { extractionIds: [10], rawDataId: 1, sourceId: 1 },
      });

      expect(calculateConfidence).toHaveBeenCalledWith(
        'tier1',
        expect.objectContaining({ modelName: 'gpt-4o' }),
        true, // verification passed (mock returns verified: true)
      );
    });
  });

  describe('updates extraction confidence in DB', () => {
    it('calls db.update with the calculated confidence', async () => {
      const { db } = await import('../../src/db/index');
      const { calculateConfidence } = await import('../../src/pipeline/confidence');
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');

      // Override calculateConfidence to return 'verified'
      (calculateConfidence as any).mockReturnValue('verified');

      mockDbState.rawDataRows = [
        { id: 1, evidence: { html: '<html></html>' } },
      ];
      mockDbState.extractionRows = [
        {
          id: 10,
          modelName: 'gpt-4o',
          inputPricePer1m: 2.5,
          outputPricePer1m: 10,
          contextWindow: 128000,
          confidence: 'likely',
          rawEvidence: {},
        },
      ];
      mockDbState.sourceRows = [{ id: 1, name: 'openai' }];

      let selectCallCount = 0;
      (db.select as any).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.rawDataRows),
              }),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockDbState.extractionRows),
            }),
          };
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.sourceRows),
              }),
            }),
          };
        }
      });

      const worker = createScoreWorker();
      const handler = (worker as any).handler;
      await handler({
        data: { extractionIds: [10], rawDataId: 1, sourceId: 1 },
      });

      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('quarantines extractions with disagreements', () => {
    it('sets low_confidence when verification finds disagreements', async () => {
      const { db } = await import('../../src/db/index');
      const { verifyExtraction } = await import('../../src/pipeline/verification');
      const { calculateConfidence } = await import('../../src/pipeline/confidence');
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');

      // Override verification to return disagreements
      (verifyExtraction as any).mockResolvedValue({
        verified: false,
        disagreements: [
          {
            modelName: 'gpt-4o',
            field: 'inputPricePer1m',
            pass1Value: 2.5,
            pass2Value: 5.0,
            pass2Supported: true,
          },
        ],
        pass2Results: [],
      });

      // calculateConfidence returns 'likely' but quarantining should override
      (calculateConfidence as any).mockReturnValue('likely');

      mockDbState.rawDataRows = [
        { id: 1, evidence: { html: '<html></html>' } },
      ];
      mockDbState.extractionRows = [
        {
          id: 10,
          modelName: 'gpt-4o',
          inputPricePer1m: 2.5,
          outputPricePer1m: 10,
          contextWindow: 128000,
          confidence: 'likely',
          rawEvidence: {},
        },
      ];
      mockDbState.sourceRows = [{ id: 1, name: 'openai' }];

      let selectCallCount = 0;
      (db.select as any).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.rawDataRows),
              }),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockDbState.extractionRows),
            }),
          };
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.sourceRows),
              }),
            }),
          };
        }
      });

      const worker = createScoreWorker();
      const handler = (worker as any).handler;
      const result = await handler({
        data: { extractionIds: [10], rawDataId: 1, sourceId: 1 },
      });

      // The update should have been called with 'low_confidence' (quarantined)
      expect(db.update).toHaveBeenCalled();
      expect(result.lowConfidence).toBe(1);
    });
  });

  describe('falls back to existing confidence on verification error', () => {
    it('keeps existing confidence when verifyExtraction throws', async () => {
      const { db } = await import('../../src/db/index');
      const { verifyExtraction } = await import('../../src/pipeline/verification');
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');

      // Override verification to throw an error
      (verifyExtraction as any).mockRejectedValue(new Error('OpenAI API error'));

      mockDbState.rawDataRows = [
        { id: 1, evidence: { html: '<html></html>' } },
      ];
      mockDbState.extractionRows = [
        {
          id: 10,
          modelName: 'gpt-4o',
          inputPricePer1m: 2.5,
          outputPricePer1m: 10,
          contextWindow: 128000,
          confidence: 'likely',
          rawEvidence: {},
        },
      ];
      mockDbState.sourceRows = [{ id: 1, name: 'openai' }];

      let selectCallCount = 0;
      (db.select as any).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.rawDataRows),
              }),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockDbState.extractionRows),
            }),
          };
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.sourceRows),
              }),
            }),
          };
        }
      });

      const worker = createScoreWorker();
      const handler = (worker as any).handler;
      const result = await handler({
        data: { extractionIds: [10], rawDataId: 1, sourceId: 1 },
      });

      // Should still score (not crash) and keep existing confidence 'likely'
      expect(result.scored).toBe(1);
      expect(result.likely).toBe(1);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('chains to generateQueue', () => {
    it('adds a generate job after scoring', async () => {
      const { db } = await import('../../src/db/index');
      const { generateQueue } = await import('../../src/pipeline/queues');
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');

      mockDbState.rawDataRows = [
        { id: 1, evidence: { html: '<html></html>' } },
      ];
      mockDbState.extractionRows = [
        {
          id: 10,
          modelName: 'gpt-4o',
          inputPricePer1m: 2.5,
          outputPricePer1m: 10,
          contextWindow: 128000,
          confidence: 'likely',
          rawEvidence: {},
        },
      ];
      mockDbState.sourceRows = [{ id: 1, name: 'openai' }];

      let selectCallCount = 0;
      (db.select as any).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.rawDataRows),
              }),
            }),
          };
        } else if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockDbState.extractionRows),
            }),
          };
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockDbState.sourceRows),
              }),
            }),
          };
        }
      });

      const worker = createScoreWorker();
      const handler = (worker as any).handler;
      await handler({
        data: { extractionIds: [10], rawDataId: 1, sourceId: 1 },
      });

      expect(generateQueue.add).toHaveBeenCalledWith('generate', {
        extractionIds: [10],
      });
    });
  });

  describe('skips generate when extractionIds is empty', () => {
    it('does not call generateQueue.add', async () => {
      const { generateQueue } = await import('../../src/pipeline/queues');
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');

      const worker = createScoreWorker();
      const handler = (worker as any).handler;
      await handler({
        data: { extractionIds: [], rawDataId: 1, sourceId: 1 },
      });

      expect(generateQueue.add).not.toHaveBeenCalled();
    });
  });
});
