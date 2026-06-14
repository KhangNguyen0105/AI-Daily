// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PricingGrid } from '../../app/components/PricingGrid';

describe('PricingGrid', () => {
  it('renders 3 pricing cards', () => {
    render(
      <PricingGrid
        inputPrice={2.5}
        outputPrice={10}
        contextWindow={128000}
        currency="usd"
        exchangeRate={25500}
      />
    );

    expect(screen.getByText('Input $/1M')).toBeDefined();
    expect(screen.getByText('Output $/1M')).toBeDefined();
    expect(screen.getByText('Context Window')).toBeDefined();
  });

  it('formats prices in USD', () => {
    render(
      <PricingGrid
        inputPrice={2.5}
        outputPrice={10}
        contextWindow={128000}
        currency="usd"
        exchangeRate={25500}
      />
    );

    expect(screen.getByText('$2.50')).toBeDefined();
    expect(screen.getByText('$10.00')).toBeDefined();
  });

  it('formats prices in VND', () => {
    render(
      <PricingGrid
        inputPrice={2.5}
        outputPrice={10}
        contextWindow={128000}
        currency="vnd"
        exchangeRate={25500}
      />
    );

    // 2.5 * 25500 = 63750
    expect(screen.getByText(/63.*750.*₫/)).toBeDefined();
  });

  it('shows N/A for null prices', () => {
    render(
      <PricingGrid
        inputPrice={null}
        outputPrice={null}
        contextWindow={null}
        currency="usd"
        exchangeRate={25500}
      />
    );

    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThanOrEqual(3);
  });

  it('formats context window in K notation', () => {
    render(
      <PricingGrid
        inputPrice={2.5}
        outputPrice={10}
        contextWindow={128000}
        currency="usd"
        exchangeRate={25500}
      />
    );

    expect(screen.getByText('128K')).toBeDefined();
  });

  it('formats context window in M notation', () => {
    render(
      <PricingGrid
        inputPrice={2.5}
        outputPrice={10}
        contextWindow={1000000}
        currency="usd"
        exchangeRate={25500}
      />
    );

    expect(screen.getByText('1M')).toBeDefined();
  });
});
