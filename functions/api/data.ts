import type { Env } from '../../server/env'
import { json } from '../../server/http'
import type { AppData, ChangeAction, ChangeEntry, Match, MatchSet, MatchSnapshot, Player } from '../../src/types'

/** Der Verlauf waechst langsam; mehr als die letzten Eintraege braucht niemand. */
const CHANGE_LIMIT = 100

interface PlayerRow {
  id: number
  name: string
  color: string
  sort_order: number
}

interface MatchRow {
  id: number
  played_on: string
  t1p1: number
  t1p2: number
  t2p1: number
  t2p2: number
  note: string | null
  source: string
}

interface SetRow {
  match_id: number
  set_no: number
  t1_games: number
  t2_games: number
}

interface ChangeRow {
  id: number
  at: string
  action: string
  match_id: number
  before_json: string | null
  after_json: string | null
}

function parseSnapshot(value: string | null): MatchSnapshot | null {
  if (!value) return null
  try {
    return JSON.parse(value) as MatchSnapshot
  } catch {
    return null
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const [players, matches, sets, changes] = await Promise.all([
    env.DB.prepare('SELECT id, name, color, sort_order FROM players ORDER BY sort_order, id').all<PlayerRow>(),
    env.DB
      .prepare(
        'SELECT id, played_on, t1p1, t1p2, t2p1, t2p2, note, source FROM matches ORDER BY played_on, id',
      )
      .all<MatchRow>(),
    env.DB.prepare('SELECT match_id, set_no, t1_games, t2_games FROM sets ORDER BY match_id, set_no').all<SetRow>(),
    env.DB
      .prepare(
        'SELECT id, at, action, match_id, before_json, after_json FROM changes ORDER BY at DESC, id DESC LIMIT ?',
      )
      .bind(CHANGE_LIMIT)
      .all<ChangeRow>(),
  ])

  const setsByMatch = new Map<number, MatchSet[]>()
  for (const row of sets.results) {
    const list = setsByMatch.get(row.match_id) ?? []
    list.push({ setNo: row.set_no, t1Games: row.t1_games, t2Games: row.t2_games })
    setsByMatch.set(row.match_id, list)
  }

  const data: AppData = {
    players: players.results.map<Player>((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      sortOrder: row.sort_order,
    })),
    matches: matches.results.map<Match>((row) => ({
      id: row.id,
      playedOn: row.played_on,
      team1: [row.t1p1, row.t1p2],
      team2: [row.t2p1, row.t2p2],
      note: row.note,
      source: row.source,
      sets: setsByMatch.get(row.id) ?? [],
    })),
    changes: changes.results.map<ChangeEntry>((row) => ({
      id: row.id,
      at: row.at,
      action: row.action as ChangeAction,
      matchId: row.match_id,
      before: parseSnapshot(row.before_json),
      after: parseSnapshot(row.after_json),
    })),
  }

  return json(data)
}
