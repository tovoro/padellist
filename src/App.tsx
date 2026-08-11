import { useCallback, useEffect, useMemo, useState } from 'react'
import { UnauthorizedError, api } from './api.ts'
import BottomNav, { type Tab } from './components/BottomNav.tsx'
import MatchForm from './components/MatchForm.tsx'
import PasswordGate from './components/PasswordGate.tsx'
import SettingsSheet from './components/SettingsSheet.tsx'
import { nextSuggestion } from './lib/rotation.ts'
import { computeStats } from './lib/stats.ts'
import { t } from './strings.ts'
import type { AppData, Match, MatchInput } from './types.ts'
import Home from './views/Home.tsx'
import Log from './views/Log.tsx'
import Matches from './views/Matches.tsx'
import Ranking from './views/Ranking.tsx'

type FormTarget = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; match: Match }

export default function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [authorised, setAuthorised] = useState<boolean | null>(null)
  const [stale, setStale] = useState(false)
  const [tab, setTab] = useState<Tab>('home')
  const [form, setForm] = useState<FormTarget>({ mode: 'closed' })
  const [settingsOpen, setSettingsOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await api.data())
      setAuthorised(true)
      setStale(false)
    } catch (cause) {
      if (cause instanceof UnauthorizedError) {
        setAuthorised(false)
        return
      }
      // Der Service Worker liefert offline den letzten Stand; schlaegt auch das
      // fehl, bleibt nur der Hinweis.
      setStale(true)
      setAuthorised(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => (data ? computeStats(data) : null), [data])
  const playerById = useMemo(() => new Map((data?.players ?? []).map((player) => [player.id, player])), [data])
  const suggestion = useMemo(
    () => (data && stats ? nextSuggestion(data.players.map((player) => player.id), stats.outcomes) : null),
    [data, stats],
  )

  if (authorised === null) return <div className="min-h-dvh" />

  if (!authorised) {
    return (
      <PasswordGate
        onUnlocked={() => {
          setAuthorised(true)
          void load()
        }}
      />
    )
  }

  if (!data || !stats) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-[1.05rem] text-muted">{t.errors.offline}</p>
        <button type="button" onClick={() => void load()} className="text-[1.05rem] text-accent">
          {t.errors.retry}
        </button>
      </div>
    )
  }

  async function submitMatch(input: MatchInput) {
    if (form.mode === 'edit') await api.updateMatch(form.match.id, input)
    else await api.createMatch(input)
    await load()
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="mx-auto flex max-w-xl items-center justify-between px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-8 rounded-md" />
          <h1 className="text-[1.7rem] leading-none font-bold tracking-[-0.045em]">{t.appName}</h1>
        </div>
        <button type="button" onClick={() => setSettingsOpen(true)} className="text-[0.95rem] text-muted">
          {t.settings.title}
        </button>
      </header>

      {stale ? <p className="mx-auto max-w-xl px-4 pb-3 text-[0.88rem] text-muted">{t.errors.offline}</p> : null}

      <main className="mx-auto max-w-xl px-4">
        {tab === 'home' ? (
          <Home
            stats={stats}
            suggestion={suggestion}
            playerById={playerById}
            onAddMatch={() => setForm({ mode: 'new' })}
            onShowAll={() => setTab('matches')}
          />
        ) : null}
        {tab === 'ranking' ? <Ranking stats={stats} playerById={playerById} /> : null}
        {tab === 'matches' ? (
          <Matches stats={stats} playerById={playerById} onEdit={(match) => setForm({ mode: 'edit', match })} />
        ) : null}
        {tab === 'log' ? <Log changes={data.changes} playerById={playerById} /> : null}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      {form.mode !== 'closed' ? (
        <MatchForm
          players={data.players}
          matches={data.matches}
          suggestedTeams={suggestion?.teams ?? null}
          existing={form.mode === 'edit' ? form.match : null}
          onClose={() => setForm({ mode: 'closed' })}
          onSubmit={submitMatch}
          onDelete={
            form.mode === 'edit'
              ? async () => {
                  await api.deleteMatch(form.match.id)
                  await load()
                }
              : null
          }
        />
      ) : null}

      {settingsOpen ? (
        <SettingsSheet
          players={data.players}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => void load()}
          onLoggedOut={() => {
            setAuthorised(false)
            setData(null)
          }}
        />
      ) : null}
    </div>
  )
}
