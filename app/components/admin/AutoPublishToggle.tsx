'use client';

import { useState } from 'react';

interface AutoPublishToggleProps {
  initialValue: boolean;
  onChange: (enabled: boolean) => Promise<void>;
}

export function AutoPublishToggle({ initialValue, onChange }: AutoPublishToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    const newValue = !enabled;
    setIsLoading(true);

    // Optimistic update
    setEnabled(newValue);

    try {
      await onChange(newValue);
    } catch {
      // Revert on error
      setEnabled(!newValue);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        role="switch"
        aria-checked={enabled}
        onClick={handleToggle}
        disabled={isLoading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-accent-blue' : 'bg-bg-tertiary'
        } ${isLoading ? 'opacity-50' : ''}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-bg-primary shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-text-secondary">Auto-publish</span>
    </div>
  );
}
