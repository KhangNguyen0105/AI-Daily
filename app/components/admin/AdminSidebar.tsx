'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { label: 'Overview', href: '/admin' },
  { label: 'Articles', href: '/admin/articles' },
  { label: 'Pipeline', href: '/admin/pipeline' },
  { label: 'Sources', href: '/admin/sources' },
];

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <nav
        aria-label="Admin navigation"
        className={`fixed top-12 left-0 bottom-0 w-60 bg-bg-secondary border-r border-border-primary z-50 transform transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="py-2 px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center px-4 py-2 text-sm rounded-md mb-1 ${
                isActive(item.href)
                  ? 'bg-accent-blue/10 text-accent-blue font-semibold'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary font-normal'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
