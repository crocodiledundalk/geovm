"use client"

import { useState } from "react"
import { TrendingUp, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useMarketplace } from "@/components/marketplace/marketplace-provider"
import { getActivityColor, formatCurrency, calculateROI } from "@/lib/marketplace/marketplace-utils"

export function InvestmentPanel() {
  const { availableTrixels, selectTrixel, walletBalance } = useMarketplace()
  const [sortBy, setSortBy] = useState<"activity" | "earnings" | "roi">("activity")

  // Sort trixels based on selected criteria
  const sortedTrixels = [...availableTrixels].sort((a, b) => {
    if (sortBy === "activity") {
      return b.activityLevel - a.activityLevel
    } else if (sortBy === "earnings") {
      return b.potentialEarnings - a.potentialEarnings
    } else {
      // ROI
      return calculateROI(b.potentialEarnings, b.price) - calculateROI(a.potentialEarnings, a.price)
    }
  })

  return (
    <Card className="border-2 border-gray-100 dark:border-gray-800 sticky top-20">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Investment Opportunities
          </span>
          <div className="text-sm font-normal text-gray-500 dark:text-gray-400">
            Balance: {formatCurrency(walletBalance)} SOL
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={sortBy === "activity" ? "default" : "outline"}
            onClick={() => setSortBy("activity")}
            className={sortBy === "activity" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            Activity
          </Button>
          <Button
            size="sm"
            variant={sortBy === "earnings" ? "default" : "outline"}
            onClick={() => setSortBy("earnings")}
            className={sortBy === "earnings" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            Earnings
          </Button>
          <Button
            size="sm"
            variant={sortBy === "roi" ? "default" : "outline"}
            onClick={() => setSortBy("roi")}
            className={sortBy === "roi" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            ROI %
          </Button>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {sortedTrixels.map((trixel) => (
            <div
              key={trixel.id}
              className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
              onClick={() => selectTrixel(trixel.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{trixel.name}</h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Level {trixel.level} • ID: {trixel.id}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getActivityColor(trixel.activityLevel)}`}></div>
                  <span className="text-xs">{trixel.activityLevel}%</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Price</div>
                  <div className="font-medium">{formatCurrency(trixel.price)} SOL</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Monthly</div>
                  <div className="font-medium">{formatCurrency(trixel.potentialEarnings)} SOL</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">ROI</div>
                  <div className="font-medium">{calculateROI(trixel.potentialEarnings, trixel.price).toFixed(1)}%</div>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full mt-2 bg-teal-600 hover:bg-teal-700"
                onClick={(e) => {
                  e.stopPropagation()
                  selectTrixel(trixel.id)
                }}
              >
                View Details
              </Button>
            </div>
          ))}

          {sortedTrixels.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No investment opportunities available at the moment.
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Trixels with higher activity levels generally offer better returns but may come at a premium price. You
              can also invest fractionally in trixels to diversify your portfolio.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
