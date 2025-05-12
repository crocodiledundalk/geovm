'use client';
import maplibregl, {Map as MaplibreMap} from 'maplibre-gl';

interface RippleOptions {
  color?: string;
  width?: number;
  maxRadius?: number;
  initialOpacity?: number;
  fadeToOpacity?: number;
}

// Helper function to create and animate a ripple effect
export function startRippleAnimation(map: MaplibreMap, center: maplibregl.LngLat, options: RippleOptions = {}) {
  const RIPPLE_DURATION = 2000; // ms
  const MAX_RADIUS = options.maxRadius || 100; // pixels
  const RIPPLE_INITIAL_OPACITY = options.initialOpacity || 0.6;
  const RIPPLE_STROKE_INITIAL_OPACITY = 0.7;
  const RIPPLE_COLOR = options.color || 'rgba(70, 130, 180, 1)'; // SteelBlue

  const rippleIdBase = `ripple-${performance.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const sourceId = `${rippleIdBase}-source`;
  const layerId = `${rippleIdBase}-layer`;

  // Check if map is still valid
  if (!map.getStyle()) {
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
        properties: {}
      }]
    }
  });

  map.addLayer({
    id: layerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': 0,
      'circle-color': 'rgba(0,0,0,0)',
      'circle-opacity': RIPPLE_INITIAL_OPACITY,
      'circle-stroke-width': options.width || 2,
      'circle-stroke-color': RIPPLE_COLOR,
      'circle-stroke-opacity': RIPPLE_STROKE_INITIAL_OPACITY,
      'circle-pitch-alignment': 'map',
    }
  });

  const startTime = performance.now();
  const animate = () => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / RIPPLE_DURATION, 1);
    
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'circle-radius', progress * MAX_RADIUS);
      map.setPaintProperty(
        layerId,
        'circle-opacity',
        RIPPLE_INITIAL_OPACITY * (1 - progress)
      );
      map.setPaintProperty(
        layerId,
        'circle-stroke-opacity',
        RIPPLE_STROKE_INITIAL_OPACITY * (1 - progress)
      );
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }
  };

  requestAnimationFrame(animate);
} 