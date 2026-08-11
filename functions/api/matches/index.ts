import type { Env } from '../../../server/env'
import { error, json } from '../../../server/http'
import { changeStatement } from '../../../server/changes'
import { loadPlayerIds, setStatements } from '../../../server/matches'
import { parseMatchInput } from '../../../server/validate'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error(400, 'invalid_body')
  }

  const parsed = parseMatchInput(body, await loadPlayerIds(env))
  if (!parsed.ok) return error(400, parsed.message)
  const match = parsed.value

  const inserted = await env.DB
    .prepare(
      `INSERT INTO matches (played_on, t1p1, t1p2, t2p1, t2p2, note, source)
       VALUES (?, ?, ?, ?, ?, ?, 'app')
       RETURNING id`,
    )
    .bind(match.playedOn, match.team1[0], match.team1[1], match.team2[0], match.team2[1], match.note)
    .first<{ id: number }>()

  if (!inserted) return error(500, 'insert_failed')

  try {
    await env.DB.batch([
      ...setStatements(env, inserted.id, match),
      changeStatement(env, 'create', inserted.id, null, match),
    ])
  } catch (cause) {
    // Ein Match ohne Saetze haette keinen bestimmbaren Sieger - lieber zuruecknehmen.
    await env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(inserted.id).run()
    throw cause
  }

  return json({ id: inserted.id }, { status: 201 })
}
