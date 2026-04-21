import { create } from 'zustand'
import { useWSStore } from './ws'

interface LocationState {
  watching: boolean
  watchId: number | null
  currentLat: number | null
  currentLng: number | null
  jobId: string | null
  permissionDenied: boolean
  httpsRequired: boolean
  startWatching: (jobId: string) => void
  stopWatching: () => void
  requestPermission: () => Promise<boolean>
  upgradeJobId: (jobId: string) => void
}

const THROTTLE_MS = 3500
let lastSent = 0

function isSecureContext() {
  return (
    window.isSecureContext ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
  )
}

export const useLocationStore = create<LocationState>((set, get) => ({
  watching: false,
  watchId: null,
  currentLat: null,
  currentLng: null,
  jobId: null,
  permissionDenied: false,
  httpsRequired: !isSecureContext(),

  requestPermission: async () => {
    if (!isSecureContext()) {
      set({ httpsRequired: true })
      return false
    }
    if (!navigator.geolocation) {
      set({ permissionDenied: true })
      return false
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      )
      set({
        permissionDenied: false,
        httpsRequired: false,
        currentLat: pos.coords.latitude,
        currentLng: pos.coords.longitude,
      })
      return true
    } catch (err: unknown) {
      const e = err as GeolocationPositionError
      set({ permissionDenied: e.code === GeolocationPositionError.PERMISSION_DENIED })
      return false
    }
  },

  // Swap job_id without restarting the watch — used when rider accepts a job
  upgradeJobId: (jobId: string) => {
    set({ jobId })
  },

  startWatching: (jobId) => {
    get().stopWatching()
    if (!isSecureContext() || !navigator.geolocation) return

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        set({ currentLat: lat, currentLng: lng, permissionDenied: false })

        const now = Date.now()
        if (now - lastSent >= THROTTLE_MS) {
          lastSent = now
          const currentJobId = useLocationStore.getState().jobId
          // Only send LOCATION_UPDATE when on a real job (not idle)
          if (currentJobId && currentJobId !== 'idle') {
            useWSStore.getState().send('LOCATION_UPDATE', {
              lat,
              lng,
              job_id: currentJobId,
            })
          }
        }
      },
      (err) => {
        set({ permissionDenied: err.code === GeolocationPositionError.PERMISSION_DENIED })
      },
      { enableHighAccuracy: true, maximumAge: 2000 }
    )

    set({ watching: true, watchId: id, jobId })
  },

  stopWatching: () => {
    const { watchId } = get()
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
    }
    set({ watching: false, watchId: null, jobId: null })
  },
}))
