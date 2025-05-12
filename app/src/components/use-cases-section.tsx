import { Radio, Truck, Umbrella, Cpu, Building } from "lucide-react"

import { siteConfig } from "@/lib/constants"
import { Card, CardContent } from "@/components/ui/card"

const iconMap = {
  Radio: Radio,
  Truck: Truck,
  Umbrella: Umbrella,
  Cpu: Cpu,
  Building: Building,
}

export function UseCasesSection() {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[800px] text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Use <span className="text-teal-600 dark:text-teal-400">Cases</span>
          </h2>
          <p className="mt-4 text-gray-500 dark:text-gray-400 md:text-lg">
            GeoSVM enables a wide range of applications that require robust geospatial accounting and verification.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {siteConfig.useCases.map((useCase) => {
            const Icon = iconMap[useCase.icon as keyof typeof iconMap]

            return (
              <Card key={useCase.title} className="border-2 border-gray-100 dark:border-gray-800">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold">{useCase.title}</h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">{useCase.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
