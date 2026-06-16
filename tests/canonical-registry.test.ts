import { describe, it, expect, beforeEach } from 'vitest';
import { CanonicalRegistry } from '../src/lib/canonical-registry';

/**
 * CanonicalRegistry Unit Tests
 *
 * Note: These tests are integration tests with a real database.
 * They verify the core functionality of the registry.
 */

describe('CanonicalRegistry', () => {
  let registry: CanonicalRegistry;
  // Use a unique provider and model name for each test to avoid conflicts
  let testProviderName: string;
  let testModelName: string;

  beforeEach(() => {
    registry = new CanonicalRegistry();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    testProviderName = `test_provider_${timestamp}_${randomId}`;
    testModelName = `test_model_${timestamp}_${randomId}`;
  });

  describe('register', () => {
    it('should create new canonical model for new extraction', async () => {
      const result = await registry.register(
        testProviderName,
        'model-1',
        {
          modelName: testModelName,
          confidence: 'verified',
          contextWindow: 128000,
        },
        'tier1',
      );

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return existing canonical_id when provider model ID matches', async () => {
      // Register first
      const firstId = await registry.register(
        testProviderName,
        'gpt-4o-unique-1',
        {
          modelName: testModelName,
          confidence: 'verified',
          contextWindow: 128000,
        },
        'tier1',
      );

      // Register again with same provider model ID
      const secondId = await registry.register(
        testProviderName,
        'gpt-4o-unique-1',
        {
          modelName: testModelName,
          confidence: 'verified',
          contextWindow: 128000,
        },
        'tier1',
      );

      // Should return the same ID
      expect(secondId).toBe(firstId);
    });
  });

  describe('resolve', () => {
    it('should resolve model by provider model ID', async () => {
      const modelId = await registry.register(
        testProviderName,
        'model-by-id-1',
        {
          modelName: testModelName,
          confidence: 'verified',
        },
        'tier1',
      );

      const result = await registry.resolve(testProviderName, testModelName, 'model-by-id-1');

      expect(result).not.toBeNull();
      expect(result?.canonical_id).toBe(modelId);
      expect(result?.canonical_name).toBe(testModelName);
    });

    it('should resolve model by alias', async () => {
      const modelId = await registry.register(
        testProviderName,
        'model-by-alias-1',
        {
          modelName: `${testModelName}-alias`,
          confidence: 'verified',
        },
        'tier1',
      );

      // Add alias
      const aliasName = `${testModelName}-alias-2`;
      await registry.addAlias(modelId, aliasName);

      // Resolve by alias
      const result = await registry.resolve(testProviderName, aliasName);

      expect(result?.canonical_id).toBe(modelId);
    });

    it('should resolve model by normalized name', async () => {
      const modelId = await registry.register(
        testProviderName,
        'model-normalized-1',
        {
          modelName: `${testModelName}-normalized`,
          confidence: 'verified',
        },
        'tier1',
      );

      // Resolve with different casing
      const result = await registry.resolve(testProviderName, `${testModelName}-normalized`.toUpperCase());

      expect(result?.canonical_id).toBe(modelId);
    });

    it('should return null for unmatched model', async () => {
      const result = await registry.resolve(testProviderName, `${testModelName}-nonexistent`);

      expect(result).toBeNull();
    });
  });

  describe('addAlias', () => {
    it('should append alias to existing model', async () => {
      const modelId = await registry.register(
        testProviderName,
        'add-alias-1',
        {
          modelName: `${testModelName}-addAlias`,
          confidence: 'verified',
        },
        'tier1',
      );

      await registry.addAlias(modelId, `${testModelName}-addAlias-v2`);

      // Verify alias works
      const result = await registry.resolve(testProviderName, `${testModelName}-addAlias-v2`);
      expect(result?.canonical_id).toBe(modelId);
    });

    it('should not add duplicate alias', async () => {
      const modelId = await registry.register(
        testProviderName,
        'dup-alias-1',
        {
          modelName: `${testModelName}-dupAlias`,
          confidence: 'verified',
        },
        'tier1',
      );

      const alias = `${testModelName}-dupAlias-alias`;
      await registry.addAlias(modelId, alias);
      // Should not error when adding duplicate
      await registry.addAlias(modelId, alias);

      const result = await registry.resolve(testProviderName, alias);
      expect(result?.canonical_id).toBe(modelId);
    });
  });

  describe('recordRename', () => {
    it('should update canonical name and track in lineage', async () => {
      const oldName = `${testModelName}-old`;
      const newName = `${testModelName}-new`;

      const modelId = await registry.register(
        testProviderName,
        'rename-test-1',
        {
          modelName: oldName,
          confidence: 'verified',
        },
        'tier1',
      );

      await registry.recordRename(
        modelId,
        oldName,
        newName,
        'model_release',
      );

      // Verify new name is resolved
      const result = await registry.resolve(testProviderName, newName);
      expect(result?.canonical_id).toBe(modelId);

      // Verify old name is in aliases
      const oldNameResult = await registry.resolve(testProviderName, oldName);
      expect(oldNameResult?.canonical_id).toBe(modelId);
    });
  });

  describe('markDeprecated', () => {
    it('should mark model as deprecated', async () => {
      const modelId = await registry.register(
        testProviderName,
        'deprecated-1',
        {
          modelName: `${testModelName}-deprecated`,
          confidence: 'verified',
        },
        'tier1',
      );

      await registry.markDeprecated(modelId);

      // Verify deprecation was recorded
      const lineage = await registry.getLineage(modelId);
      expect(lineage).toBeTruthy();
      expect(lineage.length).toBeGreaterThan(0);
    });

    it('should mark model as replaced', async () => {
      const oldId = await registry.register(
        testProviderName,
        'replaced-old-1',
        {
          modelName: `${testModelName}-old-replaced`,
          confidence: 'verified',
        },
        'tier1',
      );

      const newId = await registry.register(
        testProviderName,
        'replaced-new-1',
        {
          modelName: `${testModelName}-new-replaced`,
          confidence: 'verified',
        },
        'tier1',
      );

      await registry.markDeprecated(oldId, newId);

      // Verify replacement was recorded
      const lineage = await registry.getLineage(oldId);
      expect(lineage).toBeTruthy();
    });
  });

  describe('getLineage', () => {
    it('should return full lineage history', async () => {
      const modelId = await registry.register(
        testProviderName,
        'lineage-test-1',
        {
          modelName: `${testModelName}-lineage`,
          confidence: 'verified',
        },
        'tier1',
      );

      // Add some events
      await registry.addAlias(modelId, `${testModelName}-lineage-v2`);

      const lineage = await registry.getLineage(modelId);

      expect(lineage).toBeTruthy();
      expect(lineage.length).toBeGreaterThanOrEqual(1);
      expect(lineage[0]).toHaveProperty('type');
    });
  });

  describe('error handling', () => {
    it('should throw error when adding alias to non-existent model', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(registry.addAlias(fakeId, 'alias')).rejects.toThrow();
    });

    it('should throw error when recording rename for non-existent model', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        registry.recordRename(fakeId, 'old', 'new', 'reason'),
      ).rejects.toThrow();
    });
  });

  describe('duplicate detection', () => {
    it('should not create duplicate when same provider model ID registered twice', async () => {
      const firstId = await registry.register(
        testProviderName,
        'dup-detection-1',
        {
          modelName: `${testModelName}-dup`,
          confidence: 'verified',
        },
        'tier1',
      );

      const secondId = await registry.register(
        testProviderName,
        'dup-detection-1',
        {
          modelName: `${testModelName}-dup-updated`,
          confidence: 'verified',
        },
        'tier1',
      );

      expect(secondId).toBe(firstId);
    });
  });
});
