"use client"

import { useState } from "react"
import { X, AlertCircle, Check } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useMarketplace } from "@/components/marketplace/marketplace-provider"
import { formatCurrency, calculateROI } from "@/lib/marketplace/marketplace-utils"

export function TransactionModal() {
  const { selectedTrixel, clearSelectedTrixel, buyTrixel, investInTrixel, walletBalance } = useMarketplace()
  const [transactionType, setTransactionType] = useState<"buy" | "invest">("buy")
  const [investmentAmount, setInvestmentAmount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  if (!selectedTrixel) return null

  // Calculate ownership percentage based on investment amount
  const ownershipPercentage = (investmentAmount / selectedTrixel.price) * 100

  // Calculate expected earnings based on investment amount
  const expectedEarnings = selectedTrixel.potentialEarnings * (investmentAmount / selectedTrixel.price)

  // Calculate ROI
  const roi = calculateROI(expectedEarnings, investmentAmount)

  const handleInvestmentChange = (value: number[]) => {
    setInvestmentAmount(value[0])
  }

  const handleClose = () => {
    if (isProcessing) return
    clearSelectedTrixel()
    setIsComplete(false)
  }

  const handleTransaction = async () => {
    setIsProcessing(true)

    let success = false

    if (transactionType === "buy") {
      success = await buyTrixel(selectedTrixel.id)
    } else {
      success = await investInTrixel(selectedTrixel.id, investmentAmount)
    }

    if (success) {
      setIsComplete(true)
    }

    setIsProcessing(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-2 border-gray-100 dark:border-gray-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{isComplete ? "Transaction Complete" : "Trixel Investment"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} disabled={isProcessing}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isComplete ? (
            <div className="py-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">Transaction Successful!</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {transactionType === "buy"
                  ? `You have successfully purchased ${selectedTrixel.name}.`
                  : `You have successfully invested ${formatCurrency(investmentAmount)} SOL in ${selectedTrixel.name}.`}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your portfolio has been updated with your new investment.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="font-medium mb-1">{selectedTrixel.name}</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Level {selectedTrixel.level} • ID: {selectedTrixel.id}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Activity Level</div>
                  <div className="text-lg font-medium">{selectedTrixel.activityLevel}%</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Monthly Earnings</div>
                  <div className="text-lg font-medium">{formatCurrency(selectedTrixel.potentialEarnings)} SOL</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Full Price</div>
                  <div className="text-lg font-medium">{formatCurrency(selectedTrixel.price)} SOL</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Annual ROI</div>
                  <div className="text-lg font-medium">
                    {calculateROI(selectedTrixel.potentialEarnings, selectedTrixel.price).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mb-6">
                <Button
                  variant={transactionType === "buy" ? "default" : "outline"}
                  onClick={() => setTransactionType("buy")}
                  className={transactionType === "buy" ? "bg-teal-600 hover:bg-teal-700 flex-1" : "flex-1"}
                >
                  Buy Full Trixel
                </Button>
                <Button
                  variant={transactionType === "invest" ? "default" : "outline"}
                  onClick={() => {
                    setTransactionType("invest")
                    setInvestmentAmount(selectedTrixel.price / 4) // Default to 25%
                  }}
                  className={transactionType === "invest" ? "bg-teal-600 hover:bg-teal-700 flex-1" : "flex-1"}
                >
                  Fractional Investment
                </Button>
              </div>

              {transactionType === "invest" && (
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <div className="text-sm font-medium">Investment Amount</div>
                    <div className="text-sm font-medium">{formatCurrency(investmentAmount)} SOL</div>
                  </div>

                  <Slider
                    defaultValue={[selectedTrixel.price / 4]}
                    max={Math.min(selectedTrixel.price, walletBalance)}
                    min={selectedTrixel.price * 0.05}
                    step={selectedTrixel.price * 0.01}
                    onValueChange={handleInvestmentChange}
                    className="mb-4"
                  />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Ownership</div>
                      <div>{ownershipPercentage.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Monthly Earnings</div>
                      <div>{formatCurrency(expectedEarnings)} SOL</div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Annual ROI</div>
                      <div>{roi.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              )}

              {walletBalance < (transactionType === "buy" ? selectedTrixel.price : investmentAmount) && (
                <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Insufficient Balance</p>
                    <p className="text-xs">Your wallet balance is too low to complete this transaction.</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <h4 className="font-medium mb-1">Investment Summary</h4>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">
                  {transactionType === "buy"
                    ? "You are purchasing the entire trixel and will receive 100% of its revenue."
                    : `You are purchasing ${ownershipPercentage.toFixed(1)}% of this trixel and will receive proportional revenue.`}
                </p>

                <div className="flex justify-between text-xs">
                  <span>Your wallet balance:</span>
                  <span>{formatCurrency(walletBalance)} SOL</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Transaction amount:</span>
                  <span>{formatCurrency(transactionType === "buy" ? selectedTrixel.price : investmentAmount)} SOL</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1 pt-1 flex justify-between text-xs font-medium">
                  <span>Remaining balance:</span>
                  <span>
                    {formatCurrency(
                      walletBalance - (transactionType === "buy" ? selectedTrixel.price : investmentAmount),
                    )}{" "}
                    SOL
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          {isComplete ? (
            <Button onClick={handleClose} className="bg-teal-600 hover:bg-teal-700">
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                onClick={handleTransaction}
                disabled={
                  isProcessing || walletBalance < (transactionType === "buy" ? selectedTrixel.price : investmentAmount)
                }
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isProcessing ? "Processing..." : "Confirm Transaction"}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
