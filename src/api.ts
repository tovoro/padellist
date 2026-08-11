import type { AppData, MatchInput } from './types.ts'

export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized')
    this.name = 'UnauthorizedError'
  }
}

export class ApiError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.name = 'ApiError'
    this.code = code
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })

  if (response.status === 401) throw new UnauthorizedError()

  if (!response.ok) {
    let code = `http_${response.status}`
    try {
      const body = (await response.json()) as { error?: unknown }
      if (typeof body.error === 'string') code = body.error
    } catch {
      // Fehlerkoerper ist nicht zwingend JSON.
    }
    throw new ApiError(code)
  }

  return (await response.json()) as T
}

export const api = {
  data: () => request<AppData>('/api/data'),
  login: (password: string) =>
    request<{ ok: true }>('/api/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: true }>('/api/session', { method: 'DELETE' }),
  createMatch: (input: MatchInput) =>
    request<{ id: number }>('/api/matches', { method: 'POST', body: JSON.stringify(input) }),
  updateMatch: (id: number, input: MatchInput) =>
    request<{ id: number }>(`/api/matches/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteMatch: (id: number) => request<{ ok: true }>(`/api/matches/${id}`, { method: 'DELETE' }),
  renamePlayers: (players: Array<{ id: number; name: string }>) =>
    request<{ ok: true }>('/api/players', { method: 'PUT', body: JSON.stringify(players) }),
}
