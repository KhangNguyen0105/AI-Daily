'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface ModelOption {
  modelName: string;
  sourceId: number;
  sourceName: string;
}

/**
 * Custom searchable dropdown for model selection.
 * Per D-11: Dropdown selectors with search, 2-5 per page.
 * Per UI-SPEC: w-full px-3 py-2 border border-gray-300 rounded-lg text-sm.
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
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = models.filter(
    (m) =>
      m.modelName.toLowerCase().includes(query.toLowerCase()) ||
      m.sourceName.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = useCallback(
    (model: ModelOption) => {
      onSelect(model);
      setOpen(false);
      setQuery('');
    },
    [onSelect],
  );

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={selected && !open ? selected.modelName : query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          if (selected) setQuery('');
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-label={placeholder}
      />
      {open && filtered.length > 0 && (
        <ul
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {filtered.map((model) => (
            <li
              key={`${model.modelName}-${model.sourceId}`}
              role="option"
              aria-selected={
                selected?.modelName === model.modelName &&
                selected?.sourceId === model.sourceId
              }
              onClick={() => handleSelect(model)}
              className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            >
              <span className="font-medium">{model.modelName}</span>
              <span className="text-gray-500 ml-2">{model.sourceName}</span>
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && query.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
          No models found
        </div>
      )}
    </div>
  );
}
