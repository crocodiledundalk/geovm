"use client"

import { useState, useEffect } from "react"
import { Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useGlobeStore } from "@/lib/demo/globe-store"

export function ActivityCounter() {
  const activityCount = useGlobeStore((state) => state.activityCount)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (activityCount > 0) {
      setIsAnimating(true)
      const timeout = setTimeout(() => setIsAnimating(false), 1000)
      return () => clearTimeout(timeout)
    }
  }, [activityCount])

  return (
    <Card className="border-2 border-gray-100 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Activity className={`h-5 w-5 ${isAnimating ? "text-teal-500 animate-pulse" : ""}`} />
          Activity Counter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold tabular-nums">
            <span className={isAnimating ? "text-teal-500" : ""}>{activityCount}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">Total Usage Units Simulated</p>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div>
              <div className="font-medium">Active Trixels</div>
              <div className="text-gray-500 dark:text-gray-400">{Math.min(activityCount, 12)}</div>
            </div>
            <div>
              <div className="font-medium">Network Value</div>
              <div className="text-gray-500 dark:text-gray-400">{(activityCount * 0.05).toFixed(2)} SOL</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
