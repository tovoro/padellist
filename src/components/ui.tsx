import type { ReactNode } from 'react'
import type { Result } from '../lib/stats.ts'
import type { Player } from '../types.ts'

export function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-[1.35rem] leading-tight font-semibold tracking-[-0.03em]">{children}</h2>
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-2 block text-[0.9rem] font-medium tracking-[-0.01em] text-muted">{children}</span>
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-[0.9rem] leading-snug text-muted">{children}</p>
}

/** Gefuellt = Sieg, hohl = Niederlage, grau = unentschieden. Juengstes rechts. */
export function FormDots({ form }: { form: Result[] }) {
  if (form.length === 0) return null
  const styles: Record<Result, string> = {
    W: 'bg-accent',
    L: 'bg-loss',
    D: 'bg-strong',
  }
  return (
    <span className="inline-flex gap-[5px]">
      {[...form].reverse().map((result, index) => (
        <span key={index} className={`size-[7px] rounded-full ${styles[result]}`} />
      ))}
    </span>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'quiet'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  const styles = {
    primary: 'bg-accent text-accent-ink active:opacity-85',
    quiet: 'border border-strong text-ink active:bg-line',
  }[variant]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-md px-4 text-[1.05rem] font-medium tracking-[-0.01em] transition-opacity disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function Team({ players, className = '' }: { players: Array<Player | undefined>; className?: string }) {
  return <span className={className}>{players.map((player) => player?.name ?? '?').join(' + ')}</span>
}

export function List({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line border-y border-line">{children}</div>
}

export function Row({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  if (!onClick) return <div className="py-3">{children}</div>
  return (
    <button type="button" onClick={onClick} className="w-full py-3 text-left active:bg-line/50">
      {children}
    </button>
  )
}

export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45" onClick={onClose}>
      <div
        className="max-h-[93vh] overflow-y-auto rounded-t-lg border-t border-strong bg-bg pb-[env(safe-area-inset-bottom)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg px-4 py-3">
          <h2 className="text-[1.2rem] font-semibold tracking-[-0.03em]">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-1 px-1 text-[1.05rem] text-muted">
            Fertig
          </button>
        </div>
        <div className="px-4 py-5">{children}</div>
        {footer ? <div className="sticky bottom-0 border-t border-line bg-bg px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  )
}
