import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import mapboxgl from 'mapbox-gl'
import { useWSStore } from '../stores/ws'
import { useLocationStore } from '../stores/location'
import { useToast } from './Toast'
import { MAPBOX_TOKEN, MAP_STYLE } from '../lib/mapStyle'
import PlacesAutocomplete from './PlacesAutocomplete'

interface JobSheetProps {
  open: boolean
  onClose: () => void
}

export default function JobSheet({ open, onClose }: JobSheetProps) {
  const send = useWSStore((s) => s.send)
  const { currentLat, currentLng } = useLocationStore()
  const toast = useToast()
  const sheetRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupLat, setPickupLat] = useState('')
  const [pickupLng, setPickupLng] = useState('')
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [dropoffLat, setDropoffLat] = useState('')
  const [dropoffLng, setDropoffLng] = useState('')
  const [description, setDescription] = useState('')
  const [locLoading, setLocLoading] = useState(false)

  // Touch drag state
  const dragStartY = useRef(0)
  const currentDragY = useRef(0)
  const isDragging = useRef(false)

  // Init dropoff mini-map
  useEffect(() => {
    if (!open) {
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
      return
    }

    const t = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current || !MAPBOX_TOKEN) return
      mapboxgl.accessToken = MAPBOX_TOKEN

      const center: [number, number] = currentLat && currentLng
        ? [currentLng, currentLat]
        : [3.3792, 6.5244]

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center,
        zoom: 14,
        attributionControl: false,
        interactive: true,
      })

      const el = document.createElement('div')
      el.style.cssText = `
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        background:#6366f1;border:3px solid #fff;
        transform:rotate(-45deg);cursor:grab;
        box-shadow:0 4px 12px rgba(99,102,241,0.5);
      `

      const marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat(center)
        .addTo(map)

      markerRef.current = marker

      const reverseGeocode = (lat: number, lng: number, setAddress: (addr: string) => void) => {
        const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        if (typeof window.google === 'undefined' || !window.google.maps) {
          setAddress(fallback)
          return
        }
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results?.[0]) {
            setAddress(results[0].formatted_address)
          } else {
            setAddress(fallback)
          }
        })
      }

      const updateDropoff = (lngLat: mapboxgl.LngLat) => {
        setDropoffLat(lngLat.lat.toFixed(6))
        setDropoffLng(lngLat.lng.toFixed(6))
        reverseGeocode(lngLat.lat, lngLat.lng, setDropoffAddress)
      }

      updateDropoff(marker.getLngLat())
      marker.on('dragend', () => updateDropoff(marker.getLngLat()))
      map.on('click', (e) => {
        marker.setLngLat(e.lngLat)
        updateDropoff(e.lngLat)
      })

      mapRef.current = map
    }, 350)

    return () => clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // When dropoff address autocomplete fires, pan map marker to the new location
  const handleDropoffChange = (address: string, lat: number, lng: number) => {
    setDropoffAddress(address)
    setDropoffLat(lat.toFixed(6))
    setDropoffLng(lng.toFixed(6))
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLngLat([lng, lat])
      mapRef.current.easeTo({ center: [lng, lat], zoom: 15, duration: 600 })
    }
  }

  const useMyLocation = () => {
    const handleLocation = (lat: number, lng: number) => {
      setPickupLat(lat.toFixed(6))
      setPickupLng(lng.toFixed(6))
      
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      if (typeof window.google === 'undefined' || !window.google.maps) {
        setPickupAddress(fallback)
        return
      }
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === 'OK' && results?.[0]) {
          setPickupAddress(results[0].formatted_address)
        } else {
          setPickupAddress(fallback)
        }
      })
    }

    if (currentLat && currentLng) {
      handleLocation(currentLat, currentLng)
      return
    }
    if (!navigator.geolocation) { toast.show('Geolocation not supported', 'error'); return }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleLocation(pos.coords.latitude, pos.coords.longitude)
        setLocLoading(false)
      },
      () => { toast.show('Could not get location', 'error'); setLocLoading(false) },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const reset = () => {
    setPickupAddress(''); setPickupLat(''); setPickupLng('')
    setDropoffAddress(''); setDropoffLat(''); setDropoffLng('')
    setDescription('')
  }

  const handleSubmit = () => {
    const pLat = parseFloat(pickupLat)
    const pLng = parseFloat(pickupLng)
    const dLat = parseFloat(dropoffLat)
    const dLng = parseFloat(dropoffLng)

    if (!pickupAddress || !dropoffAddress) {
      toast.show('Set pickup and dropoff locations', 'error')
      return
    }
    if (isNaN(pLat) || isNaN(pLng) || isNaN(dLat) || isNaN(dLng)) {
      toast.show('Enter valid coordinates', 'error')
      return
    }

    send('CREATE_JOB', {
      pickup_address: pickupAddress,
      pickup_lat: pLat,
      pickup_lng: pLng,
      dropoff_address: dropoffAddress,
      dropoff_lat: dLat,
      dropoff_lng: dLng,
      package_description: description || undefined,
    })

    reset()
    onClose()
    toast.show('Job created — broadcasting to riders', 'success')
  }

  // Handle drag
  const onHandleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    currentDragY.current = 0
    isDragging.current = true
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }
  const onHandleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta < 0) return
    currentDragY.current = delta
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`
  }
  const onHandleTouchEnd = () => {
    isDragging.current = false
    if (sheetRef.current) sheetRef.current.style.transition = ''
    if (currentDragY.current > 100) { onClose() }
    else { if (sheetRef.current) sheetRef.current.style.transform = '' }
    currentDragY.current = 0
  }

  const inputCls = 'w-full px-4 py-3 glass-light rounded-xl text-sm text-text-primary placeholder:text-text-secondary/40 outline-none'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30"
            onClick={onClose}
          />

          {/* Floating CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.15 }}
            className="fixed bottom-[82vh] left-4 right-4 z-50"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              className="w-full py-4 bg-accent-primary rounded-2xl text-white font-bold text-base glow-primary"
              style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.5)' }}
            >
              Create Delivery →
            </motion.button>
          </motion.div>

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 glass rounded-t-3xl z-40 flex flex-col"
            style={{ height: '82vh' }}
          >
            {/* Handle */}
            <div
              className="flex-shrink-0 pt-4 pb-2 flex justify-center cursor-grab active:cursor-grabbing select-none"
              onTouchStart={onHandleTouchStart}
              onTouchMove={onHandleTouchMove}
              onTouchEnd={onHandleTouchEnd}
            >
              <div className="w-10 h-1 bg-white/25 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex-shrink-0 px-6 pb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">New Delivery</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full glass-light flex items-center justify-center text-text-secondary text-sm"
              >✕</button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">

              {/* ── Pickup ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-secondary/70 uppercase tracking-wide">
                    📍 Pickup
                  </label>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={useMyLocation}
                    disabled={locLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-light text-accent-primary text-xs font-medium relative overflow-hidden"
                  >
                    {!locLoading && (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-accent-primary/10"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                    )}
                    {locLoading ? (
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    ) : <span className="text-[10px]">◎</span>}
                    My Location
                  </motion.button>
                </div>

                <PlacesAutocomplete
                  placeholder="Search pickup address…"
                  value={pickupAddress}
                  onChange={(addr, lat, lng) => {
                    setPickupAddress(addr)
                    setPickupLat(lat.toFixed(6))
                    setPickupLng(lng.toFixed(6))
                  }}
                  className={inputCls}
                />
                {/* Hidden lat/lng — kept in state, not shown */}
                <input type="hidden" value={pickupLat} readOnly />
                <input type="hidden" value={pickupLng} readOnly />
              </div>

              {/* ── Dropoff ── */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary/70 uppercase tracking-wide block">
                  📌 Dropoff
                </label>

                <PlacesAutocomplete
                  placeholder="Search dropoff address…"
                  value={dropoffAddress}
                  onChange={handleDropoffChange}
                  className={inputCls}
                />
                {/* Hidden lat/lng */}
                <input type="hidden" value={dropoffLat} readOnly />
                <input type="hidden" value={dropoffLng} readOnly />

                {/* Mini map — pin updates when autocomplete fires */}
                <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ height: 180 }}>
                  <div ref={mapContainerRef} className="absolute inset-0" />
                  <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
                    <span className="glass text-[10px] text-text-secondary px-3 py-1 rounded-full">
                      Drag pin or tap to adjust
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Package ── */}
              <div>
                <label className="text-xs font-semibold text-text-secondary/70 uppercase tracking-wide block mb-2">
                  📋 Package (optional)
                </label>
                <input
                  placeholder="What's in the package?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="h-2" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
