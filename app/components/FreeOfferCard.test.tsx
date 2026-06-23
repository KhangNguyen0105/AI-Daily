// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FreeOfferCard } from './FreeOfferCard';

describe('FreeOfferCard', () => {
  const defaultProps = {
    modelPattern: 'deepseek-v4-flash',
    description: 'Free tier available on OpenModel',
    providerName: 'OpenModel',
    providerUrl: 'https://www.openmodel.ai/model-pricing',
  };

  it('renders FREE badge text', () => {
    render(<FreeOfferCard {...defaultProps} />);
    expect(screen.getByText('FREE')).toBeDefined();
  });

  it('renders modelPattern as heading (h3)', () => {
    render(<FreeOfferCard {...defaultProps} />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.textContent).toBe('deepseek-v4-flash');
  });

  it('renders description with line-clamp-3 class', () => {
    render(<FreeOfferCard {...defaultProps} />);
    const desc = screen.getByText('Free tier available on OpenModel');
    expect(desc.className).toContain('line-clamp-3');
  });

  it('renders credits text when credits prop is provided', () => {
    render(<FreeOfferCard {...defaultProps} credits="10K tokens/day" />);
    expect(screen.getByText('10K tokens/day')).toBeDefined();
  });

  it('does NOT render credits span when credits is null', () => {
    const { container } = render(<FreeOfferCard {...defaultProps} credits={null} />);
    const creditsSpan = container.querySelector('.text-green-600');
    expect(creditsSpan).toBeNull();
  });

  it('does NOT render credits span when credits is undefined', () => {
    const { container } = render(<FreeOfferCard {...defaultProps} />);
    const creditsSpan = container.querySelector('.text-green-600');
    expect(creditsSpan).toBeNull();
  });

  it('provider link has href matching providerUrl prop', () => {
    render(<FreeOfferCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://www.openmodel.ai/model-pricing');
  });

  it('provider link has target="_blank" and rel="noopener noreferrer"', () => {
    render(<FreeOfferCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('provider link href starts with https:// (valid URL format)', () => {
    render(<FreeOfferCard {...defaultProps} />);
    const link = screen.getByRole('link');
    const href = link.getAttribute('href');
    expect(href).toMatch(/^https:\/\//);
  });

  it('provider link text shows providerName', () => {
    render(<FreeOfferCard {...defaultProps} />);
    expect(screen.getByText('OpenModel')).toBeDefined();
  });

  it('external link SVG icon is present', () => {
    const { container } = render(<FreeOfferCard {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('card has green background class', () => {
    const { container } = render(<FreeOfferCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-green-500/10');
  });

  it('card has green border class', () => {
    const { container } = render(<FreeOfferCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-green-500/30');
  });

  it('card has hover class', () => {
    const { container } = render(<FreeOfferCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('hover:bg-green-500/15');
  });
});
