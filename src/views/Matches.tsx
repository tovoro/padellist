import MatchRow from '../components/MatchRow.tsx'
import { Heading, Note } from '../components/ui.tsx'
import { formatMonth, monthKey } from '../lib/format.ts'
import type { MatchOutcome, Stats } from '../lib/stats.ts'
import { t } from '../strings.ts'
import type { Match, Player } from '../types.ts'

function groupByMonth(outcomes: MatchOutcome[]): Array<{ key: string; label: string; items: MatchOutcome[] }> {
  const groups: Array<{ key: string; label: string; items: MatchOutcome[] }> = []
  for (const outcome of outcomes) {
    const key = monthKey(outcome.match.playedOn)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(outcome)
    else groups.push({ key, label: formatMonth(outcome.match.playedOn), items: [outcome] })
  }
  return groups
}

export default function Matches({
  stats,
  playerById,
  onEdit,
}: {
  stats: Stats
  playerById: Map<number, Player>
  onEdit: (match: Match) => void
}) {
  const groups = groupByMonth([...stats.outcomes].reverse())

  return (
    <div>
      <Heading>{t.matches.title}</Heading>

      {groups.length === 0 ? (
        <p className="text-[1.05rem]">{t.matches.empty}</p>
      ) : (
        <>
          <div className="mb-4">
            <Note>{t.matches.tapToEdit}</Note>
          </div>

          <div className="space-y-7">
            {groups.map((group) => (
              <section key={group.key}>
                <h3 className="mb-1 text-[0.8rem] font-medium tracking-[0.06em] text-faint uppercase">
                  {group.label}
                </h3>
                <div className="divide-y divide-line border-y border-line">
                  {group.items.map((outcome) => (
                    <MatchRow
                      key={outcome.match.id}
                      outcome={outcome}
                      playerById={playerById}
                      onEdit={() => onEdit(outcome.match)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
