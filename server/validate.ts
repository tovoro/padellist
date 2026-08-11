export interface ParsedMatch {
  playedOn: string
  team1: [number, number]
  team2: [number, number]
  note: string | null
  sets: Array<{ t1Games: number; t2Games: number }>
}

export type ParseResult = { ok: true; value: ParsedMatch } | { ok: false; message: string }

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_SETS = 3
const MAX_GAMES = 9
const MAX_NOTE = 200

function parseTeam(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null
  const [a, b] = value
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null
  return [a as number, b as number]
}

export function parseMatchInput(body: unknown, validPlayerIds: Set<number>): ParseResult {
  if (typeof body !== 'object' || body === null) return { ok: false, message: 'invalid_body' }
  const input = body as Record<string, unknown>

  if (typeof input.playedOn !== 'string' || !DATE_PATTERN.test(input.playedOn)) {
    return { ok: false, message: 'invalid_date' }
  }
  if (Number.isNaN(Date.parse(input.playedOn))) return { ok: false, message: 'invalid_date' }

  const team1 = parseTeam(input.team1)
  const team2 = parseTeam(input.team2)
  if (!team1 || !team2) return { ok: false, message: 'invalid_teams' }

  const everyone = [...team1, ...team2]
  if (new Set(everyone).size !== 4) return { ok: false, message: 'duplicate_players' }
  if (everyone.some((id) => !validPlayerIds.has(id))) return { ok: false, message: 'unknown_player' }

  if (!Array.isArray(input.sets) || input.sets.length < 1 || input.sets.length > MAX_SETS) {
    return { ok: false, message: 'invalid_set_count' }
  }

  const sets: Array<{ t1Games: number; t2Games: number }> = []
  for (const raw of input.sets) {
    if (typeof raw !== 'object' || raw === null) return { ok: false, message: 'invalid_set' }
    const { t1Games, t2Games } = raw as Record<string, unknown>
    if (!Number.isInteger(t1Games) || !Number.isInteger(t2Games)) return { ok: false, message: 'invalid_set' }
    const a = t1Games as number
    const b = t2Games as number
    if (a < 0 || b < 0 || a > MAX_GAMES || b > MAX_GAMES) return { ok: false, message: 'games_out_of_range' }
    // Ein Satz kann nicht unentschieden enden.
    if (a === b) return { ok: false, message: 'tied_set' }
    sets.push({ t1Games: a, t2Games: b })
  }

  let note: string | null = null
  if (typeof input.note === 'string' && input.note.trim() !== '') {
    note = input.note.trim().slice(0, MAX_NOTE)
  }

  return { ok: true, value: { playedOn: input.playedOn, team1, team2, note, sets } }
}
