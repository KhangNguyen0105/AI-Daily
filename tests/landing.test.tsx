import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Landing Page', () => {
  it('app/page.tsx should be a valid module that exports a default function', async () => {
    const pagePath = resolve(__dirname, '../app/page.tsx');
    const content = readFileSync(pagePath, 'utf-8');

    // Verify it exports a default function component
    expect(content).toContain('export default');
    expect(content).toContain('AI Daily');
  });

  it('app/page.tsx should NOT contain login/register prompts (FRNT-01)', () => {
    const pagePath = resolve(__dirname, '../app/page.tsx');
    const content = readFileSync(pagePath, 'utf-8');

    const forbiddenTerms = ['login', 'register', 'sign in', 'sign up', 'log in'];
    for (const term of forbiddenTerms) {
      expect(content.toLowerCase()).not.toContain(term);
    }
  });

  it('app/layout.tsx should contain metadata with AI Daily branding', () => {
    const layoutPath = resolve(__dirname, '../app/layout.tsx');
    const content = readFileSync(layoutPath, 'utf-8');

    expect(content).toContain('AI Daily');
    expect(content).toContain('metadata');
  });

  it('app/layout.tsx should NOT contain login/register prompts (FRNT-01)', () => {
    const layoutPath = resolve(__dirname, '../app/layout.tsx');
    const content = readFileSync(layoutPath, 'utf-8');

    const forbiddenTerms = ['login', 'register', 'sign in', 'sign up', 'log in'];
    for (const term of forbiddenTerms) {
      expect(content.toLowerCase()).not.toContain(term);
    }
  });
});
