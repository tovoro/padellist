import type { Env } from '../../server/env'
import { error, json } from '../../server/http'

const MAX_NAME = 24

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error(400, 'invalid_body')
  }

  if (!Array.isArray(body) || body.length === 0) return error(400, 'invalid_body')

  const updates: Array<{ id: number; name: string }> = []
  for (const raw of body) {
    if (typeof raw !== 'object' || raw === null) return error(400, 'invalid_body')
    const { id, name } = raw as Record<string, unknown>
    if (!Number.isInteger(id)) return error(400, 'invalid_id')
    if (typeof name !== 'string' || name.trim() === '') return error(400, 'invalid_name')
    updates.push({ id: id as number, name: name.trim().slice(0, MAX_NAME) })
  }

  await env.DB.batch(
    updates.map((update) =>
      env.DB.prepare('UPDATE players SET name = ? WHERE id = ?').bind(update.name, update.id),
    ),
  )

  return json({ ok: true })
}
