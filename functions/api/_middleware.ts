import type { Env } from '../../server/env'
import { error } from '../../server/http'
import { verifySession } from '../../server/session'

const PUBLIC_PATHS = new Set(['/api/login'])

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  if (PUBLIC_PATHS.has(url.pathname)) return context.next()

  const authorised = await verifySession(context.env.SESSION_SECRET, context.request.headers.get('Cookie'))
  if (!authorised) return error(401, 'unauthorized')

  return context.next()
}
