import { useState } from 'react'
import { api } from '../api.ts'
import { t } from '../strings.ts'
import type { Player } from '../types.ts'
import { Button, Label, Sheet } from './ui.tsx'

export default function SettingsSheet({
  players,
  onClose,
  onSaved,
  onLoggedOut,
}: {
  players: Player[]
  onClose: () => void
  onSaved: () => void
  onLoggedOut: () => void
}) {
  const [names, setNames] = useState<Record<number, string>>(() =>
    Object.fromEntries(players.map((player) => [player.id, player.name])),
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    const updates = players
      .map((player) => ({ id: player.id, name: (names[player.id] ?? '').trim() }))
      .filter((entry) => entry.name !== '')

    if (updates.length === 0) return

    setSaving(true)
    setMessage(null)
    try {
      await api.renamePlayers(updates)
      onSaved()
      setMessage(t.settings.saved)
    } catch {
      setMessage(t.errors.generic)
    }
    setSaving(false)
  }

  async function logout() {
    await api.logout().catch(() => undefined)
    onLoggedOut()
  }

  return (
    <Sheet
      title={t.settings.title}
      onClose={onClose}
      footer={
        <Button onClick={() => void save()} disabled={saving} className="w-full">
          {t.settings.save}
        </Button>
      }
    >
      <div className="space-y-6">
        <div>
          <Label>{t.settings.players}</Label>
          <div className="space-y-2">
            {players.map((player) => (
              <input
                key={player.id}
                type="text"
                value={names[player.id] ?? ''}
                maxLength={24}
                onChange={(event) => setNames((current) => ({ ...current, [player.id]: event.target.value }))}
                className="w-full rounded-md border border-strong bg-raised px-3 py-3 text-[1.05rem] text-ink"
                aria-label={`Name ${player.name}`}
              />
            ))}
          </div>
        </div>

        {message ? <p className="text-[0.95rem] text-accent">{message}</p> : null}

        <button type="button" onClick={() => void logout()} className="text-[0.95rem] text-loss">
          {t.settings.logout}
        </button>
      </div>
    </Sheet>
  )
}
