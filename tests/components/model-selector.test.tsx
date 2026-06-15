// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSelector } from '../../app/components/ModelSelector';
import type { ModelOption } from '../../app/components/ModelSelector';

const mockModels: ModelOption[] = [
  { modelName: 'gpt-4o', sourceId: 1, sourceName: 'OpenAI' },
  { modelName: 'claude-sonnet-4-5', sourceId: 2, sourceName: 'Anthropic' },
  { modelName: 'gemini-2.0-flash', sourceId: 3, sourceName: 'Google' },
  { modelName: 'gpt-4o-mini', sourceId: 1, sourceName: 'OpenAI' },
];

describe('ModelSelector', () => {
  it('renders input with placeholder', () => {
    render(
      <ModelSelector
        models={mockModels}
        selected={null}
        onSelect={vi.fn()}
        placeholder="Search models..."
      />,
    );

    const input = screen.getByPlaceholderText('Search models...');
    expect(input).not.toBeNull();
  });

  it('opens dropdown on focus and shows all models', () => {
    render(
      <ModelSelector
        models={mockModels}
        selected={null}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search models...');
    fireEvent.focus(input);

    expect(screen.getByText('gpt-4o')).not.toBeNull();
    expect(screen.getByText('claude-sonnet-4-5')).not.toBeNull();
    expect(screen.getByText('gemini-2.0-flash')).not.toBeNull();
    expect(screen.getByText('gpt-4o-mini')).not.toBeNull();
  });

  it('filters options when typing', () => {
    render(
      <ModelSelector
        models={mockModels}
        selected={null}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search models...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'gpt' } });

    // Should show gpt-4o and gpt-4o-mini but not claude or gemini
    expect(screen.getByText('gpt-4o')).not.toBeNull();
    expect(screen.getByText('gpt-4o-mini')).not.toBeNull();
    expect(screen.queryByText('claude-sonnet-4-5')).toBeNull();
    expect(screen.queryByText('gemini-2.0-flash')).toBeNull();
  });

  it('filters by source name', () => {
    render(
      <ModelSelector
        models={mockModels}
        selected={null}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search models...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'anthro' } });

    expect(screen.getByText('claude-sonnet-4-5')).not.toBeNull();
    expect(screen.queryByText('gpt-4o')).toBeNull();
  });

  it('calls onSelect when option is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ModelSelector
        models={mockModels}
        selected={null}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByPlaceholderText('Search models...');
    fireEvent.focus(input);

    const option = screen.getByText('gpt-4o');
    fireEvent.click(option);

    expect(onSelect).toHaveBeenCalledWith({
      modelName: 'gpt-4o',
      sourceId: 1,
      sourceName: 'OpenAI',
    });
  });

  it('shows model name and source name in dropdown options', () => {
    render(
      <ModelSelector
        models={mockModels}
        selected={null}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search models...');
    fireEvent.focus(input);

    // Each option should show model name and source name
    const option = screen.getByText('gpt-4o').closest('li');
    expect(option).not.toBeNull();
    expect(option!.textContent).toContain('OpenAI');
  });

  it('shows "No models found" when query has no matches', () => {
    render(
      <ModelSelector
        models={mockModels}
        selected={null}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search models...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No models found')).not.toBeNull();
  });

  it('displays selected model name in input', () => {
    const selected: ModelOption = {
      modelName: 'gpt-4o',
      sourceId: 1,
      sourceName: 'OpenAI',
    };
    render(
      <ModelSelector
        models={mockModels}
        selected={selected}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('Search models...') as HTMLInputElement;
    expect(input.value).toBe('gpt-4o');
  });
});
