export type Vec3D = [number, number, number];

const OCTAHEDRON_VERTICES: Vec3D[] = [
    [0, 0, 1],  // v0 (North Pole)
    [1, 0, 0],  // v1
    [0, 1, 0],  // v2
    [-1, 0, 0], // v3
    [0, -1, 0], // v4
    [0, 0, -1]  // v5 (South Pole)
];

type BaseTrixelName = "N0" | "N1" | "N2" | "N3" | "S0" | "S1" | "S2" | "S3";

const BASE_TRIANGLES_INDICES: Record<BaseTrixelName, [Vec3D, Vec3D, Vec3D]> = {
    N0: [OCTAHEDRON_VERTICES[0], OCTAHEDRON_VERTICES[1], OCTAHEDRON_VERTICES[2]], // v0,v1,v2
    N1: [OCTAHEDRON_VERTICES[0], OCTAHEDRON_VERTICES[2], OCTAHEDRON_VERTICES[3]], // v0,v2,v3
    N2: [OCTAHEDRON_VERTICES[0], OCTAHEDRON_VERTICES[3], OCTAHEDRON_VERTICES[4]], // v0,v3,v4
    N3: [OCTAHEDRON_VERTICES[0], OCTAHEDRON_VERTICES[4], OCTAHEDRON_VERTICES[1]], // v0,v4,v1
    S0: [OCTAHEDRON_VERTICES[5], OCTAHEDRON_VERTICES[2], OCTAHEDRON_VERTICES[1]], // v5,v2,v1 (cyclic of paper's v1,v5,v2)
    S1: [OCTAHEDRON_VERTICES[5], OCTAHEDRON_VERTICES[3], OCTAHEDRON_VERTICES[2]], // v5,v3,v2 (cyclic of paper's v2,v5,v3)
    S2: [OCTAHEDRON_VERTICES[5], OCTAHEDRON_VERTICES[4], OCTAHEDRON_VERTICES[3]], // v5,v4,v3 (cyclic of paper's v3,v5,v4)
    S3: [OCTAHEDRON_VERTICES[5], OCTAHEDRON_VERTICES[1], OCTAHEDRON_VERTICES[4]], // v5,v1,v4 (cyclic of paper's v4,v5,v1)
};

function addVectors(vA: Vec3D, vB: Vec3D): Vec3D {
    return [vA[0] + vB[0], vA[1] + vB[1], vA[2] + vB[2]];
}

function normalizeVector(v: Vec3D): Vec3D {
    const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (mag === 0) {
        // Or handle as an error, though for normalized input vectors to addVectors,
        // sum should only be zero if they are perfectly opposite, which shouldn't happen in HTM.
        console.warn("Normalizing a zero-magnitude vector");
        return [0, 0, 0]; 
    }
    return [v[0] / mag, v[1] / mag, v[2] / mag];
}

function getMidpoint(p1: Vec3D, p2: Vec3D): Vec3D {
    return normalizeVector(addVectors(p1, p2));
}

export function getTrixelCornerVectorsFromHTMName(name: string): { v0: Vec3D, v1: Vec3D, v2: Vec3D } {
    if (name.length < 2) throw new Error("Invalid HTM name: too short. Name must be like 'N0', 'S31', etc.");
    const baseName = name.substring(0, 2);
    const subIndicesStr = name.substring(2);

    const baseKey = baseName as BaseTrixelName; // Type assertion
    if (!(baseKey in BASE_TRIANGLES_INDICES)) { // Runtime check for validity
        throw new Error(`Invalid base HTM name: ${baseName}. Must be N0-N3 or S0-S3.`);
    }
    
    let currentVertices: [Vec3D, Vec3D, Vec3D] = BASE_TRIANGLES_INDICES[baseKey];

    for (let i = 0; i < subIndicesStr.length; i++) {
        const subIndex = parseInt(subIndicesStr[i], 10);
        if (isNaN(subIndex) || subIndex < 0 || subIndex > 3) {
            throw new Error(`Invalid sub-index character: '${subIndicesStr[i]}' in HTM name '${name}'`);
        }

        const [cv0, cv1, cv2] = currentVertices; // Parent vertices (local v0, v1, v2)

        // Calculate midpoints of edges (w0, w1, w2 from paper terminology)
        // w2 is midpoint of (cv0, cv1)
        // w1 is midpoint of (cv0, cv2)
        // w0 is midpoint of (cv1, cv2)
        const w2_mid_cv0_cv1 = getMidpoint(cv0, cv1); // Paper's w2 (connects to local v0,v1)
        const w1_mid_cv0_cv2 = getMidpoint(cv0, cv2); // Paper's w1 (connects to local v0,v2)
        const w0_mid_cv1_cv2 = getMidpoint(cv1, cv2); // Paper's w0 (connects to local v1,v2)

        if (subIndex === 0) { // Child 0: (cv0, w2, w1)
            currentVertices = [cv0, w2_mid_cv0_cv1, w1_mid_cv0_cv2];
        } else if (subIndex === 1) { // Child 1: (cv1, w0, w2)
            currentVertices = [cv1, w0_mid_cv1_cv2, w2_mid_cv0_cv1];
        } else if (subIndex === 2) { // Child 2: (cv2, w1, w0)
            currentVertices = [cv2, w1_mid_cv0_cv2, w0_mid_cv1_cv2];
        } else if (subIndex === 3) { // Child 3: (w0, w1, w2) - central, ensure CCW
            // Paper order for T3 is (w0,w1,w2)
            // w0 = mid(cv1,cv2)
            // w1 = mid(cv0,cv2)
            // w2 = mid(cv0,cv1)
            currentVertices = [w0_mid_cv1_cv2, w1_mid_cv0_cv2, w2_mid_cv0_cv1];
        } 
        // No else needed due to subIndex validation above
    }
    return { v0: currentVertices[0], v1: currentVertices[1], v2: currentVertices[2] };
}

// Example Usage (optional, for testing):
/*
try {
    console.log("N0:", getTrixelCornerVectorsFromHTMName("N0"));
    console.log("S0:", getTrixelCornerVectorsFromHTMName("S0"));
    console.log("N00:", getTrixelCornerVectorsFromHTMName("N00"));
    // console.log("N00000000000000000000:", getTrixelCornerVectorsFromHTMName("N00000000000000000000")); // Max depth
} catch (e) {
    console.error(e.message);
}
*/ 