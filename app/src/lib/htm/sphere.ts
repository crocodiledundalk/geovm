// triangle-globe/src/utils/sphere.ts

export const RAD = Math.PI/180;
export const DEG = 180/Math.PI;

/**
 * Spherical linear interpolation.
 * @param a Start unit vector (Cartesian [x,y,z])
 * @param b End unit vector (Cartesian [x,y,z])
 * @param t Interpolation factor (0 to 1)
 * @returns Interpolated unit vector (Cartesian [x,y,z])
 */
export function slerp(a:number[], b:number[], t:number): number[] {
  // Ensure inputs are arrays of 3 numbers
  if (!Array.isArray(a) || a.length !== 3 || !Array.isArray(b) || b.length !== 3) {
    console.error("slerp: Inputs 'a' and 'b' must be arrays of 3 numbers.");
    return [0,0,0]; // Or throw error
  }

  // Clamp dot product to [-1, 1] to avoid Math.acos errors due to floating point precision
  const dot = Math.min(1, Math.max(-1, a[0]*b[0]+a[1]*b[1]+a[2]*b[2]));
  const Ω = Math.acos(dot);

  // Check for undefined/NaN angle or zero angle
  if (isNaN(Ω) || Ω < 1e-10) { // Use a small threshold instead of === 0
    return a; // If points are identical or very close, return start point
  }
  const sinΩ = Math.sin(Ω);
  // Check if sinΩ is very close to zero (could happen if Ω is near PI, i.e., opposite points)
  if (Math.abs(sinΩ) < 1e-10) {
      // If points are nearly opposite, any perpendicular vector can be used for rotation axis.
      // Linear interpolation followed by normalization might be more stable here,
      // but for simplicity, we can return 'a' or handle it as a special case if needed.
      // For t=0.5, the midpoint is ambiguous. Let's just return 'a' for now.
      // A more robust solution would handle antipodal points specifically.
      return a;
  }


  const k0 = Math.sin((1-t)*Ω)/sinΩ;
  const k1 = Math.sin(t*Ω)/sinΩ;
  return [ 
    a[0]*k0 + b[0]*k1, 
    a[1]*k0 + b[1]*k1, 
    a[2]*k0 + b[2]*k1 
  ];
}

/**
 * Converts Cartesian coordinates (unit vector) to [longitude, latitude] in degrees.
 * @param p Cartesian [x,y,z] unit vector
 * @returns Tuple [longitude, latitude] in degrees
 */
export function cart2ll([x,y,z]:number[]): readonly [number, number] { // Using readonly tuple for [lon,lat]
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    console.error("cart2ll: Input must be an array of 3 numbers.");
    return [0,0]; // Or throw error
  }
   // Clamp z to avoid Math.asin errors due to floating point inaccuracies near poles
  const clampedZ = Math.min(1, Math.max(-1, z));
  // Ensure atan2 handles potential floating point zeros correctly, though it usually does
  return [ Math.atan2(y,x)*DEG, Math.asin(clampedZ)*DEG ] as const;
}

/**
 * Adjusts longitude coordinates in a ring to handle antimeridian crossings,
 * ensuring segments are represented in a way that allows continuous rendering.
 * Input ring points are expected to have longitudes already normalized to [-180, 180]
 * by the cart2ll function or similar.
 * @param ring An array of [longitude, latitude] points.
 * @returns A new array of [longitude, latitude] points with adjusted longitudes.
 */
export function wrapRingForAntimeridian(ring: Array<[number,number]>): Array<[number,number]> {
  if (!ring || ring.length === 0) return [];

  const wrappedRing: Array<[number,number]> = [];
  // Initialize prevLon with the longitude of the first point
  let prevLon = ring[0][0];
  wrappedRing.push([...ring[0]]); // Add the first point as is

  for (let i = 1; i < ring.length; i++) {
    let currentLon = ring[i][0];
    const lat = ring[i][1];
    // Calculate delta based on the *previous point's potentially adjusted* longitude
    const delta = currentLon - prevLon;

    // Check for a large jump signifying crossing the antimeridian discontinuity
    if (Math.abs(delta) > 180) {
      // Adjust the current longitude by adding/subtracting 360 degrees
      // to make it continuous with the previous point's adjusted longitude.
      // Subtract if delta is positive (e.g., -170 -> +170, delta ~ +340, sign=1, currentLon -= 360)
      // Add if delta is negative (e.g., +170 -> -170, delta ~ -340, sign=-1, currentLon -= -360)
      currentLon -= Math.sign(delta) * 360;
    }
    wrappedRing.push([currentLon, lat]);
    // Update prevLon to the potentially adjusted longitude for the *next* iteration
    prevLon = currentLon;
  }
  return wrappedRing;
}