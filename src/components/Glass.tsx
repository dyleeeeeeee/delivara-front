import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useLiquidGL } from './LiquidGLProvider'
import { LG_RESOLUTION, pulseRender, requestRender } from '../lib/liquidGlass'
import type { LiquidGLLens } from '../lib/liquidGL'

let uid = 0

export interface GlassProps {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  /** Ray-bend intensity (liquidGL refraction). */
  refraction?: number
  /** Beveled-edge depth / width (glass thickness). */
  bevelDepth?: number
  bevelWidth?: number
  /** Frosted blur amount. */
  frost?: number
  /** Animated specular gloss. */
  specular?: boolean
  /** Drop shadow under the glass. */
  shadow?: boolean
  /** 3D pointer tilt. */
  tilt?: boolean
  tiltFactor?: number
  /** Lens magnification of the refracted content. */
  magnify?: number
  onClick?: () => void
}

/**
 * A real liquidGL glass surface. The element is transparentised by liquidGL
 * and the moving map / aurora behind it is refracted through a shared WebGL
 * canvas. Until the renderer is ready it renders as a plain (invisible-glass)
 * container; the CSS class provides a hairline + radius so layout is stable.
 */
export default function Glass({
  children,
  className = '',
  style,
  refraction = 0.015,
  bevelDepth = 0.07,
  bevelWidth = 0.12,
  frost = 0,
  specular = true,
  shadow = true,
  tilt = false,
  tiltFactor = 5,
  magnify = 1,
  onClick,
}: GlassProps) {
  const { ready } = useLiquidGL()
  const ref = useRef<HTMLDivElement>(null)
  const lensRef = useRef<LiquidGLLens | null>(null)
  const idRef = useRef(`lg-${++uid}`)

  useEffect(() => {
    if (!ready || !ref.current || !window.liquidGL) return
    const el = ref.current
    el.id = idRef.current
    let cancelled = false

    // Wait a frame so layout (size/radius) is settled before liquidGL reads it.
    const raf = requestAnimationFrame(() => {
      if (cancelled || !window.liquidGL) return
      const result = window.liquidGL({
        target: `#${idRef.current}`,
        snapshot: 'body',
        resolution: LG_RESOLUTION,
        refraction,
        bevelDepth,
        bevelWidth,
        frost,
        specular,
        shadow,
        tilt,
        tiltFactor,
        magnify,
        reveal: 'none',
        // This element holds interactive content — keep it (and its subtree) tappable.
        interactive: true,
      })
      lensRef.current = (Array.isArray(result) ? result[0] : result) ?? null
      // Belt-and-suspenders: ensure the container is clickable regardless.
      el.style.pointerEvents = 'auto'
      // Draw the freshly-added lens (the on-demand ticker won't otherwise).
      pulseRender()
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      if (lensRef.current) {
        window.__liquidGLRenderer__?.removeLens(lensRef.current)
        lensRef.current = null
        requestRender()
      }
    }
    // Re-create the lens if any optical prop changes.
  }, [ready, refraction, bevelDepth, bevelWidth, frost, specular, shadow, tilt, tiltFactor, magnify])

  return (
    <div ref={ref} className={`glass-surface ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  )
}
