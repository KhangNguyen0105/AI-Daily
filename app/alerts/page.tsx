import { AlertsPageClient } from '@/app/components/AlertsPageClient';

export const revalidate = 60;

/**
 * Price alerts management page.
 * All alert data is stored in localStorage (per D-14).
 * No database query needed.
 */
export default function AlertsPage() {
  return <AlertsPageClient />;
}
