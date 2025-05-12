'use client';
import {useEffect, useRef, useMemo, useState} from 'react';
import maplibregl, {Map as MaplibreMap, StyleSpecification} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, PickingInfo } from 'deck.gl';
import { Feature, Geometry } from 'geojson';
import {trixelsToFC, getTriResolutionForZoom, getTrixelsForView} from '@/utils/htm/htm-utils';
import {useMapStore} from '@/lib/store';
import {globeStyle} from './map-style';

export default function TriangleGlobe() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const deckOverlayRef = useRef<MapboxOverlay | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const {resolution, setResolution, popupInfo, setPopupInfo} = useMapStore();

  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    // Log the style object being used
    // console.log('Style being passed to MapLibre:', JSON.parse(JSON.stringify(globeStyle)));

    mapRef.current = new MaplibreMap({
      container: mapContainerRef.current,
      style: globeStyle as StyleSpecification,
      center: [0, 0],
      zoom: 1,
      minZoom: 0,
      maxZoom: 6,
    });

    mapRef.current.on('load', () => {
      setIsMapLoaded(true);
      // Belt and suspenders: set projection programmatically
      // if (mapRef.current) { // Temporarily comment out this entire block
      //   mapRef.current.setProjection({ name: 'globe' }); 
      // }
      const initialRes = getTriResolutionForZoom(mapRef.current!.getZoom());
      setResolution(initialRes);
    });

    mapRef.current.on('zoomend', () => {
      if (!mapRef.current) return;
      const newRes = getTriResolutionForZoom(mapRef.current.getZoom());
      if (newRes !== useMapStore.getState().resolution) {
        setResolution(newRes);
      }
    });
    
    // Restore globe-specific render effect
    mapRef.current.on('render', () => {
      const currentProjection = mapRef.current?.getProjection();
      // Check if the projection object exists and if its name property is 'globe'
      if (currentProjection && typeof currentProjection === 'object' && 'name' in currentProjection && currentProjection.name === 'globe') {
        maplibregl.MercatorCoordinate.prototype.meterInMercatorCoordinateUnits = function() {
          return Math.abs(this.x - maplibregl.MercatorCoordinate.fromLngLat(this.toLngLat(), 0).x);
        };
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [setResolution]);

  // Initialize deckOverlayRef when the map is loaded
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || deckOverlayRef.current) return; // Create overlay only once

    const map = mapRef.current;
    deckOverlayRef.current = new MapboxOverlay({
      id: 'htm-mapbox-overlay',
      layers: [] // Initially empty
    });
    map.addControl(deckOverlayRef.current);

    // Cleanup when component unmounts or map changes
    return () => {
      if (map && deckOverlayRef.current) {
        map.removeControl(deckOverlayRef.current);
        deckOverlayRef.current.finalize();
        deckOverlayRef.current = null;
      }
    };
  }, [isMapLoaded]); // Runs when map is loaded

  const triLayerData = useMemo(() => {
    if (!mapRef.current || !isMapLoaded || resolution === undefined) return null;
    
    const mapInstance = mapRef.current;
    if (!mapInstance) return null; 

    const bounds = mapInstance.getBounds();
    if (!bounds) { 
        console.warn("TriangleGlobe: map.getBounds() returned undefined or null");
        return null;
    }
    const ids = getTrixelsForView(bounds, resolution);
    
    console.log(`[TriangleGlobe] useMemo: resolution: ${resolution}, number of IDs: ${ids?.length}`);
    if (ids && ids.length > 0) {
        // Check length of first ID to infer its depth (name_length - 2 = depth)
        const sampleId = ids[0];
        const sampleDepth = sampleId.length - 2;
        console.log(`[TriangleGlobe] Sample IDs (first 5):`, ids.slice(0, 5), `Sample ID depth: ${sampleDepth}`);
        if (sampleDepth !== resolution) {
            console.warn(`[TriangleGlobe] Mismatch! resolution state is ${resolution}, but sample ID depth is ${sampleDepth}`);
        }
    }
    
    if (!ids || ids.length === 0) return null;

    const data = trixelsToFC(ids);
    return data;
  }, [resolution, isMapLoaded]);

  // Define colors for base trixels
  const baseTrixelColors: { [key: string]: [number, number, number, number] } = useMemo(() => ({
    'N0': [255, 0, 0, 100],   // Red
    'N1': [0, 255, 0, 100],   // Green
    'N2': [0, 0, 255, 100],   // Blue
    'N3': [255, 255, 0, 100], // Yellow
    'S0': [255, 0, 255, 100], // Magenta
    'S1': [0, 255, 255, 100], // Cyan
    'S2': [128, 0, 128, 100], // Purple
    'S3': [255, 165, 0, 100], // Orange
  }), []);
  const defaultTrixelColor: [number,number,number,number] = useMemo(() => [100, 100, 100, 70], []);
  const selectedTrixelColor: [number,number,number,number] = useMemo(() => [255, 99, 71, 180], []);

  // Update Deck.gl layers when data or resolution changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !hasMountedRef.current) {
      hasMountedRef.current = true;
      return; // Skip first render in dev strict mode
    }

    if (!deckOverlayRef.current || !isMapLoaded) return;

    if (!triLayerData) {
      deckOverlayRef.current.setProps({ layers: [] }); // Clear layers if no data
      return;
    }

    const trixelDisplayLayer = new GeoJsonLayer({
      id: `htm-trixels-depth-${resolution}`, // Dynamic ID is good here for the layer itself
      data: triLayerData,
      pickable: true,
      stroked: true,
      filled: true,
      getLineColor: [0,0,0,255], // Solid Black
      getLineWidth: 5, // 5 pixels wide
      lineWidthMinPixels: 2, // Ensure visibility
      getFillColor: (f: Feature<Geometry, { id: string }>) => {
        if (!f.properties) return defaultTrixelColor; // Null check
        const trixelIdStr = f.properties.id;
        let trixelIdNum: number | undefined = undefined;
        if (trixelIdStr) {
          const parsed = parseInt(trixelIdStr, 10);
          if (!isNaN(parsed)) trixelIdNum = parsed;
        }

        // Compare with popupInfo.trixel (number)
        if (popupInfo?.trixel !== undefined && trixelIdNum !== undefined && popupInfo.trixel === trixelIdNum) {
          return selectedTrixelColor;
        }
        // Root trixel logic uses string form
        const rootTrixel = trixelIdStr.substring(0, 2);
        if (baseTrixelColors[rootTrixel]) {
          return baseTrixelColors[rootTrixel];
        }
        return defaultTrixelColor;
      },
      onClick: (info: PickingInfo<Feature<Geometry, { id: string }>>) => {
        if (info.object && info.object.properties && info.object.properties.id) {
          const clickedTrixelIdStr = info.object.properties.id;
          const parsedId = parseInt(clickedTrixelIdStr, 10);
          if (!isNaN(parsedId)) {
            setPopupInfo({ trixel: parsedId, coords: info.coordinate as [number, number] | undefined });
          }
        }
      },
      updateTriggers: {
        getFillColor: [popupInfo?.trixel, resolution, baseTrixelColors, defaultTrixelColor, selectedTrixelColor],
      },
    });

    deckOverlayRef.current.setProps({ layers: [trixelDisplayLayer] });

  }, [triLayerData, resolution, isMapLoaded, popupInfo, setPopupInfo, baseTrixelColors, defaultTrixelColor, selectedTrixelColor]);

  return (
    <div className="absolute inset-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* TODO: Popup component just like HexagonPopup */}
    </div>
  );
} 