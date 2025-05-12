// Example: @/lib/store.ts (or wherever useMapStore is defined)
import { create } from 'zustand';

interface MapState {
  resolution: number | undefined;
  setResolution: (res: number) => void;
  popupInfo: { trixel: number; coords: [number, number] | undefined } | null;
  setPopupInfo: (info: { trixel: number; coords: [number, number] | undefined } | null) => void;
  showTrixels: boolean;
  toggleTrixels: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  resolution: undefined,
  setResolution: (res) => set({ resolution: res }),
  popupInfo: null,
  setPopupInfo: (info) => set({ popupInfo: info }),
  showTrixels: true,
  toggleTrixels: () => set((state) => ({ showTrixels: !state.showTrixels })),
}));