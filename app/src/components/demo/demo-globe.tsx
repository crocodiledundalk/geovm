'use client';
import {useEffect, useRef, useState, useCallback} from 'react';
import maplibregl, {Map as MaplibreMap, StyleSpecification} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Feature } from 'geojson';
import {trixelsToFC, getTriResolutionForZoom, getTrixelsForView, getTrixelBoundaryLngLat } from 'htm-trixel';
import { point as turfPoint, polygon as turfPolygon } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { useGeoVmProgram } from '@/contexts/ProgramContext';
import { useGlobeStore } from '@/lib/demo/globe-store';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

import {globeStyle} from '../map/map-style';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { startRippleAnimation } from '../map/ripple-effect';

const HTM_SOURCE_ID = 'htm-trixels-source';
const HTM_INTERACTIVE_FILL_LAYER_ID = 'htm-interactive-fill-layer';
const HTM_STROKE_LAYER_ID = 'htm-stroke-layer';
const HTM_HIGHLIGHT_FILL_LAYER_ID = 'htm-highlight-fill-layer';

// New constants for ripple context trixel
const RIPPLE_CONTEXT_TRIXEL_SOURCE_ID = 'ripple-context-trixel-source';
const RIPPLE_CONTEXT_TRIXEL_STROKE_LAYER_ID = 'ripple-context-trixel-stroke-layer';
const RIPPLE_CONTEXT_HIGHLIGHT_DURATION = 2000; // ms, same as ripple for now
const RIPPLE_CONTEXT_STROKE_COLOR = '#00FF00'; // Bright Green
const RIPPLE_CONTEXT_STROKE_WIDTH = 2;
const RIPPLE_CONTEXT_STROKE_DASHARRAY: [number, number] = [2, 2];

// Style constants for trixel feedback
const FLASH_COLOR = 'white';
const FLASH_WIDTH = 3;
const SELECTED_FILL_COLOR = '#FF8C00'; // DarkOrange
const SELECTED_FILL_OPACITY = 0.5;
const SELECTED_STROKE_COLOR = '#FF8C00'; // DarkOrange, same as fill for consistency
const SELECTED_STROKE_WIDTH = 2;
const DEFAULT_STROKE_COLOR = '#088';
const DEFAULT_STROKE_WIDTH = 1;
const FLASH_DURATION = 500; // ms

const getTrixelIdForPoint = (map: MaplibreMap | null, clickLng: number, clickLat: number): number | null => {
  if (!map || !map.isStyleLoaded()) return null;

  const features = map.querySourceFeatures(HTM_SOURCE_ID);

  if (!features || features.length === 0) {
    console.warn('[DemoGlobe] getTrixelIdForPoint: No features in HTM_SOURCE_ID or source not found.');
    return null;
  }

  const clickPoint = turfPoint([clickLng, clickLat]);

  for (const feature of features) {
    let trixelIdNum: number | undefined = undefined;
    if (feature.id !== undefined) {
        if(typeof feature.id === 'number'){
            trixelIdNum = feature.id;
        } else if (typeof feature.id === 'string') {
            const parsed = parseInt(feature.id, 10);
            if(!isNaN(parsed)) trixelIdNum = parsed;
        }
    }
    if (trixelIdNum === undefined && feature.properties && feature.properties.id !== undefined) {
        const propId = feature.properties.id;
        if(typeof propId === 'number'){
            trixelIdNum = propId;
        } else if (typeof propId === 'string') {
            const parsed = parseInt(propId, 10);
            if(!isNaN(parsed)) trixelIdNum = parsed;
        }
    }

    if (trixelIdNum === undefined) {
      console.warn('[DemoGlobe] getTrixelIdForPoint: Feature missing a usable numeric ID.', JSON.stringify(feature));
      continue;
    }

    try {
      const boundaryCoords = getTrixelBoundaryLngLat(trixelIdNum); 
      if (boundaryCoords && boundaryCoords.length > 2) { 
        const closedBoundaryCoords = [...boundaryCoords];
        if (closedBoundaryCoords.length > 0 && (closedBoundaryCoords[0][0] !== closedBoundaryCoords[closedBoundaryCoords.length - 1][0] || 
            closedBoundaryCoords[0][1] !== closedBoundaryCoords[closedBoundaryCoords.length - 1][1])) {
          closedBoundaryCoords.push([...closedBoundaryCoords[0]]); 
        }
        const trixelGeoJsonPolygon = turfPolygon([closedBoundaryCoords]);
        if (booleanPointInPolygon(clickPoint, trixelGeoJsonPolygon)) {
          // console.log(`[DemoGlobe] getTrixelIdForPoint: Click in trixel ID ${trixelIdNum}`);
          return trixelIdNum;
        }
      }
    } catch (err) {
      console.error(`[DemoGlobe] getTrixelIdForPoint: Error processing trixel ID ${trixelIdNum}:`, err);
    }
  }
  // console.log('[DemoGlobe] getTrixelIdForPoint: Click did not fall into any trixel in the current source.');
  return null;
};

interface ClickedTrixelInfo {
  displayId: string;
  mapFeatureId: string | number; // The ID used by MapLibre feature state (after promoteId)
}

export default function DemoGlobe() {
  // console.log("[DemoGlobe Minimal] Component rendering START");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const lastHtmResolutionRef = useRef<number | null>(null);
  const flashingTrixelRef = useRef<{ id: string | number | null, timeoutId: NodeJS.Timeout | null }>({ id: null, timeoutId: null });
  const rippleContextTrixelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { program, provider } = useGeoVmProgram();
  const programRef = useRef(program);
  const providerRef = useRef(provider);

  // Zustand store actions
  const incrementClicksRegistered = useGlobeStore((state) => state.incrementClicksRegistered);
  const incrementClicksConfirmed = useGlobeStore((state) => state.incrementClicksConfirmed);
  const addActiveTrixel = useGlobeStore((state) => state.addActiveTrixel);

  const [showTrixels, setShowTrixels] = useState(true);
  const [showRippleTrixelContext, setShowRippleTrixelContext] = useState(true);
  const [clickedTrixelInfo, setClickedTrixelInfo] = useState<ClickedTrixelInfo | null>(null);

  // Refs for event handlers to access current state/functions
  const showTrixelsRef = useRef(showTrixels);
  useEffect(() => { showTrixelsRef.current = showTrixels; }, [showTrixels]);

  const clickedTrixelInfoRef = useRef(clickedTrixelInfo);
  useEffect(() => { clickedTrixelInfoRef.current = clickedTrixelInfo; }, [clickedTrixelInfo]);

  const showRippleTrixelContextRef = useRef(showRippleTrixelContext);
  useEffect(() => { showRippleTrixelContextRef.current = showRippleTrixelContext; }, [showRippleTrixelContext]);

  // useEffects to keep program and provider refs updated
  useEffect(() => { programRef.current = program; }, [program]);
  useEffect(() => { providerRef.current = provider; }, [provider]);

  const updateHtmVisualization = useCallback((currentMap: MaplibreMap, newResolution: number) => {
    // console.log(`[DemoGlobe Minimal] Updating HTM Visualization to Res: ${newResolution}`);
    const trixelIds = getTrixelsForView(null, newResolution);
    if (trixelIds.length === 0) {
      // console.warn(`[DemoGlobe Minimal] No trixel IDs returned for HTM Res ${newResolution}.`);
      const source = currentMap.getSource(HTM_SOURCE_ID) as maplibregl.GeoJSONSource;
      if (source) {
          source.setData({ type: 'FeatureCollection', features: [] });
      }
      // Use clickedTrixelInfoRef.current here if needed, or ensure deps cover its usage
      // For now, original logic used clickedTrixelInfo from state, which will be in this useCallback's closure
      // If setClickedTrixelInfo is called, this will re-run if clickedTrixelInfo is a dep.
      const currentClickedTrixelInfo = clickedTrixelInfoRef.current; // Use ref for current value
      if (currentClickedTrixelInfo) {
        if (mapRef.current?.getSource(HTM_SOURCE_ID) && mapRef.current.isStyleLoaded()) {
            mapRef.current.removeFeatureState({ source: HTM_SOURCE_ID, id: currentClickedTrixelInfo.mapFeatureId }, 'selected');
            mapRef.current.removeFeatureState({ source: HTM_SOURCE_ID, id: currentClickedTrixelInfo.mapFeatureId }, 'flash');
        }
        setClickedTrixelInfo(null); // This will cause updateHtmVisualization to get a new identity if clickedTrixelInfo was a dep
      }
      return;
    }
    const featureCollection = trixelsToFC(trixelIds);
    // if (featureCollection.features.length > 0) {
    //   console.log("[DemoGlobe Minimal] Sample feature from trixelsToFC:", JSON.parse(JSON.stringify(featureCollection.features[0])));
    // }
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
        // Use showTrixelsRef.current for layout property
        layout: { 'visibility': showTrixelsRef.current ? 'visible' : 'none' }
      });
      currentMap.addLayer({
        id: HTM_HIGHLIGHT_FILL_LAYER_ID, type: 'fill', source: HTM_SOURCE_ID,
        paint: {
          'fill-color': SELECTED_FILL_COLOR,
          'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], SELECTED_FILL_OPACITY, 0]
        },
        layout: { 'visibility': showTrixelsRef.current ? 'visible' : 'none' }
      });
      currentMap.addLayer({
        id: HTM_STROKE_LAYER_ID, type: 'line', source: HTM_SOURCE_ID,
        layout: { 'visibility': showTrixelsRef.current ? 'visible' : 'none' },
        paint: {
            'line-color': ['case', ['boolean', ['feature-state', 'flash'], false], FLASH_COLOR, ['boolean', ['feature-state', 'selected'], false], SELECTED_STROKE_COLOR, DEFAULT_STROKE_COLOR],
            'line-width': ['case', ['boolean', ['feature-state', 'flash'], false], FLASH_WIDTH, ['boolean', ['feature-state', 'selected'], false], SELECTED_STROKE_WIDTH, DEFAULT_STROKE_WIDTH]
        },
      });
    }
    // console.log(`[DemoGlobe Minimal] Displayed ${featureCollection.features.length} trixels for HTM Res ${newResolution}.`);
  }, [setClickedTrixelInfo]);

  const applyHtmUpdate = useCallback((currentMap: MaplibreMap, newRes: number) => {
    // console.log(`[DemoGlobe Minimal] Applying HTM update. NewRes: ${newRes}, PrevRes: ${lastHtmResolutionRef.current}`);
    updateHtmVisualization(currentMap, newRes);
    lastHtmResolutionRef.current = newRes;
  }, [updateHtmVisualization]);

  // Ref for applyHtmUpdate for event handlers
  const applyHtmUpdateRef = useRef(applyHtmUpdate);
  useEffect(() => { applyHtmUpdateRef.current = applyHtmUpdate; }, [applyHtmUpdate]);

  useEffect(() => {
    // console.log("[DemoGlobe Minimal] Main useEffect running START (map setup)");
    if (mapRef.current || !mapContainerRef.current) {
      // console.log("[DemoGlobe Minimal] Main useEffect exiting early (map exists or container missing)");
      return;
    }
    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: globeStyle as StyleSpecification,
      center: [0, 0],
      zoom: 0.9,
      minZoom: 0,
      maxZoom: 6,
    });
    mapRef.current = map;
    // console.log("[DemoGlobe Minimal] Map object created");

    map.on('load', () => {
      // console.log("[DemoGlobe Minimal] map.on('load') event fired");
      if (mapRef.current) {
        const initialRawZoom = mapRef.current.getZoom();
        const initialLat = mapRef.current.getCenter().lat;
        const initialLatRad = initialLat * Math.PI / 180;
        const clampedInitialLatRad = Math.min(Math.max(initialLatRad, -89.99 * Math.PI / 180), 89.99 * Math.PI / 180);
        const normalizedInitialZoom = initialRawZoom + Math.log2(1 / Math.cos(clampedInitialLatRad));
        const initialHtmResolution = getTriResolutionForZoom(normalizedInitialZoom);
        // console.log(`[DemoGlobe Minimal] Initial load. RawZoom: ${initialRawZoom.toFixed(2)}, Lat: ${initialLat.toFixed(2)}, NormZoom: ${normalizedInitialZoom.toFixed(2)}, Target HTM Res: ${initialHtmResolution}.`);
        applyHtmUpdateRef.current(mapRef.current, initialHtmResolution);
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
        const clickedFeature = e.features[0];
        const displayId = clickedFeature.properties?.id as string;
        const mapFeatureVal = clickedFeature.id;
        if (!displayId || mapFeatureVal === undefined) {
          console.error("[DemoGlobe Minimal] Clicked feature is missing ID property or mapFeatureVal is undefined.", clickedFeature);
          return;
        }

        const mapInstance = mapRef.current;

        // Determine the actual trixel ID from the click point for higher accuracy
        const clickedTrixelId = getTrixelIdForPoint(mapInstance, e.lngLat.lng, e.lngLat.lat);

        if (clickedTrixelId === null) {
            // console.warn(\`[DemoGlobe Minimal] Click at (\${e.lngLat.lng.toFixed(5)}, \${e.lngLat.lat.toFixed(5)}) did not resolve to a trixel ID using getTrixelIdForPoint. Using feature ID \${displayId} as fallback if needed, but likely indicates an issue.\`);
            // Optionally, you could fall back to displayId or mapFeatureVal here,
            // but it\'s better to understand why getTrixelIdForPoint failed.
            // For now, we\'ll proceed if displayId is available, but flag it.
            if(!displayId) return; // If no fallback, exit.
        }
        
        const trixelToInteractWith = clickedTrixelId !== null ? clickedTrixelId.toString() : displayId;

        // Increment registered clicks immediately
        incrementClicksRegistered();

        // -------- Solana Interaction Placeholder START --------
        const currentProgram = programRef.current;
        const currentProvider = providerRef.current;

        if (currentProgram && currentProvider && currentProvider.wallet && currentProvider.wallet.publicKey) {
          // console.log('[DemoGlobe] Solana interaction triggered for trixel:', trixelToInteractWith);
          // console.log('[DemoGlobe] Program ID:', currentProgram.programId.toBase58());
          // console.log('[DemoGlobe] Wallet Public Key:', currentProvider.wallet.publicKey.toBase58());

          // TODO: Replace with actual World PublicKey from user input or config
          const WORLD_PUBKEY = new PublicKey("SVoLi1unEnFq1iGj3Gf2e1nC5WJH5wVNcZWQSM2P3bY"); // Placeholder Devnet World

          (async () => {
            try {
              const trixelIdNumber = parseInt(trixelToInteractWith, 10);
              if (isNaN(trixelIdNumber)) {
                console.error("[DemoGlobe] Invalid trixel ID for transaction:", trixelToInteractWith);
                return;
              }

              // Placeholder: This simulates an updateTrixel call for a 'COUNT' type world.
              // This will need to be adapted based on the actual program methods and world data type.
              // For a 'COUNT' type, the 'value' could be a new count or an increment.
              // For this example, let's assume the program has an 'updateTrixel' method
              // that takes the trixel_id and a value (e.g., new count = 1 for simplicity).
              // The accounts will depend on your program's instruction.

              console.log(`[DemoGlobe] Attempting transaction for trixel ID: ${trixelIdNumber} in world ${WORLD_PUBKEY.toBase58()}`);
              
              // Example: program.methods.updateTrixel(new anchor.BN(trixelIdNumber), new anchor.BN(1) /* value */)
              //   .accounts({
              //     world: WORLD_PUBKEY,
              //     trixel: /* PDA for the trixel */,
              //     authority: currentProvider.wallet.publicKey,
              //     payer: currentProvider.wallet.publicKey,
              //     systemProgram: SystemProgram.programId,
              //   })
              //   .rpc();
              
              // SIMULATE TRANSACTION DELAY AND SUCCESS FOR NOW
              await new Promise(resolve => setTimeout(resolve, 1500));
              const mockTxSignature = `mock_tx_sig_${Date.now()}`;
              console.log("[DemoGlobe] Mock Solana transaction successful:", mockTxSignature);
              // END SIMULATION

              incrementClicksConfirmed();
              addActiveTrixel(trixelToInteractWith);

            } catch (error) {
              console.error("[DemoGlobe] Solana transaction error:", error);
              // Potentially decrement registered clicks or set an error state here
            }
          })();
        } else {
          console.warn('[DemoGlobe] Solana program or provider not available for interaction.');
        }
        // -------- Solana Interaction Placeholder END --------

        if (flashingTrixelRef.current.timeoutId) clearTimeout(flashingTrixelRef.current.timeoutId);
        if (flashingTrixelRef.current.id !== null && mapRef.current.getSource(HTM_SOURCE_ID) && mapRef.current.isStyleLoaded()) {
          mapRef.current.setFeatureState({ source: HTM_SOURCE_ID, id: flashingTrixelRef.current.id }, { flash: false });
        }
        const currentClickedTrixelInfo = clickedTrixelInfoRef.current;
        if (currentClickedTrixelInfo && currentClickedTrixelInfo.mapFeatureId !== mapFeatureVal) {
          if (mapRef.current.getSource(HTM_SOURCE_ID) && mapRef.current.isStyleLoaded()){
            mapRef.current.setFeatureState({ source: HTM_SOURCE_ID, id: currentClickedTrixelInfo.mapFeatureId }, { selected: false });
          }
        }
        if (mapRef.current.getSource(HTM_SOURCE_ID) && mapRef.current.isStyleLoaded()) {
            mapRef.current.setFeatureState({ source: HTM_SOURCE_ID, id: mapFeatureVal }, { selected: true, flash: true });
        }
        setClickedTrixelInfo({ displayId: displayId, mapFeatureId: mapFeatureVal });
        flashingTrixelRef.current = {
          id: mapFeatureVal,
          timeoutId: setTimeout(() => {
            if (mapRef.current && mapRef.current.getSource(HTM_SOURCE_ID) && mapRef.current.isStyleLoaded()) {
              mapRef.current.setFeatureState({ source: HTM_SOURCE_ID, id: mapFeatureVal }, { flash: false });
            }
            flashingTrixelRef.current = { id: null, timeoutId: null };
          }, FLASH_DURATION)
        };
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

        if (showRippleTrixelContextRef.current && mapRef.current) {
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
                // console.warn("[DemoGlobe Minimal] Ripple context source not found after check.");
            }
          }
        }

        // Existing logic for clearing trixel selection
        const currentClickedTrixelInfoForClear = clickedTrixelInfoRef.current;
        if (!e.defaultPrevented && currentClickedTrixelInfoForClear) {
            // console.log("[DemoGlobe Minimal] General map click, clearing selection.");
            if (mapRef.current.getSource(HTM_SOURCE_ID) && mapRef.current.isStyleLoaded()){
                mapRef.current.setFeatureState(
                    { source: HTM_SOURCE_ID, id: currentClickedTrixelInfoForClear.mapFeatureId },
                    { selected: false, flash: false } 
                );
            }
            if (flashingTrixelRef.current.id === currentClickedTrixelInfoForClear.mapFeatureId && flashingTrixelRef.current.timeoutId) {
                clearTimeout(flashingTrixelRef.current.timeoutId);
                flashingTrixelRef.current = { id: null, timeoutId: null };
            }
            setClickedTrixelInfo(null);
        }
      });

      map.on('zoomend', (e: maplibregl.MapLibreZoomEvent) => {
        if (!mapRef.current) return;

        let userInitiatedZoomIntent = false;
        const eventSourceInfo = [];

        if (!e.originalEvent) {
          userInitiatedZoomIntent = true; 
          eventSourceInfo.push('Programmatic/Internal');
        } else if (e.originalEvent instanceof WheelEvent) {
          userInitiatedZoomIntent = true; 
          eventSourceInfo.push('WheelEvent');
        } else if (typeof TouchEvent !== 'undefined' && e.originalEvent instanceof TouchEvent) {
          userInitiatedZoomIntent = true; 
          eventSourceInfo.push('TouchEvent');
        } else if (e.originalEvent instanceof MouseEvent) {
          const target = e.originalEvent.target as HTMLElement;
          const mapContainer = mapRef.current.getContainer();
          const zoomInButton = mapContainer.querySelector('.maplibregl-ctrl-zoom-in');
          const zoomOutButton = mapContainer.querySelector('.maplibregl-ctrl-zoom-out');
          if ((zoomInButton && zoomInButton.contains(target)) || (zoomOutButton && zoomOutButton.contains(target))) {
            userInitiatedZoomIntent = true; 
            eventSourceInfo.push('ZoomButtonMouseEvent');
          } else {
            eventSourceInfo.push('OtherMouseEvent(e.g.drag)');
          }
        } else {
          // Check if originalEvent exists and has a type property before accessing it
          if (e.originalEvent && typeof (e.originalEvent as Event).type === 'string') {
            eventSourceInfo.push(`UnknownOriginalEvent:${(e.originalEvent as Event).type}`);
          } else {
            eventSourceInfo.push('UnknownOriginalEvent:type N/A');
          }
        }

        const currentRawZoom = mapRef.current.getZoom();
        const currentLat = mapRef.current.getCenter().lat;
        const currentLatRad = currentLat * Math.PI / 180;
        // Clamp currentLatRad to avoid Math.cos(PI/2) = 0 issues
        const clampedCurrentLatRad = Math.min(Math.max(currentLatRad, -89.99 * Math.PI / 180), 89.99 * Math.PI / 180);
        const normalizedCurrentZoom = currentRawZoom + Math.log2(1 / Math.cos(clampedCurrentLatRad));

        const potentialNewHtmResolution = getTriResolutionForZoom(normalizedCurrentZoom);

        // console.log(\`[DemoGlobe Minimal] map.on('zoomend') fired. Source(s): [\${eventSourceInfo.join(', ')}]. UserIntent: \${userInitiatedZoomIntent}. RawZoom: \${currentRawZoom.toFixed(2)}, Lat: \${currentLat.toFixed(2)}, NormZoom: \${normalizedCurrentZoom.toFixed(2)}, PotentialNewHTMRes: \${potentialNewHtmResolution}, LastAppliedHTMRes: \${lastHtmResolutionRef.current}\`);

        if (userInitiatedZoomIntent) {
          if (e.originalEvent instanceof WheelEvent) {
            const isZoomIn = e.originalEvent.deltaY < 0;
            if (isZoomIn) {
              // Zooming In with Wheel
              if (lastHtmResolutionRef.current !== null && potentialNewHtmResolution > lastHtmResolutionRef.current) {
                // console.log(\`[DemoGlobe Minimal] Wheel zoom IN: New HTM Res (\${potentialNewHtmResolution}) is higher than current (\${lastHtmResolutionRef.current}). Updating.\`);
                applyHtmUpdateRef.current(mapRef.current, potentialNewHtmResolution);
              } else if (lastHtmResolutionRef.current === null && potentialNewHtmResolution !== lastHtmResolutionRef.current) {
                // Initial case or if lastHtmResolutionRef was somehow reset to null and resolution changed
                // console.log(\`[DemoGlobe Minimal] Wheel zoom IN (initial/null): New HTM Res (\${potentialNewHtmResolution}). Updating.\`);
                applyHtmUpdateRef.current(mapRef.current, potentialNewHtmResolution);
              } else {
                // console.log(\`[DemoGlobe Minimal] Wheel zoom IN: Potential HTM Res (\${potentialNewHtmResolution}) is not higher than current (\${lastHtmResolutionRef.current}). Maintaining current resolution.\`);
              }
            } else {
              // Zooming Out with Wheel
              if (potentialNewHtmResolution !== lastHtmResolutionRef.current) {
                // console.log(\`[DemoGlobe Minimal] Wheel zoom OUT: HTM Res changed to \${potentialNewHtmResolution}. Updating.\`);
                applyHtmUpdateRef.current(mapRef.current, potentialNewHtmResolution);
              } else {
                // console.log(\`[DemoGlobe Minimal] Wheel zoom OUT: HTM Res (\${potentialNewHtmResolution}) is unchanged. No visual update needed.\`);
              }
            }
          } else {
            // Other user-initiated zoom (buttons, programmatic)
            if (potentialNewHtmResolution !== lastHtmResolutionRef.current) {
              // console.log(\`[DemoGlobe Minimal] Non-wheel user zoom: HTM Res changed to \${potentialNewHtmResolution}. Updating.\`);
              applyHtmUpdateRef.current(mapRef.current, potentialNewHtmResolution);
            } else {
              // console.log(\`[DemoGlobe Minimal] Non-wheel user zoom: HTM Res (\${potentialNewHtmResolution}) is unchanged. No visual update needed.\`);
            }
          }
        } else {
          // console.log(\`[DemoGlobe Minimal] Non-user-initiated zoom event or pan-induced zoom adjustment. HTM resolution (\${lastHtmResolutionRef.current}) maintained.\`);
        }
      });
    });

    return () => {
      // console.log("[DemoGlobe Minimal] Main useEffect cleanup running");
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
    };
  }, [applyHtmUpdateRef, programRef, providerRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      if (map.getLayer(HTM_STROKE_LAYER_ID)) map.setLayoutProperty(HTM_STROKE_LAYER_ID, 'visibility', showTrixelsRef.current ? 'visible' : 'none');
      if (map.getLayer(HTM_HIGHLIGHT_FILL_LAYER_ID)) map.setLayoutProperty(HTM_HIGHLIGHT_FILL_LAYER_ID, 'visibility', showTrixelsRef.current ? 'visible' : 'none');
      if (map.getLayer(HTM_INTERACTIVE_FILL_LAYER_ID)) map.setLayoutProperty(HTM_INTERACTIVE_FILL_LAYER_ID, 'visibility', showTrixelsRef.current ? 'visible' : 'none');
      
      const currentShowTrixels = showTrixelsRef.current;
      const currentClickedTrixelInfo = clickedTrixelInfoRef.current;

      if (!currentShowTrixels && currentClickedTrixelInfo) {
        if (map.getSource(HTM_SOURCE_ID)){
            map.setFeatureState({ source: HTM_SOURCE_ID, id: currentClickedTrixelInfo.mapFeatureId }, { selected: false, flash: false });
        }
        if (flashingTrixelRef.current.id === currentClickedTrixelInfo.mapFeatureId && flashingTrixelRef.current.timeoutId) {
            clearTimeout(flashingTrixelRef.current.timeoutId);
            flashingTrixelRef.current = { id: null, timeoutId: null };
        }
        setClickedTrixelInfo(null);
      }
    }
  }, [showTrixels, clickedTrixelInfo, setClickedTrixelInfo, program, provider]);

  // console.log("[DemoGlobe Minimal] Component rendering END");
  return (
    <div className="w-full h-full relative">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute top-2 left-2 bg-white/80 p-2 rounded shadow-md flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
                <Switch 
                    id="show-trixels-toggle"
                    checked={showTrixels}
                    onCheckedChange={setShowTrixels}
                />
                <Label htmlFor="show-trixels-toggle">Show Trixels</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch 
                    id="show-trixel-ripple-context-toggle"
                    checked={showRippleTrixelContext}
                    onCheckedChange={setShowRippleTrixelContext}
                />
                <Label htmlFor="show-trixel-ripple-context-toggle">Show Ripple Trixel Context</Label>
            </div>
            {clickedTrixelInfo && (
                <p className="text-sm">Clicked Trixel: <span className="font-bold">{clickedTrixelInfo.displayId}</span></p>
            )}
        </div>
    </div>
  );
}
