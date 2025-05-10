// Convert latitude and longitude to 3D coordinates
export function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)

  return { x, y, z }
}

// Generate a random point on the globe
export function getRandomPoint() {
  const lat = Math.random() * 180 - 90
  const lng = Math.random() * 360 - 180
  return { lat, lng }
}

// Generate a trixel ID from lat/lng (simplified for demo)
export function getTrixelId(lat: number, lng: number, level = 1) {
  // This is a simplified version for the demo
  // In a real implementation, this would use the HTM algorithm
  const latSection = Math.floor((lat + 90) / 30)
  const lngSection = Math.floor((lng + 180) / 60)
  const baseId = latSection * 6 + lngSection

  // Add random suffix for demo purposes
  const suffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")

  return `T${baseId}-${level}-${suffix}`
}

// Get parent trixel ID (simplified for demo)
export function getParentTrixelId(trixelId: string) {
  const parts = trixelId.split("-")
  if (parts.length < 2) return trixelId

  const level = Number.parseInt(parts[1])
  if (level <= 1) return trixelId

  return `${parts[0]}-${level - 1}-${parts[2]}`
}

// Get trixel vertices (simplified for demo)
export function getTrixelVertices(lat: number, lng: number, radius: number, size = 10) {
  const center = latLngToVector3(lat, lng, radius)

  // This is a simplified version that creates a triangle around the point
  // In a real implementation, this would use the HTM algorithm
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
