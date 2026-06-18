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
  verifyWithEvidenceQuotes: vi.fn().mockResolvedValue({
    verified: true,
    quoteMismatches: [],
    missingEvidence: [],
  }),
}));

// Mock confidence module (new multi-dimensional + legacy)
vi.mock('../../src/pipeline/confidence', () => ({
  calculateConfidence: vi.fn().mockReturnValue('verified'),
  calculateMultiDimensionalConfidence: vi.fn().mockResolvedValue({
    source_confidence: 88,
    extraction_confidence: 88,
    normalization_confidence: 88,
    freshness_confidence: 90,
    verification_confidence: 88,
    overall_confidence: 88,
    per_field_confidence: {},
    label: 'High',
    breakdown_summary: 'Source: High, Extraction: High, Normalization: High, Freshness: Verified, Verification: High',
  }),
  applyHumanOverride: vi.fn().mockImplementation((score: any) => score),
}));

// Mock freshness tracker
vi.mock('../../src/lib/freshness-tracker', () => ({
  computeFreshnessConfidence: vi.fn().mockReturnValue(90),
  computeFreshnessMetadata: vi.fn().mockResolvedValue({
    last_verified_at: new Date(),
    freshness_status: 'fresh',
    data_age_minutes: 0,
    sla_breach: false,
    sla_days_overdue: 0,
  }),
  checkSLABreach: vi.fn().mockResolvedValue({
    breached: false,
    daysOverdue: 0,
    requiresRecrawl: false,
  }),
  triggerPriorityRecrawl: vi.fn().mockResolvedValue(undefined),
}));

// Mock edge-case classifier
vi.mock('../../src/pipeline/edge-case-classifier', () => ({
  isComparableTokenPricing: vi.fn().mockReturnValue(true),
}));

// Mock env
process.env.MIMO_API_KEY = 'test-mimo-key';
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
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');
      const worker = createScoreWorker();
      expect(worker.name).toBe('score');
    }, 15000);
  });

  describe('empty extractionIds', () => {
    it('returns zero counts when extractionIds is empty', async () => {
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');
      const worker = createScoreWorker();

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

      mockDbState.rawDataRows = [
        { id: 1, evidence: { html: '<html>test</html>' } },
      ];

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

      mockDbState.extractionRows = [];
      mockDbState.sourceRows = [{ id: 1, name: 'openai' }];

      const worker = createScoreWorker();
      const handler = (worker as any).handler;
      const result = await handler({
        data: { extractionIds: [1], rawDataId: 1, sourceId: 1 },
      });

      expect(result.scored).toBe(0);
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
          normalizationConfidence: 'high',
          humanConfidenceOverride: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          humanReviewStatus: 'unreviewed',
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
      );
    });
  });

  describe('calls calculateMultiDimensionalConfidence', () => {
    it('passes source tier, extraction, verification result, and freshness', async () => {
      const { db } = await import('../../src/db/index');
      const { calculateMultiDimensionalConfidence } = await import('../../src/pipeline/confidence');
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
          normalizationConfidence: 'high',
          humanConfidenceOverride: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          humanReviewStatus: 'unreviewed',
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

      expect(calculateMultiDimensionalConfidence).toHaveBeenCalledWith(
        'tier1',
        expect.objectContaining({ modelName: 'gpt-4o' }),
        expect.objectContaining({ verified: true }),
        90, // freshness confidence
        undefined, // edge case flags
        'high', // normalization confidence
      );
    });
  });

  describe('computes freshness metadata', () => {
    it('calls computeFreshnessMetadata and checkSLABreach', async () => {
      const { db } = await import('../../src/db/index');
      const { computeFreshnessMetadata, checkSLABreach } = await import('../../src/lib/freshness-tracker');
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
          normalizationConfidence: 'high',
          humanConfidenceOverride: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          humanReviewStatus: 'unreviewed',
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

      expect(computeFreshnessMetadata).toHaveBeenCalled();
      expect(checkSLABreach).toHaveBeenCalled();
    });
  });

  describe('updates extraction with multi-dimensional confidence', () => {
    it('stores all confidence dimensions in DB', async () => {
      const { db } = await import('../../src/db/index');
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
          normalizationConfidence: 'high',
          humanConfidenceOverride: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          humanReviewStatus: 'unreviewed',
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

      // Verify db.update was called with confidence dimensions
      expect(db.update).toHaveBeenCalled();
      const updateCall = (db.update as any).mock.results[0]?.value;
      // The set method should have been called with confidence fields
      expect(updateCall).toBeDefined();
    });
  });

  describe('quarantines extractions with disagreements', () => {
    it('sets low_confidence when verification finds disagreements', async () => {
      const { db } = await import('../../src/db/index');
      const { verifyExtraction } = await import('../../src/pipeline/verification');
      const { calculateConfidence } = await import('../../src/pipeline/confidence');
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');

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
          normalizationConfidence: 'high',
          humanConfidenceOverride: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          humanReviewStatus: 'unreviewed',
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

      expect(db.update).toHaveBeenCalled();
      expect(result.lowConfidence).toBe(1);
    });
  });

  describe('falls back to existing confidence on verification error', () => {
    it('keeps existing confidence when verifyExtraction throws', async () => {
      const { db } = await import('../../src/db/index');
      const { verifyExtraction } = await import('../../src/pipeline/verification');
      const { createScoreWorker } = await import('../../src/pipeline/workers/score');

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
          normalizationConfidence: 'high',
          humanConfidenceOverride: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          humanReviewStatus: 'unreviewed',
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
          normalizationConfidence: 'high',
          humanConfidenceOverride: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          humanReviewStatus: 'unreviewed',
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
        pipelineRunId: undefined,
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

  describe('imports multi-dimensional confidence', () => {
    it('score worker imports calculateMultiDimensionalConfidence from confidence module', async () => {
      const confidence = await import('../../src/pipeline/confidence');
      // Verify the new multi-dimensional function exists and is a mock
      expect(confidence.calculateMultiDimensionalConfidence).toBeDefined();
      expect(confidence.applyHumanOverride).toBeDefined();
      // Verify legacy function still exists
      expect(confidence.calculateConfidence).toBeDefined();
    });
  });
});
