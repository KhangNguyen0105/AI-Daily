'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200"
      aria-label="Main navigation"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-900">
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
                    ? 'text-sm font-bold text-blue-600'
                    : 'text-sm text-gray-600 hover:text-gray-900'
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
