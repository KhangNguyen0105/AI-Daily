'use client';

import { signOut } from 'next-auth/react';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-bg-primary border-b border-border-primary z-30 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary"
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="text-lg font-semibold text-text-primary">Admin</span>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: '/admin/login' })}
        className="text-sm text-text-secondary hover:text-text-primary"
      >
        Logout
      </button>
    </header>
  );
}
