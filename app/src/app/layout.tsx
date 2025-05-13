import type { Metadata } from 'next'
import './globals.css'
// import WalletConnectionProvider from '@/components/WalletConnectionProvider' // Old provider
// import WalletProviders from '@/components/WalletProviders.client'; // New provider --> Renamed
import { AppProviders } from './providers' // Use the combined providers component
import { GeoVmProgramProvider } from '@/contexts/ProgramContext'

export const metadata: Metadata = {
  title: 'GeoVM Demo',
  description: 'Next.js dApp with Solana integration for GeoVM',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* <WalletConnectionProvider> */}
        {/* <WalletProviders> */} {/* Old wrapper */}
        <AppProviders> {/* Use new combined provider */}
          <GeoVmProgramProvider>
            <div className="flex min-h-screen flex-col max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </GeoVmProgramProvider>
        {/* </WalletConnectionProvider> */}
        {/* </WalletProviders> */} {/* Old wrapper */}
        </AppProviders>
      </body>
    </html>
  )
}
