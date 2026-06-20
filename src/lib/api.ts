const BASE = import.meta.env.VITE_API_URL || 'https://api.delivra.ng'

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('delivara_token')
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  // Abort slow requests so the UI never hangs forever on flaky internet.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers, signal: controller.signal })
  } catch (e) {
    throw new Error((e as Error)?.name === 'AbortError'
      ? 'Network timed out — check your connection.'
      : 'Network error — check your connection.')
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 401) {
    localStorage.removeItem('delivara_token')
    window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : {}

  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data as T
}
