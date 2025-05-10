'use client';
import {useEffect, useRef, useMemo, useState} from 'react';
import maplibregl, {Map as MaplibreMap, StyleSpecification} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from 'deck.gl';
import {trixelsToFC, getTriResolutionForZoom, getTrixelsForView} from '@my-scope/my-htm-fork';
import {useMapStore} from '@/lib/store';
import {globeStyle} from '../map/map-style';

export default function DemoGlobe() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const deckOverlayRef = useRef<MapboxOverlay | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const {resolution, setResolution, popupInfo, setPopupInfo} = useMapStore();

  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

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
    
    mapRef.current.on('render', () => {
      const currentProjection = mapRef.current?.getProjection();
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

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || deckOverlayRef.current) return;

    const map = mapRef.current;
    deckOverlayRef.current = new MapboxOverlay({
      id: 'htm-mapbox-overlay',
      layers: []
    });
    map.addControl(deckOverlayRef.current);

    return () => {
      if (map && deckOverlayRef.current) {
        map.removeControl(deckOverlayRef.current);
        deckOverlayRef.current.finalize();
        deckOverlayRef.current = null;
      }
    };
  }, [isMapLoaded]);

  const triLayerData = useMemo(() => {
    if (!mapRef.current || !isMapLoaded || resolution === undefined) return null;
    
    const mapInstance = mapRef.current;
    if (!mapInstance) return null; 

    const bounds = mapInstance.getBounds();
    if (!bounds) { 
        console.warn("DemoGlobe: map.getBounds() returned undefined or null");
        return null;
    }
    const ids = getTrixelsForView(bounds, resolution);
    
    console.log(`[DemoGlobe] useMemo: resolution: ${resolution}, number of IDs: ${ids?.length}`);
    if (ids && ids.length > 0) {
        const sampleId = ids[0];
        const sampleDepth = sampleId.length - 2;
        console.log(`[DemoGlobe] Sample IDs (first 5):`, ids.slice(0, 5), `Sample ID depth: ${sampleDepth}`);
        if (sampleDepth !== resolution) {
            console.warn(`[DemoGlobe] Mismatch! resolution state is ${resolution}, but sample ID depth is ${sampleDepth}`);
        }
    }
    
    if (!ids || ids.length === 0) return null;

    const data = trixelsToFC(ids);
    return data;
  }, [resolution, isMapLoaded]);

  const baseTrixelColors: { [key: string]: [number, number, number, number] } = {
    'N0': [255, 0, 0, 100],
    'N1': [0, 255, 0, 100],
    'N2': [0, 0, 255, 100],
    'N3': [255, 255, 0, 100],
    'S0': [255, 0, 255, 100],
    'S1': [0, 255, 255, 100],
    'S2': [128, 0, 128, 100],
    'S3': [255, 165, 0, 100],
  };
  const defaultTrixelColor: [number,number,number,number] = [100, 100, 100, 70];
  const selectedTrixelColor: [number,number,number,number] = [255, 99, 71, 180];

  const n0ChildrenTestColors: { [key: string]: [number, number, number, number] } = {
    'N000': [255, 150, 150, 120],
    'N001': [150, 255, 150, 120],
    'N002': [150, 150, 255, 120],
    'N003': [230, 230, 120, 120],
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!deckOverlayRef.current || !isMapLoaded) return;

    if (!triLayerData) {
      deckOverlayRef.current.setProps({ layers: [] });
      return;
    }

    const trixelDisplayLayer = new GeoJsonLayer({
      id: `htm-trixels-depth-${resolution}`,
      data: triLayerData,
      pickable: true,
      stroked: true,
      filled: true,
      getLineColor: [0,0,0,255],
      getLineWidth: 5,
      lineWidthMinPixels: 2,
      getFillColor: (f: any) => {
        const trixelId = f.properties.id as string;
        if (trixelId === popupInfo?.trixel) {
          return selectedTrixelColor;
        }
        const rootTrixel = trixelId.substring(0, 2);
        if (baseTrixelColors[rootTrixel]) {
          return baseTrixelColors[rootTrixel];
        }
        return defaultTrixelColor;
      },
      onClick: ({object}: any) =>
        setPopupInfo({trixel: object?.properties.id, coords: object?.geometry?.coordinates}),
      updateTriggers: {
        getFillColor: [popupInfo?.trixel, resolution],
      },
    });

    deckOverlayRef.current.setProps({ layers: [trixelDisplayLayer] });

  }, [triLayerData, resolution, isMapLoaded, popupInfo, setPopupInfo]);

  return (
    <div className="absolute inset-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* TODO: Popup component just like HexagonPopup */}
    </div>
  );
} 