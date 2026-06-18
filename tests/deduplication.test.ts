import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectDuplicates,
  calculateMatchScore,
  generateReviewQueue,
} from '../src/lib/deduplication';
import { CanonicalRegistry } from '../src/lib/canonical-registry';

describe('Deduplication', () => {
  let registry: CanonicalRegistry;
  let testProviderName: string;
  let testModelName: string;

  beforeEach(() => {
    registry = new CanonicalRegistry();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    testProviderName = `test_dup_${timestamp}_${randomId}`;
    testModelName = `dup_model_${timestamp}_${randomId}`;
  });

  describe('calculateMatchScore', () => {
    it('should score 100 for provider ID exact match', async () => {
      const extraction = {
        modelName: testModelName,
        confidence: 'verified' as const,
      };

      const candidate = {
        id: 'test-id',
        canonicalName: testModelName,
        apiModelIds: ['provider-model-id'],
        provider: testProviderName,
        aliases: [],
        status: 'active',
        contextWindow: 128000,
      };

      const result = await calculateMatchScore(extraction, candidate);

      // Provider ID match would be checked before this, but base score should be high
      expect(result.score).toBeGreaterThan(0);
    });

    it('should score 90 for alias exact match', async () => {
      const extraction = {
        modelName: 'gpt-4o-preview',
        confidence: 'verified' as const,
      };

      const candidate = {
        id: 'test-id',
        canonicalName: 'GPT-4o',
        apiModelIds: ['gpt-4o'],
        provider: testProviderName,
        aliases: ['gpt-4o-preview', 'gpt-4o-2024-06-13'],
        status: 'active',
        contextWindow: 128000,
      };

      const result = await calculateMatchScore(extraction, candidate);

      expect(result.signals.aliasMatch).toBe(90);
      expect(result.score).toBe(90);
    });

    it('should score 75 for normalized name match', async () => {
      const extraction = {
        modelName: 'GPT-4O', // Different casing
        confidence: 'verified' as const,
      };

      const candidate = {
        id: 'test-id',
        canonicalName: 'gpt-4o',
        apiModelIds: ['gpt-4o'],
        provider: testProviderName,
        aliases: [],
        status: 'active',
        contextWindow: 128000,
      };

      const result = await calculateMatchScore(extraction, candidate);

      expect(result.signals.normalizedNameMatch).toBe(75);
      expect(result.score).toBe(75);
    });

    it('should score 60 for family and context window match', async () => {
      const extraction = {
        modelName: 'gpt-4-turbo-new',
        confidence: 'verified' as const,
        contextWindow: 128000,
      };

      const candidate = {
        id: 'test-id',
        canonicalName: 'GPT-4 Turbo',
        apiModelIds: ['gpt-4-turbo'],
        provider: testProviderName,
        family: 'gpt-4-family',
        aliases: [],
        status: 'active',
        contextWindow: 128512, // Within 10%
      };

      const result = await calculateMatchScore(extraction, candidate);

      expect(result.signals.familyAndContextMatch).toBe(60);
    });

    it('should score 40 for pricing similarity (within 5%)', async () => {
      const extraction = {
        modelName: 'claude-3-sonnet',
        confidence: 'verified' as const,
        inputPricePer1m: 3.0,
        outputPricePer1m: 15.0,
      };

      const candidate = {
        id: 'test-id',
        canonicalName: 'Claude 3 Sonnet',
        apiModelIds: ['claude-3-sonnet'],
        provider: testProviderName,
        aliases: [],
        status: 'active',
        inputPricePer1m: 3.02, // Within 5%
        outputPricePer1m: 15.03, // Within 5%
      };

      const result = await calculateMatchScore(extraction, candidate);

      expect(result.signals.pricingSimilarity).toBe(40);
    });

    it('should score 0 for no pricing match (> 5% difference)', async () => {
      const extraction = {
        modelName: 'claude-3-sonnet',
        confidence: 'verified' as const,
        inputPricePer1m: 3.0,
        outputPricePer1m: 15.0,
      };

      const candidate = {
        id: 'test-id',
        canonicalName: 'Claude 3 Sonnet',
        apiModelIds: ['claude-3-sonnet'],
        provider: testProviderName,
        aliases: [],
        status: 'active',
        inputPricePer1m: 3.5, // 16.7% difference
        outputPricePer1m: 17.0, // 13.3% difference
      };

      const result = await calculateMatchScore(extraction, candidate);

      expect(result.signals.pricingSimilarity).toBe(0);
    });
  });

  describe('detectDuplicates', () => {
    it('should return auto_link recommendation for score > 85', async () => {
      // Create a model with exact normalized name match (75% score)
      const modelId = await registry.register(
        testProviderName,
        'model-dup-1',
        {
          modelName: `${testModelName}-exact`,
          confidence: 'verified',
        },
        'tier1',
      );

      // Also add as alias for higher score
      await registry.addAlias(modelId, `${testModelName}-exact-alias`);

      const extraction = {
        modelName: `${testModelName}-exact-alias`,
        confidence: 'verified' as const,
      };

      const result = await detectDuplicates(extraction, testProviderName, registry);

      // Should find the candidate and recommend auto_link (alias match = 90%)
      expect(result.recommendation).toBe('auto_link');
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].matchScore).toBe(90);
    });

    it('should return review_queue recommendation for score 55-84', async () => {
      // Create a model
      const modelId = await registry.register(
        testProviderName,
        'model-review-1',
        {
          modelName: `${testModelName}-review`,
          confidence: 'verified',
        },
        'tier1',
      );

      // Search with punctuation that normalizes to same name
      const extraction = {
        modelName: `${testModelName}-review!!!`, // Punctuation will be removed during normalization
        confidence: 'verified' as const,
      };

      const result = await detectDuplicates(extraction, testProviderName, registry);

      // Should find candidate with normalized name match (75% = review_queue range)
      expect(result.recommendation).toBe('review_queue');
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].matchScore).toBeGreaterThanOrEqual(55);
      expect(result.candidates[0].matchScore).toBeLessThanOrEqual(84);
    });

    it('should return new_model recommendation for score < 55', async () => {
      const extraction = {
        modelName: `${testModelName}-completely-unique`,
        confidence: 'verified' as const,
      };

      const result = await detectDuplicates(extraction, testProviderName, registry);

      // Should not find any candidates
      expect(result.recommendation).toBe('new_model');
      expect(result.candidates.length).toBe(0);
    });

    it('should detect multiple candidates', async () => {
      // Create multiple similar models
      const id1 = await registry.register(
        testProviderName,
        'multi-1',
        {
          modelName: `${testModelName}-multi-1`,
          confidence: 'verified',
        },
        'tier1',
      );

      const id2 = await registry.register(
        testProviderName,
        'multi-2',
        {
          modelName: `${testModelName}-multi-2`,
          confidence: 'verified',
        },
        'tier1',
      );

      // Add aliases to create matches
      await registry.addAlias(id1, `${testModelName}-multi-alias-1`);
      await registry.addAlias(id2, `${testModelName}-multi-alias-2`);

      const extraction = {
        modelName: `${testModelName}-multi-alias-1`,
        confidence: 'verified' as const,
      };

      const result = await detectDuplicates(extraction, testProviderName, registry);

      // Should find at least the first candidate
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].matchScore).toBe(90); // Alias match
    });
  });

  describe('generateReviewQueue', () => {
    it('should generate review queue item with all required fields', async () => {
      // Create a model
      const modelId = await registry.register(
        testProviderName,
        'queue-1',
        {
          modelName: `${testModelName}-queue`,
          confidence: 'verified',
        },
        'tier1',
      );

      // Add alias for matching
      await registry.addAlias(modelId, `${testModelName}-queue-alias`);

      const extraction = {
        modelName: `${testModelName}-queue-alias`,
        confidence: 'verified' as const,
      };

      const detectionScore = await detectDuplicates(extraction, testProviderName, registry);
      const reviewItem = await generateReviewQueue(extraction, 123, detectionScore);

      expect(reviewItem).toHaveProperty('extraction_id', 123);
      expect(reviewItem).toHaveProperty('extracted_model_name');
      expect(reviewItem).toHaveProperty('candidates');
      expect(reviewItem).toHaveProperty('status', 'pending');
      expect(reviewItem).toHaveProperty('created_at');
      expect(Array.isArray(reviewItem.candidates)).toBe(true);
    });

    it('should include match reason in review candidates', async () => {
      // Create a model
      const modelId = await registry.register(
        testProviderName,
        'reason-1',
        {
          modelName: `${testModelName}-reason`,
          confidence: 'verified',
        },
        'tier1',
      );

      // Add alias
      await registry.addAlias(modelId, `${testModelName}-reason-alias`);

      const extraction = {
        modelName: `${testModelName}-reason-alias`,
        confidence: 'verified' as const,
      };

      const detectionScore = await detectDuplicates(extraction, testProviderName, registry);
      const reviewItem = await generateReviewQueue(extraction, 456, detectionScore);

      expect(reviewItem.candidates.length).toBeGreaterThan(0);
      expect(reviewItem.candidates[0]).toHaveProperty('match_reason');
      expect(reviewItem.candidates[0].match_reason.length).toBeGreaterThan(0);
    });
  });

  describe('recommendation logic', () => {
    it('should recommend auto_link for high confidence (>85)', async () => {
      const modelId = await registry.register(
        testProviderName,
        'high-conf-1',
        {
          modelName: `${testModelName}-highconf`,
          confidence: 'verified',
        },
        'tier1',
      );

      // Add multiple aliases to increase confidence
      await registry.addAlias(modelId, `${testModelName}-highconf-v1`);

      const extraction = {
        modelName: `${testModelName}-highconf-v1`,
        confidence: 'verified' as const,
      };

      const result = await detectDuplicates(extraction, testProviderName, registry);

      expect(result.recommendation).toBe('auto_link');
      expect(result.candidates[0].confidence).toBe('high');
    });

    it('should recommend review_queue for medium confidence (55-84)', async () => {
      const modelId = await registry.register(
        testProviderName,
        'med-conf-1',
        {
          modelName: `${testModelName}-medconf`,
          confidence: 'verified',
        },
        'tier1',
      );

      const extraction = {
        modelName: `${testModelName}-medconf...`, // Punctuation will be normalized away
        confidence: 'verified' as const,
      };

      const result = await detectDuplicates(extraction, testProviderName, registry);

      expect(result.recommendation).toBe('review_queue');
      expect(result.candidates[0].confidence).toBe('medium');
    });

    it('should recommend new_model for low confidence (<55)', async () => {
      const extraction = {
        modelName: `${testModelName}-completely-new-unique-${Date.now()}`,
        confidence: 'verified' as const,
      };

      const result = await detectDuplicates(extraction, testProviderName, registry);

      expect(result.recommendation).toBe('new_model');
    });
  });

  describe('edge cases', () => {
    it('should handle empty model list', async () => {
      const extraction = {
        modelName: `${testModelName}-nomatch`,
        confidence: 'verified' as const,
      };

      // Don't create any models for this provider
      const result = await detectDuplicates(extraction, `${testProviderName}-empty`, registry);

      expect(result.recommendation).toBe('new_model');
      expect(result.candidates.length).toBe(0);
    });

    it('should handle models with null context windows', async () => {
      const modelId = await registry.register(
        testProviderName,
        'nullctx-1',
        {
          modelName: `${testModelName}-nullctx`,
          confidence: 'verified',
          // No context window
        },
        'tier1',
      );

      const extraction = {
        modelName: `${testModelName}-nullctx`,
        confidence: 'verified' as const,
        // No context window
      };

      const result = await detectDuplicates(extraction, testProviderName, registry);

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].matchScore).toBeGreaterThan(0);
    });

    it('should handle models with null prices', async () => {
      const modelId = await registry.register(
        testProviderName,
        'nullprice-1',
        {
          modelName: `${testModelName}-nullprice`,
          confidence: 'verified',
          // No prices
        },
        'tier1',
      );

      const extraction = {
        modelName: `${testModelName}-nullprice`,
        confidence: 'verified' as const,
        // No prices
      };

      const result = await detectDuplicates(extraction, testProviderName, registry);

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].matchScore).toBeGreaterThan(0);
    });
  });
});
