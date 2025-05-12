import Link from "next/link"
import Image from 'next/image';
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950/20 dark:to-teal-950/20" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('/subtle-grid-pattern.png')] bg-repeat opacity-30" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                GeoSVM: planetary sharded SVM
                <span className="block text-teal-600 dark:text-teal-400">
                  inherently designed for Earth&apos;s geography
                </span>
              </h1>
              <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                A specialized Solana Network Extension with native geospatial awareness, enabling verifiable location
                data for DePINs, smart contracts, and digital assets.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700">
                <Link href="/demo">
                  Try the Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/marketplace">Explore the Marketplace</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto lg:mr-0">
            <div className="relative h-[400px] w-[400px] sm:h-[500px] sm:w-[500px]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-200 to-blue-200 dark:from-teal-900/30 dark:to-blue-900/30 blur-3xl opacity-70" />
              <Image
                src="/3d-globe-mesh.png"
                alt="GeoSVM Globe Visualization"
                className="relative z-10 object-contain"
                width={500}
                height={500}
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
