import type { ApiContext } from '../api.ts'
import { insertChange, loadSnapshot } from '../changes.ts'
import type { Database } from '../db.ts'
import { queryAll, queryOne, transaction } from '../db.ts'
import { error, json } from '../http.ts'
import { parseMatchInput } from '../validate.ts'
import type { ParsedMatch } from '../validate.ts'

function matchId(params: string[]): number | null {
  const id = Number(params[0])
  return Number.isInteger(id) && id > 0 ? id : null
}

function loadPlayerIds(db: Database): Set<number> {
  return new Set(queryAll<{ id: number }>(db, 'SELECT id FROM players').map((row) => row.id))
}

function insertSets(db: Database, id: number, match: ParsedMatch): void {
  const insert = db.prepare('INSERT INTO sets (match_id, set_no, t1_games, t2_games) VALUES (?, ?, ?, ?)')
  match.sets.forEach((set, index) => insert.run(id, index + 1, set.t1Games, set.t2Games))
}

async function readMatch(ctx: ApiContext): Promise<ParsedMatch | Response> {
  let body: unknown
  try {
    body = await ctx.request.json()
  } catch {
    return error(400, 'invalid_body')
  }

  const parsed = parseMatchInput(body, loadPlayerIds(ctx.db))
  return parsed.ok ? parsed.value : error(400, parsed.message)
}

export async function createMatch(ctx: ApiContext): Promise<Response> {
  const match = await readMatch(ctx)
  if (match instanceof Response) return match
  const { db } = ctx

  // Match, Saetze und Verlaufseintrag in einer Transaktion: ein Match ohne
  // Saetze haette keinen bestimmbaren Sieger.
  const id = transaction(db, () => {
    const inserted = queryOne<{ id: number }>(
      db,
      `INSERT INTO matches (played_on, t1p1, t1p2, t2p1, t2p2, note, source)
       VALUES (?, ?, ?, ?, ?, ?, 'app')
       RETURNING id`,
      match.playedOn,
      match.team1[0],
      match.team1[1],
      match.team2[0],
      match.team2[1],
      match.note,
    )
    if (!inserted) throw new Error('insert returned no id')

    insertSets(db, inserted.id, match)
    insertChange(db, 'create', inserted.id, null, match)
    return inserted.id
  })

  return json({ id }, { status: 201 })
}

export async function updateMatch(ctx: ApiContext, params: string[]): Promise<Response> {
  const id = matchId(params)
  if (id === null) return error(400, 'invalid_id')

  const match = await readMatch(ctx)
  if (match instanceof Response) return match
  const { db } = ctx

  const found = transaction(db, () => {
    const before = loadSnapshot(db, id)
    if (!before) return false

    db.prepare('UPDATE matches SET played_on = ?, t1p1 = ?, t1p2 = ?, t2p1 = ?, t2p2 = ?, note = ? WHERE id = ?').run(
      match.playedOn,
      match.team1[0],
      match.team1[1],
      match.team2[0],
      match.team2[1],
      match.note,
      id,
    )
    db.prepare('DELETE FROM sets WHERE match_id = ?').run(id)
    insertSets(db, id, match)
    insertChange(db, 'update', id, before, match)
    return true
  })

  return found ? json({ id }) : error(404, 'not_found')
}

export function deleteMatch(ctx: ApiContext, params: string[]): Response {
  const id = matchId(params)
  if (id === null) return error(400, 'invalid_id')
  const { db } = ctx

  const found = transaction(db, () => {
    const before = loadSnapshot(db, id)
    if (!before) return false

    db.prepare('DELETE FROM sets WHERE match_id = ?').run(id)
    db.prepare('DELETE FROM matches WHERE id = ?').run(id)
    insertChange(db, 'delete', id, before, null)
    return true
  })

  return found ? json({ ok: true }) : error(404, 'not_found')
}
