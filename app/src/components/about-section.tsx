import { Shield, SquareSplitVerticalIcon as SplitSquare, Network, Layers } from "lucide-react"
import Image from 'next/image';

import { siteConfig } from "@/lib/constants"
import { Card, CardContent } from "@/components/ui/card"

const iconMap = {
  Shield: Shield,
  SplitSquare: SplitSquare,
  Network: Network,
  Layers: Layers,
}

export function AboutSection() {
  return (
    <section id="about" className="py-20 bg-white dark:bg-gray-950">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[800px] text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            About <span className="text-teal-600 dark:text-teal-400">GeoSVM</span>
          </h2>
          <p className="mt-4 text-gray-500 dark:text-gray-400 md:text-lg">
            GeoSVM transforms location into a verifiable, economically meaningful primitive, resolving the geospatial
            &quot;blind spot&quot; of existing blockchains.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {siteConfig.features.map((feature) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap]

            return (
              <Card key={feature.title} className="border-2 border-gray-100 dark:border-gray-800">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
                    <Icon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-16 mx-auto max-w-[800px]">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-950/30 dark:to-blue-950/30 p-8">
                <h3 className="text-2xl font-bold mb-4">Key Innovation: Merkle-Sierpiński State Tree</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  GeoSVM&apos;s state tree is structured as a hierarchical triangular mesh (HTM), enabling perfect geometric
                  subdivisions and ancestry tracking.
                </p>
                <Image
                  src="/hierarchical-triangular-mesh-merkle-tree.png"
                  alt="Merkle-Sierpiński State Tree Infographic"
                  className="rounded-lg shadow-lg"
                  width={1200}
                  height={800}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
