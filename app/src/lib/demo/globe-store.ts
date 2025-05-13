import { create } from 'zustand';

interface GlobeState {
  clicksRegistered: number;
  clicksConfirmed: number;
  activeTrixels: string[];
  incrementClicksRegistered: () => void;
  incrementClicksConfirmed: () => void;
  addActiveTrixel: (trixelId: string) => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  clicksRegistered: 0,
  clicksConfirmed: 0,
  activeTrixels: [],
  incrementClicksRegistered: () => set((state) => ({ clicksRegistered: state.clicksRegistered + 1 })),
  incrementClicksConfirmed: () => set((state) => ({ clicksConfirmed: state.clicksConfirmed + 1 })),
  addActiveTrixel: (trixelId) => set((state) => ({ activeTrixels: [...state.activeTrixels, trixelId] })),
})); 