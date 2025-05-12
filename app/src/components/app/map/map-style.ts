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
        'background-color': 'var(--background)' // Use CSS variable for theme support
      }
    },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-opacity': [
          'case',
          ['boolean', ['feature-state', 'dark-mode'], false],
          0.7,  // Dark mode opacity
          0.85  // Light mode opacity
        ],
        'raster-saturation': [
          'case',
          ['boolean', ['feature-state', 'dark-mode'], false],
          0.2,  // Dark mode saturation
          0.1   // Light mode saturation
        ],
        'raster-contrast': [
          'case',
          ['boolean', ['feature-state', 'dark-mode'], false],
          0.1,  // Dark mode contrast
          0.2   // Light mode contrast
        ],
        'raster-brightness-min': [
          'case',
          ['boolean', ['feature-state', 'dark-mode'], false],
          0.1,  // Dark mode brightness
          0.3   // Light mode brightness
        ]
      }
    }
  ]
}; 