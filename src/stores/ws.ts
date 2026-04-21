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

export const useWSStore = create<WSState>((set, get) => ({
  connected: false,
  socket: null,
  handlers: new Map(),

  connect: () => {
    const token = localStorage.getItem('delivara_token')
    if (!token) return

    // Don't open a second connection if already open
    const existing = get().socket
    if (existing && existing.readyState === WebSocket.OPEN) return

    isIntentionalClose = false
    // Use environment variable for WebSocket URL
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://${location.host}/ws`
    const ws = new WebSocket(`${wsUrl}?token=${token}`)

    ws.onopen = () => {
      set({ connected: true, socket: ws })
      reconnectDelay = 1000
      ws.send(JSON.stringify({ type: 'RECONNECT', data: {} }))
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
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: event, data }))
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
