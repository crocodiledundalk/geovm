'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { WalletButton } from './WalletButton';
import { CreateWorldModal } from './CreateWorldModal';

export function Navbar() {
  const [isCreateWorldOpen, setIsCreateWorldOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">GeoVM</span>
          </Link>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setIsCreateWorldOpen(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create World
            </button>
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </nav>
      <CreateWorldModal 
        isOpen={isCreateWorldOpen} 
        onClose={() => setIsCreateWorldOpen(false)} 
      />
    </>
  );
} 