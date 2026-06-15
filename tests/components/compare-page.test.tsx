// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparePageClient } from '../../app/components/ComparePageClient';
import { ComparisonCard } from '../../app/components/ComparisonCard';
import type { PricingRow } from '../../app/components/PricingTable';
import type { PracticalCost } from '../../app/lib/pricing-utils';
import type { PromotionData } from '../../app/components/PromotionsList';
import type { ModelOption } from '../../app/components/ModelSelector';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

const mockModels: ModelOption[] = [
  { modelName: 'gpt-4o', sourceId: 1, sourceName: 'OpenAI' },
  { modelName: 'claude-sonnet-4-5', sourceId: 2, sourceName: 'Anthropic' },
  { modelName: 'gemini-2.0-flash', sourceId: 3, sourceName: 'Google' },
];

const mockPricingData: PricingRow[] = [
  {
    id: 1,
    sourceId: 1,
    modelName: 'gpt-4o',
    inputPricePer1m: 2.5,
    outputPricePer1m: 10,
    contextWindow: 128000,
    confidence: 'verified',
    collectedAt: new Date('2026-06-15'),
    sourceName: 'OpenAI',
    sourceUrl: 'https://openai.com',
  },
  {
    id: 2,
    sourceId: 2,
    modelName: 'claude-sonnet-4-5',
    inputPricePer1m: 3,
    outputPricePer1m: 15,
    contextWindow: 200000,
    confidence: 'verified',
    collectedAt: new Date('2026-06-15'),
    sourceName: 'Anthropic',
    sourceUrl: 'https://anthropic.com',
  },
];

const mockPracticalCosts: PracticalCost[] = [
  {
    modelId: 1,
    modelName: '10 Long Prompts',
    sourceName: 'OpenAI',
    confidence: 'verified',
    inputPricePer1m: 2.5,
    outputPricePer1m: 10,
    inputCost: 0.025,
    outputCost: 0.2,
    totalCost: 0.225,
  },
  {
    modelId: 2,
    modelName: '10 Long Prompts',
    sourceName: 'Anthropic',
    confidence: 'verified',
    inputPricePer1m: 3,
    outputPricePer1m: 15,
    inputCost: 0.03,
    outputCost: 0.3,
    totalCost: 0.33,
  },
];

describe('ComparisonCard', () => {
  it('renders model name', () => {
    render(
      <ComparisonCard
        model={mockPricingData[0]}
        practicalCosts={mockPracticalCosts}
        promotions={[]}
      />,
    );

    expect(screen.getByText('gpt-4o')).not.toBeNull();
  });

  it('renders source name', () => {
    render(
      <ComparisonCard
        model={mockPricingData[0]}
        practicalCosts={mockPracticalCosts}
        promotions={[]}
      />,
    );

    expect(screen.getByText('OpenAI')).not.toBeNull();
  });

  it('shows pricing', () => {
    render(
      <ComparisonCard
        model={mockPricingData[0]}
        practicalCosts={mockPracticalCosts}
        promotions={[]}
      />,
    );

    // Input price
    expect(screen.getByText(/\$2\.50\/1M tokens/)).not.toBeNull();
    // Output price
    expect(screen.getByText(/\$10\.00\/1M tokens/)).not.toBeNull();
  });

  it('shows context window', () => {
    render(
      <ComparisonCard
        model={mockPricingData[0]}
        practicalCosts={mockPracticalCosts}
        promotions={[]}
      />,
    );

    expect(screen.getByText('128K')).not.toBeNull();
  });

  it('shows practical costs', () => {
    render(
      <ComparisonCard
        model={mockPricingData[0]}
        practicalCosts={mockPracticalCosts}
        promotions={[]}
      />,
    );

    expect(screen.getByText('10 Long Prompts')).not.toBeNull();
    expect(screen.getByText('100 LeetCode Hard Tasks')).not.toBeNull();
    expect(screen.getByText('Summarize 100-Page Document')).not.toBeNull();
    expect(screen.getByText('1 Coding-Agent Session')).not.toBeNull();
  });

  it('shows confidence badge', () => {
    render(
      <ComparisonCard
        model={mockPricingData[0]}
        practicalCosts={mockPracticalCosts}
        promotions={[]}
      />,
    );

    expect(screen.getByText('verified')).not.toBeNull();
  });

  it('shows "No free tier" when no promotions', () => {
    render(
      <ComparisonCard
        model={mockPricingData[0]}
        practicalCosts={mockPracticalCosts}
        promotions={[]}
      />,
    );

    expect(screen.getByText('No free tier')).not.toBeNull();
  });

  it('shows free tier badge when promotions exist', () => {
    const promos: PromotionData[] = [
      {
        id: 1,
        modelPattern: 'gpt-4o',
        type: 'free_tier',
        description: 'Free tier with 10K tokens/day',
        credits: '10K/day',
        startDate: null,
        endDate: null,
        sourceUrl: null,
      },
    ];

    render(
      <ComparisonCard
        model={mockPricingData[0]}
        practicalCosts={mockPracticalCosts}
        promotions={promos}
      />,
    );

    expect(screen.getByText(/Free tier/)).not.toBeNull();
    expect(screen.queryByText('No free tier')).toBeNull();
  });
});

describe('ComparePageClient', () => {
  it('shows empty state with 0 models selected', () => {
    render(
      <ComparePageClient
        allModels={mockModels}
        initialSelected={[]}
        modelsData={[]}
        practicalCosts={[]}
        promotionsMap={{}}
      />,
    );

    expect(screen.getByText('Select models to compare')).not.toBeNull();
    expect(
      screen.getByText(
        'Use the dropdowns above to select 2-5 models for side-by-side comparison.',
      ),
    ).not.toBeNull();
  });

  it('shows "Add another model" with 1 model selected', () => {
    const selected: ModelOption[] = [
      { modelName: 'gpt-4o', sourceId: 1, sourceName: 'OpenAI' },
    ];

    render(
      <ComparePageClient
        allModels={mockModels}
        initialSelected={selected}
        modelsData={mockPricingData.slice(0, 1)}
        practicalCosts={mockPracticalCosts}
        promotionsMap={{}}
      />,
    );

    expect(screen.getByText('Add another model')).not.toBeNull();
    expect(
      screen.getByText(
        'Select at least 2 models to see a side-by-side comparison.',
      ),
    ).not.toBeNull();
  });

  it('renders page heading', () => {
    render(
      <ComparePageClient
        allModels={mockModels}
        initialSelected={[]}
        modelsData={[]}
        practicalCosts={[]}
        promotionsMap={{}}
      />,
    );

    expect(screen.getByText('Compare Models')).not.toBeNull();
  });

  it('shows Add model button when fewer than 5 selected', () => {
    render(
      <ComparePageClient
        allModels={mockModels}
        initialSelected={[]}
        modelsData={[]}
        practicalCosts={[]}
        promotionsMap={{}}
      />,
    );

    expect(screen.getByText('+ Add model')).not.toBeNull();
  });
});
