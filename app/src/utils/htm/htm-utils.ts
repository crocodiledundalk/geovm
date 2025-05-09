import { SphericalCoords, Vector3D, cartesianToSpherical } from '@/sdk/utils';
import type { FeatureCollection, Polygon, BBox } from 'geojson';

// Function to get the HTM resolution based on map zoom level
export function getTriResolutionForZoom(zoom: number): number {
  // Map zoom levels to HTM resolutions
  // Adjust these values based on desired detail level at each zoom
  if (zoom < 1) return 0; // Base triangles
  if (zoom < 2) return 1;
  if (zoom < 3) return 2;
  if (zoom < 4) return 3;
  if (zoom < 5) return 4;
  return 5; // Maximum resolution for now (to avoid performance issues)
}

// Convert trixel IDs to GeoJSON FeatureCollection
export function trixelsToFC(trixelIds: number[] | string[]): FeatureCollection<Polygon> {
  const features = trixelIds.map(id => {
    // Get the polygon coordinates for this trixel
    const boundary = getTrixelBoundaryLngLat(typeof id === 'string' ? id : id.toString());
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
export function getTrixelBoundaryLngLat(trixelId: string | number): [number, number][] {
  // For simple testing implementation, delegate to SDK's getTrixelVerticesFromId
  // and convert the 3D vectors to spherical coordinates
  const id = typeof trixelId === 'string' ? parseInt(trixelId, 10) : trixelId;
  
  // Validate trixel ID format before proceeding
  if (!isValidTrixelId(id)) {
    console.error(`[getTrixelBoundaryLngLat] Invalid trixel ID format: ${id} (${typeof trixelId === 'string' ? trixelId : ''})`, 
      `Rightmost digit: ${id.toString()[id.toString().length - 1]}, 
       Expected: 1-8, 
       Other digits: ${id.toString().slice(0, -1)}, 
       Expected: all 1-4`);
    return [];
  }
  
  console.log(`[getTrixelBoundaryLngLat] Processing valid trixel ID: ${id}`);
  
  // Use the SDK utility to get vertices
  try {
    // Import dynamically to avoid circular dependencies
    const { getTrixelVerticesFromId } = require('@/sdk/utils');
    const vertices = getTrixelVerticesFromId(id);
    
    // Convert to spherical coordinates
    return vertices.map((vertex: Vector3D) => {
      const spherical = cartesianToSpherical(vertex);
      return [spherical.ra, spherical.dec]; // [longitude, latitude]
    });
  } catch (error) {
    console.error(`[getTrixelBoundaryLngLat] Error getting boundary for trixel ${trixelId}:`, error);
    return [];
  }
}

// Validate if a trixel ID has the correct format
function isValidTrixelId(id: number): boolean {
  // Basic validation: check if the ID is a positive integer
  if (!Number.isInteger(id) || id <= 0) return false;
  
  // Convert to string to check individual digits
  const idStr = id.toString();
  
  // The rightmost digit (first in the ID) should be 1-8
  const rightmostDigit = parseInt(idStr[idStr.length - 1], 10);
  if (rightmostDigit < 1 || rightmostDigit > 8) return false;
  
  // All other digits should be 1-4
  for (let i = 0; i < idStr.length - 1; i++) {
    const digit = parseInt(idStr[i], 10);
    if (digit < 1 || digit > 4) return false;
  }
  
  return true;
}

// Get trixel IDs visible in the current map view
export function getTrixelsForView(bounds: BBox | null, resolution: number): number[] {
  // For an initial implementation, we return a fixed set of trixels for testing
  // In a full implementation, this would filter trixels based on the map bounds
  
  // Resolution 0 = base trixels (1-8)
  if (resolution === 0) {
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }
  
  const result: number[] = [];
  
  // Generate trixels at the specified resolution
  // In HTM, trixel IDs are digit sequences where:
  // - The rightmost digit is 1-8 (base trixel)
  // - All other digits are 1-4 (subdivision level)
  
  // For higher resolutions, build valid trixel IDs
  // Start with 1-4 (parent subdivision levels) and end with 1-8 (base trixel)
  const prefixes = generatePrefixes(resolution - 1);
  
  // For each valid prefix, generate 8 trixels with base IDs 1-8
  for (const prefix of prefixes) {
    // Limit the number of trixels to prevent overwhelming the display
    if (result.length >= 100) break;
    
    for (let base = 1; base <= 8; base++) {
      const trixelId = parseInt(`${prefix}${base}`, 10);
      result.push(trixelId);
    }
  }
  
  return result;
}

// Helper to generate valid prefixes for trixel IDs
// Returns an array of valid prefixes for the given depth
function generatePrefixes(depth: number): string[] {
  if (depth <= 0) return [''];
  
  // For depth 1, just return digits 1-4
  if (depth === 1) {
    return ['1', '2', '3', '4'];
  }
  
  // For deeper levels, recursively build
  const parentPrefixes = generatePrefixes(depth - 1);
  const results: string[] = [];
  
  // Only generate a limited set of prefixes to prevent too many trixels
  const limit = Math.min(parentPrefixes.length, 5);
  
  for (let i = 0; i < limit; i++) {
    const prefix = parentPrefixes[i];
    // For each parent prefix, add children with digits 1-4
    for (let j = 1; j <= 4; j++) {
      // Add new digit at the start of the prefix because in HTM,
      // the first digit is the base triangle, and digits are added to the left
      // as we go deeper in the hierarchy
      results.push(`${j}${prefix}`);
    }
  }
  
  return results;
} 