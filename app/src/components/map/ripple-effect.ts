'use client';
import maplibregl, {Map as MaplibreMap} from 'maplibre-gl';

// Helper function to create and animate a ripple effect
export function startRippleAnimation(map: MaplibreMap, center: maplibregl.LngLat) {
  const RIPPLE_DURATION = 2000; // ms
  const MAX_RADIUS = 100; // pixels, adjust as needed for globe projection
  const RIPPLE_INITIAL_OPACITY = 0.6;
  const RIPPLE_STROKE_INITIAL_OPACITY = 0.7;
  const RIPPLE_COLOR = 'rgba(70, 130, 180, 1)'; // SteelBlue, adjust as desired

  const rippleIdBase = `ripple-${performance.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const sourceId = `${rippleIdBase}-source`;
  const layerId = `${rippleIdBase}-layer`;

  // Check if map is still valid (e.g., not removed during async operations)
  if (!map.getStyle()) { // getStyle is a lightweight way to check if map is usable
    console.warn("[RippleEffect] Map is not valid, aborting ripple animation setup.");
    return;
  }

  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [center.lng, center.lat]
        },
        properties: {} // Satisfy Feature type
      }]
    }
  });

  map.addLayer({
    id: layerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': 0,
      'circle-color': 'rgba(0,0,0,0)', // Transparent fill initially, stroke provides the visual
      'circle-opacity': RIPPLE_INITIAL_OPACITY, // Overall opacity for the effect
      'circle-stroke-width': 2,
      'circle-stroke-color': RIPPLE_COLOR,
      'circle-stroke-opacity': RIPPLE_STROKE_INITIAL_OPACITY,
      'circle-pitch-alignment': 'map', // Ensures circle is flat on the map/globe surface
    }
  });

  const startTime = performance.now();

  function animateFrame(currentTime: number) {
    // Pre-animation checks
    if (!map.getLayer(layerId) || !map.getSource(sourceId)) {
      // Layer or source was removed (e.g., component unmounted, map destroyed)
      return;
    }
    
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / RIPPLE_DURATION, 1); // Cap progress at 1

    // Ensure radius is not negative due to potential floating point issues or timing
    const currentRadius = Math.max(0, MAX_RADIUS * progress);
    // Opacity fades out completely
    const currentStrokeOpacity = RIPPLE_STROKE_INITIAL_OPACITY * (1 - progress);
    const currentOverallOpacity = RIPPLE_INITIAL_OPACITY * (1 - progress);


    // Check again before setting properties, in case map/layer removed between schedule and execution
    if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'circle-radius', currentRadius);
        map.setPaintProperty(layerId, 'circle-stroke-opacity', currentStrokeOpacity);
        map.setPaintProperty(layerId, 'circle-opacity', currentOverallOpacity); // Fade the entire circle element
    } else {
        return; // Layer gone, stop.
    }
    

    if (progress < 1) {
      requestAnimationFrame(animateFrame);
    } else {
      // Animation finished, cleanup
      // Check if map and layer/source still exist before trying to remove
      if (map.getStyle()) { // Check map validity
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      }
    }
  }

  requestAnimationFrame(animateFrame);
} 