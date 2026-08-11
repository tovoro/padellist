import { Heading, Note } from '../components/ui.tsx'
import { formatDate, formatTimestamp } from '../lib/format.ts'
import { t } from '../strings.ts'
import type { ChangeEntry, MatchSnapshot, Player } from '../types.ts'

function teamsOf(snapshot: MatchSnapshot, playerById: Map<number, Player>): string {
  const name = (id: number) => playerById.get(id)?.name ?? '?'
  const side = (team: [number, number]) => `${name(team[0])} + ${name(team[1])}`
  return `${side(snapshot.team1)} ${t.history.versus} ${side(snapshot.team2)}`
}

function scoreOf(snapshot: MatchSnapshot): string {
  return snapshot.sets.map((set) => `${set.t1Games}:${set.t2Games}`).join('  ')
}

function teamsKey(snapshot: MatchSnapshot): string {
  return [...snapshot.team1, ...snapshot.team2].join(',')
}

function sameContent(a: MatchSnapshot, b: MatchSnapshot): boolean {
  return teamsKey(a) === teamsKey(b) && scoreOf(a) === scoreOf(b) && a.playedOn === b.playedOn
}

function Snapshot({
  label,
  snapshot,
  playerById,
  dim = false,
}: {
  label: string
  snapshot: MatchSnapshot
  playerById: Map<number, Player>
  dim?: boolean
}) {
  // Teams und Stand auf zwei Zeilen - sonst bricht der Stand auf schmalen Geraeten um.
  return (
    <div className="flex gap-3">
      <span className="w-12 shrink-0 pt-px text-[0.78rem] text-faint">{label}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-[0.95rem] leading-snug ${dim ? 'text-faint' : 'text-ink'}`}>
          {teamsOf(snapshot, playerById)}
        </div>
        <div className={`text-[0.95rem] leading-snug tabular-nums ${dim ? 'text-faint' : 'text-muted'}`}>
          {scoreOf(snapshot)}
        </div>
      </div>
    </div>
  )
}

export default function Log({
  changes,
  playerById,
}: {
  changes: ChangeEntry[]
  playerById: Map<number, Player>
}) {
  return (
    <div>
      <Heading>{t.history.title}</Heading>

      <div className="mb-4">
        <Note>{t.history.hint}</Note>
      </div>

      {changes.length === 0 ? (
        <p className="text-[1.05rem]">{t.history.empty}</p>
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {changes.map((entry) => {
            const subject = entry.after ?? entry.before
            const changed = entry.before && entry.after && !sameContent(entry.before, entry.after)
            const verb =
              entry.action === 'create'
                ? t.history.create
                : entry.action === 'delete'
                  ? t.history.delete
                  : t.history.update

            return (
              <div key={entry.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3 text-[0.78rem] text-faint">
                  <span>{formatTimestamp(entry.at)}</span>
                  <span className="text-right">
                    {subject ? `${t.history.matchOn(formatDate(subject.playedOn))} ` : ''}
                    {verb}
                  </span>
                </div>

                <div className="mt-1 space-y-1.5">
                  {entry.action === 'update' && entry.before && changed ? (
                    <Snapshot label={t.history.before} snapshot={entry.before} playerById={playerById} dim />
                  ) : null}
                  {entry.after ? (
                    <Snapshot
                      label={entry.action === 'update' ? t.history.after : ''}
                      snapshot={entry.after}
                      playerById={playerById}
                    />
                  ) : null}
                  {entry.action === 'delete' && entry.before ? (
                    <Snapshot label={t.history.removed} snapshot={entry.before} playerById={playerById} dim />
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
