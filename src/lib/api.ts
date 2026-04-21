const BASE = ''

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
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}

  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data as T
}
