'use client';

import { Navbar } from '@/components/Navbar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <main className="min-h-screen">
      <Navbar />
      {children}
    </main>
  );
} 