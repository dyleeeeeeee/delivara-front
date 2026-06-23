import { useRef } from 'react'
import type { CSSProperties, ReactNode, PointerEvent } from 'react'

interface LiquidGlassProps {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  /** Lighter, faster recipe for nested surfaces / chips. */
  light?: boolean
  /** Enable Chromium backdrop refraction (use sparingly over the map). */
  refract?: boolean
  /** Track the pointer for a moving specular highlight. */
  interactive?: boolean
  onClick?: () => void
  as?: 'div' | 'button' | 'nav' | 'aside'
}

/**
 * Reusable liquid-glass surface. Composes the CSS recipe from global.css
 * (.liquid-glass + optional .lg-refract / .lg-interactive) and, when
 * interactive, feeds pointer position into the --mx/--my specular spot.
 */
export default function LiquidGlass({
  children,
  className = '',
  style,
  light = false,
  refract = false,
  interactive = false,
  onClick,
  as = 'div',
}: LiquidGlassProps) {
  const ref = useRef<HTMLElement>(null)

  const onPointerMove = (e: PointerEvent) => {
    if (!interactive || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const mx = ((e.clientX - r.left) / r.width) * 100
    const my = ((e.clientY - r.top) / r.height) * 100
    ref.current.style.setProperty('--mx', `${mx}%`)
    ref.current.style.setProperty('--my', `${my}%`)
  }

  const cls = [
    light ? 'liquid-glass-light' : 'liquid-glass',
    refract ? 'lg-refract' : '',
    interactive ? 'lg-interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const Tag = as as 'div'
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={cls}
      style={style}
      onClick={onClick}
      onPointerMove={interactive ? onPointerMove : undefined}
    >
      {children}
    </Tag>
  )
}
