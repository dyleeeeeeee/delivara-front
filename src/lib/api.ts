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

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

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
