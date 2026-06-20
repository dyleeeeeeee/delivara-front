import { create } from 'zustand'

type EventHandler = (data: Record<string, unknown>) => void

interface WSState {
  connected: boolean
  socket: WebSocket | null
  handlers: Map<string, Set<EventHandler>>
  connect: () => void
  disconnect: () => void
  send: (event: string, data?: Record<string, unknown>) => void
  on: (event: string, handler: EventHandler) => () => void
}

let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 1000
let isIntentionalClose = false
// Critical actions queued while offline, flushed on reconnect (resilient to
// flaky internet). LOCATION_UPDATE is intentionally never queued (stale).
let pendingQueue: string[] = []
const QUEUEABLE = new Set([
  'CREATE_JOB', 'ACCEPT_JOB', 'RESPOND_OFFER', 'JOB_STATUS',
  'RIDER_ONLINE', 'RIDER_OFFLINE', 'TRACK_SUBSCRIBE',
])

export const useWSStore = create<WSState>((set, get) => ({
  connected: false,
  socket: null,
  handlers: new Map(),

  connect: () => {
    const token = localStorage.getItem('delivara_token')
    if (!token) return

    // Don't open a second connection if one is open OR still connecting
    const existing = get().socket
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) return

    isIntentionalClose = false
    const fallback = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
    const wsUrl = import.meta.env.VITE_WS_URL || fallback
    const ws = new WebSocket(`${wsUrl}?token=${token}`)

    ws.onopen = () => {
      set({ connected: true, socket: ws })
      reconnectDelay = 1000
      ws.send(JSON.stringify({ type: 'RECONNECT', data: {} }))
      // Flush anything queued while we were offline.
      if (pendingQueue.length) {
        const q = pendingQueue
        pendingQueue = []
        q.forEach((m) => { try { ws.send(m) } catch { pendingQueue.push(m) } })
      }
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        const eventHandlers = get().handlers.get(msg.type)
        if (eventHandlers) {
          eventHandlers.forEach((h) => h(msg.data || {}))
        }
      } catch {}
    }

    ws.onclose = () => {
      set({ connected: false, socket: null })
      if (isIntentionalClose) return
      reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30000)
        get().connect()
      }, reconnectDelay)
    }

    ws.onerror = () => ws.close()
    set({ socket: ws })
  },

  disconnect: () => {
    isIntentionalClose = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    const { socket } = get()
    if (socket) socket.close()
    set({ connected: false, socket: null })
  },

  send: (event, data = {}) => {
    const { socket } = get()
    const msg = JSON.stringify({ type: event, data })
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(msg)
    } else if (QUEUEABLE.has(event)) {
      // Offline: queue the action and kick a reconnect; it flushes on open.
      pendingQueue.push(msg)
      get().connect()
    }
  },

  on: (event, handler) => {
    const { handlers } = get()
    if (!handlers.has(event)) handlers.set(event, new Set())
    handlers.get(event)!.add(handler)
    return () => {
      handlers.get(event)?.delete(handler)
    }
  },
}))
