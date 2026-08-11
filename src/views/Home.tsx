import InstallHint from '../components/InstallHint.tsx'
import MatchRow from '../components/MatchRow.tsx'
import { Button, Heading, List, Note, Team } from '../components/ui.tsx'
import { formatDate } from '../lib/format.ts'
import type { Suggestion } from '../lib/rotation.ts'
import type { Stats } from '../lib/stats.ts'
import { t } from '../strings.ts'
import type { Player } from '../types.ts'

function suggestionNote(suggestion: Suggestion): string {
  if (suggestion.kind === 'series' && suggestion.wins) {
    const [a, b] = suggestion.wins
    return suggestion.matchNo === 3 ? t.home.seriesDecider(a, b) : t.home.seriesSecond(a, b)
  }
  if (suggestion.lastPlayedOn) return `${t.home.seriesNew} – ${t.home.lastPlayed(formatDate(suggestion.lastPlayedOn))}`
  return `${t.home.seriesNew} – ${t.home.neverPlayed}`
}

export default function Home({
  stats,
  suggestion,
  playerById,
  onAddMatch,
  onShowAll,
}: {
  stats: Stats
  suggestion: Suggestion | null
  playerById: Map<number, Player>
  onAddMatch: () => void
  onShowAll: () => void
}) {
  const recent = [...stats.outcomes].reverse().slice(0, 4)

  return (
    <div className="space-y-9">
      <section>
        {suggestion ? (
          <>
            <Heading>{t.home.nextTitle}</Heading>
            <div className="border-y border-line py-4 text-[1.7rem] leading-[1.2] font-semibold tracking-[-0.035em]">
              <Team players={suggestion.teams[0].map((id) => playerById.get(id))} />
              <div className="text-[1.05rem] font-normal tracking-normal text-faint">{t.home.versus}</div>
              <Team players={suggestion.teams[1].map((id) => playerById.get(id))} />
            </div>
            <div className="mt-2">
              <Note>{suggestionNote(suggestion)}</Note>
            </div>
          </>
        ) : null}

        <Button onClick={onAddMatch} className="mt-5 w-full">
          {t.home.addMatch}
        </Button>
      </section>

      <section>
        <Heading>{t.home.recent}</Heading>
        {recent.length === 0 ? (
          <div className="space-y-1">
            <p className="text-[1.05rem]">{t.home.empty}</p>
            <Note>{t.home.emptyHint}</Note>
          </div>
        ) : (
          <>
            <List>
              {recent.map((outcome) => (
                <MatchRow key={outcome.match.id} outcome={outcome} playerById={playerById} />
              ))}
            </List>
            {stats.outcomes.length > recent.length ? (
              <button type="button" onClick={onShowAll} className="mt-3 text-[1.05rem] text-accent">
                {t.home.all}
              </button>
            ) : null}
          </>
        )}
      </section>

      <InstallHint />
    </div>
  )
}
