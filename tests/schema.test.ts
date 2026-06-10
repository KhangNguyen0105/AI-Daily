import { describe, it, expect } from 'vitest';
import * as schema from '../src/db/schema';

describe('Database Schema', () => {
  describe('confidenceEnum', () => {
    it('should be defined with values verified, likely, low_confidence', () => {
      expect(schema.confidenceEnum).toBeDefined();
      // pgEnum returns an object with enumValues
      const enumDef = schema.confidenceEnum as any;
      expect(enumDef.enumValues).toEqual(['verified', 'likely', 'low_confidence']);
    });
  });

  describe('sources table', () => {
    it('should be defined', () => {
      expect(schema.sources).toBeDefined();
    });

    it('should have expected columns', () => {
      const columns = getColumns(schema.sources);
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('url');
      expect(columns).toContain('provider_type');
      expect(columns).toContain('is_active');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });
  });

  describe('rawData table', () => {
    it('should be defined', () => {
      expect(schema.rawData).toBeDefined();
    });

    it('should have expected columns', () => {
      const columns = getColumns(schema.rawData);
      expect(columns).toContain('id');
      expect(columns).toContain('source_id');
      expect(columns).toContain('url');
      expect(columns).toContain('evidence');
      expect(columns).toContain('crawled_at');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });
  });

  describe('extractions table', () => {
    it('should be defined', () => {
      expect(schema.extractions).toBeDefined();
    });

    it('should have expected columns', () => {
      const columns = getColumns(schema.extractions);
      expect(columns).toContain('id');
      expect(columns).toContain('raw_data_id');
      expect(columns).toContain('source_id');
      expect(columns).toContain('model_name');
      expect(columns).toContain('input_price_per_1m');
      expect(columns).toContain('output_price_per_1m');
      expect(columns).toContain('context_window');
      expect(columns).toContain('confidence');
      expect(columns).toContain('raw_evidence');
      expect(columns).toContain('collected_at');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });
  });

  describe('articles table', () => {
    it('should be defined', () => {
      expect(schema.articles).toBeDefined();
    });

    it('should have expected columns', () => {
      const columns = getColumns(schema.articles);
      expect(columns).toContain('id');
      expect(columns).toContain('title');
      expect(columns).toContain('content');
      expect(columns).toContain('published_at');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });
  });

  describe('pipelineRuns table', () => {
    it('should be defined', () => {
      expect(schema.pipelineRuns).toBeDefined();
    });

    it('should have expected columns', () => {
      const columns = getColumns(schema.pipelineRuns);
      expect(columns).toContain('id');
      expect(columns).toContain('status');
      expect(columns).toContain('started_at');
      expect(columns).toContain('completed_at');
      expect(columns).toContain('stats');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });
  });

  describe('practicalCosts table', () => {
    it('should be defined', () => {
      expect(schema.practicalCosts).toBeDefined();
    });

    it('should have expected columns', () => {
      const columns = getColumns(schema.practicalCosts);
      expect(columns).toContain('id');
      expect(columns).toContain('extraction_id');
      expect(columns).toContain('scenario_name');
      expect(columns).toContain('input_tokens');
      expect(columns).toContain('output_tokens');
      expect(columns).toContain('estimated_cost');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });
  });
});

/**
 * Extract column names from a Drizzle table object.
 * Drizzle tables have a [Symbol.for('drizzle:Columns')] property
 * or we can use Object.keys on the columns object.
 */
function getColumns(table: any): string[] {
  // Drizzle pgTable stores columns as own enumerable properties
  // that are PgColumn instances with a 'name' property
  const columns: string[] = [];
  for (const key of Object.keys(table)) {
    const col = table[key];
    if (col && typeof col === 'object' && 'name' in col) {
      columns.push(col.name);
    }
  }
  return columns;
}
