import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

// Types
export interface SphericalCoords {
    ra: number;  // Right Ascension or Longitude in degrees
    dec: number; // Declination or Latitude in degrees
}

export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

// Constants
const PI = Math.PI;
const TOTAL_SURFACE_AREA_SQKM = 510_100_000; // Earth's surface area in km²

// Initial octahedron vertices
const V_OCT: Vector3D[] = [
    { x: 0.0, y: 0.0, z: 1.0 },   // v0 (North Pole)
    { x: 1.0, y: 0.0, z: 0.0 },   // v1 (RA=0, Dec=0)
    { x: 0.0, y: 1.0, z: 0.0 },   // v2 (RA=90, Dec=0)
    { x: -1.0, y: 0.0, z: 0.0 },  // v3 (RA=180, Dec=0)
    { x: 0.0, y: -1.0, z: 0.0 },  // v4 (RA=270, Dec=0)
    { x: 0.0, y: 0.0, z: -1.0 },  // v5 (South Pole)
];

// Initial 8 triangles
const INITIAL_TRIANGLES = [
    // South Cap
    { id: 1, v: [V_OCT[1], V_OCT[5], V_OCT[2]] },
    { id: 2, v: [V_OCT[2], V_OCT[5], V_OCT[3]] },
    { id: 3, v: [V_OCT[3], V_OCT[5], V_OCT[4]] },
    { id: 4, v: [V_OCT[4], V_OCT[5], V_OCT[1]] },
    // North Cap
    { id: 5, v: [V_OCT[1], V_OCT[0], V_OCT[4]] },
    { id: 6, v: [V_OCT[4], V_OCT[0], V_OCT[3]] },
    { id: 7, v: [V_OCT[3], V_OCT[0], V_OCT[2]] },
    { id: 8, v: [V_OCT[2], V_OCT[0], V_OCT[1]] },
];

// Trixel Calculation Utilities
export function getTrixelCountAtResolution(resolution: number): number {
    if (resolution < 0) throw new Error("Resolution cannot be negative");
    // Base level 0 has 8 trixels (octahedron faces)
    if (resolution === 0) return 8;
    // CORRECT FORMULA: 8 * 4^(resolution - 1)
    return 8 * Math.pow(4, resolution - 1);
}

export function getTrixelAreaAtResolution(resolution: number): number {
    // Uses the corrected count function now
    const count = getTrixelCountAtResolution(resolution);
    if (count === 0) return TOTAL_SURFACE_AREA_SQKM; // Avoid division by zero, although count should be > 0 for res >= 0
    return TOTAL_SURFACE_AREA_SQKM / count;
}

export function getTrixelStats(resolution: number) {
    // Calculate stats AT the specified resolution, not cumulative
    const countAtRes = getTrixelCountAtResolution(resolution);
    const areaAtRes = getTrixelAreaAtResolution(resolution);
    // The largest area is always at resolution 0
    const largestArea = getTrixelAreaAtResolution(0); 
    // The smallest area is at the selected resolution
    const smallestArea = areaAtRes;

    const stats = {
        // Display the count AT this resolution
        totalTrixels: countAtRes, 
        // Smallest area IS the area at this resolution
        smallestTrixelArea: smallestArea, 
        // Largest area is always the area at resolution 0
        largestTrixelArea: largestArea, 
        // (Optional: Keep byResolution if needed elsewhere, but remove for clarity if not)
        // byResolution: [] // Simplified for now
    };
    
    // (Optional: Populate byResolution if needed)
    // for (let r = 0; r <= resolution; r++) {
    //     stats.byResolution.push({
    //         resolution: r,
    //         count: getTrixelCountAtResolution(r),
    //         area: getTrixelAreaAtResolution(r),
    //     });
    // }

    return stats;
}

// Vector Math Helpers
function vAdd(v1: Vector3D, v2: Vector3D): Vector3D {
    return {
        x: v1.x + v2.x,
        y: v1.y + v2.y,
        z: v1.z + v2.z,
    };
}

function vNormalize(v: Vector3D): Vector3D {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return {
        x: v.x / len,
        y: v.y / len,
        z: v.z / len,
    };
}

function vDot(v1: Vector3D, v2: Vector3D): number {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

function vCross(v1: Vector3D, v2: Vector3D): Vector3D {
    return {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x,
    };
}

// Spherical to Cartesian Conversion
function sphericalToCartesian(coords: SphericalCoords): Vector3D {
    // Validate coordinates
    if (coords.ra < 0 || coords.ra > 360 || coords.dec < -90 || coords.dec > 90) {
        throw new Error("Invalid coordinates");
    }

    const raRad = coords.ra * PI / 180.0;
    const decRad = coords.dec * PI / 180.0;

    return {
        x: Math.cos(decRad) * Math.cos(raRad),
        y: Math.cos(decRad) * Math.sin(raRad),
        z: Math.sin(decRad),
    };
}

function isPointInTriangle(p: Vector3D, v0: Vector3D, v1: Vector3D, v2: Vector3D, epsilon: number): boolean {
    // Test against plane defined by (Origin, v0, v1)
    const n01 = vCross(v0, v1);
    if (vDot(n01, p) < -epsilon) return false;

    // Test against plane defined by (Origin, v1, v2)
    const n12 = vCross(v1, v2);
    if (vDot(n12, p) < -epsilon) return false;

    // Test against plane defined by (Origin, v2, v0)
    const n20 = vCross(v2, v0);
    if (vDot(n20, p) < -epsilon) return false;

    return true;
}

// Get HTM ID from coordinates and depth
export function getHtmId(coords: SphericalCoords, depth: number): number {
    if (depth > 31) {
        throw new Error("Invalid resolution");
    }

    const pointCartesian = sphericalToCartesian(coords);
    let currentHtmId = 0;
    let currentTriangleVertices: Vector3D[] | null = null;

    // 1. Find the initial (level 0) triangle
    for (const initialTriangle of INITIAL_TRIANGLES) {
        if (isPointInTriangle(
            pointCartesian,
            initialTriangle.v[0],
            initialTriangle.v[1],
            initialTriangle.v[2],
            1e-9
        )) {
            currentHtmId = initialTriangle.id;
            currentTriangleVertices = initialTriangle.v;
            break;
        }
    }

    if (!currentTriangleVertices) {
        throw new Error("Invalid coordinates");
    }

    // 2. Recursive subdivision up to the desired depth
    for (let r = 0; r < depth; r++) {
        const vertices = currentTriangleVertices as Vector3D[];
        const [p0, p1, p2] = vertices;

        // Calculate midpoints of edges
        const w0 = vNormalize(vAdd(p1, p2)); // Midpoint of (p1, p2)
        const w1 = vNormalize(vAdd(p0, p2)); // Midpoint of (p0, p2)
        const w2 = vNormalize(vAdd(p0, p1)); // Midpoint of (p0, p1)

        // Define the 4 new child triangles
        const children: { id: number; v: Vector3D[] }[] = [
            { id: 1, v: [p0, w2, w1] },
            { id: 2, v: [p1, w0, w2] },
            { id: 3, v: [p2, w1, w0] },
            { id: 4, v: [w0, w1, w2] },
        ];

        let foundChild = false;
        for (const child of children) {
            if (isPointInTriangle(
                pointCartesian,
                child.v[0],
                child.v[1],
                child.v[2],
                1e-9
            )) {
                currentHtmId = currentHtmId * 10 + child.id;
                currentTriangleVertices = child.v;
                foundChild = true;
                break;
            }
        }

        if (!foundChild) {
            throw new Error("Invalid coordinates");
        }
    }

    return currentHtmId;
}

// Get trixel ID from coordinates and resolution
export function getTrixelId(coords: SphericalCoords, resolution: number): number {
    if (resolution > 31) {
        throw new Error("Invalid resolution");
    }
    return getHtmId(coords, resolution);
}

// Get ancestors for trixel ID
export function getTrixelAncestors(id: number): number[] {
    // Validate ID format
    const idStr = id.toString();
    
    // Check all digits except last are 1-4
    for (let i = 0; i < idStr.length - 1; i++) {
        const digit = parseInt(idStr[i]);
        if (digit < 1 || digit > 4) {
            throw new Error("Invalid trixel ID");
        }
    }
    
    // Check last digit is 1-8
    const lastDigit = parseInt(idStr[idStr.length - 1]);
    if (lastDigit < 1 || lastDigit > 8) {
        throw new Error("Invalid trixel ID");
    }

    const ancestors: number[] = [];
    let current = id;
    
    // Keep removing the first digit until we reach a single digit (1-8)
    while (current > 8) {
        const currentStr = current.toString();
        current = parseInt(currentStr.slice(1));
        ancestors.push(current);
    }
    
    return ancestors;
}

// Get PDA from trixel ID and world
export function getTrixelPDA(world: PublicKey, trixelId: number, programId: PublicKey): [PublicKey, number] {
    const trixelIdBn = new BN(trixelId);
    const idBytes = trixelIdBn.toArrayLike(Buffer, 'le', 8);
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("trixel"),
            world.toBuffer(),
            idBytes
        ],
        programId
    );
}

// Get resolution from trixel ID
export function getResolutionFromTrixelId(id: number): number {
    if (id >= 1 && id <= 8) {
        return 0; // Base level
    }
    
    // Count digits after the first digit
    let count = 0;
    let current = id;
    while (current > 8) {
        current = Math.floor(current / 10);
        count++;
    }
    return count;
}

// Get trixel vertices from trixel ID
export function getTrixelVerticesFromId(id: number): Vector3D[] {
    const idStr = id.toString();
    if (idStr.length === 0) {
        throw new Error("Invalid trixel ID: empty");
    }

    // The first digit determines the base triangle (1-8)
    const baseTriangleId = parseInt(idStr[0]);
    if (baseTriangleId < 1 || baseTriangleId > 8) {
        throw new Error(`Invalid trixel ID: base ID ${baseTriangleId} out of range 1-8`);
    }

    const baseTriangle = INITIAL_TRIANGLES[baseTriangleId - 1]; // Adjust for 0-indexed array
    if (!baseTriangle) {
        // This should not happen if baseTriangleId is validated correctly
        throw new Error(`Invalid trixel ID: Could not find base triangle for ${baseTriangleId}`);
    }

    // If this is a level 0 trixel (single digit ID), return its vertices directly
    if (idStr.length === 1) {
        if (id >= 1 && id <= 8) {
            return baseTriangle.v;
        } else {
            // Should be caught by earlier checks, but as a safeguard
            throw new Error(`Invalid trixel ID: single digit ${id} not in range 1-8`);
        }
    }

    let currentVertices = [...baseTriangle.v];
    
    // Process subsequent digits for subdivision (1-4)
    // Start from the second digit (index 1) of idStr
    for (let i = 1; i < idStr.length; i++) {
        const childIndex = parseInt(idStr[i]);
        if (childIndex < 1 || childIndex > 4) {
            throw new Error(`Invalid trixel ID: child index ${childIndex} at position ${i} out of range 1-4 for ID ${idStr}`);
        }
        
        const [p0, p1, p2] = currentVertices;
        
        const w0 = vNormalize(vAdd(p1, p2)); // Midpoint of (p1, p2)
        const w1 = vNormalize(vAdd(p0, p2)); // Midpoint of (p0, p2)
        const w2 = vNormalize(vAdd(p0, p1)); // Midpoint of (p0, p1)
        
        switch (childIndex) {
            case 1:
                currentVertices = [p0, w2, w1];
                break;
            case 2:
                currentVertices = [p1, w0, w2];
                break;
            case 3:
                currentVertices = [p2, w1, w0];
                break;
            case 4:
                currentVertices = [w0, w1, w2]; // Center triangle
                break;
            // No default needed due to validation above
        }
    }
    
    return currentVertices;
}

// Helper to convert 3D vector to spherical coordinates
export function cartesianToSpherical(v: Vector3D): SphericalCoords {
    const x = v.x;
    const y = v.y;
    const z = v.z;
    
    // Calculate declination (latitude)
    const dec = Math.asin(z) * 180.0 / PI;
    
    // Calculate right ascension (longitude)
    let ra = Math.atan2(y, x) * 180.0 / PI;
    if (ra < 0) {
        ra += 360.0;
    }
    
    return { ra, dec };
}

// Helper to get all trixels at a specific resolution
export function getAllTrixelsAtResolution(
    resolution: number, 
    pageSize?: number, // Make optional
    page?: number     // Make optional
): number[] {
    if (resolution < 0) throw new Error("Resolution cannot be negative");
    if (typeof pageSize === 'number' && pageSize <= 0) throw new Error("Page size must be positive");
    if (typeof page === 'number' && page < 0) throw new Error("Page number cannot be negative");

    const allTrixelIds: number[] = [];

    if (resolution === 0) {
        for (let i = 1; i <= 8; i++) {
            allTrixelIds.push(i);
        }
    } else {
        // Helper to recursively generate child IDs
        const generateChildrenRecursive = (currentParentId: number, currentParentActualResolution: number, targetResolution: number) => {
            // If the current parent's children will be at the target resolution
            if (currentParentActualResolution + 1 === targetResolution) {
                for (let i = 1; i <= 4; i++) { // Trixels always have 4 children (except the conceptual root)
                    allTrixelIds.push(currentParentId * 10 + i);
                }
            } 
            // If we need to go deeper
            else if (currentParentActualResolution + 1 < targetResolution) {
                for (let i = 1; i <= 4; i++) {
                    const childId = currentParentId * 10 + i;
                    generateChildrenRecursive(childId, currentParentActualResolution + 1, targetResolution);
                }
            }
            // If currentParentActualResolution >= targetResolution, we stop (or have already collected)
        };

        // Start generation from each of the 8 base trixels (which are at resolution 0)
        for (let baseTrixelId = 1; baseTrixelId <= 8; baseTrixelId++) {
            generateChildrenRecursive(baseTrixelId, 0, resolution);
        }
    }

    allTrixelIds.sort((a, b) => a - b);

    if (typeof pageSize === 'number' && typeof page === 'number') {
        const startIndex = page * pageSize;
        const endIndex = startIndex + pageSize;
        return allTrixelIds.slice(startIndex, endIndex);
    }
    
    return allTrixelIds;
}

// Helper to convert coordinates to trixel ID and get all PDAs
export function getTrixelAndAncestorPDAs(
    coords: SphericalCoords,
    resolution: number,
    world: PublicKey,
    programId: PublicKey
): { trixelId: number, trixelPda: PublicKey, ancestorPDAs: PublicKey[] } {
    const trixelId = getTrixelId(coords, resolution);
    const [trixelPda] = getTrixelPDA(world, trixelId, programId);
    
    const ancestors = getTrixelAncestors(trixelId);
    const ancestorPDAs = ancestors.map(ancestorId => {
        const [pda] = getTrixelPDA(world, ancestorId, programId);
        return pda;
    });

    return {
        trixelId,
        trixelPda,
        ancestorPDAs
    };
} 