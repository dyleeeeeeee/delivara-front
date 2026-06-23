/**
 * Hidden SVG filter defs powering the true "liquid glass" refraction.
 * Mounted once at the app root. The filter warps whatever is behind a
 * surface (via `backdrop-filter: url(#liquid-glass-refract)`), giving the
 * Apple-style liquid distortion. Only Chromium honours url() backdrops, so
 * the CSS gates it behind @supports — this is pure progressive enhancement.
 */
export default function LiquidGlassDefs() {
  return (
    <svg
      aria-hidden
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
    >
      <defs>
        <filter
          id="liquid-glass-refract"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          {/* Soft organic noise field → displacement vectors */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.009 0.012"
            numOctaves={2}
            seed={42}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
          {/* Refract the backdrop along the noise — the "liquid" bend */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale={28}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
