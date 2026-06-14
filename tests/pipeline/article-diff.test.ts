import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track what db.select should return for each call
let selectCallResults: any[][] = [];
let selectCallIndex = 0;

// Mock database module — must be before any imports that use db
vi.mock('../../src/db/index', () => ({
  db: {
    select: vi.fn(() => {
      const result = selectCallResults[selectCallIndex] ?? [];
      selectCallIndex++;
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(result)),
        })),
      };
    }),
  },
}));

// Fixtures
const today = new Date('2026-06-14T12:00:00Z');
const yesterday = new Date('2026-06-13T12:00:00Z');

const extractionGPT4o = {
  modelName: 'gpt-4o',
  inputPricePer1m: 2.5,
  outputPricePer1m: 10.0,
  contextWindow: 128000,
  sourceId: 1,
  collectedAt: new Date('2026-06-14T06:00:00Z'),
};

const extractionClaude = {
  modelName: 'claude-sonnet-4-5',
  inputPricePer1m: 3.0,
  outputPricePer1m: 15.0,
  contextWindow: 200000,
  sourceId: 2,
  collectedAt: new Date('2026-06-14T06:00:00Z'),
};

const extractionGemini = {
  modelName: 'gemini-2.0-flash',
  inputPricePer1m: 0.1,
  outputPricePer1m: 0.4,
  contextWindow: 1000000,
  sourceId: 3,
  collectedAt: new Date('2026-06-14T06:00:00Z'),
};

const extractionGPT4oYesterday = {
  modelName: 'gpt-4o',
  inputPricePer1m: 2.5,
  outputPricePer1m: 10.0,
  contextWindow: 128000,
  sourceId: 1,
  collectedAt: new Date('2026-06-13T06:00:00Z'),
};

const extractionGPT4oPriceChangedYesterday = {
  modelName: 'gpt-4o',
  inputPricePer1m: 3.0,
  outputPricePer1m: 12.0,
  contextWindow: 128000,
  sourceId: 1,
  collectedAt: new Date('2026-06-13T06:00:00Z'),
};

const extractionClaudeYesterday = {
  modelName: 'claude-sonnet-4-5',
  inputPricePer1m: 3.0,
  outputPricePer1m: 15.0,
  contextWindow: 200000,
  sourceId: 2,
  collectedAt: new Date('2026-06-13T06:00:00Z'),
};

const promotionToday = {
  modelPattern: 'gpt-4*',
  description: 'Free tier: 10K tokens/day',
  type: 'free_tier',
};

/**
 * Helper to set up sequential db.select() return values.
 * Drizzle chains: db.select().from().where() => Promise<results>
 * computeDiff calls db.select 3 times: today extractions,
 * yesterday extractions, and today promotions.
 */
function setupSelectResults(...results: any[][]) {
  selectCallResults = results;
  selectCallIndex = 0;
}

describe('computeDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallResults = [];
    selectCallIndex = 0;
  });

  it('treats all today extractions as newModels when yesterday is empty (first-run)', async () => {
    setupSelectResults(
      [extractionGPT4o, extractionClaude, extractionGemini], // today extractions
      [], // yesterday extractions (empty)
      [], // today promotions
    );

    const { computeDiff } = await import('../../src/pipeline/article-diff');
    const result = await computeDiff(today, yesterday);

    expect(result.newModels).toHaveLength(3);
    expect(result.newModels.map((m) => m.modelName)).toEqual(
      expect.arrayContaining(['gpt-4o', 'claude-sonnet-4-5', 'gemini-2.0-flash']),
    );
    expect(result.priceChanges).toHaveLength(0);
    expect(result.totalModelsToday).toBe(3);
  });

  it('correctly identifies new models not present yesterday', async () => {
    setupSelectResults(
      [extractionGPT4o, extractionClaude, extractionGemini], // today
      [extractionGPT4oYesterday, extractionClaudeYesterday], // yesterday (no gemini)
      [], // today promotions
    );

    const { computeDiff } = await import('../../src/pipeline/article-diff');
    const result = await computeDiff(today, yesterday);

    expect(result.newModels).toHaveLength(1);
    expect(result.newModels[0].modelName).toBe('gemini-2.0-flash');
    expect(result.totalModelsToday).toBe(3);
  });

  it('correctly identifies price changes with accurate changePercent', async () => {
    // gpt-4o input: yesterday 3.0, today 2.5 => -16.67%
    // gpt-4o output: yesterday 12.0, today 10.0 => -16.67%
    setupSelectResults(
      [extractionGPT4o, extractionClaude], // today
      [extractionGPT4oPriceChangedYesterday, extractionClaudeYesterday], // yesterday
      [], // today promotions
    );

    const { computeDiff } = await import('../../src/pipeline/article-diff');
    const result = await computeDiff(today, yesterday);

    expect(result.priceChanges.length).toBeGreaterThanOrEqual(2);

    const inputChange = result.priceChanges.find(
      (c) => c.modelName === 'gpt-4o' && c.field === 'input',
    );
    expect(inputChange).toBeDefined();
    expect(inputChange!.oldPrice).toBe(3.0);
    expect(inputChange!.newPrice).toBe(2.5);
    expect(inputChange!.changePercent).toBeCloseTo(-16.67, 0);

    const outputChange = result.priceChanges.find(
      (c) => c.modelName === 'gpt-4o' && c.field === 'output',
    );
    expect(outputChange).toBeDefined();
    expect(outputChange!.oldPrice).toBe(12.0);
    expect(outputChange!.newPrice).toBe(10.0);
    expect(outputChange!.changePercent).toBeCloseTo(-16.67, 0);
  });

  it('returns empty results when both days have identical data', async () => {
    setupSelectResults(
      [extractionGPT4o, extractionClaude], // today
      [extractionGPT4oYesterday, extractionClaudeYesterday], // yesterday (same prices)
      [], // today promotions
    );

    const { computeDiff } = await import('../../src/pipeline/article-diff');
    const result = await computeDiff(today, yesterday);

    expect(result.newModels).toHaveLength(0);
    expect(result.priceChanges).toHaveLength(0);
    expect(result.totalModelsToday).toBe(2);
  });

  it('includes new promotions created today', async () => {
    setupSelectResults(
      [extractionGPT4o], // today extractions
      [extractionGPT4oYesterday], // yesterday extractions
      [promotionToday], // today promotions
    );

    const { computeDiff } = await import('../../src/pipeline/article-diff');
    const result = await computeDiff(today, yesterday);

    expect(result.newPromotions).toHaveLength(1);
    expect(result.newPromotions[0].modelPattern).toBe('gpt-4*');
    expect(result.newPromotions[0].description).toBe('Free tier: 10K tokens/day');
  });

  it('handles the case where today has no extractions (all empty, totalModelsToday = 0)', async () => {
    setupSelectResults(
      [], // today - no extractions
      [extractionGPT4oYesterday], // yesterday
      [], // today promotions
    );

    const { computeDiff } = await import('../../src/pipeline/article-diff');
    const result = await computeDiff(today, yesterday);

    expect(result.newModels).toHaveLength(0);
    expect(result.priceChanges).toHaveLength(0);
    expect(result.newPromotions).toHaveLength(0);
    expect(result.totalModelsToday).toBe(0);
  });
});
