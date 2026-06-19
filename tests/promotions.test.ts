import { describe, it, expect } from 'vitest';
import { promotionTypeEnum } from '../src/db/schema';

describe('Promotion types', () => {
  it('should support free_trial as a promotion type', () => {
    expect(promotionTypeEnum.enumValues).toContain('free_trial');
  });

  it('should have exactly 4 promotion types', () => {
    expect(promotionTypeEnum.enumValues).toHaveLength(4);
  });
});
