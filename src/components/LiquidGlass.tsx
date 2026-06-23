import { useRef } from 'react'
import type { CSSProperties, ReactNode, PointerEvent } from 'react'

interface LiquidGlassProps {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  /** Lighter, faster recipe for nested surfaces / chips. */
  light?: boolean
  /** Chromium backdrop refraction. 'strong' uses the chunkier lens filter. */
  refract?: boolean | 'strong'
  /** liquidGL-style beveled glass edge (thickness highlight). */
  bevel?: boolean
  /** liquidGL-style drifting specular gloss band. */
  specular?: boolean
  /** Pointer-tracked specular spot. */
  interactive?: boolean
  /** liquidGL-style 3D pointer tilt. Number = max degrees (default 10). */
  tilt?: boolean | number
  onClick?: () => void
  as?: 'div' | 'button' | 'nav' | 'aside'
}

/**
 * Reusable liquid-glass surface. Composes the CSS recipe from global.css and
 * ports liquidGL's signature optics — bevel, drifting specular, pointer tilt
 * — onto a cross-browser CSS/SVG base (no html2canvas/WebGL, so it works over
 * the live Mapbox canvas).
 */
export default function LiquidGlass({
  children,
  className = '',
  style,
  light = false,
  refract = false,
  bevel = false,
  specular = false,
  interactive = false,
  tilt = false,
  onClick,
  as = 'div',
}: LiquidGlassProps) {
  const ref = useRef<HTMLElement>(null)
  const maxTilt = typeof tilt === 'number' ? tilt : 10

  const onPointerMove = (e: PointerEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    if (interactive) {
      el.style.setProperty('--mx', `${px * 100}%`)
      el.style.setProperty('--my', `${py * 100}%`)
    }
    if (tilt) {
      const ry = (px - 0.5) * 2 * maxTilt
      const rx = -(py - 0.5) * 2 * maxTilt
      el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`
    }
  }

  const onPointerLeave = () => {
    const el = ref.current
    if (el && tilt) el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'
  }

  const cls = [
    light ? 'liquid-glass-light' : 'liquid-glass',
    refract === 'strong' ? 'lg-refract-strong' : refract ? 'lg-refract' : '',
    bevel ? 'lg-bevel' : '',
    interactive ? 'lg-interactive' : '',
    tilt ? 'lg-tilt' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const tracks = interactive || tilt
  const Tag = as as 'div'
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={cls}
      style={style}
      onClick={onClick}
      onPointerMove={tracks ? onPointerMove : undefined}
      onPointerLeave={tracks ? onPointerLeave : undefined}
    >
      {specular && <span className="lg-glint" aria-hidden />}
      {children}
    </Tag>
  )
}
