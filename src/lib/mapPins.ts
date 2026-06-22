// Stylized map markers — Uber / DoorDash flavour: glossy teardrop pins with a
// centered glyph, a soft ground shadow, and a subtle drop-in animation; plus a
// rounded "puck" for the moving rider. All return a plain HTMLElement so they
// drop straight into `new mapboxgl.Marker({ element })`.

export type PinType = 'pickup' | 'dropoff' | 'store' | 'home'

interface PinStyle {
  color: string      // pin body
  glyph: string      // centered icon
}

const PIN_STYLES: Record<PinType, PinStyle> = {
  pickup: { color: '#22c55e', glyph: '🟢' },       // overridden below with a store glyph
  store:  { color: '#22c55e', glyph: '🏪' },
  dropoff:{ color: '#6366F1', glyph: '🏠' },
  home:   { color: '#6366F1', glyph: '🏠' },
}

// Map the semantic pickup/dropoff to nicer glyphs.
PIN_STYLES.pickup = { color: '#22c55e', glyph: '📦' }

let injected = false
function injectKeyframes() {
  if (injected || document.getElementById('delivra-pin-style')) {
    injected = true
    return
  }
  injected = true
  const style = document.createElement('style')
  style.id = 'delivra-pin-style'
  style.textContent = `
    @keyframes delivra-pin-drop {
      0%   { transform: translateY(-18px) scale(0.6); opacity: 0; }
      60%  { transform: translateY(2px)  scale(1.05); opacity: 1; }
      100% { transform: translateY(0)     scale(1);   opacity: 1; }
    }
    @keyframes delivra-shadow-in {
      0%   { transform: scale(0.4); opacity: 0; }
      100% { transform: scale(1);   opacity: 0.35; }
    }
  `
  document.head.appendChild(style)
}

/**
 * A DoorDash-style teardrop pin: rounded body that tapers to a point, a white
 * ring, a drop shadow on the ground, and a glyph in the middle. `anchor: 'bottom'`
 * so the tip sits on the coordinate.
 */
export function createPin(type: PinType): HTMLElement {
  injectKeyframes()
  const { color, glyph } = PIN_STYLES[type]

  const el = document.createElement('div')
  el.style.cssText = 'position:relative;width:40px;height:48px;cursor:pointer;'

  // Ground shadow
  const shadow = document.createElement('div')
  shadow.style.cssText = `
    position:absolute;left:50%;bottom:-2px;width:18px;height:6px;
    transform:translateX(-50%);border-radius:50%;
    background:rgba(0,0,0,0.45);filter:blur(2px);
    animation:delivra-shadow-in 0.35s ease-out both;animation-delay:0.05s;
  `

  // Teardrop body (rounded square rotated 45°, one sharp corner = the tip)
  const body = document.createElement('div')
  body.style.cssText = `
    position:absolute;left:50%;top:0;width:34px;height:34px;
    transform:translateX(-50%) rotate(45deg);
    background:linear-gradient(135deg, ${color}, ${shade(color, -18)});
    border:3px solid #fff;
    border-radius:50% 50% 50% 0;
    box-shadow:0 6px 14px rgba(0,0,0,0.4), 0 0 14px ${hexA(color, 0.55)};
    animation:delivra-pin-drop 0.4s cubic-bezier(0.18,0.89,0.32,1.28) both;
  `

  // Glyph (counter-rotated so it stays upright)
  const icon = document.createElement('div')
  icon.textContent = glyph
  icon.style.cssText = `
    position:absolute;left:50%;top:15px;transform:translate(-50%,-50%);
    font-size:16px;line-height:1;z-index:2;pointer-events:none;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,0.4));
  `

  el.appendChild(shadow)
  el.appendChild(body)
  el.appendChild(icon)
  return el
}

/**
 * Uber-style rider "puck": a rounded glowing badge with a vehicle glyph that sits
 * directly on the coordinate (anchor: 'center'). Pulses via the shared keyframes.
 */
export function createRiderPuck(): HTMLElement {
  injectKeyframes()
  const el = document.createElement('div')
  el.style.cssText = 'position:relative;width:34px;height:34px;'

  const pulse = document.createElement('div')
  pulse.style.cssText = `
    position:absolute;inset:-6px;border-radius:50%;
    border:2px solid rgba(34,211,238,0.5);
    animation:rider-pulse 2s ease-out infinite;
  `

  const badge = document.createElement('div')
  badge.style.cssText = `
    position:absolute;inset:0;border-radius:50%;
    background:linear-gradient(135deg,#22D3EE,#0ea5b7);
    border:3px solid #05070D;
    box-shadow:0 4px 12px rgba(0,0,0,0.5), 0 0 16px rgba(34,211,238,0.7);
    display:flex;align-items:center;justify-content:center;
    font-size:16px;z-index:1;
  `
  badge.textContent = '🛵'

  el.appendChild(pulse)
  el.appendChild(badge)
  return el
}

// ── tiny color helpers ──
function hexA(hex: string, a: number): string {
  const { r, g, b } = toRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
function shade(hex: string, percent: number): string {
  const { r, g, b } = toRgb(hex)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (c * percent) / 100)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}
function toRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  }
}
