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
          {/* Low-frequency noise → broad, lens-like bends (vs. fine ripples) */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.009"
            numOctaves={2}
            seed={42}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="3.5" result="softNoise" />
          {/* Refract the backdrop along the noise — the "liquid" bend */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale={34}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Stronger, chunkier refraction for big surfaces (sheet / drawer) */}
        <filter
          id="liquid-glass-bevel"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.004 0.006"
            numOctaves={2}
            seed={17}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="5" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale={60}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
