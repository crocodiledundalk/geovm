'use client';
import maplibregl, {Map as MaplibreMap} from 'maplibre-gl';

// Ripple animation configuration
interface RippleConfig {
  color: string;
  width: number;
  maxRadius: number;
  duration: number;
  radiusStops: [number, number][];
  initialOpacity: number;
  fadeToOpacity: number;
}

// Default config for ripple animations
const DEFAULT_RIPPLE_CONFIG: RippleConfig = {
  color: '#00FFFF', // Cyan
  width: 2,
  maxRadius: 50,
  duration: 2000, // 2 seconds
  radiusStops: [[0, 0], [0.5, 25], [1, 50]],
  initialOpacity: 1,
  fadeToOpacity: 0
};

// Applies a ripple animation at the specified longitude and latitude
export function startRippleAnimation(
  map: maplibregl.Map,
  longitude: number,
  latitude: number,
  config: Partial<RippleConfig> = {}
): void {
  // Merge default config with provided config
  const rippleConfig = { ...DEFAULT_RIPPLE_CONFIG, ...config };
  
  // Create unique IDs for this instance of the animation
  const sourceId = `ripple-source-${Date.now()}`;
  const layerId = `ripple-layer-${Date.now()}`;
  
  // Create a GeoJSON source for the ripple point
  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      properties: {}
    }
  });
  
  // Add a circle layer that will be animated
  map.addLayer({
    id: layerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': 0,
      'circle-radius-transition': { duration: 0 },
      'circle-opacity': rippleConfig.initialOpacity,
      'circle-opacity-transition': { duration: 0 },
      'circle-color': rippleConfig.color,
      'circle-stroke-width': rippleConfig.width,
      'circle-stroke-color': rippleConfig.color,
    } as any
  });
  
  // Timestamp for the animation start
  const startTime = performance.now();
  
  // Animation function
  const animate = (timestamp: number) => {
    // Calculate animation progress (0 to 1)
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / rippleConfig.duration, 1);
    
    // Interpolate radius based on radiusStops
    const radius = interpolateValue(progress, rippleConfig.radiusStops);
    
    // Calculate opacity (linear fade from initialOpacity to fadeToOpacity)
    const opacity = rippleConfig.initialOpacity - (progress * (rippleConfig.initialOpacity - rippleConfig.fadeToOpacity));
    
    // Apply the updated values
    map.setPaintProperty(layerId, 'circle-radius', radius);
    map.setPaintProperty(layerId, 'circle-opacity', opacity);
    
    // Continue the animation if not finished
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Clean up when animation is complete
      setTimeout(() => {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }, 100);
    }
  };
  
  // Start the animation
  requestAnimationFrame(animate);
}

// Helper function to interpolate a value based on keyframes
function interpolateValue(progress: number, stops: [number, number][]): number {
  // If progress is before the first stop or after the last stop, use the closest value
  if (progress <= stops[0][0]) return stops[0][1];
  if (progress >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  
  // Find the two stops that bracket the current progress
  for (let i = 0; i < stops.length - 1; i++) {
    const [time1, value1] = stops[i];
    const [time2, value2] = stops[i + 1];
    
    if (progress >= time1 && progress <= time2) {
      // Calculate how far we are between the two stops (0 to 1)
      const segmentProgress = (progress - time1) / (time2 - time1);
      // Linearly interpolate between the values
      return value1 + segmentProgress * (value2 - value1);
    }
  }
  
  // Fallback (should never happen with correct inputs)
  return stops[0][1];
} 