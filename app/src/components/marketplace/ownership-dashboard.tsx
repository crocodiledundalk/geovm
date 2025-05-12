"use client"

import { Wallet, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketplace } from "@/components/marketplace/marketplace-provider"
import { formatCurrency } from "@/lib/marketplace/marketplace-utils"

export function OwnershipDashboard() {
  const { ownedTrixels, totalRevenue } = useMarketplace()

  // Calculate total investment value
  const totalInvestment = ownedTrixels.reduce((sum, trixel) => sum + trixel.price, 0)

  // Calculate monthly earnings
  const monthlyEarnings = ownedTrixels.reduce((sum, trixel) => sum + trixel.potentialEarnings, 0)

  // Calculate average ROI
  const averageROI = totalInvestment > 0 ? ((monthlyEarnings * 12) / totalInvestment) * 100 : 0

  return (
    <Card className="border-2 border-gray-100 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Your Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Owned Trixels</div>
            <div className="text-2xl font-bold">{ownedTrixels.length}</div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Investment</div>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestment)} SOL</div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Monthly Earnings</div>
            <div className="text-2xl font-bold">{formatCurrency(monthlyEarnings)} SOL</div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Average ROI</div>
            <div className="text-2xl font-bold">{averageROI.toFixed(1)}%</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Accumulated Revenue</h3>
          <div className="text-sm text-teal-600 dark:text-teal-400 font-medium">{formatCurrency(totalRevenue)} SOL</div>
        </div>

        <div className="relative h-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"
            style={{ width: `${Math.min((totalRevenue / totalInvestment) * 100, 100)}%` }}
          ></div>
        </div>

        <h3 className="font-medium mb-3">Your Trixels</h3>

        {ownedTrixels.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {ownedTrixels.map((trixel) => (
              <div key={trixel.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{trixel.name}</h4>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Level {trixel.level} • ID: {trixel.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400 text-sm">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>{formatCurrency(trixel.potentialEarnings)} SOL/mo</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Investment</div>
                    <div className="font-medium">{formatCurrency(trixel.price)} SOL</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Activity Level</div>
                    <div className="font-medium">{trixel.activityLevel}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            You don&apos;t own any trixels yet. Start investing to build your portfolio!
          </div>
        )}
      </CardContent>
    </Card>
  )
}
