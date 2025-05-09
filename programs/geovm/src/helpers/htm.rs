use std::f64::consts::PI;
use anchor_lang::prelude::*;
use crate::errors::ErrorCode;

#[derive(Debug, Clone, Copy)]
pub struct Vector3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct SphericalCoords {
    pub ra: f64,  // Right Ascension or Longitude in degrees
    pub dec: f64, // Declination or Latitude in degrees
}

#[derive(Debug, Clone)]
pub struct HTMTriangle {
    pub id: u64,
    pub v: [Vector3D; 3], // Vertices in counter-clockwise order
}

impl Vector3D {
    pub const fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }
}

// Vector Math Helpers
pub fn v_add(v1: Vector3D, v2: Vector3D) -> Vector3D {
    Vector3D {
        x: v1.x + v2.x,
        y: v1.y + v2.y,
        z: v1.z + v2.z,
    }
}

pub fn v_subtract(v1: Vector3D, v2: Vector3D) -> Vector3D {
    Vector3D {
        x: v1.x - v2.x,
        y: v1.y - v2.y,
        z: v1.z - v2.z,
    }
}

pub fn v_scale(v: Vector3D, scalar: f64) -> Vector3D {
    Vector3D {
        x: v.x * scalar,
        y: v.y * scalar,
        z: v.z * scalar,
    }
}

pub fn v_dot(v1: Vector3D, v2: Vector3D) -> f64 {
    v1.x * v2.x + v1.y * v2.y + v1.z * v2.z
}

pub fn v_cross(v1: Vector3D, v2: Vector3D) -> Vector3D {
    Vector3D {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x,
    }
}

pub fn v_length(v: Vector3D) -> f64 {
    (v.x * v.x + v.y * v.y + v.z * v.z).sqrt()
}

pub fn v_normalize(v: Vector3D) -> Vector3D {
    let len = v_length(v);
    if len == 0.0 {
        Vector3D::new(0.0, 0.0, 0.0)
    } else {
        Vector3D {
            x: v.x / len,
            y: v.y / len,
            z: v.z / len,
        }
    }
}

// Spherical to Cartesian Conversion
pub fn spherical_to_cartesian(coords: SphericalCoords) -> Result<Vector3D> {
    // Validate coordinates
    if coords.ra < 0.0 || coords.ra > 360.0 || coords.dec < -90.0 || coords.dec > 90.0 {
        return Err(ErrorCode::InvalidCoordinates.into());
    }

    let ra_rad = coords.ra * PI / 180.0;
    let dec_rad = coords.dec * PI / 180.0;

    Ok(Vector3D {
        x: dec_rad.cos() * ra_rad.cos(),
        y: dec_rad.cos() * ra_rad.sin(),
        z: dec_rad.sin(),
    })
}

// Initial octahedron vertices
pub const V_OCT: [Vector3D; 6] = [
    Vector3D::new(0.0, 0.0, 1.0),   // v0 (North Pole)
    Vector3D::new(1.0, 0.0, 0.0),   // v1 (RA=0, Dec=0)
    Vector3D::new(0.0, 1.0, 0.0),   // v2 (RA=90, Dec=0)
    Vector3D::new(-1.0, 0.0, 0.0),  // v3 (RA=180, Dec=0)
    Vector3D::new(0.0, -1.0, 0.0),  // v4 (RA=270, Dec=0)
    Vector3D::new(0.0, 0.0, -1.0),  // v5 (South Pole)
];

// Initial 8 triangles
pub const INITIAL_TRIANGLES: [HTMTriangle; 8] = [
    // South Cap
    HTMTriangle {
        id: 1,
        v: [V_OCT[1], V_OCT[5], V_OCT[2]],
    },
    HTMTriangle {
        id: 2,
        v: [V_OCT[2], V_OCT[5], V_OCT[3]],
    },
    HTMTriangle {
        id: 3,
        v: [V_OCT[3], V_OCT[5], V_OCT[4]],
    },
    HTMTriangle {
        id: 4,
        v: [V_OCT[4], V_OCT[5], V_OCT[1]],
    },
    // North Cap
    HTMTriangle {
        id: 5,
        v: [V_OCT[1], V_OCT[0], V_OCT[4]],
    },
    HTMTriangle {
        id: 6,
        v: [V_OCT[4], V_OCT[0], V_OCT[3]],
    },
    HTMTriangle {
        id: 7,
        v: [V_OCT[3], V_OCT[0], V_OCT[2]],
    },
    HTMTriangle {
        id: 8,
        v: [V_OCT[2], V_OCT[0], V_OCT[1]],
    },
];

pub fn is_point_in_triangle(p: Vector3D, v0: Vector3D, v1: Vector3D, v2: Vector3D, epsilon: f64) -> bool {
    // Test against plane defined by (Origin, v0, v1)
    let n01 = v_cross(v0, v1);
    if v_dot(n01, p) < -epsilon {
        return false;
    }

    // Test against plane defined by (Origin, v1, v2)
    let n12 = v_cross(v1, v2);
    if v_dot(n12, p) < -epsilon {
        return false;
    }

    // Test against plane defined by (Origin, v2, v0)
    let n20 = v_cross(v2, v0);
    if v_dot(n20, p) < -epsilon {
        return false;
    }

    true
}

pub fn get_htm_id(spherical_coords: SphericalCoords, depth: u32) -> Result<u64> {
    if depth > 31 {
        return Err(error!(ErrorCode::InvalidResolution));
    }

    let point_cartesian = spherical_to_cartesian(spherical_coords)?;
    let mut current_htm_id = 0u64;
    let mut current_triangle_vertices: Option<[Vector3D; 3]> = None;

    // 1. Find the initial (level 0) triangle
    for initial_triangle in &INITIAL_TRIANGLES {
        if is_point_in_triangle(
            point_cartesian,
            initial_triangle.v[0],
            initial_triangle.v[1],
            initial_triangle.v[2],
            1e-9,
        ) {
            current_htm_id = initial_triangle.id;
            current_triangle_vertices = Some(initial_triangle.v);
            break;
        }
    }

    // Fallback with larger epsilon if needed
    if current_triangle_vertices.is_none() {
        for initial_triangle in &INITIAL_TRIANGLES {
            if is_point_in_triangle(
                point_cartesian,
                initial_triangle.v[0],
                initial_triangle.v[1],
                initial_triangle.v[2],
                1e-7,
            ) {
                current_htm_id = initial_triangle.id;
                current_triangle_vertices = Some(initial_triangle.v);
                break;
            }
        }
    }

    let mut current_triangle_vertices = match current_triangle_vertices {
        Some(v) => v,
        None => return Err(error!(ErrorCode::InvalidCoordinates)),
    };

    // 2. Recursive subdivision up to the desired depth
    for _r in 0..depth {
        let [p0, p1, p2] = current_triangle_vertices;

        // Calculate midpoints of edges
        let w0 = v_normalize(v_add(p1, p2)); // Midpoint of (p1, p2)
        let w1 = v_normalize(v_add(p0, p2)); // Midpoint of (p0, p2)
        let w2 = v_normalize(v_add(p0, p1)); // Midpoint of (p0, p1)

        // Define the 4 new child triangles
        let children: [(u64, [Vector3D; 3]); 4] = [
            (1, [p0, w2, w1]),
            (2, [p1, w0, w2]),
            (3, [p2, w1, w0]),
            (4, [w0, w1, w2]),
        ];

        let mut found_child = false;
        for (id_suffix, vertices) in children {
            if is_point_in_triangle(point_cartesian, vertices[0], vertices[1], vertices[2], 1e-9) {
                current_htm_id = current_htm_id * 10 + id_suffix;
                current_triangle_vertices = vertices;
                found_child = true;
                break;
            }
        }

        // Fallback with larger epsilon if needed
        if !found_child {
            for (id_suffix, vertices) in children {
                if is_point_in_triangle(point_cartesian, vertices[0], vertices[1], vertices[2], 1e-7) {
                    current_htm_id = current_htm_id * 10 + id_suffix;
                    current_triangle_vertices = vertices;
                    found_child = true;
                    break;
                }
            }
        }

        if !found_child {
            return Err(error!(ErrorCode::InvalidCoordinates));
        }
    }

    Ok(current_htm_id)
}

// Get trixel ID from coordinates and resolution
pub fn get_trixel_id(coords: SphericalCoords, resolution: u8) -> Result<u64> {
    if resolution > 31 {
        return Err(error!(ErrorCode::InvalidResolution));
    }
    get_htm_id(coords, resolution as u32).map_err(|e| error!(ErrorCode::InvalidCoordinates))
}

// Get ancestors for trixel ID
pub fn get_trixel_ancestors(id: u64) -> Result<Vec<u64>> {
    // Validate ID format
    let id_str = id.to_string();
    
    // Check all digits except last are 1-4
    for digit in id_str.chars().rev().skip(1) {
        let d = digit.to_digit(10).unwrap();
        if d < 1 || d > 4 {
            return Err(error!(ErrorCode::InvalidTrixelId));
        }
    }
    
    // Check last digit is 1-8
    let last_digit = id_str.chars().last().unwrap().to_digit(10).unwrap();
    if last_digit < 1 || last_digit > 8 {
        return Err(error!(ErrorCode::InvalidTrixelId));
    }

    let mut ancestors = Vec::new();
    let mut current = id;
    
    // Keep removing the first digit until we reach a single digit (1-8)
    while current > 8 {
        // Convert to string to remove first digit, then back to number
        let current_str = current.to_string();
        current = current_str[1..].parse::<u64>().unwrap();
        ancestors.push(current);
    }
    
    Ok(ancestors)
}

// Get PDA from trixel ID and world
pub fn get_trixel_pda(trixel_id: u64, world: &Pubkey) -> (Pubkey, u8) {
    let id_bytes = trixel_id.to_le_bytes();
    let seeds = &[
        b"trixel".as_ref(),
        world.as_ref(),
        id_bytes.as_ref()  
    ];
    Pubkey::find_program_address(seeds, &crate::ID)
}

// Verify or create trixel account
pub fn verify_trixel_account(
    trixel_account: &AccountInfo,
    trixel_id: u64,
    world: &Pubkey,
) -> Result<()> {
    let (expected_pda, _) = get_trixel_pda(trixel_id, world);
    require!(
        trixel_account.key() == expected_pda,
        ErrorCode::InvalidTrixelAccount
    );
    Ok(())
}

// Interpret trixel ID
pub fn resolution_from_trixel_id(id: u64) -> Result<u8> {
    if id < 1 || id > 8 {
        // Count digits after the first digit
        let mut count = 0;
        let mut current = id;
        while current > 8 {
            current /= 10;
            count += 1;
        }
        Ok(count)
    } else {
        Ok(0) // Base level (1-8)
    }
}

// Get child index from trixel ID (0-3 for child hashes, 0-7 for base level)
pub fn get_child_index(id: u64) -> Result<(usize, u8)> {
    if id < 1 {
        return Err(error!(ErrorCode::InvalidTrixelId));
    }
    
    // For base level trixels (1-8), subtract 1 to get 0-7
    if id <= 8 {
        return Ok(((id - 1) as usize, 0));
    }
    
    // For all other trixels, get the first digit and subtract 1
    // We can do this by repeatedly dividing by 10 until we get a number <= 8
    let mut current = id;
    let mut resolution = 0;
    while current > 8 {
        current /= 10;
        resolution += 1;
    }
    Ok(((current - 1) as usize, resolution))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_htm_id_north_pole() {
        let coords = SphericalCoords { ra: 0.0, dec: 89.999 };
        let result = get_htm_id(coords, 5).unwrap();
        assert!(result >= 100000); // Should be at least 5 digits (depth 5)
    }

    #[test]
    fn test_htm_id_equator() {
        let coords = SphericalCoords { ra: 45.0, dec: 0.0 };
        let result = get_htm_id(coords, 5).unwrap();
        assert!(result >= 100000); // Should be at least 5 digits (depth 5)
    }

    #[test]
    fn test_htm_id_deep() {
        let coords = SphericalCoords { ra: 123.0, dec: 45.0 };
        let result = get_htm_id(coords, 10).unwrap();
        assert!(result >= 10000000000); // Should be at least 10 digits (depth 10)
    }

    #[test]
    fn test_htm_id_depth_zero() {
        let coords = SphericalCoords { ra: 10.0, dec: -30.0 };
        let result = get_htm_id(coords, 0).unwrap();
        assert!(result >= 1 && result <= 8); // Should be one of the initial 8 triangles
    }

    #[test]
    fn test_trixel_id_generation() {
        println!("\nTesting trixel ID generation:");
        
        // Test North Pole
        let north_pole = SphericalCoords { ra: 0.0, dec: 89.999 };
        let north_id = get_trixel_id(north_pole, 5).unwrap();
        println!("North Pole (RA: 0°, Dec: 89.999°): {}", north_id);
        assert!(north_id >= 100000);

        // Test Equator
        let equator = SphericalCoords { ra: 45.0, dec: 0.0 };
        let equator_id = get_trixel_id(equator, 5).unwrap();
        println!("Equator (RA: 45°, Dec: 0°): {}", equator_id);
        assert!(north_id >= 100000);

        // Test Deep Subdivision
        let deep = SphericalCoords { ra: 123.0, dec: 45.0 };
        let deep_id = get_trixel_id(deep, 10).unwrap();
        println!("Deep Subdivision (RA: 123°, Dec: 45°): {}", deep_id);
        assert!(deep_id >= 10000000000);

        // Test Base Level
        let base = SphericalCoords { ra: 10.0, dec: -30.0 };
        let base_id = get_trixel_id(base, 0).unwrap();
        println!("Base Level (RA: 10°, Dec: -30°): {}", base_id);
        assert!(base_id >= 1 && base_id <= 8);
    }

    #[test]
    fn test_trixel_id_validation() {
        println!("\nTesting trixel ID validation:");
        
        // Test valid IDs
        let valid_ids = vec![
            1, 2, 3, 4, 5, 6, 7, 8,           // Base level
            21, 22, 23, 24, 25, 26, 27, 28,   // Level 1
            321, 322, 323, 324, 325, 326, 327, 328,  // Level 2
            4321, 4322, 4323, 4324, 4325, 4326, 4327, 4328,  // Level 3
            34321, 34322, 34323, 34324, 34325, 34326, 34327, 34328,  // Level 4
        ];
        for id in valid_ids {
            let result = get_trixel_ancestors(id);
            println!("Valid ID {}: {:?}", id, result);
            assert!(result.is_ok());
        }

        // Test invalid last digit
        let invalid_last = vec![0, 9, 10, 19, 20, 29];
        for id in invalid_last {
            let result = get_trixel_ancestors(id);
            println!("Invalid last digit {}: {:?}", id, result);
            assert!(result.is_err());
        }

        // Test invalid child digits
        let invalid_child = vec![
            50, 60, 70, 80,  // Invalid first digit
        ];
        for id in invalid_child {
            let result = get_trixel_ancestors(id);
            println!("Invalid child digit {}: {:?}", id, result);
            assert!(result.is_err());
        }

        // Test invalid combinations
        let invalid_combinations = vec![
            1230, // Invalid last digit (0)
            1239, // Invalid last digit (9)
            1204, // Invalid middle digit (0)
            1024, // Invalid middle digit (0)
            9123, // Invalid first digit (9)
        ];
        for id in invalid_combinations {
            let result = get_trixel_ancestors(id);
            println!("Invalid combination {}: {:?}", id, result);
            assert!(result.is_err());
        }
    }

    #[test]
    fn test_known_ancestor_chains() {
        println!("\nTesting known ancestor chains:");
        
        let test_cases = vec![
            // Base level (no ancestors)
            (1, vec![]),
            (8, vec![]),
            
            // Level 1 ancestors
            (21, vec![1]),
            (22, vec![2]),
            (23, vec![3]),
            (24, vec![4]),
            (25, vec![5]),
            (26, vec![6]),
            (27, vec![7]),
            (28, vec![8]),
            
            // Level 2 ancestors
            (321, vec![21, 1]),
            (322, vec![22, 2]),
            (323, vec![23, 3]),
            (324, vec![24, 4]),
            (325, vec![25, 5]),
            (326, vec![26, 6]),
            (327, vec![27, 7]),
            (328, vec![28, 8]),
            
            // Level 3 ancestors
            (4321, vec![321, 21, 1]),
            (4322, vec![322, 22, 2]),
            (4323, vec![323, 23, 3]),
            (4324, vec![324, 24, 4]),
            (4325, vec![325, 25, 5]),
            (4326, vec![326, 26, 6]),
            (4327, vec![327, 27, 7]),
            (4328, vec![328, 28, 8]),
            
            // Level 4 ancestors
            (34321, vec![4321, 321, 21, 1]),
            (34322, vec![4322, 322, 22, 2]),
            (34323, vec![4323, 323, 23, 3]),
            (34324, vec![4324, 324, 24, 4]),
            (34325, vec![4325, 325, 25, 5]),
            (34326, vec![4326, 326, 26, 6]),
            (34327, vec![4327, 327, 27, 7]),
            (34328, vec![4328, 328, 28, 8]),
        ];

        for (id, expected_ancestors) in test_cases {
            let ancestors = get_trixel_ancestors(id).unwrap();
            println!("\nTrixel ID: {}", id);
            println!("Expected ancestors: {:?}", expected_ancestors);
            println!("Actual ancestors: {:?}", ancestors);
            
            // Verify the ancestor chain
            assert_eq!(ancestors, expected_ancestors, 
                "Ancestor chain mismatch for trixel ID {}", id);
        }
    }

    #[test]
    fn test_trixel_pda() {
        println!("\nTesting trixel PDA generation:");
        
        let world = Pubkey::new_unique();
        let test_cases = vec![1, 51, 512, 5123, 51234];

        for trixel_id in test_cases {
            let (pda, bump) = get_trixel_pda(trixel_id, &world);
            println!("Trixel ID: {}", trixel_id);
            println!("PDA: {}", pda);
            println!("Bump: {}", bump);
            
            // Verify PDA is deterministic
            let (pda2, _) = get_trixel_pda(trixel_id, &world);
            assert_eq!(pda, pda2);
        }
    }

    #[test]
    fn test_resolution_from_trixel_id() {
        println!("\nTesting resolution from trixel ID:");
        
        let test_cases = vec![
            (1, 0),  // Base level
            (8, 0),  // Base level
            (51, 1), // Level 1
            (512, 2), // Level 2
            (5123, 3), // Level 3
            (51234, 4), // Level 4
        ];

        for (id, expected_resolution) in test_cases {
            let resolution = resolution_from_trixel_id(id).unwrap();
            println!("Trixel ID: {}", id);
            println!("Resolution: {}", resolution);
            assert_eq!(resolution, expected_resolution);
        }
    }

    #[test]
    fn test_invalid_resolution() {
        println!("\nTesting invalid resolution handling:");
        
        let coords = SphericalCoords { ra: 0.0, dec: 0.0 };
        let result = get_trixel_id(coords, 32);
        println!("Resolution 32 result: {:?}", result);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_coordinates() {
        println!("\nTesting invalid coordinates handling:");
        
        // Test invalid RA
        let invalid_ra = SphericalCoords { ra: 999.0, dec: 0.0 };
        let result = get_trixel_id(invalid_ra, 5);
        println!("Invalid RA result: {:?}", result);
        assert!(result.is_err());

        // Test invalid Dec
        let invalid_dec = SphericalCoords { ra: 0.0, dec: 999.0 };
        let result = get_trixel_id(invalid_dec, 5);
        println!("Invalid Dec result: {:?}", result);
        assert!(result.is_err());

        // Test negative RA
        let negative_ra = SphericalCoords { ra: -1.0, dec: 0.0 };
        let result = get_trixel_id(negative_ra, 5);
        println!("Negative RA result: {:?}", result);
        assert!(result.is_err());

        // Test negative Dec
        let negative_dec = SphericalCoords { ra: 0.0, dec: -91.0 };
        let result = get_trixel_id(negative_dec, 5);
        println!("Negative Dec result: {:?}", result);
        assert!(result.is_err());
    }

    #[test]
    fn test_ancestor_chain_properties() {
        println!("\nTesting ancestor chain properties:");
        
        let test_ids = vec![1234, 2341, 3412, 4123, 1231, 2342, 3413, 4124];
        
        for id in test_ids {
            let ancestors = get_trixel_ancestors(id).unwrap();
            println!("\nTesting trixel ID: {}", id);
            
            // Property 1: Chain length equals depth
            let depth = resolution_from_trixel_id(id).unwrap();
            assert_eq!(ancestors.len(), depth as usize,
                "Ancestor chain length should equal depth for ID {}", id);
            
            // Property 2: Each ancestor is a proper suffix
            for (i, ancestor) in ancestors.iter().enumerate() {
                let expected_length = depth as usize - i;
                let ancestor_str = ancestor.to_string();
                let id_str = id.to_string();
                assert!(id_str.ends_with(&ancestor_str),
                    "Ancestor {} should be a suffix of ID {}", ancestor, id);
                assert_eq!(ancestor_str.len(), expected_length,
                    "Ancestor {} should have length {}", ancestor, expected_length);
            }
            
            // Property 3: Chain is ordered from closest to furthest
            for i in 1..ancestors.len() {
                assert!(ancestors[i-1] > ancestors[i],
                    "Ancestors should be in descending order");
            }
        }
    }

    #[test]
    fn test_get_child_index() {
        println!("\nTesting child index extraction:");
        
        // Test base level (1-8)
        for i in 1..=8 {
            let (idx, res) = get_child_index(i).unwrap();
            println!("Base level ID {} -> index {}, resolution {}", i, idx, res);
            assert_eq!(idx, (i - 1) as usize);
            assert_eq!(res, 0);
        }
        
        // Test level 1
        let level1_tests = vec![
            (21, 0, 1), (22, 1, 1), (23, 2, 1), (24, 3, 1),
            (25, 0, 1), (26, 1, 1), (27, 2, 1), (28, 3, 1),
        ];
        for (id, expected_idx, expected_res) in level1_tests {
            let (idx, res) = get_child_index(id).unwrap();
            println!("Level 1 ID {} -> index {}, resolution {}", id, idx, res);
            assert_eq!(idx, expected_idx);
            assert_eq!(res, expected_res);
        }
        
        // Test deeper levels
        let deep_tests = vec![
            (321, 2, 2), (322, 2, 2), (323, 2, 2), (324, 2, 2),
            (4321, 3, 3), (4322, 3, 3), (4323, 3, 3), (4324, 3, 3),
            (54321, 4, 4), (54322, 4, 4), (54323, 4, 4), (54324, 4, 4),
        ];
        for (id, expected_idx, expected_res) in deep_tests {
            let (idx, res) = get_child_index(id).unwrap();
            println!("Deep level ID {} -> index {}, resolution {}", id, idx, res);
            assert_eq!(idx, expected_idx);
            assert_eq!(res, expected_res);
        }
        
        // Test invalid ID
        let result = get_child_index(0);
        println!("Invalid ID 0 result: {:?}", result);
        assert!(result.is_err());
    }
} 