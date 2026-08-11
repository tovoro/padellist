import type { Env } from '../../server/env'
import { json } from '../../server/http'
import { clearSessionCookie } from '../../server/session'

// Kommt nur durch, wenn die Middleware das Cookie akzeptiert hat.
export const onRequestGet: PagesFunction<Env> = async () => json({ ok: true })

export const onRequestDelete: PagesFunction<Env> = async () =>
  json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } })
