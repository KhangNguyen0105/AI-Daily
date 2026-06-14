// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderLinks } from '../../app/components/ProviderLinks';

describe('ProviderLinks', () => {
  it('renders docs, API, and playground links for known provider', () => {
    render(<ProviderLinks providerName="OpenAI" sourceUrl="https://openai.com/pricing" />);

    const docsLink = screen.getByText('Docs');
    expect(docsLink.getAttribute('href')).toBe('https://platform.openai.com/docs');
    expect(docsLink.getAttribute('target')).toBe('_blank');
    expect(docsLink.getAttribute('rel')).toBe('noopener noreferrer');

    const apiLink = screen.getByText('API Reference');
    expect(apiLink.getAttribute('href')).toBe('https://platform.openai.com/api-reference');

    const playgroundLink = screen.getByText('Playground');
    expect(playgroundLink.getAttribute('href')).toBe('https://platform.openai.com/playground');
  });

  it('renders pricing page link from sourceUrl', () => {
    render(<ProviderLinks providerName="OpenAI" sourceUrl="https://openai.com/pricing" />);

    const pricingLink = screen.getByText('Pricing Page');
    expect(pricingLink.getAttribute('href')).toBe('https://openai.com/pricing');
    expect(pricingLink.getAttribute('target')).toBe('_blank');
  });

  it('renders only sourceUrl when provider is unknown', () => {
    render(<ProviderLinks providerName="UnknownProvider" sourceUrl="https://example.com" />);

    expect(screen.getByText('Pricing Page')).toBeDefined();
    expect(screen.queryByText('Docs')).toBeNull();
    expect(screen.queryByText('API Reference')).toBeNull();
  });

  it('renders nothing when provider is unknown and no sourceUrl', () => {
    const { container } = render(
      <ProviderLinks providerName="UnknownProvider" sourceUrl={null} />
    );

    expect(screen.queryByText('Docs')).toBeNull();
    expect(screen.queryByText('Pricing Page')).toBeNull();
  });

  it('links open in new tabs with noopener noreferrer', () => {
    render(<ProviderLinks providerName="Anthropic" sourceUrl="https://anthropic.com" />);

    const links = screen.getAllByRole('link');
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });
});
