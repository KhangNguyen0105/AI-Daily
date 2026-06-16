// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromotionsPageClient } from '../../app/components/PromotionsPageClient';
import { PromotionData } from '../../app/components/PromotionsList';

const mockPromotions: PromotionData[] = [
  {
    id: 1,
    modelPattern: 'gpt-4o',
    type: 'free_tier',
    description: 'Free tier available for GPT-4o',
    credits: '1000 tokens/day',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-12-31'),
    sourceUrl: 'https://openai.com',
  },
  {
    id: 2,
    modelPattern: 'claude-sonnet-4-5',
    type: 'promotion',
    description: '50% off Claude Sonnet',
    credits: null,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-10'), // Expired
    sourceUrl: null,
  },
  {
    id: 3,
    modelPattern: 'gemini-2.0-flash',
    type: 'beta',
    description: 'Beta access for Gemini 2.0 Flash',
    credits: '500 tokens/day',
    startDate: new Date('2026-06-01'),
    endDate: null, // No end date = active
    sourceUrl: 'https://ai.google.dev',
  },
];

describe('PromotionsPageClient', () => {
  it('renders page heading and subheading', () => {
    render(<PromotionsPageClient promotions={[]} />);
    expect(screen.getByText('Promotions & Free Tiers')).toBeDefined();
    expect(screen.getByText('Active promotions, beta trials, and free credits across all providers.')).toBeDefined();
  });

  it('renders empty state when no promotions', () => {
    render(<PromotionsPageClient promotions={[]} />);
    expect(screen.getByText('No active promotions')).toBeDefined();
  });

  it('renders filter pills', () => {
    render(<PromotionsPageClient promotions={mockPromotions} />);
    // Use getAllByText for texts that appear in both filters and badges
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getAllByText('Free Tier').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Promotion').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Beta').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all promotions by default', () => {
    render(<PromotionsPageClient promotions={mockPromotions} />);
    expect(screen.getByText('Free tier available for GPT-4o')).toBeDefined();
    expect(screen.getByText('50% off Claude Sonnet')).toBeDefined();
    expect(screen.getByText('Beta access for Gemini 2.0 Flash')).toBeDefined();
  });

  it('filters by type when filter pill clicked', () => {
    render(<PromotionsPageClient promotions={mockPromotions} />);

    // Click "Free Tier" filter button (use role to distinguish from badge)
    const freeTierButtons = screen.getAllByText('Free Tier');
    const filterButton = freeTierButtons.find(el => el.tagName === 'BUTTON');
    fireEvent.click(filterButton!);

    // Only free tier promotion should be visible
    expect(screen.getByText('Free tier available for GPT-4o')).toBeDefined();
    expect(screen.queryByText('50% off Claude Sonnet')).toBeNull();
    expect(screen.queryByText('Beta access for Gemini 2.0 Flash')).toBeNull();
  });

  it('sorts active promotions before expired', () => {
    render(<PromotionsPageClient promotions={mockPromotions} />);

    const cards = screen.getAllByText(/Free tier available|50% off|Beta access/);
    // Active promotions (GPT-4o, Gemini) should come before expired (Claude)
    expect(cards[0].textContent).toBe('Free tier available for GPT-4o');
    expect(cards[1].textContent).toBe('Beta access for Gemini 2.0 Flash');
    expect(cards[2].textContent).toBe('50% off Claude Sonnet');
  });
});
