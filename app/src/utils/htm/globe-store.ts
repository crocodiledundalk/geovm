"use client"

import { create } from "zustand"

interface GlobeState {
  activityCount: number
  incrementActivity: () => void
  activeNode: { lat: number; lng: number } | null
  setActiveNode: (node: { lat: number; lng: number } | null) => void
  zoomLevel: number
  setZoomLevel: (level: number) => void
  activeTrixels: string[]
  addActiveTrixel: (id: string) => void
  clearActiveTrixels: () => void
}

export const useGlobeStore = create<GlobeState>((set) => ({
  activityCount: 0,
  incrementActivity: () => set((state) => ({ activityCount: state.activityCount + 1 })),
  activeNode: null,
  setActiveNode: (node) => set({ activeNode: node }),
  zoomLevel: 1,
  setZoomLevel: (level) => set({ zoomLevel: level }),
  activeTrixels: [],
  addActiveTrixel: (id) => set((state) => ({ activeTrixels: [...state.activeTrixels, id] })),
  clearActiveTrixels: () => set({ activeTrixels: [] }),
}))
