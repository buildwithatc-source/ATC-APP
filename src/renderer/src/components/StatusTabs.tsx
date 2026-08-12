type Tab<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  tabs: Tab<T>[]
  value: T
  counts?: Partial<Record<T, number>>
  onChange: (value: T) => void
}

/** A row of filter tabs (Active / Complete / Archived) with optional counts. */
export function StatusTabs<T extends string>({
  tabs,
  value,
  counts,
  onChange
}: Props<T>): JSX.Element {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
      {tabs.map((t) => {
        const active = t.value === value
        const count = counts?.[t.value]
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {typeof count === 'number' && (
              <span className={`ml-1.5 ${active ? 'text-slate-400' : 'text-slate-400'}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
