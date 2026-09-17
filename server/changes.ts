import type { Database } from './db.ts'
import { queryAll, queryOne } from './db.ts'
import type { ChangeAction, MatchSnapshot } from '../src/types.ts'

interface MatchRow {
  played_on: string
  t1p1: number
  t1p2: number
  t2p1: number
  t2p2: number
  note: string | null
}

/** Vollstaendiger Stand eines Matches - Grundlage fuer den Verlaufseintrag. */
export function loadSnapshot(db: Database, id: number): MatchSnapshot | null {
  const match = queryOne<MatchRow>(
    db,
    'SELECT played_on, t1p1, t1p2, t2p1, t2p2, note FROM matches WHERE id = ?',
    id,
  )
  if (!match) return null

  const sets = queryAll<{ t1_games: number; t2_games: number }>(
    db,
    'SELECT t1_games, t2_games FROM sets WHERE match_id = ? ORDER BY set_no',
    id,
  )

  return {
    playedOn: match.played_on,
    team1: [match.t1p1, match.t1p2],
    team2: [match.t2p1, match.t2p2],
    note: match.note,
    sets: sets.map((row) => ({ t1Games: row.t1_games, t2Games: row.t2_games })),
  }
}

export function insertChange(
  db: Database,
  action: ChangeAction,
  matchId: number,
  before: MatchSnapshot | null,
  after: MatchSnapshot | null,
): void {
  db.prepare(
    `INSERT INTO changes (at, action, match_id, before_json, after_json)
     VALUES (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?, ?, ?, ?)`,
  ).run(action, matchId, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null)
}
