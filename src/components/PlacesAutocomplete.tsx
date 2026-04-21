import { useState, useRef, useEffect, useCallback } from 'react'

interface Prediction {
  place_id: string
  description: string
  main_text: string
  secondary_text: string
}

interface PlacesAutocompleteProps {
  placeholder: string
  value: string
  onChange: (address: string, lat: number, lng: number) => void
  className?: string
}

let gmapsReady = false
let gmapsLoading = false
const gmapsCallbacks: (() => void)[] = []

function loadGmaps(key: string): Promise<void> {
  return new Promise((resolve) => {
    if (gmapsReady) { resolve(); return }
    gmapsCallbacks.push(resolve)
    if (gmapsLoading) return
    gmapsLoading = true
    
    const cbName = 'initMap_' + Math.floor(Math.random() * 1000000)
    // @ts-expect-error Window callback assignment
    window[cbName] = () => {
      gmapsReady = true
      gmapsCallbacks.forEach((cb) => cb())
      gmapsCallbacks.length = 0
      // @ts-expect-error cleanup
      delete window[cbName]
    }

    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=${cbName}`
    s.async = true
    s.defer = true
    s.onerror = () => {
      gmapsLoading = false
      console.error('[Places] Failed to load Google Maps script')
    }
    document.head.appendChild(s)
  })
}

// Hidden div removed as it is unused

export default function PlacesAutocomplete({
  placeholder,
  value,
  onChange,
  className = '',
}: PlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)

  useEffect(() => { setInputValue(value) }, [value])

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!key) {
      setError('no_key')
      return
    }
    loadGmaps(key).then(() => {
      try {
        geocoderRef.current = new google.maps.Geocoder()
        setReady(true)
      } catch (e) {
        console.error('[Places] Init failed:', e)
        setError('init_failed')
      }
    })
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const search = useCallback((q: string) => {
    if (!q || q.length < 2) { setPredictions([]); setOpen(false); return }
    if (!ready || typeof google === 'undefined') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(async () => {
      try {
        // Use the new AutocompleteSuggestion API instead of the deprecated AutocompleteService
        const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q
        })
        
        if (suggestions && suggestions.length > 0) {
          setPredictions(
            suggestions.slice(0, 5).map((s: any) => {
              const p = s.placePrediction
              return {
                place_id: p.placeId,
                description: p.text?.text || '',
                main_text: p.structuredFormat?.mainText?.text || p.text?.text || '',
                secondary_text: p.structuredFormat?.secondaryText?.text || '',
              }
            })
          )
          setOpen(true)
        } else {
          setPredictions([])
          setOpen(false)
        }
      } catch (err) {
        console.error('[Places] Autocomplete search failed:', err)
        setPredictions([])
        setOpen(false)
      }
    }, 300)
  }, [ready])

  const select = useCallback((prediction: Prediction) => {
    setInputValue(prediction.description)
    setPredictions([])
    setOpen(false)
    if (!geocoderRef.current) return
    geocoderRef.current.geocode(
      { placeId: prediction.place_id },
      (results: any[] | null, status: string) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location
          onChange(prediction.description, loc.lat(), loc.lng())
        }
      }
    )
  }, [onChange])

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        placeholder={error === 'no_key' ? 'Enter address manually (no API key)' : placeholder}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          if (ready) search(e.target.value)
        }}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        autoComplete="off"
        className={className}
      />

      {open && predictions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-2xl overflow-hidden z-[9999]"
          style={{
            background: 'rgba(8,12,22,0.99)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(99,102,241,0.3)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
          }}
        >
          {predictions.map((p) => (
            <button
              key={p.place_id}
              onMouseDown={(e) => { e.preventDefault(); select(p) }}
              onTouchEnd={(e) => { e.preventDefault(); select(p) }}
              className="w-full text-left px-4 py-3 flex items-start gap-3 border-b border-white/5 last:border-0 active:bg-white/10 transition-colors"
            >
              <span className="text-accent-primary flex-shrink-0 mt-0.5">📍</span>
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{p.main_text}</p>
                {p.secondary_text && (
                  <p className="text-xs text-text-secondary truncate mt-0.5">{p.secondary_text}</p>
                )}
              </div>
            </button>
          ))}
          <div className="px-4 py-2 flex justify-end opacity-40">
            <img
              src="https://developers.google.com/static/maps/documentation/images/google_on_white.png"
              alt="Powered by Google"
              className="h-3.5 invert"
            />
          </div>
        </div>
      )}
    </div>
  )
}
