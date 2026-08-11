import type { Env } from '../../../server/env'
import { error, json } from '../../../server/http'
import { changeStatement, loadSnapshot } from '../../../server/changes'
import { loadPlayerIds, setStatements } from '../../../server/matches'
import { parseMatchInput } from '../../../server/validate'

function matchId(params: Record<string, string | string[]>): number | null {
  const raw = Array.isArray(params.id) ? params.id[0] : params.id
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = matchId(params)
  if (id === null) return error(400, 'invalid_id')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error(400, 'invalid_body')
  }

  const parsed = parseMatchInput(body, await loadPlayerIds(env))
  if (!parsed.ok) return error(400, parsed.message)
  const match = parsed.value

  const before = await loadSnapshot(env, id)
  if (!before) return error(404, 'not_found')

  // Id ist bekannt, deshalb passt der komplette Austausch in einen atomaren Batch.
  await env.DB.batch([
    env.DB
      .prepare('UPDATE matches SET played_on = ?, t1p1 = ?, t1p2 = ?, t2p1 = ?, t2p2 = ?, note = ? WHERE id = ?')
      .bind(match.playedOn, match.team1[0], match.team1[1], match.team2[0], match.team2[1], match.note, id),
    env.DB.prepare('DELETE FROM sets WHERE match_id = ?').bind(id),
    ...setStatements(env, id, match),
    changeStatement(env, 'update', id, before, match),
  ])

  return json({ id })
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = matchId(params)
  if (id === null) return error(400, 'invalid_id')

  const before = await loadSnapshot(env, id)
  if (!before) return error(404, 'not_found')

  await env.DB.batch([
    env.DB.prepare('DELETE FROM sets WHERE match_id = ?').bind(id),
    env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(id),
    changeStatement(env, 'delete', id, before, null),
  ])

  return json({ ok: true })
}
