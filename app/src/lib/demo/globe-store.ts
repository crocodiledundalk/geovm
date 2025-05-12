"use client"

import { create } from "zustand"

interface GlobeState {
  totalClicksRegistered: number
  incrementClicksRegistered: () => void
  totalClicksConfirmed: number
  incrementClicksConfirmed: () => void
  activeNode: { lat: number; lng: number } | null
  setActiveNode: (node: { lat: number; lng: number } | null) => void
  zoomLevel: number
  setZoomLevel: (level: number) => void
  activeTrixels: string[]
  addActiveTrixel: (id: string) => void
  clearActiveTrixels: () => void
}

export const useGlobeStore = create<GlobeState>((set) => ({
  totalClicksRegistered: 0,
  incrementClicksRegistered: () => set((state) => ({ totalClicksRegistered: state.totalClicksRegistered + 1 })),
  totalClicksConfirmed: 0,
  incrementClicksConfirmed: () => set((state) => ({ totalClicksConfirmed: state.totalClicksConfirmed + 1 })),
  activeNode: null,
  setActiveNode: (node) => set({ activeNode: node }),
  zoomLevel: 1,
  setZoomLevel: (level) => set({ zoomLevel: level }),
  activeTrixels: [],
  addActiveTrixel: (id) => set((state) => {
    if (!state.activeTrixels.includes(id)) {
      return { activeTrixels: [...state.activeTrixels, id] };
    }
    return {};
  }),
  clearActiveTrixels: () => set({ activeTrixels: [] }),
}))
