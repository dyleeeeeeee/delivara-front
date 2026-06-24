/**
 * liquidGL bootstrap + integration glue.
 *
 * liquidGL is a vanilla library: it attaches `window.liquidGL` and refracts a
 * page background (captured via html2canvas) through a shared WebGL canvas.
 * It works wherever WebGL + html2canvas do — including iOS Safari — and falls
 * back to a CSS blur otherwise.
 *
 * This module:
 *  - injects html2canvas as the global the library expects,
 *  - loads the vendored script (once),
 *  - keeps a registry of live <canvas> sources (the Mapbox map) so they can be
 *    registered as soon as the shared renderer exists.
 */
import html2canvas from 'html2canvas'

// Shared renderer resolution. Lower = cheaper per-frame map texture uploads.
export const LG_RESOLUTION = 1.0

let loadPromise: Promise<void> | null = null

/** Ensure html2canvas + liquidGL are loaded. Idempotent. */
export function ensureLiquidGL(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    if (!window.html2canvas) window.html2canvas = html2canvas
    // Dynamic import guarantees the html2canvas global is set first.
    await import('./liquidGL.js')
  })()
  return loadPromise
}

/* ── Live map canvas registry ──────────────────────────────────────────────
   A map can mount before the shared renderer exists (the renderer is created
   on the first lens). We stash canvases and (re)register them whenever the
   renderer is available. */
const pendingCanvases = new Set<HTMLCanvasElement>()

function tryRegister(canvas: HTMLCanvasElement) {
  const fn = window.liquidGL?.registerLiveCanvas
  if (fn && window.__liquidGLRenderer__) fn(canvas)
}

/** Register a live map canvas. Returns an unregister fn. */
export function registerMapCanvas(canvas: HTMLCanvasElement): () => void {
  pendingCanvases.add(canvas)
  tryRegister(canvas)
  return () => {
    pendingCanvases.delete(canvas)
    window.__liquidGLRenderer__?.removeLiveCanvas?.(canvas)
  }
}

/** (Re)register any canvases that were waiting for the renderer. */
export function flushMapCanvases() {
  pendingCanvases.forEach(tryRegister)
}

/** Re-capture the static background (call after route / background changes). */
export function refreshSnapshot() {
  window.__liquidGLRenderer__?.captureSnapshot?.()
  pulseRender()
}

/* ── On-demand render scheduler ────────────────────────────────────────────
   liquidGL ships an unconditional rAF loop that re-renders — re-uploading the
   full Mapbox texture and recomputing every lens's geometry — on EVERY frame,
   forever. On mobile that pins the main thread and input events get dropped
   (the "can't tap buttons / too laggy" symptom).

   We instead switch the renderer to an external ticker and render only when
   something actually changes:
     • the map repaints  → its 'render' event (fires per-frame while active,
                            stops firing when Mapbox goes idle)
     • the user scrolls / resizes
     • a <Glass> lens mounts/unmounts, or the background is re-snapshotted
   When everything is still, nothing renders and the device rests. */

let rafPending = false

function renderer() {
  return window.__liquidGLRenderer__
}

/** Take over liquidGL's render loop and drive it on demand. Idempotent. */
export function installOnDemandTicker() {
  const r = renderer()
  if (!r || r.__onDemand) return
  r.__onDemand = true
  // Stop liquidGL's internal forever-loop and prevent new lenses from starting one.
  r.useExternalTicker = true
  if (r._rafId) {
    cancelAnimationFrame(r._rafId)
    r._rafId = null
  }
  window.addEventListener('scroll', requestRender, { passive: true })
  window.addEventListener('resize', requestRender, { passive: true })
}

/** Render once on the next animation frame (coalesced — many calls → one render). */
export function requestRender() {
  if (rafPending || !renderer()) return
  rafPending = true
  requestAnimationFrame(() => {
    rafPending = false
    renderer()?.render()
  })
}

/** Render a few consecutive frames to let async layout / snapshots settle. */
export function pulseRender(frames = 3) {
  let n = frames
  const step = () => {
    renderer()?.render()
    if (--n > 0) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
