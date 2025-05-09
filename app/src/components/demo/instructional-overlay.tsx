import { Info, MousePointer, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function InstructionalOverlay() {
  return (
    <Card className="border-2 border-gray-100 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Info className="h-5 w-5" />
          How It Works
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This simulation demonstrates how GeoSVM records and processes geospatial activity in a decentralized network.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-1.5 mt-0.5">
              <MousePointer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Click on the Globe</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Click anywhere on the globe to simulate a DePIN activity at that location.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-teal-100 dark:bg-teal-900/30 rounded-full p-1.5 mt-0.5">
              <Zap className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Watch the Updates</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                See how activity propagates through the hierarchical trixel structure.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 text-xs">
          <p className="font-medium mb-1">What This Represents:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-500 dark:text-gray-400">
            <li>Ride-sharing trips</li>
            <li>IoT sensor data submissions</li>
            <li>Wireless network usage</li>
            <li>Decentralized storage access</li>
            <li>Location-based services</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
