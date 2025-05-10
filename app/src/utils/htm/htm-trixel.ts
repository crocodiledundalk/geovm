// Basic implementation of the htm-trixel module functions
// This is a simplified version of the original module to make the demo globe work

import type { FeatureCollection, Polygon, BBox } from 'geojson';

// Function to get the HTM resolution based on map zoom level
export function getTriResolutionForZoom(zoom: number): number {
  // Map zoom levels to HTM resolutions
  if (zoom < 1) return 0; // Base triangles
  if (zoom < 2) return 1;
  if (zoom < 3) return 2;
  if (zoom < 4) return 3;
  if (zoom < 5) return 4;
  return 5; // Maximum resolution for now
}

// Convert trixel IDs to GeoJSON FeatureCollection
export function trixelsToFC(trixelIds: number[]): FeatureCollection<Polygon> {
  const features = trixelIds.map(id => {
    // Get the polygon coordinates for this trixel
    const boundary = getTrixelBoundaryLngLat(id);
    if (!boundary || boundary.length < 3) {
      console.warn(`[trixelsToFC] Invalid boundary for trixel ${id}`);
      return null;
    }

    // Close the polygon (first point = last point)
    const coordinates = [
      [...boundary, boundary[0]]
    ];

    return {
      type: 'Feature',
      id: id,
      properties: {
        id: id // Include ID in properties for easier access
      },
      geometry: {
        type: 'Polygon',
        coordinates: coordinates
      }
    };
  }).filter(Boolean) as any[];

  return {
    type: 'FeatureCollection',
    features: features
  };
}

// Get trixel boundary coordinates in [longitude, latitude] format
export function getTrixelBoundaryLngLat(trixelId: number): [number, number][] {
  // Simple implementation that creates a triangular shape based on the trixel ID
  // In a real implementation, this would calculate the actual HTM trixel boundaries
  
  // Base trixels (1-8)
  const baseTrixels = {
    1: [[0, 60], [120, 0], [240, 0]], // N0
    2: [[120, 0], [240, 0], [0, -60]], // N1
    3: [[240, 0], [0, -60], [120, -60]], // N2
    4: [[0, -60], [120, -60], [240, -60]], // N3
    5: [[0, 60], [120, 60], [240, 0]], // S0
    6: [[120, 60], [240, 60], [0, 0]], // S1
    7: [[240, 60], [0, 0], [120, 0]], // S2
    8: [[0, 0], [120, 0], [240, 60]], // S3
  };
  
  // For demonstration purposes, return a simple triangle based on trixel ID
  // For child trixels, we'll modify the parent trixel coordinates slightly
  
  const idStr = trixelId.toString();
  const baseId = parseInt(idStr.charAt(idStr.length - 1), 10);
  
  if (baseId >= 1 && baseId <= 8 && baseTrixels[baseId as keyof typeof baseTrixels]) {
    const baseVertices = baseTrixels[baseId as keyof typeof baseTrixels];
    
    // If this is just a base trixel, return it directly
    if (idStr.length === 1) {
      return baseVertices as [number, number][];
    }
    
    // For child trixels, adjust the base trixel's coordinates
    // This is just a simple distortion for visual effect
    const childNum = parseInt(idStr.charAt(0), 10) % 4 + 1;
    const offsetFactor = idStr.length * 0.1; // More levels = more offset
    
    return baseVertices.map(([lng, lat], i) => {
      // Apply different adjustments based on child number and vertex
      const lngOffset = (childNum % 2) * offsetFactor * (i === 0 ? -1 : 1);
      const latOffset = (childNum > 2 ? 1 : -1) * offsetFactor * (i === 1 ? -1 : 1);
      return [
        (lng + lngOffset) % 360, 
        Math.max(-85, Math.min(85, lat + latOffset))
      ] as [number, number];
    });
  }
  
  // Fallback - return a default triangle near the equator
  return [[0, 0], [10, 10], [20, 0]] as [number, number][];
}

// Get trixel IDs visible in the current map view
export function getTrixelsForView(bounds: BBox | null, resolution: number): number[] {
  // For an initial implementation, we return a fixed set of trixels for testing
  
  // Resolution 0 = base trixels (1-8)
  if (resolution === 0) {
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }
  
  const result: number[] = [];
  
  // Generate some sample trixel IDs at the specified resolution
  // First digit 1-4 represents subdivision, last digit 1-8 represents base trixel
  for (let prefix = 1; prefix <= 4; prefix++) {
    for (let base = 1; base <= 8; base++) {
      // Build ID string with the specified resolution
      let idStr = prefix.toString();
      for (let i = 1; i < resolution; i++) {
        idStr += ((i % 4) + 1).toString();
      }
      idStr += base.toString();
      
      const trixelId = parseInt(idStr, 10);
      result.push(trixelId);
      
      // Limit the number of trixels to prevent overwhelming the display
      if (result.length >= 100) break;
    }
    if (result.length >= 100) break;
  }
  
  return result;
} 