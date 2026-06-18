'use client';

import { useState, useEffect, useRef } from 'react';

export interface ModelOption {
  modelName: string;
  sourceId: number;
  sourceName: string | null;
}

/**
 * Custom searchable dropdown for model selection.
 * Per D-11: dropdown selectors with search.
 */
export function ModelSelector({
  models,
  selected,
  onSelect,
  placeholder = 'Search models...',
}: {
  models: ModelOption[];
  selected: ModelOption | null;
  onSelect: (model: ModelOption) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter models by query
  const filtered = query.trim() === ''
    ? models
    : models.filter(
        (m) =>
          m.modelName.toLowerCase().includes(query.toLowerCase()) ||
          (m.sourceName && m.sourceName.toLowerCase().includes(query.toLowerCase()))
      );

  const handleSelect = (model: ModelOption) => {
    onSelect(model);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        aria-label="Search and select a model"
        value={open ? query : selected?.modelName ?? ''}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-bg-primary border border-border-primary rounded-lg shadow-lg max-h-60 overflow-auto">
          {filtered.map((model) => (
            <button
              key={`${model.modelName}-${model.sourceId}`}
              onClick={() => handleSelect(model)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-bg-secondary flex items-center gap-2"
            >
              <span className="font-medium">{model.modelName}</span>
              {model.sourceName && (
                <span className="text-text-secondary text-xs">{model.sourceName}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
