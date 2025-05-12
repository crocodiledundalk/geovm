"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useMarketplace } from "@/components/marketplace/marketplace-provider"
import { latLngToVector3, getTrixelVertices } from "@/lib/marketplace/marketplace-utils"
import { TransactionModal } from "@/components/marketplace/transaction-modal"

export function MarketplaceGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { availableTrixels, ownedTrixels, selectedTrixel, selectTrixel } = useMarketplace()

  // Handle globe click
  const handleGlobeClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Convert to lat/lng (simplified for demo)
    const clickLat = y * 90
    const clickLng = x * 180

    // Find closest trixel
    let closestTrixel = null
    let minDistance = Number.POSITIVE_INFINITY

    for (const trixel of availableTrixels) {
      const distance = Math.sqrt(
        Math.pow(trixel.location.lat - clickLat, 2) + Math.pow(trixel.location.lng - clickLng, 2),
      )

      if (distance < minDistance) {
        minDistance = distance
        closestTrixel = trixel
      }
    }

    // If we found a close trixel and it's reasonably close, select it
    if (closestTrixel && minDistance < 30) {
      selectTrixel(closestTrixel.id)
    }
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
      }
    }

    setCanvasDimensions()
    window.addEventListener("resize", setCanvasDimensions)

    // Animation variables
    let animationFrame: number
    let rotation = 0
    const rotationSpeed = 0.001

    // Draw the globe
    const drawGlobe = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = Math.min(centerX, centerY) * 0.8

      // Draw globe
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(200, 240, 255, 0.2)"
      ctx.fill()
      ctx.strokeStyle = "rgba(0, 150, 200, 0.5)"
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw grid lines (simplified HTM representation)
      ctx.strokeStyle = "rgba(0, 180, 220, 0.7)"
      ctx.lineWidth = 1

      // Draw meridians
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + rotation

        // Rotate context for meridian
        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(0, -radius)
        ctx.lineTo(0, radius)
        ctx.stroke()
        ctx.restore()
      }

      // Draw parallels
      for (let j = 1; j < 6; j++) {
        const parallelRadius = (j / 6) * radius
        ctx.beginPath()
        ctx.arc(centerX, centerY, parallelRadius, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw available trixels
      availableTrixels.forEach((trixel) => {
        const vector = latLngToVector3(trixel.location.lat, trixel.location.lng, radius)

        // Convert 3D coordinates to 2D screen coordinates (simplified)
        const trixelX = centerX + vector.x
        const trixelY = centerY - vector.y

        // Draw trixel
        const vertices = getTrixelVertices(trixel.location.lat, trixel.location.lng, radius, 15 + trixel.level * 5)

        if (vertices.length >= 3) {
          ctx.beginPath()
          ctx.moveTo(centerX + vertices[0].x, centerY - vertices[0].y)

          for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(centerX + vertices[i].x, centerY - vertices[i].y)
          }

          ctx.closePath()

          // Color based on activity level
          const alpha = 0.1 + (trixel.activityLevel / 100) * 0.4
          ctx.fillStyle = `rgba(0, 180, 220, ${alpha})`
          ctx.fill()

          // Highlight if selected
          if (selectedTrixel && selectedTrixel.id === trixel.id) {
            ctx.strokeStyle = "rgba(255, 215, 0, 0.8)"
            ctx.lineWidth = 2
          } else {
            ctx.strokeStyle = "rgba(0, 180, 220, 0.8)"
            ctx.lineWidth = 1
          }

          ctx.stroke()

          // Draw activity indicator
          ctx.beginPath()
          ctx.arc(trixelX, trixelY, 3 + (trixel.activityLevel / 100) * 5, 0, Math.PI * 2)

          // Color based on activity level
          if (trixel.activityLevel < 30) {
            ctx.fillStyle = "rgba(59, 130, 246, 0.8)" // blue
          } else if (trixel.activityLevel < 70) {
            ctx.fillStyle = "rgba(234, 179, 8, 0.8)" // yellow
          } else {
            ctx.fillStyle = "rgba(239, 68, 68, 0.8)" // red
          }

          ctx.fill()

          // Add trixel label
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
          ctx.font = "10px Arial"
          ctx.textAlign = "center"
          ctx.fillText(trixel.name, trixelX, trixelY - 10)
        }
      })

      // Draw owned trixels
      ownedTrixels.forEach((trixel) => {
        const vector = latLngToVector3(trixel.location.lat, trixel.location.lng, radius)

        // Convert 3D coordinates to 2D screen coordinates (simplified)
        const trixelX = centerX + vector.x
        const trixelY = centerY - vector.y

        // Draw trixel
        const vertices = getTrixelVertices(trixel.location.lat, trixel.location.lng, radius, 15 + trixel.level * 5)

        if (vertices.length >= 3) {
          ctx.beginPath()
          ctx.moveTo(centerX + vertices[0].x, centerY - vertices[0].y)

          for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(centerX + vertices[i].x, centerY - vertices[i].y)
          }

          ctx.closePath()

          // Color for owned trixels
          ctx.fillStyle = "rgba(16, 185, 129, 0.3)" // teal
          ctx.fill()
          ctx.strokeStyle = "rgba(16, 185, 129, 0.8)"
          ctx.lineWidth = 1.5
          ctx.stroke()

          // Draw ownership indicator
          ctx.beginPath()
          ctx.arc(trixelX, trixelY, 4, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(16, 185, 129, 0.8)"
          ctx.fill()

          // Add trixel label
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
          ctx.font = "10px Arial"
          ctx.textAlign = "center"
          ctx.fillText(trixel.name, trixelX, trixelY - 10)
        }
      })

      // Animate rotation
      rotation += rotationSpeed
      animationFrame = requestAnimationFrame(drawGlobe)
    }

    drawGlobe()

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
      cancelAnimationFrame(animationFrame)
    }
  }, [availableTrixels, ownedTrixels, selectedTrixel])

  return (
    <>
      <Card className="border-2 border-gray-100 dark:border-gray-800 relative overflow-hidden">
        <CardContent className="p-0">
          <div className="relative h-[500px] w-full bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950/30">
            <canvas ref={canvasRef} className="h-full w-full cursor-pointer" onClick={handleGlobeClick} />

            <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-gray-900/80 rounded-lg p-2 text-xs text-gray-500 dark:text-gray-400 backdrop-blur-sm">
              Click on a trixel to view investment opportunities
            </div>

            <div className="absolute top-4 right-4 flex gap-2">
              <div className="flex items-center gap-1 bg-white/80 dark:bg-gray-900/80 rounded-lg px-2 py-1 text-xs backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Low Activity</span>
              </div>
              <div className="flex items-center gap-1 bg-white/80 dark:bg-gray-900/80 rounded-lg px-2 py-1 text-xs backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Medium Activity</span>
              </div>
              <div className="flex items-center gap-1 bg-white/80 dark:bg-gray-900/80 rounded-lg px-2 py-1 text-xs backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>High Activity</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedTrixel && <TransactionModal />}
    </>
  )
}
