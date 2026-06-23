/* Type surface for the vendored liquidGL global (src/lib/liquidGL.js). */

export interface LiquidGLOptions {
  target?: string
  snapshot?: string
  resolution?: number
  refraction?: number
  bevelDepth?: number
  bevelWidth?: number
  frost?: number
  shadow?: boolean
  specular?: boolean
  reveal?: 'none' | 'fade'
  tilt?: boolean
  tiltFactor?: number
  magnify?: number
  on?: { init?: (lens: LiquidGLLens) => void }
}

export interface LiquidGLLens {
  el: HTMLElement
  options: LiquidGLOptions
}

export interface LiquidGLRenderer {
  removeLens: (lens: LiquidGLLens) => void
  addLiveCanvas: (el: HTMLCanvasElement) => void
  removeLiveCanvas: (el: HTMLCanvasElement) => void
  captureSnapshot: () => void
}

export interface LiquidGLFn {
  (options?: LiquidGLOptions): LiquidGLLens | LiquidGLLens[] | undefined
  registerDynamic: (els: Element | Element[] | NodeList | string) => void
  registerLiveCanvas: (el: HTMLCanvasElement) => () => void
  syncWith: (config?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    liquidGL?: LiquidGLFn
    html2canvas?: unknown
    __liquidGLRenderer__?: LiquidGLRenderer
    __liquidGLNoWebGL__?: boolean
  }
}

// The vendored library is plain JS with no types of its own.
declare module '*liquidGL.js'

export {}
