import { AlertsPageClient } from '@/app/components/AlertsPageClient';

/**
 * Price Alerts management page.
 * Per D-14: localStorage storage -- no backend needed. Alerts are per-device.
 * Simple server wrapper that renders the client component.
 */
export const revalidate = 60;

export default function AlertsPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 pt-14">
      <AlertsPageClient />
    </main>
  );
}
