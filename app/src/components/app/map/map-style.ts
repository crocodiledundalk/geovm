import type { StyleSpecification } from 'maplibre-gl';

export const globeStyle: StyleSpecification = {
  version: 8,
  // name: 'basic-globe', // Removed as not present in the working mission_control style
  projection: { type: 'globe' } as any, // Reverting to mission_control style for initial projection
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 
        'background-color': '#E5E7EB' // Default light gray, was var(--background)
      }
    },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-opacity': 0.85, // Default to light mode opacity
        'raster-saturation': 0.1, // Default to light mode saturation
        'raster-contrast': 0.2,   // Default to light mode contrast
        'raster-brightness-min': 0.3 // Default to light mode brightness
      }
    }
  ]
}; 