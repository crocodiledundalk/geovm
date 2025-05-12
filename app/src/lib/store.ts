import { create } from 'zustand';

// Define the map store state
interface MapState {
  resolution: number;
  setResolution: (res: number) => void;
  popupInfo: { trixel: string, coords: number[][] } | null;
  setPopupInfo: (info: { trixel: string, coords: number[][] } | null) => void;
}

// Create the store
export const useMapStore = create<MapState>((set) => ({
  resolution: 0,
  setResolution: (res: number) => set({ resolution: res }),
  popupInfo: null,
  setPopupInfo: (info: { trixel: string, coords: number[][] } | null) => set({ popupInfo: info }),
})); 