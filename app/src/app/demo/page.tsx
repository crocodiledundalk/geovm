import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import DemoGlobe from "@/components/demo/demo-globe"
import { ActivityCounter } from "@/components/demo/activity-counter"
import { InstructionalOverlay } from "@/components/demo/instructional-overlay"
import { NotificationProvider } from "@/components/demo/notification-provider"

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-blue-950/30">
        <NotificationProvider>
          <div className="container py-8">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-6 text-center">
              DePIN Activity <span className="text-teal-600 dark:text-teal-400">Simulation</span>
            </h1>

            <div className="grid gap-8 lg:grid-cols-4">
              <div className="lg:col-span-3 relative">
                <DemoGlobe />
              </div>

              <div className="space-y-8">
                <ActivityCounter />
                <InstructionalOverlay />
              </div>
            </div>
          </div>
        </NotificationProvider>
      </main>
      <Footer />
    </div>
  )
}
