import type { Env } from '../../server/env'
import { error, json } from '../../server/http'
import { createSessionCookie, secretsMatch } from '../../server/session'

const WINDOW = '-15 minutes'
const MAX_FAILURES = 10

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local'

  await env.DB.prepare(`DELETE FROM login_attempts WHERE attempted_at < datetime('now', ?)`).bind(WINDOW).run()

  const failures = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?')
    .bind(ip)
    .first<{ n: number }>()

  if ((failures?.n ?? 0) >= MAX_FAILURES) return error(429, 'too_many_attempts')

  let password = ''
  try {
    const body = (await request.json()) as { password?: unknown }
    if (typeof body.password === 'string') password = body.password
  } catch {
    return error(400, 'invalid_body')
  }

  if (!(await secretsMatch(password, env.APP_PASSWORD))) {
    await env.DB.prepare('INSERT INTO login_attempts (ip) VALUES (?)').bind(ip).run()
    return error(401, 'invalid_password')
  }

  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run()

  const secure = new URL(request.url).protocol === 'https:'
  return json({ ok: true }, { headers: { 'Set-Cookie': await createSessionCookie(env.SESSION_SECRET, secure) } })
}
