import type { Match } from '../types.ts'
import { duoKey, type MatchOutcome } from './stats.ts'

export type Team = [number, number]

export interface PairingOption {
  key: string
  teams: [Team, Team]
  played: number
  lastPlayedOn: string | null
}

export interface MatchupRecord {
  key: string
  teams: [Team, Team]
  winsA: number
  winsB: number
  draws: number
  matches: number
}

export function pairingKey(team1: Team, team2: Team): string {
  return [duoKey(team1[0], team1[1]), duoKey(team2[0], team2[1])].sort().join('|')
}

/** Vier Spieler lassen sich auf genau drei Arten aufteilen. */
function combinations(playerIds: number[]): Array<[Team, Team]> {
  if (playerIds.length !== 4) return []
  const [a, b, c, d] = [...playerIds].sort((x, y) => x - y) as [number, number, number, number]
  return [
    [
      [a, b],
      [c, d],
    ],
    [
      [a, c],
      [b, d],
    ],
    [
      [a, d],
      [b, c],
    ],
  ]
}

/**
 * Der Vorschlag wird immer aus den Matches abgeleitet und nie gespeichert - ein
 * gespeicherter Zeiger wuerde verrutschen, sobald ein Match nachtraeglich erfasst
 * oder geloescht wird.
 */
export function pairingOptions(playerIds: number[], matches: Match[]): PairingOption[] {
  const history = new Map<string, { played: number; lastPlayedOn: string | null }>()
  for (const match of matches) {
    const key = pairingKey(match.team1, match.team2)
    const entry = history.get(key) ?? { played: 0, lastPlayedOn: null }
    entry.played++
    if (entry.lastPlayedOn === null || match.playedOn > entry.lastPlayedOn) entry.lastPlayedOn = match.playedOn
    history.set(key, entry)
  }

  const options = combinations(playerIds).map<PairingOption>(([team1, team2]) => {
    const key = pairingKey(team1, team2)
    const entry = history.get(key)
    return { key, teams: [team1, team2], played: entry?.played ?? 0, lastPlayedOn: entry?.lastPlayedOn ?? null }
  })

  options.sort((x, y) => {
    if (x.played !== y.played) return x.played - y.played
    if (x.lastPlayedOn === y.lastPlayedOn) return x.key.localeCompare(y.key)
    if (x.lastPlayedOn === null) return -1
    if (y.lastPlayedOn === null) return 1
    return x.lastPlayedOn < y.lastPlayedOn ? -1 : 1
  })

  return options
}

export interface Suggestion {
  teams: [Team, Team]
  kind: 'series' | 'fresh'
  /** nur bei kind='series': Serienstand aus Sicht von teams[0] */
  wins?: [number, number]
  /** nur bei kind='series': Nummer des naechsten Matchs in der Serie */
  matchNo?: 2 | 3
  /** nur bei kind='fresh': letzter Spieltag der vorgeschlagenen Konstellation */
  lastPlayedOn?: string | null
}

/**
 * Gespielt wird in Serien: dieselbe Konstellation bleibt ueber Termine bestehen,
 * bis ein Duo zwei Matches gewonnen hat oder drei gespielt sind - erst dann wird
 * rotiert. Die laufende Serie ist die hinterste Kette gleicher Konstellation in
 * der Historie; sie wird nie gespeichert und korrigiert sich bei Nachtraegen selbst.
 */
export function nextSuggestion(playerIds: number[], outcomes: MatchOutcome[]): Suggestion | null {
  const options = pairingOptions(playerIds, outcomes.map((outcome) => outcome.match))
  const freshest = options[0]
  if (!freshest) return null

  const last = outcomes[outcomes.length - 1]
  if (!last) return { teams: freshest.teams, kind: 'fresh', lastPlayedOn: freshest.lastPlayedOn }

  const seriesKey = pairingKey(last.match.team1, last.match.team2)
  const run: MatchOutcome[] = []
  for (let i = outcomes.length - 1; i >= 0; i--) {
    const outcome = outcomes[i]!
    if (pairingKey(outcome.match.team1, outcome.match.team2) !== seriesKey) break
    run.push(outcome)
  }

  // Stand aus Sicht der Teams des juengsten Matchs; Seitentausch innerhalb der
  // Serie wird ueber den duoKey des Gewinner-Duos neutralisiert.
  const keyA = duoKey(last.match.team1[0], last.match.team1[1])
  let winsA = 0
  let winsB = 0
  for (const outcome of run) {
    if (outcome.winner === null) continue
    const winning = outcome.winner === 1 ? outcome.match.team1 : outcome.match.team2
    if (duoKey(winning[0], winning[1]) === keyA) winsA++
    else winsB++
  }

  const decided = winsA >= 2 || winsB >= 2 || run.length >= 3
  if (decided) return { teams: freshest.teams, kind: 'fresh', lastPlayedOn: freshest.lastPlayedOn }

  return {
    teams: [last.match.team1, last.match.team2],
    kind: 'series',
    wins: [winsA, winsB],
    matchNo: run.length === 1 ? 2 : 3,
  }
}

/**
 * Bilanz je Aufteilung. Bei vier festen Spielern ist Paar gegen Paar die
 * eigentliche Direktbegegnung - es gibt davon nur drei.
 */
export function matchupRecords(playerIds: number[], outcomes: MatchOutcome[]): MatchupRecord[] {
  return combinations(playerIds).map(([teamA, teamB]) => {
    const key = pairingKey(teamA, teamB)
    const keyA = duoKey(teamA[0], teamA[1])
    let winsA = 0
    let winsB = 0
    let draws = 0
    let matches = 0

    for (const outcome of outcomes) {
      if (pairingKey(outcome.match.team1, outcome.match.team2) !== key) continue
      matches++
      if (outcome.winner === null) {
        draws++
        continue
      }
      const winningTeam = outcome.winner === 1 ? outcome.match.team1 : outcome.match.team2
      if (duoKey(winningTeam[0], winningTeam[1]) === keyA) winsA++
      else winsB++
    }

    return { key, teams: [teamA, teamB], winsA, winsB, draws, matches }
  })
}
