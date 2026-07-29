import { useEffect, useState } from 'react'
import { listUnbilledExpenses } from '@renderer/lib/db/expenses'
import { formatPeso, formatTemplateDate } from '@renderer/lib/format'
import type { Expense } from '@renderer/lib/types'

type Props = {
  projectId: string
  /** Called with the chosen expenses; parent appends them as line items. */
  onAdd: (expenses: Expense[]) => void
}

/** Lists a project's UNBILLED expenses with checkboxes so they can be pulled
 *  onto the invoice as line items. Added rows disappear from the list. */
export function ExpensePicker({ projectId, onAdd }: Props): JSX.Element {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setSelected(new Set())
    listUnbilledExpenses(projectId)
      .then((rows) => active && setExpenses(rows))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load expenses'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [projectId])

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll(): void {
    setSelected((prev) => (prev.size === expenses.length ? new Set() : new Set(expenses.map((e) => e.id))))
  }

  function addSelected(): void {
    const chosen = expenses.filter((e) => selected.has(e.id))
    if (chosen.length === 0) return
    onAdd(chosen)
    // Remove added rows locally so they can't be added twice.
    setExpenses((prev) => prev.filter((e) => !selected.has(e.id)))
    setSelected(new Set())
  }

  const selectedTotal = expenses
    .filter((e) => selected.has(e.id))
    .reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Unbilled expenses</span>
        {expenses.length > 0 && (
          <button type="button" onClick={toggleAll} className="text-xs text-brand-accent hover:underline">
            {selected.size === expenses.length ? 'Clear all' : 'Select all'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-3 text-sm text-slate-400">Loading expenses…</p>
      ) : error ? (
        <p className="py-3 text-sm text-red-600">{error}</p>
      ) : expenses.length === 0 ? (
        <p className="py-3 text-sm text-slate-400">No unbilled expenses for this project.</p>
      ) : (
        <>
          <ul className="max-h-48 space-y-1 overflow-auto">
            {expenses.map((e) => (
              <li key={e.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-white">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                    className="h-4 w-4 accent-brand-accent"
                  />
                  <span className="flex-1 text-sm text-slate-700">{e.description ?? '—'}</span>
                  <span className="text-xs text-slate-400">{formatTemplateDate(e.expense_date)}</span>
                  <span className="w-24 text-right text-sm tabular-nums text-slate-700">
                    {formatPeso(Number(e.amount))}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-xs text-slate-500">
              {selected.size} selected · {formatPeso(selectedTotal)}
            </span>
            <button
              type="button"
              onClick={addSelected}
              disabled={selected.size === 0}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              Add to line items
            </button>
          </div>
        </>
      )}
    </div>
  )
}
