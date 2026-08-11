import { useState } from 'react'
import { ApiError, api } from '../api.ts'
import { t } from '../strings.ts'
import { Button } from './ui.tsx'

export default function PasswordGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password === '') return

    setPending(true)
    setError(null)
    try {
      await api.login(password)
      onUnlocked()
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'too_many_attempts') setError(t.login.throttled)
      else if (cause instanceof ApiError && cause.code === 'invalid_password') setError(t.login.wrong)
      else setError(t.login.failed)
      setPending(false)
      setPassword('')
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-xs">
        <h1 className="text-[2rem] leading-none font-semibold tracking-[-0.04em]">{t.appName}</h1>
        <p className="mt-2 text-[1.05rem] text-muted">{t.login.subtitle}</p>

        <form onSubmit={(event) => void submit(event)} className="mt-7 space-y-2.5">
          {/* Damit Passwortmanager den Eintrag sauber zuordnen koennen. */}
          <input type="text" name="username" value="padellist" readOnly hidden autoComplete="username" />
          <input
            type="password"
            value={password}
            autoFocus
            autoComplete="current-password"
            placeholder={t.login.placeholder}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-strong bg-raised px-3 py-3 text-[1.05rem] text-ink placeholder:text-faint"
          />
          <Button type="submit" disabled={pending || password === ''} className="w-full">
            {pending ? t.login.pending : t.login.submit}
          </Button>
          {error ? <p className="text-[0.95rem] text-loss">{error}</p> : null}
        </form>
      </div>
    </main>
  )
}
