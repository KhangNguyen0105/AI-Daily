// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromotionCard } from '../../app/components/PromotionCard';
import { PromotionsPageClient } from '../../app/components/PromotionsPageClient';

// Mock Date.now() for consistent timezone comparison (Pitfall 4)
const MOCK_NOW = new Date('2026-06-15T12:00:00Z').getTime();

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(MOCK_NOW);
});

describe('PromotionCard', () => {
  it('renders active card with white background', () => {
    const promo = {
      id: 1,
      modelPattern: 'gpt-4o*',
      type: 'free_tier' as const,
      description: 'Free tier with 10K tokens/day',
      credits: '10K tokens/day',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'), // future date = active
      sourceUrl: null,
      sourceName: 'OpenAI',
    };

    render(<PromotionCard promo={promo} />);

    // Active card should have white background, not gray
    const card = screen.getByText('Free tier with 10K tokens/day').closest('div[class*="border"]');
    expect(card).not.toBeNull();
    expect(card!.className).toContain('bg-white');
    expect(card!.className).not.toContain('opacity-60');
  });

  it('renders expired card with opacity-60', () => {
    const promo = {
      id: 2,
      modelPattern: 'claude-*',
      type: 'promotion' as const,
      description: 'Expired promotion',
      credits: null,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-01'), // past date = expired
      sourceUrl: null,
      sourceName: 'Anthropic',
    };

    render(<PromotionCard promo={promo} />);

    const card = screen.getByText('Expired promotion').closest('div[class*="border"]');
    expect(card).not.toBeNull();
    expect(card!.className).toContain('opacity-60');
    expect(card!.className).toContain('bg-gray-50');
  });

  it('shows correct type badge text and color class for free_tier', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'free_tier' as const,
      description: 'Free tier offer',
      credits: null,
      startDate: null,
      endDate: null,
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);

    const badge = screen.getByText('free_tier');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
  });

  it('shows correct type badge color for promotion', () => {
    const promo = {
      id: 2,
      modelPattern: '*',
      type: 'promotion' as const,
      description: 'Special offer',
      credits: null,
      startDate: null,
      endDate: null,
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);

    const badge = screen.getByText('promotion');
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-800');
  });

  it('shows correct type badge color for beta', () => {
    const promo = {
      id: 3,
      modelPattern: '*',
      type: 'beta' as const,
      description: 'Beta access',
      credits: null,
      startDate: null,
      endDate: null,
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);

    const badge = screen.getByText('beta');
    expect(badge.className).toContain('bg-purple-100');
    expect(badge.className).toContain('text-purple-800');
  });

  it('shows days remaining for future endDate', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'promotion' as const,
      description: 'Limited time offer',
      credits: null,
      startDate: null,
      endDate: new Date('2026-06-25T12:00:00Z'), // 10 days from mock now
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);
    expect(screen.getByText('10 days remaining')).toBeDefined();
  });

  it('shows "Expires tomorrow" when endDate is 1 day away', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'promotion' as const,
      description: 'Almost expired',
      credits: null,
      startDate: null,
      endDate: new Date('2026-06-16T12:00:00Z'), // 1 day from mock now
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);
    expect(screen.getByText('Expires tomorrow')).toBeDefined();
  });

  it('shows "Expires today" when endDate is today', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'promotion' as const,
      description: 'Last day to claim',
      credits: null,
      startDate: null,
      endDate: new Date('2026-06-15T12:00:00Z'), // same as mock now
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);
    expect(screen.getByText('Expires today')).toBeDefined();
  });

  it('shows "Expired" when endDate is in the past', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'promotion' as const,
      description: 'Old promotion',
      credits: null,
      startDate: null,
      endDate: new Date('2026-06-10T12:00:00Z'), // past
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);
    expect(screen.getByText('Expired')).toBeDefined();
  });

  it('shows no days remaining when endDate is null', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'free_tier' as const,
      description: 'Ongoing free tier',
      credits: null,
      startDate: null,
      endDate: null,
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);
    // Should not show any days remaining text
    expect(screen.queryByText(/days remaining/)).toBeNull();
    expect(screen.queryByText(/Expires/)).toBeNull();
    expect(screen.queryByText('Expired')).toBeNull();
  });

  it('displays credits when present', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'free_tier' as const,
      description: 'Free tier',
      credits: '$100 free credits',
      startDate: null,
      endDate: null,
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);
    expect(screen.getByText(/Credits:.*\$100 free credits/)).toBeDefined();
  });

  it('does not display credits when null', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'free_tier' as const,
      description: 'Free tier',
      credits: null,
      startDate: null,
      endDate: null,
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);
    expect(screen.queryByText(/Credits:/)).toBeNull();
  });

  it('renders source link when sourceUrl is safe', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'promotion' as const,
      description: 'Special offer',
      credits: null,
      startDate: null,
      endDate: null,
      sourceUrl: 'https://example.com/promo',
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);
    const link = screen.getByText('View details');
    expect(link.getAttribute('href')).toBe('https://example.com/promo');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('does not render source link when sourceUrl is unsafe', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'promotion' as const,
      description: 'Special offer',
      credits: null,
      startDate: null,
      endDate: null,
      sourceUrl: 'javascript:alert(1)',
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);
    expect(screen.queryByText('View details')).toBeNull();
  });

  it('does not render source link when sourceUrl is null', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'promotion' as const,
      description: 'Special offer',
      credits: null,
      startDate: null,
      endDate: null,
      sourceUrl: null,
      sourceName: null,
    };

    render(<PromotionCard promo={promo} />);
    expect(screen.queryByText('View details')).toBeNull();
  });

  it('displays provider name when sourceName is present', () => {
    const promo = {
      id: 1,
      modelPattern: '*',
      type: 'free_tier' as const,
      description: 'Free tier',
      credits: null,
      startDate: null,
      endDate: null,
      sourceUrl: null,
      sourceName: 'OpenAI',
    };

    render(<PromotionCard promo={promo} />);
    expect(screen.getByText('OpenAI')).toBeDefined();
  });
});

describe('PromotionsPageClient', () => {
  const basePromos = [
    {
      id: 1,
      modelPattern: 'gpt-4o*',
      type: 'free_tier' as const,
      description: 'Free tier for GPT-4o',
      credits: '10K tokens/day',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      sourceUrl: null,
      sourceName: 'OpenAI',
    },
    {
      id: 2,
      modelPattern: 'claude-*',
      type: 'promotion' as const,
      description: 'Claude promotion',
      credits: null,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-01'), // expired
      sourceUrl: null,
      sourceName: 'Anthropic',
    },
    {
      id: 3,
      modelPattern: 'gemini-*',
      type: 'beta' as const,
      description: 'Gemini beta access',
      credits: null,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-08-01'),
      sourceUrl: null,
      sourceName: 'Google',
    },
  ];

  it('renders page heading and subheading', () => {
    render(<PromotionsPageClient promotions={[]} />);
    expect(screen.getByText('Promotions & Free Tiers')).toBeDefined();
    expect(
      screen.getByText(
        'Active promotions, beta trials, and free credits across all providers.'
      )
    ).toBeDefined();
  });

  it('renders filter pills: All, Free Tier, Promotion, Beta', () => {
    render(<PromotionsPageClient promotions={basePromos} />);
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('Free Tier')).toBeDefined();
    expect(screen.getByText('Promotion')).toBeDefined();
    expect(screen.getByText('Beta')).toBeDefined();
  });

  it('renders all promotions by default (All filter)', () => {
    render(<PromotionsPageClient promotions={basePromos} />);
    expect(screen.getByText('Free tier for GPT-4o')).toBeDefined();
    expect(screen.getByText('Claude promotion')).toBeDefined();
    expect(screen.getByText('Gemini beta access')).toBeDefined();
  });

  it('sorts active promotions before expired ones', () => {
    const { container } = render(<PromotionsPageClient promotions={basePromos} />);
    const cards = container.querySelectorAll('div[class*="border"][class*="rounded-lg"][class*="p-4"]');

    // First two should be active (no opacity-60), last should be expired (opacity-60)
    expect(cards.length).toBe(3);
    // Active cards: GPT-4o free_tier (endDate 2026-12-31) and Gemini beta (endDate 2026-08-01)
    // Expired card: Claude promotion (endDate 2026-03-01)
    expect(cards[2].className).toContain('opacity-60');
  });

  it('shows empty state when no promotions exist', () => {
    render(<PromotionsPageClient promotions={[]} />);
    expect(screen.getByText('No active promotions')).toBeDefined();
    expect(
      screen.getByText(
        'Promotions and free tier offers will appear here as providers announce them.'
      )
    ).toBeDefined();
  });

  it('shows empty state when filter returns no results', () => {
    // Only free_tier and beta promos, no promotion type
    const promos = [
      {
        id: 1,
        modelPattern: '*',
        type: 'free_tier' as const,
        description: 'Free tier',
        credits: null,
        startDate: null,
        endDate: null,
        sourceUrl: null,
        sourceName: null,
      },
    ];

    render(<PromotionsPageClient promotions={promos} />);
    // Click the "Promotion" filter using fireEvent
    const promotionFilter = screen.getByText('Promotion');
    fireEvent.click(promotionFilter);

    // Should show empty state for that filter
    expect(screen.getByText('No active promotions')).toBeDefined();
  });

  it('uses responsive grid layout', () => {
    const { container } = render(<PromotionsPageClient promotions={basePromos} />);
    const grid = container.querySelector('.grid');
    expect(grid).not.toBeNull();
    expect(grid!.className).toContain('grid-cols-1');
    expect(grid!.className).toContain('md:grid-cols-2');
    expect(grid!.className).toContain('lg:grid-cols-3');
  });

  it('uses max-w-6xl container per UI-SPEC', () => {
    const { container } = render(<PromotionsPageClient promotions={basePromos} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('max-w-6xl');
    expect(wrapper.className).toContain('mx-auto');
  });
});
