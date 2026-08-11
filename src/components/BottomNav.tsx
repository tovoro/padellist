import { t } from '../strings.ts'

export type Tab = 'home' | 'ranking' | 'matches' | 'log'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'home', label: t.tabs.home },
  { id: 'ranking', label: t.tabs.ranking },
  { id: 'matches', label: t.tabs.matches },
  { id: 'log', label: t.tabs.log },
]

export default function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-xl">
        {TABS.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={selected ? 'page' : undefined}
              className={`relative flex-1 py-3.5 text-[0.98rem] tracking-[-0.01em] ${
                selected ? 'font-semibold text-ink' : 'text-muted'
              }`}
            >
              {selected ? <span className="absolute inset-x-0 top-0 h-px bg-accent" aria-hidden /> : null}
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
