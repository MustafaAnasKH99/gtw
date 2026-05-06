const TABS = [
  { id: 'game', label: 'Game' },
  { id: 'about', label: 'About GTW' },
  { id: 'builtby', label: 'Built By' },
]

export default function TabNav({ active, onChange }) {
  return (
    <nav className="tab-nav" aria-label="Site sections">
      {TABS.map((t) => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            type="button"
            className={isActive ? 'tab-nav__btn tab-nav__btn--active' : 'tab-nav__btn'}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}
