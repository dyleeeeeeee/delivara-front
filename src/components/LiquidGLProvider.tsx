import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ensureLiquidGL, flushMapCanvases, refreshSnapshot, installOnDemandTicker, pulseRender, LG_RESOLUTION } from '../lib/liquidGlass'

interface LiquidGLContextValue {
  /** True once liquidGL + the shared renderer are ready. */
  ready: boolean
  /** Re-capture the static background (refraction reflects new content). */
  refresh: () => void
}

const LiquidGLContext = createContext<LiquidGLContextValue>({ ready: false, refresh: () => {} })

// eslint-disable-next-line react-refresh/only-export-components
export function useLiquidGL() {
  return useContext(LiquidGLContext)
}

/**
 * Boots the shared liquidGL renderer once and keeps it alive for the whole
 * session. An offscreen anchor lens forces the renderer to exist immediately
 * so the map canvas and every <Glass> can register against it. Re-captures the
 * background on route changes so static content refracts correctly.
 */
export default function LiquidGLProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    ensureLiquidGL().then(() => {
      if (cancelled || !window.liquidGL || !anchorRef.current) return
      // Instantiate the shared renderer via a 1px offscreen lens.
      anchorRef.current.id = 'lg-anchor'
      window.liquidGL({
        target: '#lg-anchor',
        snapshot: 'body',
        resolution: LG_RESOLUTION,
        reveal: 'none',
        shadow: false,
        specular: false,
      })
      // Replace liquidGL's every-frame loop with a demand-driven ticker so the
      // page stays responsive — renders are triggered by map repaints, scroll,
      // resize and lens changes instead of running continuously.
      installOnDemandTicker()
      flushMapCanvases()
      pulseRender()
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // After each navigation, let the DOM settle then re-snapshot the background.
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(refreshSnapshot, 260)
    return () => clearTimeout(t)
  }, [ready, location.pathname])

  return (
    <LiquidGLContext.Provider value={{ ready, refresh: refreshSnapshot }}>
      <div
        ref={anchorRef}
        aria-hidden
        style={{ position: 'fixed', width: 1, height: 1, left: -9999, top: -9999, pointerEvents: 'none' }}
      />
      {children}
    </LiquidGLContext.Provider>
  )
}
