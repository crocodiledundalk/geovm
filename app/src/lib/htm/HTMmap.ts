// HTMmap.ts (FIXED for tuple assignment errors and readonly)

import { slerp, cart2ll, wrapRingForAntimeridian } from "./sphere";

// --- Type Definitions ---
interface Vector3DObj { x: number; y: number; z: number; }
type Vec3DArray = [number, number, number];
interface SphericalCoords { ra: number; dec: number; }
// Ensure HTMTriangleDef's 'v' property is correctly a 3-element tuple
interface HTMTriangleDef { id: number; v: [Vector3DObj, Vector3DObj, Vector3DObj]; }

// --- Vector Math Helpers ---
const Vector3DStatic = { new: (x: number, y: number, z: number): Vector3DObj => ({ x, y, z }) };
function v_add(v1: Vector3DObj, v2: Vector3DObj): Vector3DObj { return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z }; }
function v_normalize(v: Vector3DObj): Vector3DObj {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len < 1e-15) return Vector3DStatic.new(0.0, 0.0, 0.0);
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}
function spherical_to_cartesian(coords: SphericalCoords): Vector3DObj {
    const ra_rad = coords.ra * Math.PI / 180.0;
    const dec_rad = coords.dec * Math.PI / 180.0;
    return {
        x: Math.cos(dec_rad) * Math.cos(ra_rad),
        y: Math.cos(dec_rad) * Math.sin(ra_rad),
        z: Math.sin(dec_rad)
    };
}
function v_cross(v1: Vector3DObj, v2: Vector3DObj): Vector3DObj { return { x: v1.y * v2.z - v1.z * v2.y, y: v1.z * v2.x - v1.x * v2.z, z: v1.x * v2.y - v1.y * v2.x }; }
function v_dot(v1: Vector3DObj, v2: Vector3DObj): number { return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z; }
function is_point_in_triangle(p: Vector3DObj, v0: Vector3DObj, v1: Vector3DObj, v2: Vector3DObj, epsilon: number): boolean {
    const n01 = v_cross(v0, v1); if (v_dot(n01, p) < -epsilon) return false;
    const n12 = v_cross(v1, v2); if (v_dot(n12, p) < -epsilon) return false;
    const n20 = v_cross(v2, v0); if (v_dot(n20, p) < -epsilon) return false;
    return true;
}

// --- Constants ---
const V_OCT: Vector3DObj[] = [
    Vector3DStatic.new(0.0, 0.0, 1.0), Vector3DStatic.new(1.0, 0.0, 0.0),
    Vector3DStatic.new(0.0, 1.0, 0.0), Vector3DStatic.new(-1.0, 0.0, 0.0),
    Vector3DStatic.new(0.0, -1.0, 0.0), Vector3DStatic.new(0.0, 0.0, -1.0),
];
// Ensure INITIAL_TRIANGLES_DEF provides the correct tuple type for 'v'
const INITIAL_TRIANGLES_DEF: HTMTriangleDef[] = [
    { id: 1, v: [V_OCT[1], V_OCT[5], V_OCT[2]] }, { id: 2, v: [V_OCT[2], V_OCT[5], V_OCT[3]] },
    { id: 3, v: [V_OCT[3], V_OCT[5], V_OCT[4]] }, { id: 4, v: [V_OCT[4], V_OCT[5], V_OCT[1]] },
    { id: 5, v: [V_OCT[1], V_OCT[0], V_OCT[4]] }, { id: 6, v: [V_OCT[4], V_OCT[0], V_OCT[3]] },
    { id: 7, v: [V_OCT[3], V_OCT[0], V_OCT[2]] }, { id: 8, v: [V_OCT[2], V_OCT[0], V_OCT[1]] },
];
const MAX_DEPTH_JS_NUMERIC = 15;

// --- Core Logic ---
export function getTrixelVerticesNumeric(id: number): [Vector3DObj, Vector3DObj, Vector3DObj] {
    const idStr = id.toString();
    if (!idStr || idStr.length === 0) throw new Error(`Invalid numeric ID (empty string from ${id})`);
    const rootId = parseInt(idStr[0], 10);
    if (isNaN(rootId) || rootId < 1 || rootId > 8) throw new Error(`Invalid root HTM ID segment: ${idStr[0]} from ID ${id}`);
    
    const initialTriangleDef = INITIAL_TRIANGLES_DEF.find(t => t.id === rootId)!;
    let currentVertices: [Vector3DObj, Vector3DObj, Vector3DObj];

    // Adjust pole vertices slightly for root trixels (IDs 1-8) to aid rendering
    if (idStr.length === 1) {
        const adjustedV: Vector3DObj[] = initialTriangleDef.v.map(v_orig => {
            let v_new = { ...v_orig }; // Create a mutable copy
            const Z_ADJUST_NORTH = 0.9999998; // Corresponds to approx 89.966 deg lat
            const Z_ADJUST_SOUTH = -0.9999998; // Corresponds to approx -89.966 deg lat

            if (v_orig.x === 0 && v_orig.y === 0 && v_orig.z === 1.0) { // V_OCT[0] - North Pole
                v_new.z = Z_ADJUST_NORTH;
                return v_normalize(v_new); // Re-normalize after z adjustment
            } else if (v_orig.x === 0 && v_orig.y === 0 && v_orig.z === -1.0) { // V_OCT[5] - South Pole
                v_new.z = Z_ADJUST_SOUTH;
                return v_normalize(v_new);
            }
            return v_orig; // Return original if not a pole vertex
        });
        currentVertices = adjustedV as [Vector3DObj, Vector3DObj, Vector3DObj];
    } else {
        currentVertices = initialTriangleDef.v;
    }

    for (let i = 1; i < idStr.length; i++) {
        const childSuffix = parseInt(idStr[i], 10);
        if (isNaN(childSuffix) || childSuffix < 1 || childSuffix > 4) throw new Error(`Invalid child suffix ${idStr[i]} in ID ${id}. Expected 1-4.`);
        
        // p0, p1, p2 are correctly destructured from the tuple currentVertices
        const [p0, p1, p2] = currentVertices;
        const w0 = v_normalize(v_add(p1, p2)); 
        const w1 = v_normalize(v_add(p0, p2)); 
        const w2 = v_normalize(v_add(p0, p1));
        
        // FIX: Ensure the new array assigned to currentVertices is explicitly a 3-element tuple
        if (childSuffix === 1) currentVertices = [p0, w2, w1] as [Vector3DObj, Vector3DObj, Vector3DObj];
        else if (childSuffix === 2) currentVertices = [p1, w0, w2] as [Vector3DObj, Vector3DObj, Vector3DObj];
        else if (childSuffix === 3) currentVertices = [p2, w1, w0] as [Vector3DObj, Vector3DObj, Vector3DObj];
        else currentVertices = [w0, w1, w2] as [Vector3DObj, Vector3DObj, Vector3DObj];
    }
    return currentVertices;
}

export function lookupIdRaDec(ra: number, dec: number, depth: number): number {
    if (depth > MAX_DEPTH_JS_NUMERIC) throw new Error(`Depth ${depth} exceeds max JS numeric ID depth ${MAX_DEPTH_JS_NUMERIC}`);
    if (depth < 0) throw new Error("Depth cannot be negative.");
    const point_cartesian = spherical_to_cartesian({ ra, dec });
    let current_htm_id: number | null = null;
    let current_triangle_vertices_opt: [Vector3DObj, Vector3DObj, Vector3DObj] | null = null;
    const primaryEpsilon = 1e-9, fallbackEpsilon = 1e-7;

    for (const it of INITIAL_TRIANGLES_DEF) { if (is_point_in_triangle(point_cartesian, it.v[0], it.v[1], it.v[2], primaryEpsilon)) { current_htm_id = it.id; current_triangle_vertices_opt = it.v; break; } }
    if (!current_triangle_vertices_opt) { for (const it of INITIAL_TRIANGLES_DEF) { if (is_point_in_triangle(point_cartesian, it.v[0], it.v[1], it.v[2], fallbackEpsilon)) { current_htm_id = it.id; current_triangle_vertices_opt = it.v; break; } } }
    if (!current_triangle_vertices_opt || current_htm_id === null) throw new Error(`Failed to find initial HTM triangle for RA ${ra}, Dec ${dec}.`);
    
    // current_triangle_vertices is correctly typed here because current_triangle_vertices_opt is a tuple or null
    let current_triangle_vertices: [Vector3DObj, Vector3DObj, Vector3DObj] = current_triangle_vertices_opt;

    for (let r = 0; r < depth; r++) {
        const [p0, p1, p2] = current_triangle_vertices;
        const w0 = v_normalize(v_add(p1, p2)); const w1 = v_normalize(v_add(p0, p2)); const w2 = v_normalize(v_add(p0, p1));
        
        // The 'v' property in children objects will be inferred as a 3-element tuple
        const children = [ 
            {s:1, v:[p0,w2,w1]}, 
            {s:2, v:[p1,w0,w2]}, 
            {s:3, v:[p2,w1,w0]}, 
            {s:4, v:[w0,w1,w2]} 
        ];
        let found_child = false;
        for (const ch of children) { 
            if (is_point_in_triangle(point_cartesian, ch.v[0], ch.v[1], ch.v[2], primaryEpsilon)) { 
                current_htm_id = current_htm_id!*10 + ch.s; 
                current_triangle_vertices = ch.v as [Vector3DObj, Vector3DObj, Vector3DObj]; 
                found_child = true; 
                break; 
            } 
        }
        if (!found_child) { 
            for (const ch of children) { 
                if (is_point_in_triangle(point_cartesian, ch.v[0], ch.v[1], ch.v[2], fallbackEpsilon)) { 
                    current_htm_id = current_htm_id!*10 + ch.s; 
                    current_triangle_vertices = ch.v as [Vector3DObj, Vector3DObj, Vector3DObj]; 
                    found_child = true; 
                    break; 
                } 
            } 
        }
        if (!found_child) throw new Error(`Failed to find child HTM trixel at level ${r+1} for RA ${ra}, Dec ${dec} (parent ${current_htm_id}).`);
    }
    return current_htm_id!;
}

// --- Edge Densification & Boundary Generation ---
const DEFAULT_SEGMENTS_PER_EDGE = 16;
function objToArr(v: Vector3DObj): Vec3DArray { return [v.x, v.y, v.z]; }

function normalizeLongitude(lon: number): number {
    let l = lon % 360;
    if (l > 180) l -= 360;
    if (l < -180) l += 360;
    return l;
}

function areLonLatPointsEqual(p1: readonly [number,number] | undefined, p2: readonly [number,number] | undefined, tolerance: number = 1e-9): boolean {
    if (!p1 || !p2) return false;
    return Math.abs(normalizeLongitude(p1[0]) - normalizeLongitude(p2[0])) < tolerance && Math.abs(p1[1] - p2[1]) < tolerance;
}

function getPolygonCoordinatesForGlobe(
    v0_obj: Vector3DObj,
    v1_obj: Vector3DObj,
    v2_obj: Vector3DObj,
    segmentsPerEdge: number
): Array<[number, number]> {
    const vertices3D: [Vector3DObj, Vector3DObj, Vector3DObj] = [v0_obj, v1_obj, v2_obj];
    const polygonRingLonLat: Array<[number, number]> = [];

    for (let i = 0; i < 3; i++) {
        const p_start_obj = vertices3D[i];
        const p_end_obj = vertices3D[(i + 1) % 3];
        const p_start_arr = objToArr(p_start_obj);
        const p_end_arr = objToArr(p_end_obj);

        const start_ll = [...cart2ll(p_start_arr)] as [number, number];
        
        if (i === 0) {
            polygonRingLonLat.push(start_ll);
        }

        for (let j = 1; j < segmentsPerEdge; j++) {
            const t = j / segmentsPerEdge;
            const slerped_p_arr = slerp(p_start_arr, p_end_arr, t) as Vec3DArray;
            const slerped_norm_obj = v_normalize({ x: slerped_p_arr[0], y: slerped_p_arr[1], z: slerped_p_arr[2] });
            const slerped_ll = [...cart2ll(objToArr(slerped_norm_obj))] as [number, number];
            polygonRingLonLat.push(slerped_ll);
        }
        
        const end_ll = [...cart2ll(p_end_arr)] as [number, number];
        polygonRingLonLat.push(end_ll);
    }

    const uniquePoints: Array<[number, number]> = [];
    if (polygonRingLonLat.length > 0) {
        uniquePoints.push(polygonRingLonLat[0]);
        for (let k = 1; k < polygonRingLonLat.length; k++) {
            if (!areLonLatPointsEqual(polygonRingLonLat[k], polygonRingLonLat[k-1])) {
                if (k === polygonRingLonLat.length -1 && areLonLatPointsEqual(polygonRingLonLat[k], uniquePoints[0])) {
                    // Don't add
                } else {
                    uniquePoints.push(polygonRingLonLat[k]);
                }
            }
        }
    }

    if (uniquePoints.length > 0 && !areLonLatPointsEqual(uniquePoints[0], uniquePoints[uniquePoints.length - 1])) {
        uniquePoints.push([...uniquePoints[0]] as [number, number]);
    }

    if (uniquePoints.length < 4) {
        //console.warn(`[getPolygonCoordinatesForGlobe] Trixel resulted in < 4 unique points after densification: ${uniquePoints.length}`);
        return []; // Return empty if not enough points for a valid ring
    }
    // DO NOT wrap here, wrap in trixelBoundary after getting the raw coordinates.
    return uniquePoints;
}

class HTMmap {
  constructor() {}
  public lookupIdLonLat(lon: number, lat: number, depth: number): number { return this.lookupIdRaDec(lon, lat, depth); }
  public lookupIdRaDec = lookupIdRaDec;

  public trixelBoundary(id: number): any {
    if (typeof id !== 'number' || id <= 0 || isNaN(id)) {
        console.error("[HTMmap] trixelBoundary: Valid positive HTM numeric ID required. Received:", id);
        return { type: "GeometryCollection", geometries: [] };
    }
    try {
        const [v0_obj, v1_obj, v2_obj] = getTrixelVerticesNumeric(id);

        // Check if it's one of the 8 root trixels for simplified polar cap handling
        if (id >= 1 && id <= 8) {
            const initialDef = INITIAL_TRIANGLES_DEF.find(t => t.id === id)!;
            let isNorthCap = false;
            let isSouthCap = false;
            const equatorialVertices: Vector3DObj[] = [];

            initialDef.v.forEach(v => {
                if (v.x === 0 && v.y === 0 && v.z === 1.0) isNorthCap = true;
                else if (v.x === 0 && v.y === 0 && v.z === -1.0) isSouthCap = true;
                else equatorialVertices.push(v);
            });

            // If it is a polar cap root trixel (one pole vertex, two equatorial)
            if ((isNorthCap || isSouthCap) && equatorialVertices.length === 2) {
                const POLE_LAT_CLAMP = 89.99; // How close to the pole the "top" edge is
                const nearPoleLat = isNorthCap ? POLE_LAT_CLAMP : -POLE_LAT_CLAMP;

                // Get the two equatorial vertices' lon/lat
                const eqV1_ll = [...cart2ll(objToArr(equatorialVertices[0]))] as [number, number];
                const eqV2_ll = [...cart2ll(objToArr(equatorialVertices[1]))] as [number, number];

                // Create the two near-pole vertices with the same longitudes as the equatorial ones
                const nearPoleV1_ll: [number, number] = [eqV1_ll[0], nearPoleLat];
                const nearPoleV2_ll: [number, number] = [eqV2_ll[0], nearPoleLat];

                // Form a quadrilateral ring (densify the equatorial edge)
                const simplifiedRingCoordinates: Array<[number, number]> = [eqV1_ll];
                const eqV1_arr = objToArr(equatorialVertices[0]);
                const eqV2_arr = objToArr(equatorialVertices[1]);

                for (let j = 1; j < DEFAULT_SEGMENTS_PER_EDGE; j++) {
                    const t = j / DEFAULT_SEGMENTS_PER_EDGE;
                    const slerped_p_arr = slerp(eqV1_arr, eqV2_arr, t) as Vec3DArray;
                    const slerped_ll = [...cart2ll(objToArr(v_normalize({x:slerped_p_arr[0], y:slerped_p_arr[1], z:slerped_p_arr[2]})))] as [number, number];
                    // Clamp latitude of intermediate points too, just in case slerp goes over pole slightly (unlikely for equator)
                    if (Math.abs(slerped_ll[1]) > POLE_LAT_CLAMP) {
                         slerped_ll[1] = Math.sign(slerped_ll[1]) * POLE_LAT_CLAMP;
                    }
                    simplifiedRingCoordinates.push(slerped_ll);
                }
                simplifiedRingCoordinates.push(eqV2_ll);
                simplifiedRingCoordinates.push(nearPoleV2_ll); // Add near-pole vertex 2
                simplifiedRingCoordinates.push(nearPoleV1_ll); // Add near-pole vertex 1
                simplifiedRingCoordinates.push(eqV1_ll); // Close the ring
                
                console.log(`[HTMmap trixelBoundary DEBUG] For ROOT POLAR ID ${id}, SIMPLIFIED QUAD coordinates:`, JSON.stringify(simplifiedRingCoordinates));
                const unwrappedRing = wrapRingForAntimeridian(simplifiedRingCoordinates); // USE wrapRingForAntimeridian

                if (unwrappedRing.length < 4) { // Check unwrappedRing
                    console.warn(`[HTMmap trixelBoundary] ID ${id} (polar) resulted in a ring with < 4 points after unwrapping. Coords:`, JSON.stringify(unwrappedRing));
                    return { type: "GeometryCollection", geometries: [] };
                }
                const geojsonPolygon = { type: "Polygon", coordinates: [unwrappedRing] }; // Use unwrappedRing
                return geojsonPolygon; // Return directly, no splitGeoJSON
            }
        }

        // Default behavior for non-root or non-polar root trixels
        const rawCoordinates = getPolygonCoordinatesForGlobe(v0_obj, v1_obj, v2_obj, DEFAULT_SEGMENTS_PER_EDGE);
        if (rawCoordinates.length > 0) {
            const unwrappedRing = wrapRingForAntimeridian(rawCoordinates); // USE wrapRingForAntimeridian

            if (unwrappedRing.length < 4) { // Check unwrappedRing
                 console.warn(`[HTMmap trixelBoundary] ID ${id} (default) resulted in a ring with < 4 points after unwrapping. Coords:`, JSON.stringify(unwrappedRing));
                return { type: "GeometryCollection", geometries: [] };
            }
            const geojsonPolygon = { type: "Polygon", coordinates: [unwrappedRing] }; // Use unwrappedRing
            return geojsonPolygon; // Return directly, no splitGeoJSON
        } else {
            // rawCoordinates was empty or less than 4 points from getPolygonCoordinatesForGlobe
            return { type: "GeometryCollection", geometries: [] };
        }
    } catch (e: any) {
        console.error(`[HTMmap] Error generating boundary for ID ${id}:`, e.message, e.stack);
        return { type: "GeometryCollection", geometries: [] };
    }
  }
}
export default HTMmap;