import { computeStats } from '../src/lib/stats.ts'
import { pairingOptions } from '../src/lib/rotation.ts'
import type { Match } from '../src/types.ts'
import type { StatsInput } from '../src/lib/stats.ts'

let failures = 0

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  ok   ${label}`)
  } else {
    failures++
    console.log(`  FAIL ${label} ${detail}`)
  }
}

const players = [
  { id: 1, name: 'A', color: '#111', sortOrder: 1 },
  { id: 2, name: 'B', color: '#222', sortOrder: 2 },
  { id: 3, name: 'C', color: '#333', sortOrder: 3 },
  { id: 4, name: 'D', color: '#444', sortOrder: 4 },
]

let nextId = 1

function match(
  playedOn: string,
  team1: [number, number],
  team2: [number, number],
  sets: Array<[number, number]>,
): Match {
  return {
    id: nextId++,
    playedOn,
    team1,
    team2,
    note: null,
    source: 'app',
    sets: sets.map(([a, b], index) => ({ setNo: index + 1, t1Games: a, t2Games: b })),
  }
}

console.log('\n1. Bilanzen gehen auf')
{
  const data: StatsInput = {
    players,
    matches: [
      match('2026-01-05', [1, 2], [3, 4], [[6, 4], [6, 3]]),
      match('2026-01-12', [1, 3], [2, 4], [[6, 1]]),
      match('2026-01-19', [1, 4], [2, 3], [[3, 6], [6, 4], [7, 5]]),
    ],
  }
  const stats = computeStats(data)
  check('alle 4 Spieler haben 3 Matches', stats.players.every((entry) => entry.matches === 3))
  const wins = stats.players.reduce((acc, entry) => acc + entry.wins, 0)
  check('Siege gesamt = 2 pro Match', wins === 6, `= ${wins}`)
  const diff = stats.players.reduce((acc, entry) => acc + entry.gameDiff, 0)
  check('Spieldifferenzen heben sich auf', diff === 0, `= ${diff}`)
}

console.log('\n2. Dauersieger steht oben')
{
  const matches: Match[] = []
  const partners: Array<[number, [number, number]]> = [
    [2, [3, 4]],
    [3, [2, 4]],
    [4, [2, 3]],
  ]
  for (let round = 0; round < 6; round++) {
    const entry = partners[round % 3]!
    matches.push(match(`2026-02-${String(round + 1).padStart(2, '0')}`, [1, entry[0]], entry[1], [[6, 1], [6, 2]]))
  }
  const stats = computeStats({ players, matches })
  check('Spieler 1 fuehrt die Rangliste an', stats.players[0]!.player.id === 1, `-> ${stats.players[0]!.player.name}`)
  check('Spieler 1 hat 100% Siegquote', stats.players[0]!.winPct === 100)
  check('Form nur Siege', stats.players[0]!.form.join('') === 'WWWWW')
  check('Form ist auf 5 begrenzt', stats.players[0]!.form.length === 5)
}

console.log('\n3. Gleiche Quote, Spieldifferenz entscheidet')
{
  // Beide gewinnen 1 von 2, Spieler 1 aber deutlicher.
  const data: StatsInput = {
    players,
    matches: [
      match('2026-03-01', [1, 3], [2, 4], [[6, 0], [6, 0]]),
      match('2026-03-08', [2, 3], [1, 4], [[6, 5], [7, 5]]),
    ],
  }
  const stats = computeStats(data)
  const one = stats.players.find((entry) => entry.player.id === 1)!
  const two = stats.players.find((entry) => entry.player.id === 2)!
  check('gleiche Siegquote', one.winPct === two.winPct, `${one.winPct} vs ${two.winPct}`)
  check('bessere Spieldifferenz entscheidet', one.gameDiff > two.gameDiff, `${one.gameDiff} vs ${two.gameDiff}`)
  check(
    'Spieler 1 steht vor Spieler 2',
    stats.players.indexOf(one) < stats.players.indexOf(two),
    `${stats.players.map((entry) => entry.player.name).join(' > ')}`,
  )
}

console.log('\n4. Reihenfolge ist chronologisch, nicht nach Eingabe')
{
  const early = match('2026-04-01', [1, 2], [3, 4], [[6, 0], [6, 0]])
  const late = match('2026-04-08', [1, 3], [2, 4], [[6, 0], [6, 0]])
  const backdated = match('2026-03-20', [1, 4], [2, 3], [[6, 0], [6, 0]])
  const stats = computeStats({ players, matches: [early, late, backdated] })
  check('rueckdatiertes Match wirkt zuerst', stats.outcomes[0]!.match.playedOn === '2026-03-20')
  check('danach chronologisch', stats.outcomes.map((o) => o.match.playedOn).join() === '2026-03-20,2026-04-01,2026-04-08')
}

console.log('\n5. Unentschieden')
{
  const stats = computeStats({ players, matches: [match('2026-05-01', [1, 2], [3, 4], [[6, 4], [4, 6]])] })
  check('kein Sieger', stats.outcomes[0]!.winner === null)
  check(
    'als Unentschieden gezaehlt',
    stats.players.every((entry) => entry.draws === 1 && entry.wins === 0 && entry.losses === 0),
  )
  check('Form zeigt D', stats.players[0]!.form.join('') === 'D')
}

console.log('\n6. Sieg nach Saetzen trotz weniger Spielen')
{
  // 6:7 6:2 4:6 - Team 2 gewinnt 2:1 Saetze, hat aber weniger Spiele (15:16).
  const stats = computeStats({
    players,
    matches: [match('2026-06-01', [1, 2], [3, 4], [[6, 7], [6, 2], [4, 6]])],
  })
  const outcome = stats.outcomes[0]!
  check('Team 2 gewinnt', outcome.winner === 2)
  check('Team 2 hat weniger Spiele', outcome.team2Games < outcome.team1Games, `${outcome.team2Games}:${outcome.team1Games}`)
}

console.log('\n7. Duo-, Partner- und Gegnerstatistik')
{
  const data: StatsInput = {
    players,
    matches: [
      match('2026-07-01', [1, 2], [3, 4], [[6, 0]]),
      match('2026-07-02', [1, 2], [3, 4], [[6, 1]]),
      match('2026-07-03', [3, 4], [1, 2], [[6, 2]]),
    ],
  }
  const stats = computeStats(data)
  const duo12 = stats.duos.find((duo) => duo.key === '1-2')!
  const duo34 = stats.duos.find((duo) => duo.key === '3-4')!
  check('Duo 1-2 hat 3 Matches, 2 Siege', duo12.matches === 3 && duo12.wins === 2)
  check('Duo 3-4 hat 3 Matches, 1 Sieg', duo34.matches === 3 && duo34.wins === 1)
  check('nur 2 Duos aufgetreten', stats.duos.length === 2, `= ${stats.duos.length}`)
  check('Partner von 1 ist nur 2', Object.keys(stats.partners[1]!).join() === '2')
  check('Partnerquote 1+2 = 66.7%', Math.abs(stats.partners[1]![2]!.winPct - 200 / 3) < 1e-9)
  check('Gegner von 1 sind 3 und 4', Object.keys(stats.opponents[1]!).sort().join() === '3,4')
  check(
    'Gegnerbilanz 1 vs 3: 3 Spiele, 2 Siege',
    stats.opponents[1]![3]!.matches === 3 && stats.opponents[1]![3]!.wins === 2,
  )
}

console.log('\n8. Rotation schlaegt die am wenigsten gespielte Paarung vor')
{
  const ids = [1, 2, 3, 4]
  const none = pairingOptions(ids, [])
  check('drei Paarungen bei vier Spielern', none.length === 3)
  check('alle bei 0 Spielen', none.every((option) => option.played === 0))

  const played = [
    match('2026-08-01', [1, 2], [3, 4], [[6, 0]]),
    match('2026-08-02', [1, 3], [2, 4], [[6, 0]]),
  ]
  const suggestion = pairingOptions(ids, played)
  check('Vorschlag ist 1-4|2-3', suggestion[0]!.key === '1-4|2-3', `-> ${suggestion[0]!.key}`)
  check('Vorschlag noch nie gespielt', suggestion[0]!.played === 0)

  const swapped = pairingOptions(ids, [...played, match('2026-08-03', [3, 4], [1, 2], [[6, 0]])])
  check('Seitentausch zaehlt als dieselbe Paarung', swapped.find((option) => option.key === '1-2|3-4')!.played === 2)

  const allOnce = [
    match('2026-09-03', [1, 2], [3, 4], [[6, 0]]),
    match('2026-09-01', [1, 3], [2, 4], [[6, 0]]),
    match('2026-09-02', [1, 4], [2, 3], [[6, 0]]),
  ]
  const tie = pairingOptions(ids, allOnce)
  check('bei Gleichstand aeltestes zuerst', tie[0]!.key === '1-3|2-4', `-> ${tie[0]!.key}`)

  check('kein Vorschlag bei 5 Spielern', pairingOptions([1, 2, 3, 4, 5], []).length === 0)
}

if (failures > 0) throw new Error(`${failures} Check(s) fehlgeschlagen.`)
console.log('\nAlle Checks bestanden.\n')
