import type { Env } from './env'
import type { ChangeAction, MatchSnapshot } from '../src/types'

interface MatchRow {
  played_on: string
  t1p1: number
  t1p2: number
  t2p1: number
  t2p2: number
  note: string | null
}

/** Vollstaendiger Stand eines Matches - Grundlage fuer den Verlaufseintrag. */
export async function loadSnapshot(env: Env, id: number): Promise<MatchSnapshot | null> {
  const match = await env.DB.prepare(
    'SELECT played_on, t1p1, t1p2, t2p1, t2p2, note FROM matches WHERE id = ?',
  )
    .bind(id)
    .first<MatchRow>()

  if (!match) return null

  const sets = await env.DB.prepare('SELECT t1_games, t2_games FROM sets WHERE match_id = ? ORDER BY set_no')
    .bind(id)
    .all<{ t1_games: number; t2_games: number }>()

  return {
    playedOn: match.played_on,
    team1: [match.t1p1, match.t1p2],
    team2: [match.t2p1, match.t2p2],
    note: match.note,
    sets: sets.results.map((row) => ({ t1Games: row.t1_games, t2Games: row.t2_games })),
  }
}

export function changeStatement(
  env: Env,
  action: ChangeAction,
  matchId: number,
  before: MatchSnapshot | null,
  after: MatchSnapshot | null,
): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO changes (at, action, match_id, before_json, after_json)
     VALUES (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?, ?, ?, ?)`,
  ).bind(action, matchId, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null)
}
