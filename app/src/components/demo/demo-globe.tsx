'use client';
import {useEffect, useRef, useState, useCallback} from 'react';
import maplibregl, {Map as MaplibreMap, StyleSpecification, GeoJSONFeature} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';
import {trixelsToFC, getTriResolutionForZoom, getTrixelsForView, getTrixelBoundaryLngLat } from '@lib/htm';
import { point as turfPoint, polygon as turfPolygon } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { useProgram } from '@/contexts/ProgramContext';
import { useGlobeStore } from '@/lib/demo/globe-store';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TrixelData as HookTrixelData } from '@/hooks/useTrixels';
import { cartesianToSpherical, getTrixelPDA, getResolutionFromTrixelId } from '@/sdk/utils';
import { useQueryClient } from '@tanstack/react-query';

import {globeStyle} from '../app/map/map-style';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { startRippleAnimation } from '../app/map/ripple-effect';
import { TrixelInfoOverlay } from '../TrixelInfoOverlay';

const HTM_SOURCE_ID = 'htm-trixels-source';
const HTM_INTERACTIVE_FILL_LAYER_ID = 'htm-interactive-fill-layer';
const HTM_STROKE_LAYER_ID = 'htm-stroke-layer';
const HTM_HIGHLIGHT_FILL_LAYER_ID = 'htm-highlight-fill-layer';

// New constants for ripple context trixel
const RIPPLE_CONTEXT_TRIXEL_SOURCE_ID = 'ripple-context-trixel-source';
const RIPPLE_CONTEXT_TRIXEL_STROKE_LAYER_ID = 'ripple-context-trixel-stroke-layer';
const RIPPLE_CONTEXT_HIGHLIGHT_DURATION = 2000; // ms, same as ripple for now
const DEFAULT_RESOLUTION_FOR_RIPPLE_CONTEXT = 6; // Default HTM resolution for context
const RIPPLE_CONTEXT_STROKE_COLOR = '#00FF00'; // Bright Green
const RIPPLE_CONTEXT_STROKE_WIDTH = 2;
const RIPPLE_CONTEXT_STROKE_DASHARRAY: [number, number] = [2, 2];

// Style constants for trixel feedback
const FLASH_COLOR = 'white';
const FLASH_WIDTH = 3;
const SELECTED_FILL_COLOR = '#FF8C00'; // DarkOrange
const SELECTED_FILL_OPACITY = 0.5; // Revert to original 0.5
const SELECTED_STROKE_COLOR = '#FF8C00'; // DarkOrange, same as fill for consistency
const SELECTED_STROKE_WIDTH = 2;
const DEFAULT_STROKE_COLOR = '#088';
const DEFAULT_STROKE_WIDTH = 1;
const FLASH_DURATION = 500; // ms
const MAX_MAP_ZOOM = 6; // Define max zoom based on map config

// New constants for map points
const MAP_POINTS_SOURCE_ID = 'map-points-source';
const DATA_CENTERS_LAYER_ID = 'data-centers-layer';
const POWER_PLANTS_LAYER_ID = 'power-plants-layer';
const ICON_SIZE = 0.035; // Further adjusted icon size globally

const ICON_MANIFEST: Record<string, string> = {
  datacenter: '/icons/datacenter.png',
  Hydro:      '/icons/hydro.png',
  Coal:       '/icons/coal.png',
  Gas:        '/icons/gas.png',
  Oil:        '/icons/oil.png',
  Nuclear:    '/icons/nuclear.png',
  Solar:      '/icons/solar.png',
  Wind:       '/icons/wind.png',
  default:    '/icons/default.png' // A default icon for unknown types
};

// Helper to get resolution from trixel ID
// const getResolutionForTrixelId = (trixelId: number): number => {
//   if (trixelId < 4) return 0; // Base resolution
//   const R = Math.floor(Math.log2(trixelId / 4) / 2);
//   return R;
// };

// Helper to get a suitable zoom level for a given resolution,
// ALIGNED with getTriResolutionForZoom in htm-utils.ts
// REVERTED: Target zoom for the actual resolution again
const getZoomForResolution = (resolution: number): number => {
  let targetZoom: number;
  // Revert back to using the direct resolution
  const effectiveResolution = resolution; 

  // console.log(`[DemoGlobe] getZoomForResolution: Input Res ${resolution}, Effective Target Res ${effectiveResolution}`);

  switch (effectiveResolution) { // Use effectiveResolution for switch
    case 0: targetZoom = 0.9; break; 
    case 1: targetZoom = 1.0; break;
    case 2: targetZoom = 1.5; break;
    case 3: targetZoom = 2.0; break;
    case 4: targetZoom = 2.5; break; 
    case 5: targetZoom = 3.0; break;
    case 6: targetZoom = 4.0; break;
    case 7: targetZoom = 5.0; break;
    case 8: targetZoom = 6.0; break; // Will be capped by MAX_MAP_ZOOM if it's lower
    case 9: targetZoom = 7.0; break; // Will be capped
    case 10: targetZoom = 8.0; break; // Will be capped
    // For resolutions greater than 10, map them to a zoom that results in HTM res 10
    // or simply cap at MAX_MAP_ZOOM if that implies a lower HTM res.
    default: 
      // If resolution is high, aim for a zoom that htm-utils would interpret as max practical res (e.g., 10)
      // or just hit MAX_MAP_ZOOM.
      if (effectiveResolution > 10) targetZoom = 8.0; // Aim for zoom that gives HTM res 10
      else targetZoom = 6.0; // Default for unexpected high resolutions within typical HTM range
      break;
  }
  return Math.min(targetZoom, MAX_MAP_ZOOM);
};

// Helper function to check if map is in viewport
// --- TODO: Implement this check if necessary ---
// const isLatLngInViewport = (map: MaplibreMap, lat: number, lng: number): boolean => {
//   const bounds = map.getBounds();
//   return bounds.contains([lng, lat]);
// };

const getTrixelIdForPoint = (map: MaplibreMap | null, clickLng: number, clickLat: number): number | null => {
  if (!map) return null;

  const htmSource = map.getSource(HTM_SOURCE_ID) as maplibregl.GeoJSONSource;
  if (!htmSource || !(htmSource as any)._data) {
    console.warn('[DemoGlobe] getTrixelIdForPoint: HTM_SOURCE_ID not found or has no data.');
    return null;
  }

  const featureCollection = (htmSource as any)._data as FeatureCollection<Polygon, { id: string | number }>; // Assuming properties.id from trixelsToFC might be string or number
  if (!featureCollection || !featureCollection.features || featureCollection.features.length === 0) {
    console.warn('[DemoGlobe] getTrixelIdForPoint: No features in HTM_SOURCE_ID.');
    return null;
  }

  const clickPoint = turfPoint([clickLng, clickLat]);

  for (const feature of featureCollection.features) {
    // Ensure feature.id exists and is a number, or can be parsed to one if getTrixelBoundaryLngLat expects number
    let trixelIdNum: number | undefined = undefined;
    if (feature.id !== undefined) { // maplibre promotes feature.properties.id to feature.id if promoteId is used
        if(typeof feature.id === 'number'){
            trixelIdNum = feature.id;
        } else if (typeof feature.id === 'string') {
            const parsed = parseInt(feature.id, 10);
            if(!isNaN(parsed)) trixelIdNum = parsed;
        }
    }
    // Fallback to properties.id if feature.id was not suitable (e.g. if promoteId was not used or was different)
    if (trixelIdNum === undefined && feature.properties && feature.properties.id !== undefined) {
        if(typeof feature.properties.id === 'number'){
            trixelIdNum = feature.properties.id;
        } else if (typeof feature.properties.id === 'string') {
            const parsed = parseInt(feature.properties.id, 10);
            if(!isNaN(parsed)) trixelIdNum = parsed;
        }
    }

    if (trixelIdNum === undefined) {
      console.warn('[DemoGlobe] getTrixelIdForPoint: Feature missing a usable numeric ID.', feature);
      continue;
    }

    try {
      if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
        const geojsonFeature = feature as Feature<Polygon | MultiPolygon>; // Type assertion for Turf

        // Test original point
        if (booleanPointInPolygon(clickPoint, geojsonFeature)) {
          // console.log(`[DemoGlobe] Click in trixel ID ${trixelIdNum} (original)`);
          return trixelIdNum;
        }

        // Test with click point longitude +360
        const clickPointPlus360 = turfPoint([clickLng + 360, clickLat]);
        if (booleanPointInPolygon(clickPointPlus360, geojsonFeature)) {
          // console.log(`[DemoGlobe] Click in trixel ID ${trixelIdNum} (lng +360)`);
          return trixelIdNum;
        }

        // Test with click point longitude -360
        const clickPointMinus360 = turfPoint([clickLng - 360, clickLat]);
        if (booleanPointInPolygon(clickPointMinus360, geojsonFeature)) {
          // console.log(`[DemoGlobe] Click in trixel ID ${trixelIdNum} (lng -360)`);
          return trixelIdNum;
        }

      } else {
        console.warn(`[DemoGlobe] getTrixelIdForPoint: Feature ID ${trixelIdNum} does not have a suitable Polygon/MultiPolygon geometry. Feature:`, JSON.stringify(feature));
      }
    } catch (err) {
      console.error(`[DemoGlobe] getTrixelIdForPoint: Error processing trixel ID ${trixelIdNum} with its feature geometry:`, err);
    }
  }

  console.log('[DemoGlobe] getTrixelIdForPoint: Click did not fall into any trixel in the current source.');
  return null;
};

interface ClickedTrixelInfo {
  displayId: string;
  mapFeatureId: string | number; // The ID used by MapLibre feature state (after promoteId)
}

// Define props interface
interface DemoGlobeProps {
  jumpToTrixelData?: HookTrixelData | null;
  onJumpComplete?: () => void;
  worldAccount?: any;
  worldPubkey?: PublicKey;
}

// --- Utility for delay ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
// ------------------------

// Helper to load icons into the map – modern MapLibre API
async function loadIcons(map: maplibregl.Map): Promise<void[]> {
  return Promise.all(
    Object.entries(ICON_MANIFEST).map(async ([name, url]) => {
      console.log(`[DemoGlobe loadIcons] Attempting to load icon: ${name} from ${url}`);
      try {
        if (map.hasImage(name)) {
          console.log(`[DemoGlobe loadIcons] Icon ${name} already exists on map. Skipping.`);
          return; // avoid duplicates
        }

        const { data } = await map.loadImage(url); // ← new API
        map.addImage(name, data);
        console.log(`[DemoGlobe loadIcons] Successfully loaded and added icon: ${name}`);
      } catch (err) {
        console.error(`[DemoGlobe loadIcons] Failed to load icon ${name} from ${url}`, err);
        throw err; // surfaces in Promise.all
      }
    })
  );
}

// Helper to fetch GeoJSON data
async function fetchMapPointsGeoJSON(): Promise<FeatureCollection> {
  console.log("[DemoGlobe fetchMapPointsGeoJSON] Attempting to fetch /data/map_points.geojson");
  try {
    const response = await fetch('/data/map_points.geojson');
    if (!response.ok) {
      console.error(`[DemoGlobe fetchMapPointsGeoJSON] HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const geojsonData = await response.json();
    console.log("[DemoGlobe fetchMapPointsGeoJSON] Successfully fetched GeoJSON data:", geojsonData);
    return geojsonData;
  } catch (error) {
    console.error("[DemoGlobe fetchMapPointsGeoJSON] Failed to fetch map points GeoJSON:", error);
    return { type: 'FeatureCollection', features: [] };
  }
}

export default function DemoGlobe({ 
  jumpToTrixelData = null, 
  onJumpComplete, 
  worldAccount = null,
  worldPubkey = undefined
}: DemoGlobeProps) {
  // console.log("[DemoGlobe Minimal] Component rendering START");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const lastHtmResolutionRef = useRef<number | null>(null);
  const flashingTrixelRef = useRef<{ id: string | number | null, timeoutId: NodeJS.Timeout | null }>({ id: null, timeoutId: null });
  const rippleContextTrixelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isJumpingRef = useRef<boolean>(false); // Flag to track jump state
  const queryClient = useQueryClient(); // Get queryClient instance

  const { program, provider } = useProgram();
  const programRef = useRef(program);
  const providerRef = useRef(provider);

  // Zustand store actions
  const incrementClicksRegistered = useGlobeStore((state) => state.incrementClicksRegistered);
  const incrementClicksConfirmed = useGlobeStore((state) => state.incrementClicksConfirmed);
  const addActiveTrixel = useGlobeStore((state) => state.addActiveTrixel);

  const [showTrixels, setShowTrixels] = useState(true);
  const [showRippleTrixelContext, setShowRippleTrixelContext] = useState(true);
  const [showDataCenters, setShowDataCenters] = useState(false);
  const [showPowerPlants, setShowPowerPlants] = useState(false);
  const [clickedTrixelInfo, setClickedTrixelInfo] = useState<ClickedTrixelInfo | null>(null);
  const [detailedTrixelInfo, setDetailedTrixelInfo] = useState<HookTrixelData | null>(null);

  // Refs for event handlers to access current state/functions
  const showTrixelsRef = useRef(showTrixels);
  useEffect(() => { showTrixelsRef.current = showTrixels; }, [showTrixels]);

  const clickedTrixelInfoRef = useRef(clickedTrixelInfo);
  useEffect(() => { clickedTrixelInfoRef.current = clickedTrixelInfo; }, [clickedTrixelInfo]);

  const showRippleTrixelContextRef = useRef(showRippleTrixelContext);
  useEffect(() => { showRippleTrixelContextRef.current = showRippleTrixelContext; }, [showRippleTrixelContext]);

  const showDataCentersRef = useRef(showDataCenters);
  useEffect(() => { showDataCentersRef.current = showDataCenters; }, [showDataCenters]);

  const showPowerPlantsRef = useRef(showPowerPlants);
  useEffect(() => { showPowerPlantsRef.current = showPowerPlants; }, [showPowerPlants]);

  // useEffects to keep program and provider refs updated
  useEffect(() => { programRef.current = program; }, [program]);
  useEffect(() => { providerRef.current = provider; }, [provider]);

  // --- Clear detailed info when selection is cleared by general map click ---
  useEffect(() => {
    if (!clickedTrixelInfo && detailedTrixelInfo) {
      // This can happen if a map click clears clickedTrixelInfo
      // setDetailedTrixelInfo(null); // Re-evaluate if this is the best place
    }
  }, [clickedTrixelInfo, detailedTrixelInfo]);

  // --- Modified selectTrixelOnMap ---
  const selectTrixelOnMap = useCallback(async (trixelId: number, trixelFullData?: HookTrixelData ): Promise<boolean> => { // Accept full data
    const currentMap = mapRef.current;
    if (!currentMap || !currentMap.isStyleLoaded()) {
      console.warn(`[DemoGlobe] selectTrixelOnMap: Map not ready for trixel ${trixelId}`);
      return false; // Indicate failure
    }
  
    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY = 100; // ms
  
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let features: GeoJSONFeature[] = [];
      try {
        features = currentMap.querySourceFeatures(HTM_SOURCE_ID);
      } catch (err) {
        console.error(`[DemoGlobe] selectTrixelOnMap (Attempt ${attempt}): Error querying source features:`, err);
        if (attempt === MAX_ATTEMPTS) return false; // Fail after last attempt error
        await delay(RETRY_DELAY);
        continue; // Try next attempt
      }
  
      const targetFeature = features.find(f =>
        f.id?.toString() === trixelId.toString() ||
        f.properties?.id?.toString() === trixelId.toString()
      );
  
      if (targetFeature && targetFeature.id !== undefined) {
        const mapFeatureId = targetFeature.id !== undefined ? targetFeature.id : targetFeature.properties?.id;
        if (mapFeatureId === undefined) {
            console.error(`[DemoGlobe] selectTrixelOnMap (Attempt ${attempt}): Found feature for ${trixelId}, but could not extract mapFeatureId!`, targetFeature);
            // Consider this a failure for this attempt
        } else {
            const displayId = trixelId.toString();
            console.log(`[DemoGlobe] selectTrixelOnMap (Attempt ${attempt}): Found feature for ${trixelId}. MapFeatureID: ${mapFeatureId}`);
  
            const currentClickedInfo = clickedTrixelInfoRef.current;
            if (currentClickedInfo && currentClickedInfo.mapFeatureId !== mapFeatureId) {
              console.log(`[DEBUG selectTrixelOnMap] Removing 'selected' state from previous trixel ID: ${currentClickedInfo.mapFeatureId}`);
              currentMap.removeFeatureState({ source: HTM_SOURCE_ID, id: currentClickedInfo.mapFeatureId }, 'selected');
            }
  
            console.log(`[DEBUG selectTrixelOnMap] Setting 'selected: true' state for trixel ID: ${mapFeatureId}`);
            currentMap.setFeatureState(
              { source: HTM_SOURCE_ID, id: mapFeatureId },
              { selected: true }
            );
            setClickedTrixelInfo({ displayId, mapFeatureId });
            // --- Set detailed info for overlay ---
            if (trixelFullData) {
              setDetailedTrixelInfo(trixelFullData);
            } else {
              // Handle fetching/constructing full data for direct clicks
              let foundOnChainData: HookTrixelData | undefined = undefined;
              if (worldPubkey) {
                const cachedOnChainTrixels = queryClient.getQueryData<HookTrixelData[]>(['onChainTrixels', worldPubkey.toString()]);
                if (cachedOnChainTrixels) {
                  foundOnChainData = cachedOnChainTrixels.find(t => t.id === trixelId);
                }
              }

              if (foundOnChainData) {
                console.log(`[DemoGlobe] selectTrixelOnMap: Found cached on-chain data for trixel ${trixelId}`);
                setDetailedTrixelInfo(foundOnChainData);
              } else {
                console.warn(`[DemoGlobe] selectTrixelOnMap: Full trixel data not provided or found in cache for ID ${trixelId}. Overlay will be partial.`);
                const boundary = getTrixelBoundaryLngLat(trixelId);
                const currentProgram = programRef.current;
                let pdaString: string | undefined = undefined;
                if (currentProgram && worldPubkey) { 
                  try {
                      const [pdaKey, /* bump */] = getTrixelPDA(worldPubkey, trixelId, currentProgram.programId);
                      pdaString = pdaKey.toBase58(); 
                  } catch (pdaError) {
                      console.error(`[DemoGlobe] Error generating PDA for trixel ${trixelId}:`, pdaError);
                  }
                }
                const minimalData: Partial<HookTrixelData> = {
                  id: trixelId,
                  resolution: getResolutionFromTrixelId(trixelId), 
                  vertices: boundary ? boundary.map(b => ({x: b[0], y: b[1], z: 0})) : [], 
                  sphericalCoords: boundary ? boundary.map(b => cartesianToSpherical({x: b[0], y: b[1], z: 0})) : [],
                  exists: false, 
                  pda: pdaString ? new PublicKey(pdaString) : undefined 
                };
                setDetailedTrixelInfo(minimalData as HookTrixelData); 
              }
            }
            // -------------------------------------
            return true; // Indicate success
        }
      }
  
      // Feature not found on this attempt
      if (attempt === MAX_ATTEMPTS) {
        console.error(`[DemoGlobe] selectTrixelOnMap: Feature not found for trixel ID ${trixelId} after ${MAX_ATTEMPTS} attempts.`);
        // Clear previous selection if target not found after all attempts
        if (clickedTrixelInfoRef.current) {
            const currentClickedInfo = clickedTrixelInfoRef.current; // Need to capture ref value here
            // Check map state again before removing feature state
            if (currentMap.getSource(HTM_SOURCE_ID) && currentMap.isStyleLoaded()) {
                 currentMap.removeFeatureState({ source: HTM_SOURCE_ID, id: currentClickedInfo.mapFeatureId }, 'selected');
            }
           setClickedTrixelInfo(null);
           setDetailedTrixelInfo(null); // Clear detailed info too
        }
        return false; // Indicate failure
      }
  
      // Wait before retrying
      // console.log(`[DemoGlobe] selectTrixelOnMap: Feature ${trixelId} not found on attempt ${attempt}. Retrying...`);
      await delay(RETRY_DELAY);
    } // End of retry loop
  
    return false; // Should not be reached, but return false just in case
  // Add setClickedTrixelInfo to dependencies
  }, [worldPubkey, queryClient, programRef, providerRef, setClickedTrixelInfo, setDetailedTrixelInfo]);
  // ----------------------------- 

  // --- Flash effect helper ---
  const applyFlashEffect = useCallback((mapFeatureIdToFlash: string | number) => {
      const currentMap = mapRef.current;
      if (!currentMap || !mapFeatureIdToFlash) return;

      if (flashingTrixelRef.current.timeoutId) clearTimeout(flashingTrixelRef.current.timeoutId);
      if (flashingTrixelRef.current.id !== null && flashingTrixelRef.current.id !== mapFeatureIdToFlash) {
        if (currentMap.getSource(HTM_SOURCE_ID) && currentMap.isStyleLoaded()) {
          currentMap.setFeatureState({ source: HTM_SOURCE_ID, id: flashingTrixelRef.current.id }, { flash: false });
        }
      }

      if (currentMap.getSource(HTM_SOURCE_ID) && currentMap.isStyleLoaded()) {
        currentMap.setFeatureState({ source: HTM_SOURCE_ID, id: mapFeatureIdToFlash }, { flash: true });
      }

      flashingTrixelRef.current = {
        id: mapFeatureIdToFlash,
        timeoutId: setTimeout(() => {
          // Check again if map exists and source exists before setting state
          if (mapRef.current && mapRef.current.getSource(HTM_SOURCE_ID) && mapRef.current.isStyleLoaded()) {
            mapRef.current.setFeatureState({ source: HTM_SOURCE_ID, id: mapFeatureIdToFlash }, { flash: false });
          }
          flashingTrixelRef.current = { id: null, timeoutId: null };
        }, FLASH_DURATION)
      };
  }, []); // No dependencies needed if it only uses refs and constants
  // -------------------------

  const updateHtmVisualization = useCallback((currentMap: MaplibreMap, newResolution: number, ensureTrixelId?: number | null) => {
    // console.log(`[DemoGlobe Minimal] Updating HTM Visualization to Res: ${newResolution}, Ensuring ID: ${ensureTrixelId}`);
    let trixelIds = getTrixelsForView(null, newResolution);

    // --- Ensure the target trixel ID is included ---
    if (ensureTrixelId !== null && ensureTrixelId !== undefined && !trixelIds.includes(ensureTrixelId)) {
        console.log(`[DemoGlobe updateHtmVisualization] Target trixel ${ensureTrixelId} was not in view for res ${newResolution}. Adding it explicitly.`);
        trixelIds.push(ensureTrixelId);
    }
    // ---------------------------------------------

    if (trixelIds.length === 0) {
      console.warn(`[DemoGlobe Minimal] No trixel IDs returned for HTM Res ${newResolution}.`);
      const source = currentMap.getSource(HTM_SOURCE_ID) as maplibregl.GeoJSONSource;
      if (source) {
          source.setData({ type: 'FeatureCollection', features: [] });
      }
      if (clickedTrixelInfo) {
        if (mapRef.current?.getSource(HTM_SOURCE_ID) && mapRef.current.isStyleLoaded()) {
            mapRef.current.removeFeatureState({ source: HTM_SOURCE_ID, id: clickedTrixelInfo.mapFeatureId }, 'selected');
            mapRef.current.removeFeatureState({ source: HTM_SOURCE_ID, id: clickedTrixelInfo.mapFeatureId }, 'flash');
        }
        setClickedTrixelInfo(null);
      }
      return;
    }
    const featureCollection = trixelsToFC(trixelIds);

    // --- START TEMPORARY DEBUG LOG ---
    if (trixelIds.includes(3) || trixelIds.includes(6)) { // Check if problematic trixels are in the current view
      const featuresForId3 = featureCollection.features.filter(f => f.properties && f.properties.id === 3);
      const featuresForId6 = featureCollection.features.filter(f => f.properties && f.properties.id === 6);
      if (featuresForId3.length > 0) {
        console.log(`[DEBUG DEMOGLOBE] For Trixel ID 3, found ${featuresForId3.length} features in FeatureCollection from trixelsToFC. Features:`, JSON.parse(JSON.stringify(featuresForId3)));
      }
      if (featuresForId6.length > 0) {
        console.log(`[DEBUG DEMOGLOBE] For Trixel ID 6, found ${featuresForId6.length} features in FeatureCollection from trixelsToFC. Features:`, JSON.parse(JSON.stringify(featuresForId6)));
      }
    }
    // --- END TEMPORARY DEBUG LOG ---

    featureCollection.features.forEach((f: Feature) => {
      if (!(f.properties && f.properties.id)) { 
        console.warn("[DemoGlobe Minimal] Feature created by trixelsToFC is missing properties.id for trixelId promotion.", f);
      }
    });
    const source = currentMap.getSource(HTM_SOURCE_ID) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(featureCollection);
    } else {
      currentMap.addSource(HTM_SOURCE_ID, { type: 'geojson', data: featureCollection, promoteId: 'id' });
      currentMap.addLayer({
        id: HTM_INTERACTIVE_FILL_LAYER_ID, type: 'fill', source: HTM_SOURCE_ID,
        paint: { 'fill-color': '#000000', 'fill-opacity': 0.01 },
        layout: { 'visibility': showTrixels ? 'visible' : 'none' }
      });
      currentMap.addLayer({
        id: HTM_HIGHLIGHT_FILL_LAYER_ID, type: 'fill', source: HTM_SOURCE_ID,
        paint: {
          'fill-color': SELECTED_FILL_COLOR,
          'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], SELECTED_FILL_OPACITY, 0]
        },
        layout: { 'visibility': showTrixels ? 'visible' : 'none' }
      });
      currentMap.addLayer({
        id: HTM_STROKE_LAYER_ID, type: 'line', source: HTM_SOURCE_ID,
        layout: { 'visibility': showTrixels ? 'visible' : 'none' },
        paint: {
            'line-color': ['case', ['boolean', ['feature-state', 'flash'], false], FLASH_COLOR, ['boolean', ['feature-state', 'selected'], false], SELECTED_STROKE_COLOR, DEFAULT_STROKE_COLOR],
            'line-width': ['case', ['boolean', ['feature-state', 'flash'], false], FLASH_WIDTH, ['boolean', ['feature-state', 'selected'], false], SELECTED_STROKE_WIDTH, DEFAULT_STROKE_WIDTH]
        },
      });
    }
    // console.log(`[DemoGlobe Minimal] Displayed ${featureCollection.features.length} trixels for HTM Res ${newResolution}.`);
  }, [setClickedTrixelInfo]);

  const applyHtmUpdate = useCallback((currentMap: MaplibreMap, newRes: number, ensureTrixelId?: number | null) => {
    // console.log(`[DemoGlobe Minimal] Applying HTM update. NewRes: ${newRes}, PrevRes: ${lastHtmResolutionRef.current}, Ensuring ID: ${ensureTrixelId}`);
    updateHtmVisualization(currentMap, newRes, ensureTrixelId); // Pass ensureTrixelId along
    lastHtmResolutionRef.current = newRes;
  }, [updateHtmVisualization]);

  // Ref for applyHtmUpdate for event handlers
  const applyHtmUpdateRef = useRef(applyHtmUpdate);
  useEffect(() => { applyHtmUpdateRef.current = applyHtmUpdate; }, [applyHtmUpdate]);

  useEffect(() => {
    console.log("[DemoGlobe Minimal] Main useEffect running START (map setup)");
    if (mapRef.current || !mapContainerRef.current) {
      console.log("[DemoGlobe Minimal] Main useEffect exiting early (map exists or container missing)");
      return;
    }
    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: globeStyle as StyleSpecification,
      center: [0, 0],
      zoom: 0.9,
      minZoom: 0,
      maxZoom: 6
      // renderWorldCopies: false // Option is ignored, will be set via method
    });
    mapRef.current = map;
    map.setRenderWorldCopies(false); // <-- SET IT HERE
    // console.log('[DEBUG] world copies after construction?', map.getRenderWorldCopies());
    // console.log("[DemoGlobe Minimal] Map object created");

    map.on('load', async () => { // Make the load callback async
      map.setRenderWorldCopies(false); // <-- AND SET IT HERE AGAIN FOR ROBUSTNESS
      console.log("[DemoGlobe map.on('load')] Map load event fired.");

      // Load custom icons
      try {
        console.log("[DemoGlobe map.on('load')] Starting icon loading...");
        await loadIcons(map);
        console.log("[DemoGlobe map.on('load')] Custom icons loading process completed.");
      } catch (error) {
        console.error("[DemoGlobe map.on('load')] Error during custom icon loading:", error);
      }

      // Fetch and add map points GeoJSON
      try {
        console.log("[DemoGlobe map.on('load')] Starting map points GeoJSON fetching...");
        const mapPointsData = await fetchMapPointsGeoJSON();
        console.log(`[DemoGlobe map.on('load')] Map points GeoJSON fetched. Number of features: ${mapPointsData.features.length}`);
        
        if (mapPointsData.features.length > 0) {
          if (!map.getSource(MAP_POINTS_SOURCE_ID)) {
            map.addSource(MAP_POINTS_SOURCE_ID, {
              type: 'geojson',
              data: mapPointsData
            });
            console.log(`[DemoGlobe map.on('load')] Added source: ${MAP_POINTS_SOURCE_ID}`);
          } else {
            console.log(`[DemoGlobe map.on('load')] Source ${MAP_POINTS_SOURCE_ID} already exists. Updating data.`);
            (map.getSource(MAP_POINTS_SOURCE_ID) as maplibregl.GeoJSONSource).setData(mapPointsData);
          }

          // Add Data Centers Layer
          if (!map.getLayer(DATA_CENTERS_LAYER_ID)) {
            map.addLayer({
              id: DATA_CENTERS_LAYER_ID,
              type: 'symbol',
              source: MAP_POINTS_SOURCE_ID,
              filter: ['==', ['get', 'type'], 'datacenter'], // Restore filter
              layout: {
                'icon-image': 'datacenter', // Restore original icon
                'icon-size': ICON_SIZE, // Use the ICON_SIZE constant
                'icon-allow-overlap': true,
                'visibility': showDataCentersRef.current ? 'visible' : 'none'
              }
            });
            console.log(`[DemoGlobe map.on('load')] Added layer: ${DATA_CENTERS_LAYER_ID}. Initial visibility: ${showDataCentersRef.current ? 'visible' : 'none'}`);
          } else {
            console.log(`[DemoGlobe map.on('load')] Layer ${DATA_CENTERS_LAYER_ID} already exists.`);
          }

          // Add Power Plants Layer
          if (!map.getLayer(POWER_PLANTS_LAYER_ID)) {
            map.addLayer({
              id: POWER_PLANTS_LAYER_ID,
              type: 'symbol',
              source: MAP_POINTS_SOURCE_ID,
              filter: ['==', ['get', 'type'], 'power_plant'],
              layout: {
                'icon-image': [
                  'match',
                  ['get', 'primary_fuel'],
                  'Hydro',   'Hydro',
                  'Coal',    'Coal',
                  'Gas',     'Gas',
                  'Oil',     'Oil',
                  'Nuclear', 'Nuclear',
                  'Solar',   'Solar',
                  'Wind',    'Wind',
                  /* default */ 'default'
                ],
                'icon-size': ICON_SIZE,
                'icon-allow-overlap': true,
                'visibility': showPowerPlantsRef.current ? 'visible' : 'none'
              }
            });
            console.log(`[DemoGlobe map.on('load')] Added layer: ${POWER_PLANTS_LAYER_ID}. Initial visibility: ${showPowerPlantsRef.current ? 'visible' : 'none'}`);
          }
        } else {
          console.warn("[DemoGlobe Minimal] No features found in map points GeoJSON data. Layers not added.");
        }
      } catch (error) {
        console.error("[DemoGlobe Minimal] Error processing map points GeoJSON or adding layers:", error);
      }

      if (mapRef.current) { // mapRef might have been nulled by cleanup if component unmounted quickly
        const initialRawZoom = mapRef.current.getZoom();
        const initialLat = mapRef.current.getCenter().lat;
        const initialLatRad = initialLat * Math.PI / 180;
        const clampedInitialLatRad = Math.min(Math.max(initialLatRad, -89.99 * Math.PI / 180), 89.99 * Math.PI / 180);
        const normalizedInitialZoom = initialRawZoom + Math.log2(1 / Math.cos(clampedInitialLatRad));
        const initialHtmResolution = getTriResolutionForZoom(normalizedInitialZoom);
        console.log(`[DemoGlobe Minimal] Initial load. RawZoom: ${initialRawZoom.toFixed(2)}, Lat: ${initialLat.toFixed(2)}, NormZoom: ${normalizedInitialZoom.toFixed(2)}, Target HTM Res: ${initialHtmResolution}.`);
        applyHtmUpdate(mapRef.current, initialHtmResolution);
      }

      // Add source and layer for ripple context trixel
      map.addSource(RIPPLE_CONTEXT_TRIXEL_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: RIPPLE_CONTEXT_TRIXEL_STROKE_LAYER_ID,
        type: 'line',
        source: RIPPLE_CONTEXT_TRIXEL_SOURCE_ID,
        paint: {
          'line-color': RIPPLE_CONTEXT_STROKE_COLOR,
          'line-width': RIPPLE_CONTEXT_STROKE_WIDTH,
          'line-dasharray': RIPPLE_CONTEXT_STROKE_DASHARRAY
        }
      });

      map.on('click', HTM_INTERACTIVE_FILL_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        if (!showTrixelsRef.current || !e.features || e.features.length === 0 || !mapRef.current) return;

        const mapInstance = mapRef.current;
        // const clickedFeature = e.features[0]; // We'll rely on getTrixelIdForPoint

        // Determine the actual trixel ID from the click point for higher accuracy
        const numericTrixelId = getTrixelIdForPoint(mapInstance, e.lngLat.lng, e.lngLat.lat);

        if (numericTrixelId === null) {
          console.warn(`[DemoGlobe Click] Click at (${e.lngLat.lng.toFixed(5)}, ${e.lngLat.lat.toFixed(5)}) did not resolve to a trixel ID. Overlay will not show.`);
          // If we can't get a numeric ID, we don't proceed to select/show overlay for this click.
          // The general map click handler might clear existing selections if e.defaultPrevented is not called.
          return; 
        }
        
        incrementClicksRegistered();

        // -------- Solana Interaction Placeholder START --------
        const currentProgram = programRef.current;
        const currentProvider = providerRef.current;

        if (currentProgram && currentProvider && currentProvider.wallet && currentProvider.wallet.publicKey) {
          // console.log('[DemoGlobe] Solana interaction triggered for trixel:', numericTrixelId);
          // console.log('[DemoGlobe] Program ID:', currentProgram.programId.toBase58());
          // console.log('[DemoGlobe] Wallet Public Key:', currentProvider.wallet.publicKey.toBase58());

          // TODO: Replace with actual World PublicKey from user input or config
          const WORLD_PUBKEY = new PublicKey("SVoLi1unEnFq1iGj3Gf2e1nC5WJH5wVNcZWQSM2P3bY"); // Placeholder Devnet World

          (async () => {
            try {
              // numericTrixelId is already a number
              console.log(`[DemoGlobe] Attempting transaction for trixel ID: ${numericTrixelId} in world ${WORLD_PUBKEY.toBase58()}`);
              
              // SIMULATE TRANSACTION DELAY AND SUCCESS FOR NOW
              await new Promise(resolve => setTimeout(resolve, 1500));
              const mockTxSignature = `mock_tx_sig_${Date.now()}`;
              console.log("[DemoGlobe] Mock Solana transaction successful:", mockTxSignature);
              // END SIMULATION

              incrementClicksConfirmed();
              addActiveTrixel(numericTrixelId.toString()); // Ensure this matches expected type

            } catch (error) {
              console.error("[DemoGlobe] Solana transaction error:", error);
            }
          })();
        } else {
          console.warn('[DemoGlobe] Solana program or provider not available for interaction.');
        }
        // -------- Solana Interaction Placeholder END --------

        // --- Select the trixel, show overlay, and apply flash ---
        (async () => {
          const selectionSuccess = await selectTrixelOnMap(numericTrixelId /*, no full data for direct click */);
          if (selectionSuccess) {
            // selectTrixelOnMap has handled:
            // 1. Clearing previous 'selected' state (if any)
            // 2. Setting new 'selected' state on the map feature
            // 3. Updating clickedTrixelInfoRef.current
            // 4. Updating detailedTrixelInfo (which triggers the overlay)

            // Now, apply flash effect to the newly selected trixel
            const currentSelectedInfo = clickedTrixelInfoRef.current;
            if (currentSelectedInfo && currentSelectedInfo.mapFeatureId !== undefined) {
              if (mapRef.current && mapRef.current.getSource(HTM_SOURCE_ID) && mapRef.current.isStyleLoaded()) {
                 applyFlashEffect(currentSelectedInfo.mapFeatureId);
              } else {
                console.warn("[DemoGlobe Click] Map not ready for flash effect even after successful selection.");
              }
            } else {
              console.warn("[DemoGlobe Click] Selection reported success, but clickedTrixelInfo not updated for flash effect.");
            }
          } else {
            console.warn(`[DemoGlobe Click] Failed to select trixel ${numericTrixelId} on map. Overlay may not show or may be cleared.`);
            // selectTrixelOnMap should handle clearing detailedTrixelInfo if selection fails.
          }
        })();
        // ----------------------------------------------------
        
        e.preventDefault(); 
      });

      map.on('click', (e: maplibregl.MapMouseEvent) => {
        if (!mapRef.current || !mapRef.current.getStyle()) return;
        
        startRippleAnimation(mapRef.current, e.lngLat);

        // Logic for showing ripple context trixel
        if (rippleContextTrixelTimeoutRef.current) {
          clearTimeout(rippleContextTrixelTimeoutRef.current);
          rippleContextTrixelTimeoutRef.current = null;
        }
        const contextSource = mapRef.current.getSource(RIPPLE_CONTEXT_TRIXEL_SOURCE_ID) as maplibregl.GeoJSONSource;
        if (contextSource) contextSource.setData({ type: 'FeatureCollection', features: [] });

        if (showRippleTrixelContext && mapRef.current) {
          // Pass the map instance to getTrixelIdForPoint
          const numericId = getTrixelIdForPoint(mapRef.current, e.lngLat.lng, e.lngLat.lat);
          
          if (numericId !== null) { 
            const featureCollectionForContext = trixelsToFC([numericId]); // trixelsToFC still expects number[] based on recent linter
            if (featureCollectionForContext.features.length > 0 && contextSource) {
              contextSource.setData(featureCollectionForContext);
              rippleContextTrixelTimeoutRef.current = setTimeout(() => {
                if (mapRef.current && mapRef.current.getSource(RIPPLE_CONTEXT_TRIXEL_SOURCE_ID)) {
                  (mapRef.current.getSource(RIPPLE_CONTEXT_TRIXEL_SOURCE_ID) as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
                }
                rippleContextTrixelTimeoutRef.current = null;
              }, RIPPLE_CONTEXT_HIGHLIGHT_DURATION);
            } else if (!contextSource) {
                console.warn("[DemoGlobe Minimal] Ripple context source not found after check.");
            }
          }
        }

        // Existing logic for clearing trixel selection
        if (!e.defaultPrevented && clickedTrixelInfo) {
            console.log("[DemoGlobe Minimal] General map click, clearing selection.");
            if (mapRef.current.getSource(HTM_SOURCE_ID) && mapRef.current.isStyleLoaded()){
                console.log(`[DEBUG general map click] Setting 'selected: false, flash: false' state for trixel ID: ${clickedTrixelInfo.mapFeatureId}`);
                mapRef.current.setFeatureState(
                    { source: HTM_SOURCE_ID, id: clickedTrixelInfo.mapFeatureId },
                    { selected: false, flash: false } 
                );
            }
            if (flashingTrixelRef.current.id === clickedTrixelInfo.mapFeatureId && flashingTrixelRef.current.timeoutId) {
                clearTimeout(flashingTrixelRef.current.timeoutId);
                flashingTrixelRef.current = { id: null, timeoutId: null };
            }
            setClickedTrixelInfo(null);
            setDetailedTrixelInfo(null); // Clear detailed info on general map click
        }
      });

      map.on('zoomend', (e: maplibregl.MapLibreZoomEvent) => {
        if (!mapRef.current) return;

        let userInitiatedZoomIntent = false;
        const eventSourceInfo = [];

        if (!e.originalEvent) {
          userInitiatedZoomIntent = true; // Programmatic zoom (flyTo, zoomTo, etc.)
          eventSourceInfo.push('Programmatic/Internal');
        } else if (e.originalEvent instanceof WheelEvent) {
          userInitiatedZoomIntent = true; // Mouse wheel
          eventSourceInfo.push('WheelEvent');
        } else if (typeof TouchEvent !== 'undefined' && e.originalEvent instanceof TouchEvent) {
          userInitiatedZoomIntent = true; // Pinch zoom
          eventSourceInfo.push('TouchEvent');
        } else if (e.originalEvent instanceof MouseEvent) {
          const target = e.originalEvent.target as HTMLElement;
          const mapContainer = mapRef.current.getContainer();
          const zoomInButton = mapContainer.querySelector('.maplibregl-ctrl-zoom-in');
          const zoomOutButton = mapContainer.querySelector('.maplibregl-ctrl-zoom-out');
          if ((zoomInButton && zoomInButton.contains(target)) || (zoomOutButton && zoomOutButton.contains(target))) {
            userInitiatedZoomIntent = true; // Click on default zoom buttons
            eventSourceInfo.push('ZoomButtonMouseEvent');
          } else {
            eventSourceInfo.push('OtherMouseEvent(e.g.drag)');
            // MouseEvent not on a zoom button (e.g., from map drag). NOT considered user-initiated for HTM update.
          }
        } else {
          // Check if originalEvent exists and has a type property before accessing it
          if (e.originalEvent && typeof (e.originalEvent as any).type === 'string') {
            eventSourceInfo.push(`UnknownOriginalEvent:${(e.originalEvent as any).type}`);
          } else {
            eventSourceInfo.push('UnknownOriginalEvent:type N/A');
          }
          // Other originalEvent types? Default to not user-initiated for safety.
        }

        const currentRawZoom = mapRef.current.getZoom();
        const currentLat = mapRef.current.getCenter().lat;
        const currentLatRad = currentLat * Math.PI / 180;
        // Clamp currentLatRad to avoid Math.cos(PI/2) = 0 issues
        const clampedCurrentLatRad = Math.min(Math.max(currentLatRad, -89.99 * Math.PI / 180), 89.99 * Math.PI / 180);
        const normalizedCurrentZoom = currentRawZoom + Math.log2(1 / Math.cos(clampedCurrentLatRad));

        const potentialNewHtmResolution = getTriResolutionForZoom(normalizedCurrentZoom);

        // --- Check isJumpingRef flag before processing zoom ---
        if (isJumpingRef.current) {
          // console.log("[DemoGlobe Minimal] map.on('zoomend'): Jump in progress, skipping resolution update.");
          return; // Skip update if a jump is happening
        }
        // -----------------------------------------------------

        if (userInitiatedZoomIntent) {
          if (e.originalEvent instanceof WheelEvent) {
            const isZoomIn = e.originalEvent.deltaY < 0;
            if (isZoomIn) {
              // Zooming In with Wheel
              if (lastHtmResolutionRef.current !== null && potentialNewHtmResolution > lastHtmResolutionRef.current) {
                console.log(`[DemoGlobe Minimal] Wheel zoom IN: New HTM Res (${potentialNewHtmResolution}) is higher than current (${lastHtmResolutionRef.current}). Updating.`);
                applyHtmUpdate(mapRef.current, potentialNewHtmResolution);
              } else if (lastHtmResolutionRef.current === null && potentialNewHtmResolution !== lastHtmResolutionRef.current) {
                // Initial case or if lastHtmResolutionRef was somehow reset to null and resolution changed
                console.log(`[DemoGlobe Minimal] Wheel zoom IN (initial/null): New HTM Res (${potentialNewHtmResolution}). Updating.`);
                applyHtmUpdate(mapRef.current, potentialNewHtmResolution);
              } else {
                console.log(`[DemoGlobe Minimal] Wheel zoom IN: Potential HTM Res (${potentialNewHtmResolution}) is not higher than current (${lastHtmResolutionRef.current}). Maintaining current resolution.`);
              }
            } else {
              // Zooming Out with Wheel
              if (potentialNewHtmResolution !== lastHtmResolutionRef.current) {
                console.log(`[DemoGlobe Minimal] Wheel zoom OUT: HTM Res changed to ${potentialNewHtmResolution}. Updating.`);
                applyHtmUpdate(mapRef.current, potentialNewHtmResolution);
              } else {
                console.log(`[DemoGlobe Minimal] Wheel zoom OUT: HTM Res (${potentialNewHtmResolution}) is unchanged. No visual update needed.`);
              }
            }
          } else {
            // Other user-initiated zoom (buttons, programmatic)
            if (potentialNewHtmResolution !== lastHtmResolutionRef.current) {
              console.log(`[DemoGlobe Minimal] Non-wheel user zoom: HTM Res changed to ${potentialNewHtmResolution}. Updating.`);
              applyHtmUpdate(mapRef.current, potentialNewHtmResolution);
            } else {
              console.log(`[DemoGlobe Minimal] Non-wheel user zoom: HTM Res (${potentialNewHtmResolution}) is unchanged. No visual update needed.`);
            }
          }
        } else {
          console.log(`[DemoGlobe Minimal] Non-user-initiated zoom event or pan-induced zoom adjustment. HTM resolution (${lastHtmResolutionRef.current}) maintained.`);
        }
      });
    });

    return () => {
      console.log("[DemoGlobe Minimal] Main useEffect cleanup running");
      if (flashingTrixelRef.current.timeoutId) {
        clearTimeout(flashingTrixelRef.current.timeoutId);
        flashingTrixelRef.current = { id: null, timeoutId: null };
      }
      if (rippleContextTrixelTimeoutRef.current) { // Cleanup for context trixel timeout
        clearTimeout(rippleContextTrixelTimeoutRef.current);
        rippleContextTrixelTimeoutRef.current = null;
      }
      mapRef.current?.remove();
      mapRef.current = null;
      isJumpingRef.current = false; // Ensure flag is reset on unmount
    };
  }, [applyHtmUpdateRef, programRef, providerRef, setClickedTrixelInfo]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      if (map.getLayer(HTM_STROKE_LAYER_ID)) map.setLayoutProperty(HTM_STROKE_LAYER_ID, 'visibility', showTrixels ? 'visible' : 'none');
      if (map.getLayer(HTM_HIGHLIGHT_FILL_LAYER_ID)) map.setLayoutProperty(HTM_HIGHLIGHT_FILL_LAYER_ID, 'visibility', showTrixels ? 'visible' : 'none');
      if (map.getLayer(HTM_INTERACTIVE_FILL_LAYER_ID)) map.setLayoutProperty(HTM_INTERACTIVE_FILL_LAYER_ID, 'visibility', showTrixels ? 'visible' : 'none');
      if (!showTrixels && clickedTrixelInfo) {
        if (map.getSource(HTM_SOURCE_ID)){
            map.setFeatureState({ source: HTM_SOURCE_ID, id: clickedTrixelInfo.mapFeatureId }, { selected: false, flash: false });
        }
        if (flashingTrixelRef.current.id === clickedTrixelInfo.mapFeatureId && flashingTrixelRef.current.timeoutId) {
            clearTimeout(flashingTrixelRef.current.timeoutId);
            flashingTrixelRef.current = { id: null, timeoutId: null };
        }
        setClickedTrixelInfo(null);
      }
    }
  }, [showTrixels, setClickedTrixelInfo, program, provider]);

  // useEffect for toggling Data Centers visibility
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded() && map.getLayer(DATA_CENTERS_LAYER_ID)) {
      const visibility = showDataCenters ? 'visible' : 'none';
      console.log(`[DemoGlobe useEffect showDataCenters] Setting ${DATA_CENTERS_LAYER_ID} visibility to: ${visibility}`);
      map.setLayoutProperty(DATA_CENTERS_LAYER_ID, 'visibility', visibility);
    } else {
      console.log(`[DemoGlobe useEffect showDataCenters] Conditions not met for visibility change. Map ready: ${!!(map && map.isStyleLoaded())}, Layer exists: ${!!(map && map.getLayer(DATA_CENTERS_LAYER_ID))}`);
    }
    // showDataCentersRef is already updated by its own useEffect
  }, [showDataCenters]);

  // useEffect for toggling Power Plants visibility
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded() && map.getLayer(POWER_PLANTS_LAYER_ID)) {
      const visibility = showPowerPlants ? 'visible' : 'none';
      console.log(`[DemoGlobe useEffect showPowerPlants] Setting ${POWER_PLANTS_LAYER_ID} visibility to: ${visibility}`);
      map.setLayoutProperty(POWER_PLANTS_LAYER_ID, 'visibility', visibility);
    } else {
      console.log(`[DemoGlobe useEffect showPowerPlants] Conditions not met for visibility change. Map ready: ${!!(map && map.isStyleLoaded())}, Layer exists: ${!!(map && map.getLayer(POWER_PLANTS_LAYER_ID))}`);
    }
    // showPowerPlantsRef is already updated by its own useEffect
  }, [showPowerPlants]);

  // --- Modified performJump ---
  const performJump = useCallback(async (targetTrixelFullData: HookTrixelData) => { 
      const targetTrixelId = targetTrixelFullData.id;
      console.log(`[DemoGlobe] Initiating jump animation for trixel ID: ${targetTrixelId}`);
      const currentMap = mapRef.current;
      if (!currentMap) return;

      // --- Set jump flag ---
      isJumpingRef.current = true;
      // --------------------

      // --- FlyTo logic (happens first now) ---
      try {
          const boundary = getTrixelBoundaryLngLat(targetTrixelId);
          if (boundary && boundary.length > 0) {
            const centerLng = boundary[0][0];
            const centerLat = boundary[0][1];
            const targetResolution = getResolutionFromTrixelId(targetTrixelId);
            const targetZoom = getZoomForResolution(targetResolution);
            console.log(`[DemoGlobe] Jump: Target Res ${targetResolution}, Target Zoom ${targetZoom.toFixed(2)}`);

            const flyToOptions: maplibregl.FlyToOptions = {
              center: [centerLng, centerLat],
              zoom: targetZoom,
              speed: 1.2,
              curve: 1.4,
              essential: true
            };

            // --- Define moveend handler (now includes selection and flash) ---
            const handleMoveEnd = async () => { // Make handler async
              console.log(`[DemoGlobe] Fly-to animation completed for trixel ID: ${targetTrixelId}. Initial lastHtmResolutionRef: ${lastHtmResolutionRef.current}`);
              currentMap.off('moveend', handleMoveEnd); // Important: Remove listener

              // --- Determine the grid resolution to display --- 
              // Display the grid AT the target trixel's resolution
              const gridResolutionToShow = targetResolution; // Show grid AT the target resolution
              console.log(`[DemoGlobe handleMoveEnd] Target Trixel Res: ${targetResolution}. Grid Resolution to Show: ${gridResolutionToShow}.`);
              // ---------------------------------------------

              console.log(`[DemoGlobe handleMoveEnd] Forcing HTM update to gridRes: ${gridResolutionToShow} (while ensuring target ${targetTrixelId}).`);
              
              // Define promises for sourcedata and idle AFTER initiating the update
              const sourceDataLoadedPromise = new Promise<void>((resolve, reject) => {
                const listener = (e: maplibregl.MapSourceDataEvent) => {
                  if (e.sourceId === HTM_SOURCE_ID && e.isSourceLoaded === true && e.sourceDataType !== 'metadata' && e.dataType === 'source') {
                    console.log(`[DemoGlobe handleMoveEnd] 'sourcedata' event: Source ${HTM_SOURCE_ID} fully loaded for targetRes ${targetResolution}.`);
                    currentMap.off('sourcedata', listener);
                    resolve();
                  } else if (e.sourceId === HTM_SOURCE_ID && (e as any).error) {
                    console.error(`[DemoGlobe handleMoveEnd] 'sourcedata' event: Error loading source ${HTM_SOURCE_ID}.`, (e as any).error);
                    currentMap.off('sourcedata', listener);
                    reject((e as any).error);
                  } else if (e.sourceId === HTM_SOURCE_ID) {
                    // console.log(`[DemoGlobe handleMoveEnd] 'sourcedata' event for ${HTM_SOURCE_ID} (isSourceLoaded: ${e.isSourceLoaded}, type: ${e.sourceDataType}, dataType: ${e.dataType}) - waiting for full load.`);
                  }
                };
                currentMap.on('sourcedata', listener);
                setTimeout(() => { // Timeout for the promise
                    currentMap.off('sourcedata', listener);
                    reject(new Error(`Timeout waiting for sourcedata on ${HTM_SOURCE_ID} for res ${targetResolution}`));
                }, 5000); // 5 second timeout
              });

              const mapIdlePromise = new Promise<void>((resolve, reject) => {
                console.log(`[DemoGlobe handleMoveEnd] Setting up 'idle' listener.`);
                const idleListener = () => {
                    currentMap.off('idle', idleListener); // Ensure listener is removed
                    console.log(`[DemoGlobe handleMoveEnd] Map 'idle' after HTM update for targetRes ${targetResolution}.`);
                    resolve();
                };
                currentMap.on('idle', idleListener);
                 setTimeout(() => { // Timeout for the promise
                    currentMap.off('idle', idleListener);
                    console.warn(`[DemoGlobe handleMoveEnd] Timeout waiting for map 'idle' for res ${targetResolution}. Proceeding cautiously.`);
                    resolve(); // Resolve anyway to not block indefinitely, but log it.
                }, 5000); // 5 second timeout
              });

              // Initiate the update, using gridResolutionToShow but ensuring the target trixel is included
              applyHtmUpdateRef.current(currentMap, gridResolutionToShow, targetTrixelId); 
              // Note: lastHtmResolutionRef will be set to gridResolutionToShow inside applyHtmUpdate
              console.log(`[DemoGlobe handleMoveEnd] HTM update to grid ${gridResolutionToShow} (ensuring ${targetTrixelId}) initiated. lastHtmResolutionRef is now: ${lastHtmResolutionRef.current}.`);
              console.log(`[DemoGlobe handleMoveEnd] Waiting for source data to load and map to become idle for grid resolution ${gridResolutionToShow}...`);
              
              try {
                await Promise.all([sourceDataLoadedPromise, mapIdlePromise]);
                console.log(`[DemoGlobe handleMoveEnd] Source data loaded and map idle confirmed for grid resolution ${gridResolutionToShow}.`);
                
                if (!currentMap.isStyleLoaded()) {
                    console.warn(`[DemoGlobe handleMoveEnd] Map style not fully loaded even after source and idle. Waiting a bit more.`);
                    await delay(200); 
                }
              } catch (error) {
                console.error(`[DemoGlobe handleMoveEnd] Error waiting for source data or map idle for res ${targetResolution}:`, error);
                // Even if waiting fails, we might still try to select as a last resort.
              }
              
              console.log(`[DemoGlobe handleMoveEnd] Proceeding to selectTrixelOnMap for ${targetTrixelId}. Current lastHtmResolutionRef: ${lastHtmResolutionRef.current} (Grid Res was ${gridResolutionToShow})`);
              const selectionSuccess = await selectTrixelOnMap(targetTrixelId, targetTrixelFullData); // Pass full data
              // ---------------------------------------------

              // --- Add Flash effect only if selection succeeded ---
              if (selectionSuccess) {
                  const selectedInfo = clickedTrixelInfoRef.current; // Ref should be updated by selectTrixelOnMap
                  if (selectedInfo && selectedInfo.displayId === targetTrixelId.toString()) {
                      console.log(`[DemoGlobe] Jump: Selection successful for ${targetTrixelId}. Applying flash.`);
                      applyFlashEffect(selectedInfo.mapFeatureId);
                  } else {
                      // This case might happen if selectTrixelOnMap returned true but state update hasn't happened somehow?
                      console.warn(`[DemoGlobe] Jump: Flash skipped. Trixel ${targetTrixelId} selection state mismatch after successful select.`);
                  }
              } else {
                  console.warn(`[DemoGlobe] Jump: Selection failed for trixel ${targetTrixelId} after fly-to and retries. Flash skipped.`);
                  // Optional: Clear any previous selection if the target couldn't be selected
                  if (clickedTrixelInfoRef.current) {
                    if (currentMap.getSource(HTM_SOURCE_ID) && currentMap.isStyleLoaded()) {
                       currentMap.removeFeatureState({ source: HTM_SOURCE_ID, id: clickedTrixelInfoRef.current.mapFeatureId }, 'selected');
                    }
                    setClickedTrixelInfo(null);
                  }
              }
              // -----------------------------------------------

              // --- Reset jump flag ---
              isJumpingRef.current = false;
              // -----------------------

              if (onJumpComplete) {
                onJumpComplete(); // Call completion callback
              }
            };
            // ---------------------------------------------------------------

            currentMap.once('moveend', handleMoveEnd); // Attach the enhanced handler
            currentMap.flyTo(flyToOptions); // Start the animation

          } else {
            console.warn(`[DemoGlobe] Could not get boundary for jump target trixel ID: ${targetTrixelId}`);
            isJumpingRef.current = false; // Reset flag if boundary fails
            if (onJumpComplete) onJumpComplete();
          }
      } catch (error) {
          console.error(`[DemoGlobe] Error during jump initiation for trixel ID ${targetTrixelId}:`, error);
          isJumpingRef.current = false; // Reset flag on error
          if (onJumpComplete) onJumpComplete();
      }
  // Add selectTrixelOnMap, onJumpComplete, applyFlashEffect, setClickedTrixelInfo as dependencies
  }, [selectTrixelOnMap, onJumpComplete, applyFlashEffect, setClickedTrixelInfo]);
  // -----------------------------

  // --- Modified useEffect for jumpToTrixelId ---
  useEffect(() => {
      const runJumpLogic = async () => {
          if (jumpToTrixelData !== null && mapRef.current) {
              console.log(`[DemoGlobe] Received jump request for trixel ID: ${jumpToTrixelData.id}. Will call performJump directly.`);
              // Directly call performJump. 
              // performJump's moveend handler is responsible for setting the correct resolution grid before selection.
              await performJump(jumpToTrixelData); 
          }
      };
      runJumpLogic(); // Execute the async logic
  // performJump is a useCallback. Its dependencies are managed there.
  // applyHtmUpdateRef is a dependency of performJump, so it's indirectly covered.
  }, [jumpToTrixelData, performJump]);
  // --- END JUMP TO TRIXEL LOGIC ---

  // ... rest of useEffects and component return ...

  console.log("[DemoGlobe Minimal] Component rendering END");
  return (
    <div className="w-full h-full relative">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute top-2 left-2 bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 rounded-md shadow-lg border border-gray-300 dark:border-gray-700 flex flex-col space-y-2 z-10">
            <div className="flex items-center space-x-2">
                <Switch 
                    id="show-trixels-toggle"
                    checked={showTrixels}
                    onCheckedChange={setShowTrixels}
                />
                <Label htmlFor="show-trixels-toggle" className="text-sm text-gray-700 dark:text-gray-200">Show Trixels</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch 
                    id="show-trixel-ripple-context-toggle"
                    checked={showRippleTrixelContext}
                    onCheckedChange={setShowRippleTrixelContext}
                />
                <Label htmlFor="show-trixel-ripple-context-toggle" className="text-sm text-gray-700 dark:text-gray-200">Show Ripple Trixel Context</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch 
                    id="show-data-centers-toggle"
                    checked={showDataCenters}
                    onCheckedChange={setShowDataCenters}
                />
                <Label htmlFor="show-data-centers-toggle" className="text-sm text-gray-700 dark:text-gray-200">Display Data Centers</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch 
                    id="show-power-plants-toggle"
                    checked={showPowerPlants}
                    onCheckedChange={setShowPowerPlants}
                />
                <Label htmlFor="show-power-plants-toggle" className="text-sm text-gray-700 dark:text-gray-200">Display Power Plants</Label>
            </div>
        </div>

        {/* Use the TrixelInfoOverlay component */}
        <TrixelInfoOverlay 
            trixelInfo={detailedTrixelInfo} 
            worldAccount={worldAccount} 
            onClose={() => setDetailedTrixelInfo(null)} // Add a way to close the overlay
        />
    </div>
  );
}
