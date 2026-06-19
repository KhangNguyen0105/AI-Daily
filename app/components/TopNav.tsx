'use client';

import { useState } from 'react';
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
 *
 * Responsive: hamburger menu on mobile (review #10).
 */
export function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Pricing', href: '/' },
    { label: 'Daily Digest', href: '/digest' },
    { label: 'Trends', href: '/trends' },
    { label: 'Promotions', href: '/promotions' },
    { label: 'Subscriptions', href: '/subscriptions' },
    { label: 'Compare', href: '/compare' },
    { label: 'Alerts', href: '/alerts' },
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

        {/* Desktop nav — hidden on mobile */}
        <div className="hidden md:flex items-center gap-6">
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

        {/* Hamburger button — visible on mobile only */}
        <button
          className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-sm ${
                  isActive
                    ? 'font-bold text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
