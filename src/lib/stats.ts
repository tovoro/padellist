import type { AppData, Match, Player } from '../types.ts'

export type Result = 'W' | 'L' | 'D'

export interface MatchOutcome {
  match: Match
  team1Sets: number
  team2Sets: number
  team1Games: number
  team2Games: number
  /** null = unentschieden (moeglich bei 1:1 Saetzen und gleicher Spielanzahl) */
  winner: 1 | 2 | null
}

export interface PlayerStats {
  player: Player
  matches: number
  wins: number
  losses: number
  draws: number
  winPct: number
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
  gameDiff: number
  /** juengstes Resultat zuerst, maximal 5 */
  form: Result[]
}

export interface PairRecord {
  matches: number
  wins: number
  draws: number
  winPct: number
}

export interface DuoStats {
  key: string
  players: [Player, Player]
  matches: number
  wins: number
  losses: number
  draws: number
  winPct: number
  gamesWon: number
  gamesLost: number
}

/** Statistik braucht nur Spieler und Matches - der Verlauf geht sie nichts an. */
export type StatsInput = Pick<AppData, 'players' | 'matches'>

export interface Stats {
  players: PlayerStats[]
  duos: DuoStats[]
  partners: Record<number, Record<number, PairRecord>>
  opponents: Record<number, Record<number, PairRecord>>
  /** chronologisch aufsteigend */
  outcomes: MatchOutcome[]
}

export function duoKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

export function summariseMatch(match: Match): MatchOutcome {
  let team1Sets = 0
  let team2Sets = 0
  let team1Games = 0
  let team2Games = 0

  for (const set of match.sets) {
    team1Games += set.t1Games
    team2Games += set.t2Games
    if (set.t1Games > set.t2Games) team1Sets++
    else if (set.t2Games > set.t1Games) team2Sets++
  }

  let winner: 1 | 2 | null = null
  if (team1Sets > team2Sets) winner = 1
  else if (team2Sets > team1Sets) winner = 2
  else if (team1Games > team2Games) winner = 1
  else if (team2Games > team1Games) winner = 2

  return { match, team1Sets, team2Sets, team1Games, team2Games, winner }
}

export function chronological(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => (a.playedOn === b.playedOn ? a.id - b.id : a.playedOn < b.playedOn ? -1 : 1))
}

function emptyPair(): PairRecord {
  return { matches: 0, wins: 0, draws: 0, winPct: 0 }
}

function recordPair(
  table: Record<number, Record<number, PairRecord>>,
  a: number,
  b: number,
  won: boolean,
  drew: boolean,
): void {
  const row = (table[a] ??= {})
  const cell = (row[b] ??= emptyPair())
  cell.matches++
  if (won) cell.wins++
  if (drew) cell.draws++
}

function finalisePairs(table: Record<number, Record<number, PairRecord>>): void {
  for (const row of Object.values(table)) {
    for (const cell of Object.values(row)) {
      cell.winPct = cell.matches === 0 ? 0 : (cell.wins / cell.matches) * 100
    }
  }
}

export function computeStats(data: StatsInput): Stats {
  const playerById = new Map(data.players.map((player) => [player.id, player]))

  const accumulator = new Map<
    number,
    Omit<PlayerStats, 'player' | 'winPct' | 'gameDiff' | 'form'> & { results: Result[] }
  >(
    data.players.map((player) => [
      player.id,
      {
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        results: [],
      },
    ]),
  )

  const duoAccumulator = new Map<
    string,
    {
      ids: [number, number]
      matches: number
      wins: number
      losses: number
      draws: number
      gamesWon: number
      gamesLost: number
    }
  >()

  const partners: Record<number, Record<number, PairRecord>> = {}
  const opponents: Record<number, Record<number, PairRecord>> = {}
  const outcomes: MatchOutcome[] = []

  for (const match of chronological(data.matches)) {
    if (match.sets.length === 0) continue
    const outcome = summariseMatch(match)
    outcomes.push(outcome)

    const drew = outcome.winner === null
    const teams: Array<{
      ids: [number, number]
      foes: [number, number]
      won: boolean
      sets: number
      foeSets: number
      games: number
      foeGames: number
    }> = [
      {
        ids: match.team1,
        foes: match.team2,
        won: outcome.winner === 1,
        sets: outcome.team1Sets,
        foeSets: outcome.team2Sets,
        games: outcome.team1Games,
        foeGames: outcome.team2Games,
      },
      {
        ids: match.team2,
        foes: match.team1,
        won: outcome.winner === 2,
        sets: outcome.team2Sets,
        foeSets: outcome.team1Sets,
        games: outcome.team2Games,
        foeGames: outcome.team1Games,
      },
    ]

    for (const team of teams) {
      for (const [index, id] of team.ids.entries()) {
        const stats = accumulator.get(id)
        if (!stats) continue
        stats.matches++
        if (drew) stats.draws++
        else if (team.won) stats.wins++
        else stats.losses++
        stats.setsWon += team.sets
        stats.setsLost += team.foeSets
        stats.gamesWon += team.games
        stats.gamesLost += team.foeGames
        stats.results.unshift(drew ? 'D' : team.won ? 'W' : 'L')

        const partner = team.ids[index === 0 ? 1 : 0]
        if (partner !== undefined) recordPair(partners, id, partner, team.won, drew)
        for (const foe of team.foes) recordPair(opponents, id, foe, team.won, drew)
      }

      const key = duoKey(team.ids[0], team.ids[1])
      const duo = duoAccumulator.get(key) ?? {
        ids: [Math.min(team.ids[0], team.ids[1]), Math.max(team.ids[0], team.ids[1])] as [number, number],
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        gamesWon: 0,
        gamesLost: 0,
      }
      duo.matches++
      if (drew) duo.draws++
      else if (team.won) duo.wins++
      else duo.losses++
      duo.gamesWon += team.games
      duo.gamesLost += team.foeGames
      duoAccumulator.set(key, duo)
    }
  }

  finalisePairs(partners)
  finalisePairs(opponents)

  const players: PlayerStats[] = data.players.map((player) => {
    const stats = accumulator.get(player.id)
    const matches = stats?.matches ?? 0
    const wins = stats?.wins ?? 0
    const gamesWon = stats?.gamesWon ?? 0
    const gamesLost = stats?.gamesLost ?? 0

    return {
      player,
      matches,
      wins,
      losses: stats?.losses ?? 0,
      draws: stats?.draws ?? 0,
      winPct: matches === 0 ? 0 : (wins / matches) * 100,
      setsWon: stats?.setsWon ?? 0,
      setsLost: stats?.setsLost ?? 0,
      gamesWon,
      gamesLost,
      gameDiff: gamesWon - gamesLost,
      form: (stats?.results ?? []).slice(0, 5),
    }
  })

  // Siegquote entscheidet, bei Gleichstand die Spieldifferenz.
  players.sort(
    (a, b) => b.winPct - a.winPct || b.gameDiff - a.gameDiff || a.player.name.localeCompare(b.player.name),
  )

  const duos: DuoStats[] = []
  for (const [key, duo] of duoAccumulator) {
    const first = playerById.get(duo.ids[0])
    const second = playerById.get(duo.ids[1])
    if (!first || !second) continue
    duos.push({
      key,
      players: [first, second],
      matches: duo.matches,
      wins: duo.wins,
      losses: duo.losses,
      draws: duo.draws,
      winPct: duo.matches === 0 ? 0 : (duo.wins / duo.matches) * 100,
      gamesWon: duo.gamesWon,
      gamesLost: duo.gamesLost,
    })
  }
  duos.sort((a, b) => b.winPct - a.winPct || b.matches - a.matches || a.key.localeCompare(b.key))

  return { players, duos, partners, opponents, outcomes }
}
