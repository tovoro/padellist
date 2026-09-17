import type { ApiContext } from '../api.ts'
import { queryOne } from '../db.ts'
import { error, json } from '../http.ts'
import { createSessionCookie, secretsMatch } from '../session.ts'

const WINDOW = '-15 minutes'
const MAX_FAILURES = 10

export async function login({ request, db, config }: ApiContext): Promise<Response> {
  const ip = request.ip

  db.prepare(`DELETE FROM login_attempts WHERE attempted_at < datetime('now', ?)`).run(WINDOW)

  const failures = queryOne<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?', ip)
  if ((failures?.n ?? 0) >= MAX_FAILURES) return error(429, 'too_many_attempts')

  let password = ''
  try {
    const body = (await request.json()) as { password?: unknown }
    if (typeof body.password === 'string') password = body.password
  } catch {
    return error(400, 'invalid_body')
  }

  if (!(await secretsMatch(password, config.appPassword))) {
    db.prepare('INSERT INTO login_attempts (ip) VALUES (?)').run(ip)
    return error(401, 'invalid_password')
  }

  db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip)

  return json(
    { ok: true },
    { headers: { 'Set-Cookie': await createSessionCookie(config.sessionSecret, request.secure) } },
  )
}
