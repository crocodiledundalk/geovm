import type { StyleSpecification } from 'maplibre-gl';

export const globeStyle: StyleSpecification = {
  version: 8,
  // name: 'basic-globe', // Removed as not present in the working mission_control style
  projection: { type: 'globe' }, // Original structure, but removed 'as any'
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
      paint: { 'background-color': '#000' }
    },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm'
    }
  ]
}; 