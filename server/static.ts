import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import type { Stats } from 'node:fs'
import type { ServerResponse } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
}

export interface StaticRequest {
  method: string
  pathname: string
  ifModifiedSince: string | null
}

export async function serveStatic(root: string, request: StaticRequest, res: ServerResponse): Promise<void> {
  const rootDir = resolve(root)

  let pathname: string
  try {
    pathname = decodeURIComponent(request.pathname)
  } catch {
    return sendStatus(res, 400)
  }

  let file = resolve(rootDir, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`)
  if (file !== rootDir && !file.startsWith(rootDir + sep)) return sendStatus(res, 404)

  let info = await statFile(file)
  // Ohne Dateiendung ist es eine Navigation: die App uebernimmt den Pfad.
  if (!info && extname(pathname) === '') {
    file = resolve(rootDir, 'index.html')
    info = await statFile(file)
  }
  if (!info) return sendStatus(res, 404)

  // HTTP-Daten sind sekundengenau; sonst gaebe es nie ein 304.
  const modified = new Date(Math.floor(info.mtimeMs / 1000) * 1000)
  if (request.ifModifiedSince && new Date(request.ifModifiedSince) >= modified) {
    res.statusCode = 304
    res.end()
    return
  }

  res.statusCode = 200
  res.setHeader('Content-Type', CONTENT_TYPES[extname(file)] ?? 'application/octet-stream')
  res.setHeader('Content-Length', info.size)
  res.setHeader('Last-Modified', modified.toUTCString())
  // Vite haengt an alles unter /assets/ einen Hash; alles andere (index.html,
  // Service Worker, Manifest, Icons) behaelt seinen Namen und wird revalidiert.
  res.setHeader(
    'Cache-Control',
    pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  )

  if (request.method === 'HEAD') {
    res.end()
    return
  }

  createReadStream(file)
    .on('error', () => res.destroy())
    .pipe(res)
}

async function statFile(file: string): Promise<Stats | null> {
  try {
    const info = await stat(file)
    return info.isFile() ? info : null
  } catch {
    return null
  }
}

function sendStatus(res: ServerResponse, status: number): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(status === 404 ? 'Not found' : 'Bad request')
}
