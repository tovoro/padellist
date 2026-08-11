import type { Env } from './env'
import type { ParsedMatch } from './validate'

export async function loadPlayerIds(env: Env): Promise<Set<number>> {
  const rows = await env.DB.prepare('SELECT id FROM players').all<{ id: number }>()
  return new Set(rows.results.map((row) => row.id))
}

export function setStatements(env: Env, matchId: number, match: ParsedMatch): D1PreparedStatement[] {
  return match.sets.map((set, index) =>
    env.DB
      .prepare('INSERT INTO sets (match_id, set_no, t1_games, t2_games) VALUES (?, ?, ?, ?)')
      .bind(matchId, index + 1, set.t1Games, set.t2Games),
  )
}
