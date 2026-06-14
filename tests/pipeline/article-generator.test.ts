import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DiffResult } from '../../src/pipeline/article-diff';

// Mock the ai module
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock the env module
vi.mock('@/src/lib/env', () => ({
  env: {
    AI_PROVIDER: 'anthropic',
    AI_FALLBACK_PROVIDER: 'openai',
    MIMO_API_KEY: 'test-mimo-key',
    MIMO_BASE_URL: 'https://mimo.example.com/v1',
  },
}));

// Mock the provider modules
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn((model: string) => ({ provider: 'anthropic', model })),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string, opts?: Record<string, unknown>) => ({
    provider: 'openai',
    model,
    ...opts,
  })),
  createOpenAI: vi.fn((opts?: Record<string, unknown>) =>
    vi.fn((model: string) => ({
      provider: 'custom-openai',
      model,
      ...opts,
    })),
  ),
}));

import { generateText } from 'ai';
import { generateArticle, type GeneratedArticle } from '../../src/pipeline/article-generator';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

const mockGenerateText = vi.mocked(generateText);
const mockAnthropic = vi.mocked(anthropic);
const mockOpenai = vi.mocked(openai);

const sampleDiff: DiffResult = {
  newModels: [
    {
      modelName: 'gemini-2.0-flash',
      inputPricePer1m: 0.1,
      outputPricePer1m: 0.4,
      contextWindow: 1000000,
      sourceName: 'google',
    },
  ],
  priceChanges: [
    {
      modelName: 'gpt-4o',
      field: 'input',
      oldPrice: 5.0,
      newPrice: 2.5,
      changePercent: -50,
    },
  ],
  newPromotions: [],
  totalModelsToday: 25,
};

const emptyDiff: DiffResult = {
  newModels: [],
  priceChanges: [],
  newPromotions: [],
  totalModelsToday: 15,
};

const llmResponse = `SUMMARY: GPT-4o price drops 50%, new Gemini 2.0 Flash launched
# AI Daily Digest - June 14, 2026

## Key Changes

- GPT-4o input price dropped 50% from $5.00 to $2.50 per 1M tokens
- Gemini 2.0 Flash launched with competitive pricing

## Pricing Highlights

GPT-4o is now one of the most affordable premium models at $2.50/1M input tokens.

## What to Watch

Monitor whether other providers match GPT-4o's price reduction.`;

describe('generateArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls generateText with the primary provider model', async () => {
    mockGenerateText.mockResolvedValue({ text: llmResponse } as Awaited<ReturnType<typeof generateText>>);

    await generateArticle(sampleDiff);

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockAnthropic).toHaveBeenCalledWith('claude-sonnet-4-5');
    const call = mockGenerateText.mock.calls[0][0];
    expect(call.temperature).toBe(0.3);
    expect(call.maxOutputTokens).toBe(1024);
  });

  it('falls back to secondary provider when primary throws', async () => {
    mockGenerateText
      .mockRejectedValueOnce(new Error('Anthropic rate limit'))
      .mockResolvedValueOnce({ text: llmResponse } as Awaited<ReturnType<typeof generateText>>);

    const result = await generateArticle(sampleDiff);

    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(mockOpenai).toHaveBeenCalledWith('gpt-4o');
    expect(result.title).toContain('AI Daily Digest');
  });

  it('throws if both primary and fallback fail', async () => {
    mockGenerateText
      .mockRejectedValueOnce(new Error('Primary failed'))
      .mockRejectedValueOnce(new Error('Fallback failed'));

    await expect(generateArticle(sampleDiff)).rejects.toThrow('Fallback failed');
  });

  it('parses title, summary, and content from delimited output', async () => {
    mockGenerateText.mockResolvedValue({ text: llmResponse } as Awaited<ReturnType<typeof generateText>>);

    const result = await generateArticle(sampleDiff);

    expect(result.summary).toBe('GPT-4o price drops 50%, new Gemini 2.0 Flash launched');
    expect(result.title).toBe('AI Daily Digest - June 14, 2026');
    expect(result.content).toContain('## Key Changes');
    expect(result.content).toContain('## Pricing Highlights');
    expect(result.content).toContain('## What to Watch');
  });

  it('handles missing delimiters gracefully (fallback extraction)', async () => {
    const noDelimiterResponse = `# Simple Title

Some content without the SUMMARY delimiter.`;
    mockGenerateText.mockResolvedValue({ text: noDelimiterResponse } as Awaited<ReturnType<typeof generateText>>);

    const result = await generateArticle(sampleDiff);

    expect(result.title).toBe('Simple Title');
    expect(result.summary.length).toBeLessThanOrEqual(150);
    expect(result.content).toContain('Some content without');
  });

  it('includes diff context in user prompt', async () => {
    mockGenerateText.mockResolvedValue({ text: llmResponse } as Awaited<ReturnType<typeof generateText>>);

    await generateArticle(sampleDiff);

    const call = mockGenerateText.mock.calls[0][0];
    expect(call.prompt).toContain('gemini-2.0-flash');
    expect(call.prompt).toContain('gpt-4o');
  });

  it('includes "no changes" context when diff is empty', async () => {
    mockGenerateText.mockResolvedValue({ text: llmResponse } as Awaited<ReturnType<typeof generateText>>);

    await generateArticle(emptyDiff);

    const call = mockGenerateText.mock.calls[0][0];
    expect(call.prompt).toContain('Total models tracked today: 15');
    expect(call.prompt).toContain('No changes detected today');
  });

  it('builds compact diff context string from DiffResult', async () => {
    mockGenerateText.mockResolvedValue({ text: llmResponse } as Awaited<ReturnType<typeof generateText>>);

    await generateArticle(sampleDiff);

    const call = mockGenerateText.mock.calls[0][0];
    // Should contain model names and price info
    expect(call.prompt).toContain('gemini-2.0-flash');
    expect(call.prompt).toContain('$0.1');
    expect(call.prompt).toContain('gpt-4o');
    expect(call.prompt).toContain('50');
  });
});
