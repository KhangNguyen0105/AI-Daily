'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/app/components/ThemeToggle';

/**
 * Top navigation bar — site-wide nav component.
 * Per D-21: "Daily Digest" link accessible from all pages.
 * Adapts D-16/D-21 from SideNav to TopNav (SideNav does not exist in codebase).
 *
 * Uses usePathname() for active link detection:
 * - Link is "active" when pathname starts with the link's href
 * - /digest is active for both /digest and /digest/2026-06-14
 */
export function TopNav() {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Pricing', href: '/' },
    { label: 'Daily Digest', href: '/digest' },
    { label: 'Trends', href: '/trends' },
    { label: 'Promotions', href: '/promotions' },
    { label: 'Compare', href: '/compare' },
    { label: 'Alerts', href: '/alerts' },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-bg-secondary border-b border-border-primary"
      aria-label="Main navigation"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-text-primary">
          AI Daily
        </Link>

        <div className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? 'text-sm font-bold text-accent-blue'
                    : 'text-sm text-text-secondary hover:text-text-primary'
                }
              >
                {link.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
