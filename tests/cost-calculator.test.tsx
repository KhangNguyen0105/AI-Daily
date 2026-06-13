// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CostCalculator } from '../app/components/CostCalculator';
import type { PricingRow } from '../app/components/PricingTable';

/** Mock data: models with valid pricing, sorted cheap to expensive by total cost. */
function createMockData(): PricingRow[] {
  return [
    {
      id: 1,
      modelName: 'gpt-4o-mini',
      inputPricePer1m: 0.15,
      outputPricePer1m: 0.6,
      contextWindow: 128000,
      confidence: 'verified',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'OpenAI',
      sourceUrl: 'https://openai.com',
    },
    {
      id: 2,
      modelName: 'claude-3.5-sonnet',
      inputPricePer1m: 3,
      outputPricePer1m: 15,
      contextWindow: 200000,
      confidence: 'verified',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'Anthropic',
      sourceUrl: 'https://anthropic.com',
    },
    {
      id: 3,
      modelName: 'gpt-4o',
      inputPricePer1m: 2.5,
      outputPricePer1m: 10,
      contextWindow: 128000,
      confidence: 'likely',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'OpenAI',
      sourceUrl: 'https://openai.com',
    },
    {
      id: 4,
      modelName: 'gemini-2.0-flash',
      inputPricePer1m: 0.1,
      outputPricePer1m: 0.4,
      contextWindow: 1000000,
      confidence: 'verified',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'Google',
      sourceUrl: 'https://google.com',
    },
  ];
}

/** Mock data with null pricing (should be excluded). */
function createDataWithNulls(): PricingRow[] {
  return [
    {
      id: 1,
      modelName: 'gpt-4o-mini',
      inputPricePer1m: 0.15,
      outputPricePer1m: 0.6,
      contextWindow: 128000,
      confidence: 'verified',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'OpenAI',
      sourceUrl: 'https://openai.com',
    },
    {
      id: 2,
      modelName: 'unknown-model',
      inputPricePer1m: null,
      outputPricePer1m: 10,
      contextWindow: 128000,
      confidence: 'low_confidence',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'Unknown',
      sourceUrl: null,
    },
    {
      id: 3,
      modelName: 'another-null',
      inputPricePer1m: 5,
      outputPricePer1m: null,
      contextWindow: 128000,
      confidence: 'low_confidence',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'Unknown',
      sourceUrl: null,
    },
  ];
}

describe('CostCalculator', () => {
  describe('scenario buttons', () => {
    it('renders 4 scenario buttons', () => {
      render(<CostCalculator data={[]} currency="usd" />);
      const buttons = screen.getAllByRole('tab');
      expect(buttons).toHaveLength(4);
    });

    it('renders correct scenario names', () => {
      render(<CostCalculator data={[]} currency="usd" />);
      expect(screen.getByRole('tab', { name: '10 Long Prompts' })).toBeDefined();
      expect(screen.getByRole('tab', { name: '100 LeetCode Hard Tasks' })).toBeDefined();
      expect(screen.getByRole('tab', { name: 'Summarize 100-Page Document' })).toBeDefined();
      expect(screen.getByRole('tab', { name: '1 Coding-Agent Session' })).toBeDefined();
    });

    it('first scenario is selected by default', () => {
      render(<CostCalculator data={[]} currency="usd" />);
      const firstTab = screen.getByRole('tab', { name: '10 Long Prompts' });
      expect(firstTab.getAttribute('aria-selected')).toBe('true');
    });

    it('clicking a scenario updates selection', async () => {
      const user = userEvent.setup();
      render(<CostCalculator data={[]} currency="usd" />);

      const codingAgentTab = screen.getByRole('tab', { name: '1 Coding-Agent Session' });
      await user.click(codingAgentTab);

      expect(codingAgentTab.getAttribute('aria-selected')).toBe('true');
      const firstTab = screen.getByRole('tab', { name: '10 Long Prompts' });
      expect(firstTab.getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('ranked model list', () => {
    it('models are ranked cheapest first', () => {
      const data = createMockData();
      render(<CostCalculator data={data} currency="usd" />);

      const rows = screen.getAllByText(/^#\d+$/);
      expect(rows[0].textContent).toBe('#1');
      expect(rows[1].textContent).toBe('#2');
      expect(rows[2].textContent).toBe('#3');
      expect(rows[3].textContent).toBe('#4');
    });

    it('cheapest model has green highlight class', () => {
      const data = createMockData();
      const { container } = render(<CostCalculator data={data} currency="usd" />);

      const firstRow = container.querySelector('.border-green-500');
      expect(firstRow).not.toBeNull();
      expect(firstRow!.classList.contains('bg-green-50')).toBe(true);
    });

    it('other models do not have green highlight', () => {
      const data = createMockData();
      const { container } = render(<CostCalculator data={data} currency="usd" />);

      const greenBorders = container.querySelectorAll('.border-green-500');
      expect(greenBorders).toHaveLength(1);
    });

    it('null-pricing models are excluded', () => {
      const data = createDataWithNulls();
      render(<CostCalculator data={data} currency="usd" />);

      // Only gpt-4o-mini has valid pricing; unknown-model and another-null should be excluded
      expect(screen.getByText(/gpt-4o-mini/)).toBeDefined();
      expect(screen.queryByText(/unknown-model/)).toBeNull();
      expect(screen.queryByText(/another-null/)).toBeNull();
    });

    it('cost breakdown (input/output) is displayed per model', () => {
      const data = createMockData();
      render(<CostCalculator data={data} currency="usd" />);

      // Each model row should contain "In:" and "Out:" text
      const breakdowns = screen.getAllByText(/In:.*Out:/);
      expect(breakdowns.length).toBeGreaterThan(0);
    });
  });

  describe('empty state', () => {
    it('shows empty message when no models have valid pricing', () => {
      const data: PricingRow[] = [
        {
          id: 1,
          modelName: 'null-model',
          inputPricePer1m: null,
          outputPricePer1m: null,
          contextWindow: 128000,
          confidence: 'low_confidence',
          collectedAt: new Date(),
          sourceName: 'Unknown',
          sourceUrl: null,
        },
      ];
      render(<CostCalculator data={data} currency="usd" />);
      expect(
        screen.getByText('No models with complete pricing data available for this scenario.')
      ).toBeDefined();
    });

    it('shows empty message for empty data array', () => {
      render(<CostCalculator data={[]} currency="usd" />);
      expect(
        screen.getByText('No models with complete pricing data available for this scenario.')
      ).toBeDefined();
    });
  });

  describe('currency formatting', () => {
    it('displays USD format when currency is usd', () => {
      const data = createMockData();
      render(<CostCalculator data={data} currency="usd" />);

      // Cost values should contain $ symbol
      const dollarSigns = screen.getAllByText(/\$/);
      expect(dollarSigns.length).toBeGreaterThan(0);
    });

    it('displays VND format when currency is vnd', () => {
      const data = createMockData();
      render(<CostCalculator data={data} currency="vnd" />);

      // Cost values should contain dong symbol
      const vndSigns = screen.getAllByText(/₫/);
      expect(vndSigns.length).toBeGreaterThan(0);
    });

    it('applies custom exchange rate for VND display', () => {
      const data = createMockData();
      render(<CostCalculator data={data} currency="vnd" exchangeRate={26000} />);

      // Cost values should contain dong symbol with custom rate
      const vndSigns = screen.getAllByText(/₫/);
      expect(vndSigns.length).toBeGreaterThan(0);

      // Verify the cheapest model's total cost uses the custom rate (not default 25500)
      // gemini-2.0-flash: inputCost = (10000/1M)*0.1 = 0.001, outputCost = (20000/1M)*0.4 = 0.008
      // totalCost = 0.009 USD * 26000 = 234 VND (formatted as ₫234)
      // With default rate 25500: 0.009 * 25500 = 229.5 -> ₫230
      // So we should see 234, not 230
      const formattedElements = screen.getAllByText(/₫/);
      const has234 = formattedElements.some(el => el.textContent?.includes('234'));
      expect(has234).toBe(true);
    });
  });
});
