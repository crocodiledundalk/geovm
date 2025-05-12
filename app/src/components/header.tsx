"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import WalletMultiButtonClient from "@/components/WalletMultiButtonClient"

import { siteConfig } from "@/lib/constants"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-teal-400 to-blue-600">
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">GEO</div>
            </div>
            <span className="hidden font-bold sm:inline-block">{siteConfig.name}</span>
          </Link>
        </div>

        <div className="flex items-center">
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6 mr-4">
            {siteConfig.navigation.map((item) => (
              <Link key={item.name} href={item.href} className="text-sm font-medium transition-colors hover:text-primary">
                {item.name}
              </Link>
            ))}
          </nav>
          
          {/* Wallet Button - Desktop */}
          <div className="hidden md:block">
            <WalletMultiButtonClient />
          </div>

          {/* Mobile menu button */}
          <button
            className="flex items-center justify-center rounded-md p-2 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">Toggle menu</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 md:hidden">
          <nav className="flex flex-col space-y-4 pb-4">
            {siteConfig.navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-2">
              <WalletMultiButtonClient />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
