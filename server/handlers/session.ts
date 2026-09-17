import { json } from '../http.ts'
import { clearSessionCookie } from '../session.ts'

// Kommt nur durch, wenn die Routenpruefung das Cookie akzeptiert hat.
export function sessionStatus(): Response {
  return json({ ok: true })
}

export function logout(): Response {
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } })
}
