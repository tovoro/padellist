import type { Config } from './config.ts'
import type { Database } from './db.ts'
import { error } from './http.ts'
import { verifySession } from './session.ts'
import { getData } from './handlers/data.ts'
import { login } from './handlers/login.ts'
import { createMatch, deleteMatch, updateMatch } from './handlers/matches.ts'
import { renamePlayers } from './handlers/players.ts'
import { logout, sessionStatus } from './handlers/session.ts'

/** Das Noetigste aus dem HTTP-Request, damit die Handler ohne Node-Typen auskommen. */
export interface ApiRequest {
  method: string
  url: URL
  header(name: string): string | null
  json(): Promise<unknown>
  /** Adresse des Clients; hinter Caddy aus X-Forwarded-For. */
  ip: string
  /** Kam der Request beim Proxy ueber HTTPS an? Bestimmt das Secure-Flag des Cookies. */
  secure: boolean
}

export interface ApiContext {
  request: ApiRequest
  db: Database
  config: Config
}

export type Handler = (ctx: ApiContext, params: string[]) => Response | Promise<Response>

interface Route {
  method: string
  pattern: RegExp
  handler: Handler
  public?: boolean
}

// Nur der Login ist offen; alles andere setzt ein gueltiges Session-Cookie voraus.
const routes: Route[] = [
  { method: 'POST', pattern: /^\/api\/login$/, handler: login, public: true },
  { method: 'GET', pattern: /^\/api\/session$/, handler: sessionStatus },
  { method: 'DELETE', pattern: /^\/api\/session$/, handler: logout },
  { method: 'GET', pattern: /^\/api\/data$/, handler: getData },
  { method: 'POST', pattern: /^\/api\/matches$/, handler: createMatch },
  { method: 'PUT', pattern: /^\/api\/matches\/(\d+)$/, handler: updateMatch },
  { method: 'DELETE', pattern: /^\/api\/matches\/(\d+)$/, handler: deleteMatch },
  { method: 'PUT', pattern: /^\/api\/players$/, handler: renamePlayers },
]

export async function handleApi(ctx: ApiContext): Promise<Response> {
  const { method, url } = ctx.request

  const matching = routes.filter((route) => route.pattern.test(url.pathname))
  if (matching.length === 0) return error(404, 'not_found')

  const route = matching.find((candidate) => candidate.method === method)
  if (!route) return error(405, 'method_not_allowed')

  if (!route.public) {
    const authorised = await verifySession(ctx.config.sessionSecret, ctx.request.header('cookie'))
    if (!authorised) return error(401, 'unauthorized')
  }

  const params = (url.pathname.match(route.pattern) ?? []).slice(1)
  return route.handler(ctx, params)
}
