"use client"

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

interface TrixelUpdateAnimationProps {
  trixelPath: string[]
}

export function TrixelUpdateAnimation({ trixelPath }: TrixelUpdateAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (trixelPath.length === 0) return

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= trixelPath.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [trixelPath])

  if (trixelPath.length === 0) return null

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="flex flex-col items-center space-y-4">
        {trixelPath.map((trixelId, index) => {
          const isActive = index <= currentStep
          const isCurrentStep = index === currentStep

          return (
            <div key={trixelId} className="flex flex-col items-center">
              {index > 0 && (
                <div className={`h-8 flex items-center justify-center ${isActive ? "text-teal-500" : "text-gray-300"}`}>
                  <ArrowUp className={`h-6 w-6 ${isCurrentStep ? "animate-bounce" : ""}`} />
                </div>
              )}

              <div
                className={`
                  rounded-lg px-4 py-2 transition-all duration-300
                  ${isActive ? "bg-teal-500 text-white scale-110" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}
                  ${isCurrentStep ? "animate-pulse shadow-lg" : ""}
                `}
              >
                <div className="text-xs font-mono">{trixelId}</div>
                <div className="text-xs">Level {trixelPath.length - index}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 text-center bg-white/80 dark:bg-gray-900/80 rounded-lg p-3 max-w-md backdrop-blur-sm">
        <h3 className="font-bold text-sm mb-1">Hierarchical State Update</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Activity data propagates upward through the trixel hierarchy, ensuring consistent state across all levels.
        </p>
      </div>
    </div>
  )
}
