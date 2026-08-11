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
