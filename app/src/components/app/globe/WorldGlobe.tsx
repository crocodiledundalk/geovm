'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MaplibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '@/lib/store';
import { globeStyle } from '../map/map-style';
import { startRippleAnimation } from '../map/ripple-effect';
import { PublicKey } from '@solana/web3.js';
import { getTriResolutionForZoom, getTrixelsForView, trixelsToFC } from '@/utils/htm/htm-utils';
import { useTheme } from 'next-themes';

// Constants for HTM layer IDs
const HTM_SOURCE_ID = 'htm-trixels-source';
const HTM_FILL_LAYER_ID = 'htm-fill-layer';
const HTM_STROKE_LAYER_ID = 'htm-stroke-layer';
const HTM_HIGHLIGHT_LAYER_ID = 'htm-highlight-layer';

interface WorldGlobeProps {
  worldPubkey: PublicKey;
  maxResolution: number;
  canonicalResolution: number;
}

export function WorldGlobe({ worldPubkey, maxResolution, canonicalResolution }: WorldGlobeProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const lastResolutionRef = useRef<number | null>(null);
  const { theme } = useTheme();
  
  const { resolution, setResolution, popupInfo, setPopupInfo } = useMapStore();
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  // Update map style when theme changes
  useEffect(() => {
    if (!mapRef.current || !isStyleLoaded) return;
    
    const isDarkMode = theme === 'dark';
    mapRef.current.setFeatureState(
      { source: 'osm' },
      { 'dark-mode': isDarkMode }
    );
  }, [theme, isStyleLoaded]);

  // Initialize map when the component mounts
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    console.log('Creating map instance');
    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: globeStyle as StyleSpecification,
      center: [0, 0],
      zoom: 1,
      minZoom: 0,
      maxZoom: 6,
    });

    map.on('load', () => {
      console.log('Map load event fired');
      setIsMapLoaded(true);
      
      // Set initial dark mode state
      const isDarkMode = theme === 'dark';
      map.setFeatureState(
        { source: 'osm' },
        { 'dark-mode': isDarkMode }
      );
      
      // Set the initial HTM resolution based on zoom level
      const initialRes = getTriResolutionForZoom(map.getZoom());
      setResolution(initialRes);
    });
    
    map.on('style.load', () => {
      console.log('Style load event fired');
      setIsStyleLoaded(true);
    });

    map.on('zoomend', () => {
      if (!map) return;
      const newRes = getTriResolutionForZoom(map.getZoom());
      if (newRes !== resolution) {
        setResolution(newRes);
      }
    });
    
    mapRef.current = map;
    
    return () => {
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
      setIsStyleLoaded(false);
    };
  }, [resolution, setResolution, theme]);

  // Update trixel visualization when resolution changes
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !isStyleLoaded || resolution === undefined) {
      console.log('Skipping trixel update, not ready:', {
        hasMap: !!mapRef.current,
        isMapLoaded,
        isStyleLoaded,
        resolution
      });
      return;
    }
    
    const map = mapRef.current;
    
    // Only update if resolution has changed
    if (lastResolutionRef.current === resolution) return;
    
    console.log(`Updating trixels for resolution ${resolution}`);
    
    try {
      // Get trixels for current view
      const trixelIds = getTrixelsForView(null, resolution);
      
      if (trixelIds.length === 0) {
        console.warn('No trixels returned for current view');
        return;
      }
      
      console.log(`Got ${trixelIds.length} trixel IDs, first few:`, trixelIds.slice(0, 5));
      const featureCollection = trixelsToFC(trixelIds);
      console.log(`Converted to feature collection with ${featureCollection.features.length} features`);
      
      // Update or add source
      if (map.getSource(HTM_SOURCE_ID)) {
        console.log('Updating existing source');
        const source = map.getSource(HTM_SOURCE_ID) as maplibregl.GeoJSONSource;
        source.setData(featureCollection);
      } else {
        console.log('Adding new source and layers');
        
        // Double check that style is loaded
        if (!map.isStyleLoaded()) {
          console.warn('Style not loaded yet, cannot add new source');
          return;
        }
        
        // Add source
        map.addSource(HTM_SOURCE_ID, {
          type: 'geojson',
          data: featureCollection,
          promoteId: 'id'
        });
        
        // Add fill layer
        map.addLayer({
          id: HTM_FILL_LAYER_ID,
          type: 'fill',
          source: HTM_SOURCE_ID,
          paint: {
            'fill-color': [
              'match',
              ['get', 'id'],
              // Match the ID to determine base trixel color
              // Using string matching since the expression language doesn't support substr
              1, 'rgba(255, 0, 0, 0.2)',   // Red - N0
              2, 'rgba(0, 255, 0, 0.2)',   // Green - N1
              3, 'rgba(0, 0, 255, 0.2)',   // Blue - N2
              4, 'rgba(255, 255, 0, 0.2)', // Yellow - N3
              5, 'rgba(255, 0, 255, 0.2)', // Magenta - S0
              6, 'rgba(0, 255, 255, 0.2)', // Cyan - S1
              7, 'rgba(128, 0, 128, 0.2)', // Purple - S2
              8, 'rgba(255, 165, 0, 0.2)', // Orange - S3
              // Default fallback
              'rgba(100, 100, 100, 0.1)'
            ] as any,
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              0.7, // Higher opacity when selected
              0.3  // Default opacity
            ]
          }
        });
        
        // Add stroke layer
        map.addLayer({
          id: HTM_STROKE_LAYER_ID,
          type: 'line',
          source: HTM_SOURCE_ID,
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              '#FF8C00', // Orange when selected
              '#088'     // Default teal
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              2,  // Thicker when selected
              1   // Default width
            ]
          }
        });
        
        // Handle click event for trixel selection
        map.on('click', HTM_FILL_LAYER_ID, (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          const trixelId = feature.properties?.id;
          const featureId = feature.id;
          
          if (trixelId && e.lngLat) {
            // Clear previous selection
            if (popupInfo?.trixel) {
              map.setFeatureState(
                { source: HTM_SOURCE_ID, id: popupInfo.trixel },
                { selected: false }
              );
            }
            
            // Set new selection
            map.setFeatureState(
              { source: HTM_SOURCE_ID, id: featureId },
              { selected: true }
            );
            
            // Show popup info and handle type issues with a type assertion
            setPopupInfo({
              trixel: trixelId,
              coords: feature.geometry.type === 'Polygon' ? (feature.geometry.coordinates as any) : []
            });
            
            // Add ripple effect
            startRippleAnimation(map, e.lngLat, {
              color: '#FF8C00',
              width: 2,
              maxRadius: 40,
              initialOpacity: 0.8,
              fadeToOpacity: 0
            });
          }
        });
      }
      
      lastResolutionRef.current = resolution;
      console.log('Trixel update completed');
    } catch (error) {
      console.error('Error updating trixels:', error);
    }
    
  }, [resolution, isMapLoaded, isStyleLoaded, popupInfo, setPopupInfo]);

  return (
    <div className="relative w-full h-[50vh] bg-background rounded-lg overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" style={{ aspectRatio: '16/9' }} />
      
      {popupInfo && (
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-md shadow-lg border text-sm max-w-[300px]">
          <h3 className="font-semibold mb-1">Trixel Info</h3>
          <p className="font-mono text-xs text-muted-foreground break-all">ID: {popupInfo.trixel}</p>
          <div className="mt-2 flex gap-2">
            <button 
              onClick={() => {
                if (mapRef.current && popupInfo.coords.length > 0) {
                  const coords = popupInfo.coords[0];
                  if (Array.isArray(coords) && coords.length > 0) {
                    const coordPoint = coords[0];
                    if (Array.isArray(coordPoint) && coordPoint.length >= 2) {
                      mapRef.current.flyTo({ 
                        center: [coordPoint[0], coordPoint[1]], 
                        zoom: Math.min((resolution || 0) + 2, maxResolution) 
                      });
                    }
                  }
                }
              }}
              className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90"
            >
              Zoom To
            </button>
            <button 
              onClick={() => {
                if (mapRef.current && popupInfo.trixel) {
                  mapRef.current.setFeatureState(
                    { source: HTM_SOURCE_ID, id: popupInfo.trixel },
                    { selected: false }
                  );
                  setPopupInfo(null);
                }
              }}
              className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary/90"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm p-2 rounded shadow border">
        <div className="text-xs flex flex-col gap-1">
          <div>Resolution: {resolution}</div>
          <div>World: {worldPubkey.toString().slice(0, 4)}...{worldPubkey.toString().slice(-4)}</div>
        </div>
      </div>
    </div>
  );
} 