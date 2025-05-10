"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function GlobeSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentFeature, setCurrentFeature] = useState(0)

  const features = ["HTM Grid Structure", "Trixel Hierarchy", "State Propagation", "Geo-Sharding"]

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

    // Simple globe animation
    let animationFrame: number
    let rotation = 0

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
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - radius)
        ctx.lineTo(centerX, centerY + radius)
        ctx.stroke()

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

      // Draw triangular mesh (simplified)
      ctx.strokeStyle = "rgba(0, 200, 150, 0.8)"
      ctx.lineWidth = 1.5

      const drawTriangle = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.lineTo(x3, y3)
        ctx.closePath()
        ctx.stroke()
      }

      // Draw some sample triangles
      for (let k = 0; k < 8; k++) {
        const angle1 = (k / 8) * Math.PI * 2 + rotation
        const angle2 = ((k + 1) / 8) * Math.PI * 2 + rotation

        const x1 = centerX
        const y1 = centerY
        const x2 = centerX + Math.cos(angle1) * radius
        const y2 = centerY + Math.sin(angle1) * radius
        const x3 = centerX + Math.cos(angle2) * radius
        const y3 = centerY + Math.sin(angle2) * radius

        drawTriangle(x1, y1, x2, y2, x3, y3)

        // Draw subdivision (level 1)
        const midX1 = (x1 + x2) / 2
        const midY1 = (y1 + y2) / 2
        const midX2 = (x2 + x3) / 2
        const midY2 = (y2 + y3) / 2
        const midX3 = (x3 + x1) / 2
        const midY3 = (y3 + y1) / 2

        drawTriangle(midX1, midY1, midX2, midY2, midX3, midY3)
      }

      // Highlight a specific trixel based on current feature
      ctx.fillStyle = "rgba(0, 220, 180, 0.3)"
      const highlightAngle = (currentFeature / 4) * Math.PI * 2 + rotation
      const nextAngle = ((currentFeature + 1) / 4) * Math.PI * 2 + rotation

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX + Math.cos(highlightAngle) * radius, centerY + Math.sin(highlightAngle) * radius)
      ctx.lineTo(centerX + Math.cos(nextAngle) * radius, centerY + Math.sin(nextAngle) * radius)
      ctx.closePath()
      ctx.fill()

      // Animate rotation
      if (isAnimating) {
        rotation += 0.005
        animationFrame = requestAnimationFrame(drawGlobe)
      }
    }

    drawGlobe()

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
      cancelAnimationFrame(animationFrame)
    }
  }, [isAnimating, currentFeature])

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating)
  }

  const nextFeature = () => {
    setCurrentFeature((prev) => (prev + 1) % features.length)
  }

  return (
    <section className="py-20 bg-white dark:bg-gray-950">
      <div className="container">
        <div className="mx-auto max-w-[800px] text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Interactive <span className="text-teal-600 dark:text-teal-400">Globe</span>
          </h2>
          <p className="mt-4 text-gray-500 dark:text-gray-400 md:text-lg">
            Explore the geospatial state structure of GeoSVM through our interactive visualization.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-2 border-gray-100 dark:border-gray-800 h-[500px]">
              <CardContent className="p-0 h-full">
                <div className="relative h-full w-full bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950/30">
                  <canvas ref={canvasRef} className="h-full w-full" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full border-2 border-gray-100 dark:border-gray-800">
              <CardContent className="p-6 flex flex-col h-full">
                <h3 className="text-2xl font-bold mb-4">{features[currentFeature]}</h3>

                <div className="flex-1">
                  {currentFeature === 0 && (
                    <p className="text-gray-500 dark:text-gray-400">
                      The Hierarchical Triangular Mesh (HTM) divides Earth's surface into triangular cells (trixels)
                      that can be perfectly subdivided, creating a consistent geometric hierarchy.
                    </p>
                  )}

                  {currentFeature === 1 && (
                    <p className="text-gray-500 dark:text-gray-400">
                      Each trixel has a unique ID that encodes its location, resolution, and ancestry, enabling
                      efficient computation of spatial relationships and hierarchical queries.
                    </p>
                  )}

                  {currentFeature === 2 && (
                    <p className="text-gray-500 dark:text-gray-400">
                      State updates propagate hierarchically through the trixel tree, ensuring data consistency and
                      enabling efficient aggregation of geospatial information.
                    </p>
                  )}

                  {currentFeature === 3 && (
                    <p className="text-gray-500 dark:text-gray-400">
                      Geo-sharding allows for localized consensus and parallel transaction processing, significantly
                      improving scalability while maintaining global consistency.
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <Button onClick={toggleAnimation} variant="outline">
                    {isAnimating ? "Pause Animation" : "Start Animation"}
                  </Button>
                  <Button onClick={nextFeature} className="bg-teal-600 hover:bg-teal-700">
                    Next Feature
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
