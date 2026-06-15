'use client';

import { useState, useEffect } from 'react';
import { getAlerts } from '@/app/lib/alerts';
import { AlertSetForm } from './AlertSetForm';

/**
 * Interactive bell icon for setting price alerts.
 * Per D-15: Bell icon on model detail page.
 * Per UI-SPEC: Gray outline when no alert, blue filled when alert exists.
 * Per UI-SPEC: Touch target 44px minimum.
 */
export function BellIcon({
  modelName,
  sourceId,
  currentPrice,
}: {
  modelName: string;
  sourceId: number;
  currentPrice: number | null;
}) {
  const [hasAlert, setHasAlert] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Check if alert exists on mount (after hydration)
  useEffect(() => {
    const alerts = getAlerts();
    const exists = alerts.some(
      (a) => a.modelName === modelName && a.sourceId === sourceId,
    );
    setHasAlert(exists);
  }, [modelName, sourceId]);

  const handleAlertChange = (newHasAlert: boolean) => {
    setHasAlert(newHasAlert);
  };

  return (
    <span className="inline-flex flex-col align-middle ml-2">
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 rounded-lg transition-colors ${
          hasAlert
            ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
        aria-label={hasAlert ? 'Manage price alert' : 'Set price alert'}
        title={hasAlert ? 'Alert set - click to manage' : 'Set price alert'}
      >
        {/* Bell icon SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={hasAlert ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={hasAlert ? 0 : 1.5}
          className="w-6 h-6"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
      </button>
      {showForm && (
        <AlertSetForm
          modelName={modelName}
          sourceId={sourceId}
          currentPrice={currentPrice}
          hasAlert={hasAlert}
          onAlertChange={handleAlertChange}
        />
      )}
    </span>
  );
}
