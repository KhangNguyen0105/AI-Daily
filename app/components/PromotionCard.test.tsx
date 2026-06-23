// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PromotionCard } from './PromotionCard';

describe('PromotionCard', () => {
  const defaultProps = {
    modelPattern: 'All Dashscope Qwen Models',
    description: '20% off on all Dashscope Qwen models',
    providerName: 'Dashscope',
    providerUrl: 'https://help.aliyun.com/zh/model-studio/getting-started/models',
  };

  it('renders discount badge when discount prop is provided', () => {
    render(<PromotionCard {...defaultProps} discount="20% OFF" />);
    expect(screen.getByText('20% OFF')).toBeDefined();
  });

  it('extracts discount from description when no discount prop', () => {
    render(<PromotionCard {...defaultProps} />);
    expect(screen.getByText('20% OFF')).toBeDefined();
  });

  it('renders "PROMO" fallback badge when no discount pattern found', () => {
    render(<PromotionCard {...defaultProps} description="Special offer on models" />);
    expect(screen.getByText('PROMO')).toBeDefined();
  });

  it('PROMO badge uses fallback style', () => {
    render(<PromotionCard {...defaultProps} description="Special offer on models" />);
    const badge = screen.getByText('PROMO');
    expect(badge.className).toContain('bg-amber-500/50');
    expect(badge.className).toContain('text-amber-700');
  });

  it('discount badge uses solid style', () => {
    render(<PromotionCard {...defaultProps} />);
    const badge = screen.getByText('20% OFF');
    expect(badge.className).toContain('bg-amber-500');
    expect(badge.className).toContain('text-white');
  });

  it('renders modelPattern as heading (h3)', () => {
    render(<PromotionCard {...defaultProps} />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.textContent).toBe('All Dashscope Qwen Models');
  });

  it('renders description with line-clamp-3 class', () => {
    render(<PromotionCard {...defaultProps} />);
    const desc = screen.getByText('20% off on all Dashscope Qwen models');
    expect(desc.className).toContain('line-clamp-3');
  });

  it('provider link has correct href, target, and rel', () => {
    render(<PromotionCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://help.aliyun.com/zh/model-studio/getting-started/models');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('provider link href starts with https://', () => {
    render(<PromotionCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toMatch(/^https:\/\//);
  });

  it('card has amber background class', () => {
    const { container } = render(<PromotionCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-amber-500/10');
  });

  it('card has amber border class', () => {
    const { container } = render(<PromotionCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-amber-500/30');
  });

  it('card has hover class', () => {
    const { container } = render(<PromotionCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('hover:bg-amber-500/15');
  });
});
