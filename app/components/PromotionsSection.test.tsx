// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PromotionsSection } from './PromotionsSection';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PromotionsSection', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders section heading "Promotions & Discounts" with count badge', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        promotions: [
          { id: 1, modelPattern: 'All Qwen Models', description: '20% off', sourceName: 'Dashscope', sourceUrl: 'https://dashscope.com', credits: null },
        ],
      }),
    });

    render(<PromotionsSection date="2026-06-22" />);

    await waitFor(() => {
      expect(screen.getByText(/Promotions & Discounts/)).toBeDefined();
      expect(screen.getByText('(1)')).toBeDefined();
    });
  });

  it('renders PromotionCard for each promotion in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        promotions: [
          { id: 1, modelPattern: 'Qwen Models', description: '20% off', sourceName: 'Dashscope', sourceUrl: 'https://dashscope.com', credits: null },
          { id: 2, modelPattern: 'Claude Models', description: '5% off', sourceName: 'Anthropic', sourceUrl: 'https://anthropic.com', credits: null },
        ],
      }),
    });

    render(<PromotionsSection date="2026-06-22" />);

    await waitFor(() => {
      expect(screen.getByText('Qwen Models')).toBeDefined();
      expect(screen.getByText('Claude Models')).toBeDefined();
    });
  });

  it('returns null (renders nothing) when promotions array is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ promotions: [] }),
    });

    const { container } = render(<PromotionsSection date="2026-06-22" />);

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('shows error message when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<PromotionsSection date="2026-06-22" />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load promotions')).toBeDefined();
    });
  });

  it('shows loading skeleton before data loads', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // Never resolves

    const { container } = render(<PromotionsSection date="2026-06-22" />);

    // Should show skeleton with pulse animation
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('section heading uses amber text class', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        promotions: [
          { id: 1, modelPattern: 'test', description: 'test', sourceName: 'test', sourceUrl: 'https://test.com', credits: null },
        ],
      }),
    });

    render(<PromotionsSection date="2026-06-22" />);

    await waitFor(() => {
      const heading = screen.getByText(/Promotions & Discounts/);
      expect(heading.className).toContain('text-amber-600');
    });
  });

  it('grid uses responsive classes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        promotions: [
          { id: 1, modelPattern: 'test', description: 'test', sourceName: 'test', sourceUrl: 'https://test.com', credits: null },
        ],
      }),
    });

    const { container } = render(<PromotionsSection date="2026-06-22" />);

    await waitFor(() => {
      const grid = container.querySelector('.grid');
      expect(grid).not.toBeNull();
      expect(grid!.className).toContain('grid-cols-1');
      expect(grid!.className).toContain('md:grid-cols-2');
      expect(grid!.className).toContain('lg:grid-cols-3');
    });
  });
});
