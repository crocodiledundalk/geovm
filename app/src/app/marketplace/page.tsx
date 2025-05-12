import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MarketplaceGlobe } from "@/components/marketplace/marketplace-globe"
import { InvestmentPanel } from "@/components/marketplace/investment-panel"
import { OwnershipDashboard } from "@/components/marketplace/ownership-dashboard"
import { MarketplaceProvider } from "@/components/marketplace/marketplace-provider"

export default function MarketplacePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-blue-950/30">
        <MarketplaceProvider>
          <div className="container py-8">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-6 text-center">
              GeoSVM <span className="text-teal-600 dark:text-teal-400">Marketplace</span>
            </h1>

            <p className="text-center text-gray-500 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              Invest in revenue-generating trixels based on simulated DePIN activity. Claim fractional ownership of
              geographic areas and earn returns from network usage.
            </p>

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-8">
                <MarketplaceGlobe />
                <OwnershipDashboard />
              </div>

              <div>
                <InvestmentPanel />
              </div>
            </div>
          </div>
        </MarketplaceProvider>
      </main>
      <Footer />
    </div>
  )
}
