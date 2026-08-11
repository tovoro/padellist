import { useMemo } from 'react'
import { FormDots, Heading, List, Note, Row, Team } from '../components/ui.tsx'
import { formatDiff, formatPct } from '../lib/format.ts'
import { matchupRecords } from '../lib/rotation.ts'
import type { Stats } from '../lib/stats.ts'
import { t } from '../strings.ts'
import type { Player } from '../types.ts'

export default function Ranking({ stats, playerById }: { stats: Stats; playerById: Map<number, Player> }) {
  const players = stats.players.map((entry) => entry.player)

  const matchups = useMemo(
    () => matchupRecords(players.map((player) => player.id), stats.outcomes).filter((record) => record.matches > 0),
    [players, stats.outcomes],
  )

  if (stats.outcomes.length === 0) {
    return (
      <div>
        <Heading>{t.ranking.title}</Heading>
        <p className="text-[1.05rem]">{t.ranking.empty}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section>
        <Heading>{t.ranking.title}</Heading>
        <List>
          {stats.players.map((entry, index) => (
            <Row key={entry.player.id}>
              <div className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-[0.9rem] tabular-nums text-faint">{index + 1}</span>

                <div className="min-w-0 flex-1">
                  <div className="text-[1.15rem] leading-snug font-semibold tracking-[-0.02em]">
                    {entry.player.name}
                  </div>
                  <div className="text-[0.88rem] leading-snug text-muted">
                    {t.ranking.record(entry.wins, entry.losses, entry.draws)}
                  </div>
                  <div className="text-[0.88rem] leading-snug text-faint">
                    {t.ranking.detail(`${entry.setsWon}:${entry.setsLost}`, formatDiff(entry.gameDiff))}
                  </div>
                </div>

                <FormDots form={entry.form} />
              </div>
            </Row>
          ))}
        </List>
      </section>

      <section>
        <h2 className="text-[1.35rem] leading-tight font-semibold tracking-[-0.03em]">{t.ranking.duos}</h2>
        <div className="mt-0.5 mb-3">
          <Note>{t.ranking.duosHint}</Note>
        </div>
        <List>
          {stats.duos.map((duo) => (
            <div key={duo.key} className="flex items-baseline justify-between gap-4 py-2.5">
              <Team players={duo.players} className="text-[1.05rem]" />
              <span className="shrink-0 text-right">
                <span className="text-[1.05rem] font-semibold tabular-nums">{formatPct(duo.winPct)}</span>
                <span className="ml-2 text-[0.88rem] tabular-nums text-faint">
                  {t.ranking.outOf(duo.wins, duo.matches)}
                </span>
              </span>
            </div>
          ))}
        </List>
      </section>

      {matchups.length > 0 ? (
        <section>
          <h2 className="text-[1.35rem] leading-tight font-semibold tracking-[-0.03em]">{t.ranking.matchups}</h2>
          <div className="mt-0.5 mb-3">
            <Note>{t.ranking.matchupsHint}</Note>
          </div>
          <List>
            {matchups.map((record) => (
              <div key={record.key} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`min-w-0 flex-1 truncate text-[1.05rem] ${record.winsA > record.winsB ? 'font-semibold' : 'text-muted'}`}>
                    <Team players={record.teams[0].map((id) => playerById.get(id))} />
                  </span>
                  <span className="shrink-0 text-[1.05rem] font-semibold tabular-nums">
                    {record.winsA} : {record.winsB}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-right text-[1.05rem] ${record.winsB > record.winsA ? 'font-semibold' : 'text-muted'}`}>
                    <Team players={record.teams[1].map((id) => playerById.get(id))} />
                  </span>
                </div>
                {record.draws > 0 ? (
                  <div className="mt-0.5 text-center text-[0.78rem] text-faint">
                    {record.draws} unentschieden
                  </div>
                ) : null}
              </div>
            ))}
          </List>
        </section>
      ) : null}
    </div>
  )
}
