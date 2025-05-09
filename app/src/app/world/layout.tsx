'use client';

import { Navbar } from '@/components/Navbar';

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
} 