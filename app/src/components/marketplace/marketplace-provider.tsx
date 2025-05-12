"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { generateTrixels } from "@/lib/marketplace/marketplace-utils"

export interface Trixel {
  id: string
  name: string
  level: number
  activityLevel: number
  potentialEarnings: number
  price: number
  owned: boolean
  location: {
    lat: number
    lng: number
  }
}

interface MarketplaceContextType {
  availableTrixels: Trixel[]
  ownedTrixels: Trixel[]
  selectedTrixel: Trixel | null
  totalRevenue: number
  walletBalance: number
  selectTrixel: (id: string) => void
  buyTrixel: (id: string) => Promise<boolean>
  investInTrixel: (id: string, amount: number) => Promise<boolean>
  clearSelectedTrixel: () => void
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined)

export function useMarketplace() {
  const context = useContext(MarketplaceContext)
  if (!context) {
    throw new Error("useMarketplace must be used within a MarketplaceProvider")
  }
  return context
}

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const [availableTrixels, setAvailableTrixels] = useState<Trixel[]>([])
  const [ownedTrixels, setOwnedTrixels] = useState<Trixel[]>([])
  const [selectedTrixel, setSelectedTrixel] = useState<Trixel | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [walletBalance, setWalletBalance] = useState(10) // Starting with 10 SOL

  // Initialize with some sample data
  useEffect(() => {
    const initialTrixels = generateTrixels(12)
    setAvailableTrixels(initialTrixels)

    // Start with a couple of owned trixels
    const initialOwnedTrixels = generateTrixels(2, true)
    setOwnedTrixels(initialOwnedTrixels)

    // Set initial revenue
    setTotalRevenue(initialOwnedTrixels.reduce((sum, trixel) => sum + trixel.potentialEarnings * 0.7, 0))

    // Start revenue accumulation simulation
    const interval = setInterval(() => {
      setTotalRevenue((prev) => {
        const increment = ownedTrixels.reduce((sum, trixel) => sum + trixel.potentialEarnings * 0.01, 0)
        return prev + increment
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [ownedTrixels])

  // Update revenue when owned trixels change
  useEffect(() => {
    // This simulates revenue accumulation based on owned trixels
    const intervalId = setInterval(() => {
      if (ownedTrixels.length > 0) {
        setTotalRevenue((prev) => {
          const increment = ownedTrixels.reduce((sum, trixel) => sum + trixel.potentialEarnings * 0.01, 0)
          return prev + increment
        })
      }
    }, 5000)

    return () => clearInterval(intervalId)
  }, [ownedTrixels])

  const selectTrixel = (id: string) => {
    const trixel = availableTrixels.find((t) => t.id === id)
    if (trixel) {
      setSelectedTrixel(trixel)
    }
  }

  const clearSelectedTrixel = () => {
    setSelectedTrixel(null)
  }

  const buyTrixel = async (id: string): Promise<boolean> => {
    const trixel = availableTrixels.find((t) => t.id === id)
    if (!trixel) return false

    if (walletBalance < trixel.price) {
      alert("Insufficient balance to complete this purchase.")
      return false
    }

    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Update wallet balance
    setWalletBalance((prev) => prev - trixel.price)

    // Move trixel from available to owned
    setAvailableTrixels((prev) => prev.filter((t) => t.id !== id))
    setOwnedTrixels((prev) => [...prev, { ...trixel, owned: true }])

    // Clear selection
    clearSelectedTrixel()

    return true
  }

  const investInTrixel = async (id: string, amount: number): Promise<boolean> => {
    const trixel = availableTrixels.find((t) => t.id === id)
    if (!trixel) return false

    if (walletBalance < amount) {
      alert("Insufficient balance to complete this investment.")
      return false
    }

    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Calculate ownership percentage
    const ownershipPercentage = amount / trixel.price

    // Update wallet balance
    setWalletBalance((prev) => prev - amount)

    // Create fractional ownership
    const fractionalTrixel = {
      ...trixel,
      owned: true,
      price: amount,
      potentialEarnings: trixel.potentialEarnings * ownershipPercentage,
      name: `${trixel.name} (${Math.round(ownershipPercentage * 100)}%)`,
    }

    // Add to owned trixels
    setOwnedTrixels((prev) => [...prev, fractionalTrixel])

    // Clear selection
    clearSelectedTrixel()

    return true
  }

  return (
    <MarketplaceContext.Provider
      value={{
        availableTrixels,
        ownedTrixels,
        selectedTrixel,
        totalRevenue,
        walletBalance,
        selectTrixel,
        buyTrixel,
        investInTrixel,
        clearSelectedTrixel,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  )
}
