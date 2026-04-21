import { create } from 'zustand'

interface UIState {
  drawerOpen: boolean
  cameraFollow: boolean
  toggleDrawer: () => void
  setCameraFollow: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  drawerOpen: false,
  cameraFollow: true,
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  setCameraFollow: (v) => set({ cameraFollow: v }),
}))
