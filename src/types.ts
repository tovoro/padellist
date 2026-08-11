export interface Player {
  id: number
  name: string
  color: string
  sortOrder: number
}

export interface MatchSet {
  setNo: number
  t1Games: number
  t2Games: number
}

export interface Match {
  id: number
  playedOn: string
  team1: [number, number]
  team2: [number, number]
  note: string | null
  source: string
  sets: MatchSet[]
}

export interface MatchSnapshot {
  playedOn: string
  team1: [number, number]
  team2: [number, number]
  note: string | null
  sets: Array<{ t1Games: number; t2Games: number }>
}

export type ChangeAction = 'create' | 'update' | 'delete'

export interface ChangeEntry {
  id: number
  /** ISO 8601 mit Z - in SQLite als UTC geschrieben, im Client lokal formatiert. */
  at: string
  action: ChangeAction
  matchId: number
  before: MatchSnapshot | null
  after: MatchSnapshot | null
}

export interface AppData {
  players: Player[]
  matches: Match[]
  changes: ChangeEntry[]
}

export interface MatchInput {
  playedOn: string
  team1: [number, number]
  team2: [number, number]
  note?: string | null
  sets: Array<{ t1Games: number; t2Games: number }>
}
