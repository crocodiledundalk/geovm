import ActualHTMmapClass from './HTMmap';
import ActualTrixelUtilsClass from './TrixelUtils';

// Continue to export your custom function (getTrixelCornerVectorsFromHTMName) as a named export
export * from './htm-vertex-utils';

// Main HTM classes and functions
export { default as HTMmap } from './HTMmap';

// HTM utility functions
export * from './htm-utils';

// Potentially other core exports if any, for example, types used across modules
// export type { Vec3D } from './htm-vertex-utils'; // Example if Vec3D is a core type to expose
// export type { SphericalCoords, Vector3D as CartVector3D } from './HTMmap'; // Example for core data types

// Create the default export object that triangle-globe expects
const htmJsDefault = {
  HTMmap: ActualHTMmapClass,
  TrixelUtils: ActualTrixelUtilsClass,
  // You could also add getTrixelCornerVectorsFromHTMName to this default export if desired:
  // getTrixelCornerVectorsFromHTMName: getTrixelCornerVectorsFromHTMName // (would need to be imported explicitly if not using export *)
};

export default htmJsDefault;

import HTMmap from './HTMmap';

/**
 * Gets the geographic boundary (longitude, latitude pairs) for a given trixel ID.
 * @param trixelId The numeric ID of the trixel.
 * @returns An array of [longitude, latitude] pairs representing the trixel's boundary.
 *          Returns an empty array if the boundary cannot be determined.
 */
export const getTrixelBoundaryLngLat = (trixelId: number): [number, number][] => {
    const htmMapInstance = new HTMmap();
    const geometry = htmMapInstance.trixelBoundary(trixelId); // This now returns a GeoJSON geometry object

    // The trixelBoundary method in HTMmap.ts now returns a GeoJSON geometry object (Polygon, MultiPolygon, or GeometryCollection).
    // We need to extract the coordinate array for consumption by legacy code expecting [lon, lat][].
    
    if (geometry && geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates.length > 0) {
        return geometry.coordinates[0] as [number, number][]; // Return the first ring
    } else if (geometry && geometry.type === 'MultiPolygon' && geometry.coordinates && geometry.coordinates.length > 0 && geometry.coordinates[0].length > 0) {
        // For MultiPolygon, for simplicity here, we return the first ring of the first polygon.
        // Consumers might need more sophisticated handling if they need all parts of a MultiPolygon.
        return geometry.coordinates[0][0] as [number, number][]; 
    } else if (geometry && geometry.type === 'GeometryCollection') {
        // If it's an empty GeometryCollection (error case from trixelBoundary), return empty array.
        return [];
    }
    // console.warn(`[getTrixelBoundaryLngLat] ID ${trixelId} did not yield a parsable Polygon or MultiPolygon. Geometry:`, geometry);
    return []; // Default to empty array if not a recognized/valid Polygon or MultiPolygon
}; 