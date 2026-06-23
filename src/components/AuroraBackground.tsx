/**
 * The futuristic base reality layer. A deep void with drifting holographic
 * aurora blobs + a faint tech grid. On map screens the Mapbox canvas paints
 * over most of it; on every other screen this IS the background that liquidGL
 * refracts through the glass. Fixed, full-viewport, behind all content.
 */
export default function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden>
      <div className="aurora-blob aurora-iris" />
      <div className="aurora-blob aurora-aqua" />
      <div className="aurora-blob aurora-plasma" />
      <div className="aurora-grid" />
      <div className="aurora-vignette" />
    </div>
  )
}
