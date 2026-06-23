/**
 * Hidden SVG filter defs powering the true "liquid glass" refraction.
 * Mounted once at the app root. Each filter warps whatever is behind a
 * surface (via `backdrop-filter: url(...)`) AND splits the R/G/B channels
 * by slightly different amounts — chromatic aberration, the colour-fringe
 * you see at the edge of real thick glass. Only Chromium honours url()
 * backdrops, so the CSS gates this behind @supports — pure progressive
 * enhancement on top of the universal CSS blur/specular/bevel base.
 */

interface RefractFilterProps {
  id: string
  baseFrequency: string
  blur: number
  /** Green (centre) displacement scale; R/B fan out around it for aberration. */
  scale: number
  /** How far R and B split from G, in px. */
  aberration: number
  seed: number
}

/** One refraction filter with built-in chromatic aberration. */
function RefractFilter({ id, baseFrequency, blur, scale, aberration, seed }: RefractFilterProps) {
  const disp = (channel: 'R' | 'G' | 'B', s: number, result: string) => {
    // Isolate a single colour channel (keep alpha), zero the others.
    const matrix =
      channel === 'R'
        ? '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'
        : channel === 'G'
        ? '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'
        : '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
    return (
      <>
        <feDisplacementMap
          in="SourceGraphic"
          in2="softNoise"
          scale={s}
          xChannelSelector="R"
          yChannelSelector="G"
          result={`${result}_disp`}
        />
        <feColorMatrix in={`${result}_disp`} type="matrix" values={matrix} result={result} />
      </>
    )
  }

  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
      {/* Low-frequency noise → broad, lens-like bends */}
      <feTurbulence type="fractalNoise" baseFrequency={baseFrequency} numOctaves={2} seed={seed} result="noise" />
      <feGaussianBlur in="noise" stdDeviation={blur} result="softNoise" />

      {/* Refract each channel by a different scale → chromatic fringe */}
      {disp('R', scale - aberration, 'red')}
      {disp('G', scale, 'green')}
      {disp('B', scale + aberration, 'blue')}

      {/* Recombine the channels (screen blend adds light) */}
      <feBlend in="red" in2="green" mode="screen" result="rg" />
      <feBlend in="rg" in2="blue" mode="screen" />
    </filter>
  )
}

export default function LiquidGlassDefs() {
  return (
    <svg
      aria-hidden
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
    >
      <defs>
        {/* Standard refraction for chips / navbars */}
        <RefractFilter
          id="liquid-glass-refract"
          baseFrequency="0.006 0.009"
          blur={3.5}
          scale={34}
          aberration={3}
          seed={42}
        />
        {/* Stronger, chunkier lens for big surfaces (sheet / drawer) */}
        <RefractFilter
          id="liquid-glass-bevel"
          baseFrequency="0.004 0.006"
          blur={5}
          scale={60}
          aberration={6}
          seed={17}
        />
      </defs>
    </svg>
  )
}
