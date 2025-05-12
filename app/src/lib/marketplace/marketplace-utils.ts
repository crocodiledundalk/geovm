import type { Trixel } from "@/components/marketplace/marketplace-provider"

// Generate random trixels for demo purposes
export function generateTrixels(count: number, owned = false): Trixel[] {
  const trixels: Trixel[] = []

  for (let i = 0; i < count; i++) {
    const level = Math.floor(Math.random() * 3) + 1
    const activityLevel = Math.floor(Math.random() * 100) + 1
    const potentialEarnings = (0.01 + Math.random() * 0.2) * activityLevel
    const price = potentialEarnings * (10 + Math.random() * 10)

    trixels.push({
      id: `T${Math.floor(Math.random() * 8)}-${level}-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")}`,
      name: `Trixel ${String.fromCharCode(65 + i)}${level}`,
      level,
      activityLevel,
      potentialEarnings,
      price: Number.parseFloat(price.toFixed(2)),
      owned,
      location: {
        lat: Math.random() * 180 - 90,
        lng: Math.random() * 360 - 180,
      },
    })
  }

  return trixels
}

// Get activity level color
export function getActivityColor(level: number): string {
  if (level < 30) return "bg-blue-500"
  if (level < 70) return "bg-yellow-500"
  return "bg-red-500"
}

// Format currency
export function formatCurrency(amount: number): string {
  return amount.toFixed(2)
}

// Calculate ROI percentage
export function calculateROI(earnings: number, price: number): number {
  return ((earnings * 12) / price) * 100
}

// Convert latitude and longitude to 3D coordinates
export function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)

  return { x, y, z }
}

// Get trixel vertices (simplified for demo)
export function getTrixelVertices(lat: number, lng: number, radius: number, size = 10) {
  const center = latLngToVector3(lat, lng, radius)

  // This is a simplified version that creates a triangle around the point
  const vertices = []

  // Create three points around the center
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3
    const x = center.x + size * Math.cos(angle)
    const y = center.y + size * Math.sin(angle)
    const z = center.z

    vertices.push({ x, y, z })
  }

  return vertices
}
