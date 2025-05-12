"use client"

import { useState, useEffect } from "react"
import { Activity, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useGlobeStore } from "@/lib/demo/globe-store"

export function ActivityCounter() {
  const totalClicksRegistered = useGlobeStore((state) => state.totalClicksRegistered)
  const totalClicksConfirmed = useGlobeStore((state) => state.totalClicksConfirmed)
  const activeTrixelsCount = useGlobeStore((state) => state.activeTrixels.length)
  
  const [isRegisteredAnimating, setIsRegisteredAnimating] = useState(false)
  const [isConfirmedAnimating, setIsConfirmedAnimating] = useState(false)

  useEffect(() => {
    if (totalClicksRegistered > 0) {
      setIsRegisteredAnimating(true)
      const timeout = setTimeout(() => setIsRegisteredAnimating(false), 1000)
      return () => clearTimeout(timeout)
    }
  }, [totalClicksRegistered])

  useEffect(() => {
    if (totalClicksConfirmed > 0) {
      setIsConfirmedAnimating(true)
      const timeout = setTimeout(() => setIsConfirmedAnimating(false), 1000)
      return () => clearTimeout(timeout)
    }
  }, [totalClicksConfirmed])

  return (
    <Card className="border-2 border-gray-100 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Activity className={`h-5 w-5 ${isRegisteredAnimating || isConfirmedAnimating ? "text-teal-500 animate-pulse" : ""}`} />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Total Clicks Registered */}
        <div className="flex flex-col items-center mb-4">
          <div className="text-3xl font-bold tabular-nums">
            <span className={isRegisteredAnimating ? "text-teal-500" : ""}>{totalClicksRegistered}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">Total Clicks Registered</p>
        </div>

        {/* Total Clicks Confirmed */}
        <div className="flex flex-col items-center border-t border-gray-100 dark:border-gray-800 pt-4 mb-4">
          <div className="text-3xl font-bold tabular-nums">
            <span className={isConfirmedAnimating ? "text-green-500" : ""}>{totalClicksConfirmed}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">Total Clicks Confirmed</p>
        </div>

        {/* Active Trixels & Network Value */}
        <div className="mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div>
              <div className="font-medium">Active Trixels</div>
              <div className="text-gray-500 dark:text-gray-400 tabular-nums">{activeTrixelsCount}</div>
            </div>
            <div>
              <div className="font-medium">Network Value</div>
              <div className="text-gray-500 dark:text-gray-400 tabular-nums">{(totalClicksConfirmed * 0.05).toFixed(2)} SOL</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
