// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PromotionsList } from '../../app/components/PromotionsList';

describe('PromotionsList', () => {
  it('shows empty state when no promotions exist', () => {
    render(<PromotionsList promotions={[]} />);

    expect(
      screen.getByText('No active promotions or free tier offers.')
    ).toBeDefined();
  });

  it('renders active promotion with green styling', () => {
    const promotions = [
      {
        id: 1,
        modelPattern: 'gpt-4o*',
        type: 'free_tier' as const,
        description: 'Free tier with 10K tokens/day',
        credits: '10K tokens/day',
        startDate: new Date('2026-01-01'),
        endDate: null, // no end date = active
        sourceUrl: 'https://openai.com',
      },
    ];

    render(<PromotionsList promotions={promotions} />);

    expect(screen.getByText('Free tier with 10K tokens/day')).toBeDefined();
    expect(screen.getByText(/Credits:.*10K tokens\/day/)).toBeDefined();
    // Active promotions should have green border
    const promotionEl = screen.getByText('Free tier with 10K tokens/day').closest('[class*="green"]');
    expect(promotionEl).not.toBeNull();
  });

  it('renders expired promotion with gray styling', () => {
    const promotions = [
      {
        id: 2,
        modelPattern: 'claude-*',
        type: 'promotion' as const,
        description: 'Beta access expired',
        credits: null,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-01'), // past date = expired
        sourceUrl: null,
      },
    ];

    render(<PromotionsList promotions={promotions} />);

    expect(screen.getByText('Beta access expired')).toBeDefined();
    // Expired promotions should have gray styling
    const promotionEl = screen.getByText('Beta access expired').closest('[class*="gray"]');
    expect(promotionEl).not.toBeNull();
  });

  it('renders type badge for each promotion', () => {
    const promotions = [
      {
        id: 1,
        modelPattern: '*',
        type: 'free_tier' as const,
        description: 'Free tier offer',
        credits: null,
        startDate: null,
        endDate: null,
        sourceUrl: null,
      },
      {
        id: 2,
        modelPattern: '*',
        type: 'beta' as const,
        description: 'Beta access',
        credits: null,
        startDate: null,
        endDate: null,
        sourceUrl: null,
      },
    ];

    render(<PromotionsList promotions={promotions} />);

    expect(screen.getByText('free_tier')).toBeDefined();
    expect(screen.getByText('beta')).toBeDefined();
  });

  it('renders source link when sourceUrl is provided', () => {
    const promotions = [
      {
        id: 1,
        modelPattern: '*',
        type: 'promotion' as const,
        description: 'Special offer',
        credits: null,
        startDate: null,
        endDate: null,
        sourceUrl: 'https://example.com/promo',
      },
    ];

    render(<PromotionsList promotions={promotions} />);

    const link = screen.getByText('View details');
    expect(link.getAttribute('href')).toBe('https://example.com/promo');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
