// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FreeOffersSection } from './FreeOffersSection';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FreeOffersSection', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders section heading "Free Models" with count badge', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        freeOffers: [
          { id: 1, modelPattern: 'deepseek-v4-flash', description: 'Free on OpenModel', sourceName: 'OpenModel', sourceUrl: 'https://openmodel.ai', credits: null },
        ],
      }),
    });

    render(<FreeOffersSection date="2026-06-22" />);

    await waitFor(() => {
      expect(screen.getByText(/Free Models/)).toBeDefined();
      expect(screen.getByText('(1)')).toBeDefined();
    });
  });

  it('renders FreeOfferCard for each offer in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        freeOffers: [
          { id: 1, modelPattern: 'deepseek-v4-flash', description: 'Free on OpenModel', sourceName: 'OpenModel', sourceUrl: 'https://openmodel.ai', credits: null },
          { id: 2, modelPattern: 'cohere-north-mini', description: 'Free on OpenRouter', sourceName: 'OpenRouter', sourceUrl: 'https://openrouter.ai', credits: null },
        ],
      }),
    });

    render(<FreeOffersSection date="2026-06-22" />);

    await waitFor(() => {
      expect(screen.getByText('deepseek-v4-flash')).toBeDefined();
      expect(screen.getByText('cohere-north-mini')).toBeDefined();
    });
  });

  it('returns null (renders nothing) when freeOffers array is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ freeOffers: [] }),
    });

    const { container } = render(<FreeOffersSection date="2026-06-22" />);

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('shows error message when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<FreeOffersSection date="2026-06-22" />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load free offers')).toBeDefined();
    });
  });

  it('shows loading skeleton before data loads', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // Never resolves

    const { container } = render(<FreeOffersSection date="2026-06-22" />);

    // Should show skeleton with pulse animation
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('section heading uses green text class', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        freeOffers: [
          { id: 1, modelPattern: 'test', description: 'test', sourceName: 'test', sourceUrl: 'https://test.com', credits: null },
        ],
      }),
    });

    render(<FreeOffersSection date="2026-06-22" />);

    await waitFor(() => {
      const heading = screen.getByText(/Free Models/);
      expect(heading.className).toContain('text-green-600');
    });
  });

  it('grid uses responsive classes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        freeOffers: [
          { id: 1, modelPattern: 'test', description: 'test', sourceName: 'test', sourceUrl: 'https://test.com', credits: null },
        ],
      }),
    });

    const { container } = render(<FreeOffersSection date="2026-06-22" />);

    await waitFor(() => {
      const grid = container.querySelector('.grid');
      expect(grid).not.toBeNull();
      expect(grid!.className).toContain('grid-cols-1');
      expect(grid!.className).toContain('md:grid-cols-2');
      expect(grid!.className).toContain('lg:grid-cols-3');
    });
  });
});
