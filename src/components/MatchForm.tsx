import { useMemo, useState } from 'react'
import { today } from '../lib/format.ts'
import { pairingKey, pairingOptions, type Team as TeamIds } from '../lib/rotation.ts'
import { t, translateError } from '../strings.ts'
import type { Match, MatchInput, Player } from '../types.ts'
import { ApiError } from '../api.ts'
import { Button, Label, Sheet, Team } from './ui.tsx'

const MAX_SETS = 3
const MAX_GAMES = 9

interface SetInput {
  t1: number
  t2: number
}

function Stepper({ value, onChange, label }: { value: number; onChange: (next: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-strong">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="size-12 text-xl text-muted active:bg-line"
        aria-label={`${label} weniger`}
      >
        &minus;
      </button>
      <span className="min-w-7 text-center text-2xl font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(MAX_GAMES, value + 1))}
        className="size-12 text-xl text-muted active:bg-line"
        aria-label={`${label} mehr`}
      >
        +
      </button>
    </div>
  )
}

export default function MatchForm({
  players,
  matches,
  suggestedTeams,
  existing,
  onClose,
  onSubmit,
  onDelete,
}: {
  players: Player[]
  matches: Match[]
  suggestedTeams: [TeamIds, TeamIds] | null
  existing: Match | null
  onClose: () => void
  onSubmit: (input: MatchInput) => Promise<void>
  onDelete: (() => Promise<void>) | null
}) {
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])

  const options = useMemo(
    () => pairingOptions(players.map((player) => player.id), matches),
    [players, matches],
  )
  // Stabile Reihenfolge, damit die Knoepfe nicht springen; der Rotationsvorschlag
  // ist lediglich vorausgewaehlt.
  const displayOptions = useMemo(() => [...options].sort((a, b) => a.key.localeCompare(b.key)), [options])

  const [playedOn, setPlayedOn] = useState(existing?.playedOn ?? today())
  const [teams, setTeams] = useState<[TeamIds, TeamIds]>(() => {
    if (existing) return [existing.team1, existing.team2]
    // Vorauswahl folgt der Serien-Logik; Fallback auf die Rotations-Ordnung.
    if (suggestedTeams) return suggestedTeams
    const suggested = options[0]
    if (suggested) return suggested.teams
    const ids = players.map((player) => player.id)
    return [
      [ids[0] ?? 0, ids[1] ?? 0],
      [ids[2] ?? 0, ids[3] ?? 0],
    ]
  })
  const [sets, setSets] = useState<SetInput[]>(() =>
    existing && existing.sets.length > 0
      ? existing.sets.map((set) => ({ t1: set.t1Games, t2: set.t2Games }))
      : // 6:0 als Start spart Taps - Padel-Saetze gehen fast immer 6:x aus.
        [{ t1: 6, t2: 0 }],
  )
  const [note, setNote] = useState(existing?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedKey = pairingKey(teams[0], teams[1])
  const field = 'w-full rounded-md border border-strong bg-raised px-3 py-3 text-[1.05rem] text-ink'

  function updateSet(index: number, side: 't1' | 't2', value: number) {
    setSets((current) => current.map((set, i) => (i === index ? { ...set, [side]: value } : set)))
  }

  async function save() {
    if (sets.some((set) => set.t1 === set.t2)) {
      setError(t.errors.tied_set)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        playedOn,
        team1: teams[0],
        team2: teams[1],
        note: note.trim() === '' ? null : note.trim(),
        sets: sets.map((set) => ({ t1Games: set.t1, t2Games: set.t2 })),
      })
      onClose()
    } catch (cause) {
      setError(cause instanceof ApiError ? translateError(cause.code) : t.errors.generic)
      setSaving(false)
    }
  }

  async function remove() {
    if (!onDelete) return
    if (!confirm(t.form.deleteConfirm)) return
    setSaving(true)
    try {
      await onDelete()
      onClose()
    } catch {
      setError(t.errors.generic)
      setSaving(false)
    }
  }

  return (
    <Sheet
      title={existing ? t.form.editTitle : t.form.newTitle}
      onClose={onClose}
      footer={
        <Button onClick={() => void save()} disabled={saving} className="w-full">
          {saving ? t.form.saving : t.form.save}
        </Button>
      }
    >
      <div className="space-y-7">
        <div>
          <label htmlFor="playedOn">
            <Label>{t.form.date}</Label>
          </label>
          <input
            id="playedOn"
            type="date"
            value={playedOn}
            onChange={(event) => setPlayedOn(event.target.value)}
            className={field}
          />
        </div>

        {displayOptions.length > 0 ? (
          <div>
            <Label>{t.form.pairing}</Label>
            <div className="divide-y divide-line rounded-md border border-strong">
              {displayOptions.map((option) => {
                const active = option.key === selectedKey
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setTeams(option.teams)}
                    className={`relative w-full px-3 py-3 text-left text-[1.05rem] ${
                      active ? 'font-semibold' : 'text-muted'
                    }`}
                  >
                    {active ? <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" aria-hidden /> : null}
                    <Team players={option.teams[0].map((id) => playerById.get(id))} />
                    <span className="font-normal text-faint"> {t.home.versus} </span>
                    <Team players={option.teams[1].map((id) => playerById.get(id))} />
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setTeams([teams[1], teams[0]])}
              className="mt-2 text-[0.95rem] text-accent"
            >
              {t.form.swap}
            </button>
          </div>
        ) : null}

        <div>
          <Label>{t.form.sets}</Label>

          <div className="mb-2 grid grid-cols-2 gap-3 text-center text-[0.88rem] text-muted">
            <Team players={teams[0].map((id) => playerById.get(id))} />
            <Team players={teams[1].map((id) => playerById.get(id))} />
          </div>

          <div className="space-y-3">
            {sets.map((set, index) => (
              <div key={index}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[0.88rem] text-faint">{t.form.setLabel(index + 1)}</span>
                  {sets.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setSets((current) => current.filter((_, i) => i !== index))}
                      className="text-[0.88rem] text-muted underline"
                    >
                      {t.form.removeSet}
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stepper
                    value={set.t1}
                    onChange={(value) => updateSet(index, 't1', value)}
                    label={`${t.form.setLabel(index + 1)} links`}
                  />
                  <Stepper
                    value={set.t2}
                    onChange={(value) => updateSet(index, 't2', value)}
                    label={`${t.form.setLabel(index + 1)} rechts`}
                  />
                </div>
              </div>
            ))}
          </div>

          {sets.length < MAX_SETS ? (
            <button
              type="button"
              onClick={() => setSets((current) => [...current, { t1: 6, t2: 0 }])}
              className="mt-3 text-[0.95rem] text-accent"
            >
              {t.form.addSet}
            </button>
          ) : null}
        </div>

        <div>
          <label htmlFor="note">
            <Label>{t.form.note}</Label>
          </label>
          <input
            id="note"
            type="text"
            value={note}
            maxLength={200}
            placeholder={t.form.notePlaceholder}
            onChange={(event) => setNote(event.target.value)}
            className={`${field} placeholder:text-faint`}
          />
        </div>

        {error ? <p className="text-[1.05rem] text-loss">{error}</p> : null}

        {onDelete ? (
          <button type="button" onClick={() => void remove()} disabled={saving} className="text-[0.95rem] text-loss">
            {t.form.delete}
          </button>
        ) : null}
      </div>
    </Sheet>
  )
}
