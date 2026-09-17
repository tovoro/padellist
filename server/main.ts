import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleApi } from './api.ts'
import type { ApiRequest } from './api.ts'
import { readConfig } from './config.ts'
import { openDatabase } from './db.ts'
import { serveStatic } from './static.ts'

/** Ein Match mit drei Saetzen sind ein paar hundert Bytes; alles darueber ist kein Client von uns. */
const MAX_BODY_BYTES = 64 * 1024

const config = readConfig(process.env)
const db = openDatabase(config.dbPath, config.migrationsDir)

const server = createServer((req, res) => {
  handle(req, res).catch((cause: unknown) => {
    console.error(cause)
    if (res.headersSent) res.destroy()
    else sendJson(res, 500, { error: 'internal_error' })
  })
})

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET'
  // Nur der Pfad interessiert; der Host-Header des Clients bleibt aussen vor.
  const url = new URL(req.url ?? '/', 'http://localhost')
  const secure = header(req, 'x-forwarded-proto') === 'https'
  setSecurityHeaders(res, secure)

  if (url.pathname === '/healthz') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('ok')
    return
  }

  if (url.pathname.startsWith('/api/')) {
    const body = await readBody(req)
    if (body === null) return sendJson(res, 413, { error: 'payload_too_large' })

    const request: ApiRequest = {
      method,
      url,
      header: (name) => header(req, name),
      json: async () => JSON.parse(body.toString('utf8')) as unknown,
      ip: clientIp(req),
      secure,
    }
    return sendResponse(res, await handleApi({ request, db, config }))
  }

  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }

  return serveStatic(
    config.staticDir,
    { method, pathname: url.pathname, ifModifiedSince: header(req, 'if-modified-since') },
    res,
  )
}

function header(req: IncomingMessage, name: string): string | null {
  const value = req.headers[name]
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

// Caddy ersetzt ein vom Client mitgeschicktes X-Forwarded-For, deshalb ist
// der erste Eintrag der echte Absender.
function clientIp(req: IncomingMessage): string {
  const forwarded = header(req, 'x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.socket.remoteAddress || 'unknown'
}

/** Liest den Body komplett ein; null, wenn er das Limit ueberschreitet. */
async function readBody(req: IncomingMessage): Promise<Buffer | null> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size <= MAX_BODY_BYTES) chunks.push(buffer)
  }
  return size > MAX_BODY_BYTES ? null : Buffer.concat(chunks)
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, name) => {
    if (name !== 'set-cookie') res.setHeader(name, value)
  })
  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) res.setHeader('Set-Cookie', cookies)

  const body = Buffer.from(await response.arrayBuffer())
  res.setHeader('Content-Length', body.byteLength)
  res.end(body)
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(body))
  res.end(body)
}

// Caddy terminiert TLS; HSTS ist deshalb nur sinnvoll, wenn der Request dort
// verschluesselt ankam. Der Rest gilt auch fuer den lokalen Dev-Server.
function setSecurityHeaders(res: ServerResponse, secure: boolean): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  )
  if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000')
}

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`)
  server.close(() => {
    db.close()
    process.exit(0)
  })
  server.closeIdleConnections()
  // Haengende Keep-Alive-Verbindungen sollen den Neustart nicht aufhalten.
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

server.listen(config.port, () => {
  console.log(`padellist listening on port ${config.port}, database ${config.dbPath}`)
})
