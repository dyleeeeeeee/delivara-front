import { api } from './api'

// VAPID public application server key. Matches the backend VAPID_PUBLIC_KEY.
// Public by design — safe to ship in the bundle.
const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BPKaTq-e4WqGEUcvPrQiY6S2EPCCRMC9pq8-_8axQv9_gC3W8W4rOUnJOGFrVTuJ4xawcC1_VxDdbFhzk9q_SFU'

function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buffer
}

/**
 * Best-effort Web Push subscription. Requests notification permission, subscribes
 * via the service worker, and registers the subscription with the backend.
 * Silently no-ops on unsupported browsers, denied permission, or any failure.
 */
export async function subscribePush(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    if (!localStorage.getItem('delivara_token')) return
    if (Notification.permission === 'denied') return

    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
    if (permission !== 'granted') return

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC_KEY),
      })
    }

    const json = sub.toJSON()
    await api('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    })
  } catch {
    // best-effort — ignore (unsupported, blocked, offline, etc.)
  }
}

/** Remove the current push subscription locally and on the backend. */
export async function unsubscribePush(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await api('/api/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {})
    await sub.unsubscribe()
  } catch {
    // best-effort
  }
}
