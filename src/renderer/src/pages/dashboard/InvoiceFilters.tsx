import type { Client, InvoiceStatus } from '@renderer/lib/types'

export type Filters = {
  search: string
  clientId: string // '' = all
  status: InvoiceStatus | '' // '' = all
  from: string // yyyy-mm-dd or ''
  to: string // yyyy-mm-dd or ''
}

export const emptyFilters: Filters = { search: '', clientId: '', status: '', from: '', to: '' }

const control =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30'

type Props = {
  value: Filters
  clients: Client[]
  onChange: (next: Filters) => void
}

export function InvoiceFilters({ value, clients, onChange }: Props): JSX.Element {
  const set = (patch: Partial<Filters>): void => onChange({ ...value, ...patch })
  const dirty = JSON.stringify(value) !== JSON.stringify(emptyFilters)

  return (
    <div className="flex flex-wrap items-end gap-2">
      <input
        className={`${control} min-w-[200px] flex-1`}
        placeholder="Search invoice # or client…"
        value={value.search}
        onChange={(e) => set({ search: e.target.value })}
      />

      <select
        className={control}
        value={value.clientId}
        onChange={(e) => set({ clientId: e.target.value })}
      >
        <option value="">All clients</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1 text-xs text-slate-500">
        From
        <input
          type="date"
          className={control}
          value={value.from}
          onChange={(e) => set({ from: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-slate-500">
        To
        <input
          type="date"
          className={control}
          value={value.to}
          onChange={(e) => set({ to: e.target.value })}
        />
      </label>

      {dirty && (
        <button
          onClick={() => onChange(emptyFilters)}
          className="px-2 py-2 text-sm text-slate-500 hover:text-slate-800 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}
