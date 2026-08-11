import { useEffect, useState } from 'react'
import { t } from '../strings.ts'

const DISMISS_KEY = 'padellist-install-hint'

// Chromium-only Event, fehlt in lib.dom.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

/** iPads melden sich seit iPadOS 13 als Mac, aber mit Touchscreen. */
function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * Dezenter Installationshinweis: auf Chromium ein Knopf fuer den nativen Dialog,
 * auf iOS eine Anleitung (Safari kennt keine Install-API). Verschwindet dauerhaft
 * nach Installation oder Wegklicken.
 */
export default function InstallHint() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'dismissed')
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (dismissed || isStandalone()) return null
  if (!installEvent && !isIos()) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, 'dismissed')
    setDismissed(true)
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') dismiss()
  }

  return (
    <div className="rounded-md border border-line px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.95rem] font-medium tracking-[-0.01em]">{t.install.title}</div>

          {installEvent ? (
            <button
              type="button"
              onClick={() => void install()}
              className="mt-1.5 rounded-md bg-accent px-3.5 py-2 text-[0.95rem] font-medium text-accent-ink active:opacity-85"
            >
              {t.install.action}
            </button>
          ) : (
            <p className="mt-0.5 text-[0.88rem] leading-snug text-muted">
              <ShareIcon /> {t.install.iosHint}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label={t.install.dismiss}
          className="-mt-1 -mr-1 p-1 text-lg leading-none text-faint"
        >
          &times;
        </button>
      </div>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="inline size-4 -translate-y-px align-middle"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 8H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2" />
      <path d="M12 15V3" />
      <path d="m8 6 4-4 4 4" />
    </svg>
  )
}
