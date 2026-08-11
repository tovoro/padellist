import { formatDayNumber, formatWeekday } from '../lib/format.ts'
import type { MatchOutcome } from '../lib/stats.ts'
import { t } from '../strings.ts'
import type { Player } from '../types.ts'

interface Side {
  players: Array<Player | undefined>
  games: number[]
  setWon: boolean[]
  won: boolean
}

export default function MatchRow({
  outcome,
  playerById,
  onEdit,
  showDate = true,
}: {
  outcome: MatchOutcome
  playerById: Map<number, Player>
  onEdit?: () => void
  showDate?: boolean
}) {
  const { match, winner } = outcome

  const first: Side = {
    players: match.team1.map((id) => playerById.get(id)),
    games: match.sets.map((set) => set.t1Games),
    setWon: match.sets.map((set) => set.t1Games > set.t2Games),
    won: winner === 1,
  }
  const second: Side = {
    players: match.team2.map((id) => playerById.get(id)),
    games: match.sets.map((set) => set.t2Games),
    setWon: match.sets.map((set) => set.t2Games > set.t1Games),
    won: winner === 2,
  }

  // Der Sieger steht oben. So liest sich das Resultat, statt dass man es vergleichen muss.
  const sides = winner === 2 ? [second, first] : [first, second]

  const body = (
    <div className="flex gap-3 py-3">
      {showDate ? (
        <div className="w-9 shrink-0 pt-px text-[0.78rem] leading-tight text-faint">
          <div>{formatWeekday(match.playedOn)}</div>
          <div className="tabular-nums">{formatDayNumber(match.playedOn)}</div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        {sides.map((side, index) => (
          <div key={index} className="flex items-baseline gap-3">
            <span
              className={`min-w-0 flex-1 truncate text-[1.05rem] leading-relaxed ${
                side.won ? 'font-semibold' : 'text-muted'
              }`}
            >
              {side.players.map((player) => player?.name ?? '?').join(' + ')}
            </span>

            <span className="flex shrink-0 gap-2">
              {side.games.map((value, setIndex) => (
                <span
                  key={setIndex}
                  className={`w-[1.1rem] text-right text-[1.05rem] leading-relaxed tabular-nums ${
                    side.setWon[setIndex] ? 'font-semibold text-ink' : 'text-faint'
                  }`}
                >
                  {value}
                </span>
              ))}
            </span>
          </div>
        ))}

        {winner === null || match.note ? (
          <div className="mt-0.5 flex gap-2 text-[0.78rem] text-faint">
            {winner === null ? <span>{t.matches.draw}</span> : null}
            {match.note ? <span className="truncate">{match.note}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  )

  if (!onEdit) return body
  return (
    <button type="button" onClick={onEdit} className="block w-full text-left active:bg-line/50">
      {body}
    </button>
  )
}
