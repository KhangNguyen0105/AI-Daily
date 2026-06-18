'use client';

import { useState } from 'react';
import { SessionProviderWrapper } from '@/app/components/admin/SessionProvider';
import { AdminHeader } from '@/app/components/admin/AdminHeader';
import { AdminSidebar } from '@/app/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SessionProviderWrapper>
      <AdminHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="ml-0 md:ml-60 pt-12 min-h-screen bg-gray-50">
        <div className="p-6">
          {children}
        </div>
      </main>
    </SessionProviderWrapper>
  );
}
