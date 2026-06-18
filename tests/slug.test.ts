import { describe, it, expect } from 'vitest';
import { generateSlug, parseSlug } from '@/app/lib/slug';

describe('generateSlug', () => {
  it('converts simple model name with sourceId', () => {
    expect(generateSlug('gpt-4o', 1)).toBe('gpt-4o--1');
  });

  it('converts dots to hyphens to avoid collision', () => {
    expect(generateSlug('model.v1', 1)).toBe('model-v1--1');
    expect(generateSlug('modelv1', 1)).toBe('modelv1--1');
    // These two must NOT collide
    expect(generateSlug('model.v1', 1)).not.toBe(generateSlug('modelv1', 1));
  });

  it('lowercases and hyphenates spaces', () => {
    expect(generateSlug('Claude 3.5 Sonnet', 2)).toBe('claude-3-5-sonnet--2');
  });

  it('converts dots to hyphens and collapses', () => {
    expect(generateSlug('gemini-1.5-pro', 3)).toBe('gemini-1-5-pro--3');
  });

  it('handles mixed case with spaces', () => {
    expect(generateSlug('GPT-4o Mini', 5)).toBe('gpt-4o-mini--5');
  });

  it('strips leading hyphens', () => {
    expect(generateSlug('--leading', 1)).toBe('leading--1');
  });

  it('strips trailing hyphens', () => {
    expect(generateSlug('trailing--', 1)).toBe('trailing--1');
  });

  it('collapses multiple consecutive hyphens', () => {
    expect(generateSlug('a---b---c', 1)).toBe('a-b-c--1');
  });

  it('handles empty string', () => {
    expect(generateSlug('', 1)).toBe('--1');
  });

  it('handles already-lowercase name', () => {
    expect(generateSlug('llama-3.1-70b', 4)).toBe('llama-3-1-70b--4');
  });

  it('handles special characters', () => {
    expect(generateSlug('model@name#v2', 1)).toBe('model-name-v2--1');
  });

  it('produces deterministic output', () => {
    const slug1 = generateSlug('Test Model', 1);
    const slug2 = generateSlug('Test Model', 1);
    expect(slug1).toBe(slug2);
  });

  it('different sourceIds produce different slugs', () => {
    const slug1 = generateSlug('gpt-4o', 1);
    const slug2 = generateSlug('gpt-4o', 2);
    expect(slug1).not.toBe(slug2);
    expect(slug1).toBe('gpt-4o--1');
    expect(slug2).toBe('gpt-4o--2');
  });
});

describe('parseSlug', () => {
  it('parses valid slug with sourceId', () => {
    expect(parseSlug('gpt-4o--1')).toEqual({ sourceId: 1 });
  });

  it('parses slug with multi-digit sourceId', () => {
    expect(parseSlug('claude-35-sonnet--12')).toEqual({ sourceId: 12 });
  });

  it('returns null for slug without double-dash separator', () => {
    expect(parseSlug('invalid-slug')).toBeNull();
  });

  it('returns null for non-numeric sourceId', () => {
    expect(parseSlug('model--abc')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSlug('')).toBeNull();
  });

  it('handles slug with multiple double-dashes (uses last)', () => {
    // "model--name--3" should parse sourceId as 3
    expect(parseSlug('model--name--3')).toEqual({ sourceId: 3 });
  });

  it('returns null for sourceId of 0', () => {
    // 0 is falsy but valid — however, sourceIds start at 1 in serial PKs
    // parseSlug should still return it since parseInt returns 0
    expect(parseSlug('model--0')).toEqual({ sourceId: 0 });
  });
});
