import { useEffect, useMemo, useState } from 'react'
import { listUnbilledExpenses } from '@renderer/lib/db/expenses'
import { listBudgetCategories } from '@renderer/lib/db/budget'
import { formatPeso, formatTemplateDate } from '@renderer/lib/format'
import type { Expense } from '@renderer/lib/types'

/** An expense chosen for billing, tagged with its category name (null = none). */
export type ExpensePick = { expense: Expense; categoryName: string | null }

type Props = {
  projectId: string
  /** Called with the chosen expenses (+ category name); parent appends them. */
  onAdd: (picks: ExpensePick[]) => void
}

/** Lists a project's UNBILLED expenses, grouped by budget category, with
 *  checkboxes so they can be pulled onto the invoice as line items. Added rows
 *  disappear from the list. */
export function ExpensePicker({ projectId, onAdd }: Props): JSX.Element {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categoryName, setCategoryName] = useState<Map<string, string>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setSelected(new Set())
    Promise.all([listUnbilledExpenses(projectId), listBudgetCategories(projectId)])
      .then(([rows, cats]) => {
        if (!active) return
        setExpenses(rows)
        setCategoryName(new Map(cats.map((c) => [c.id, c.name])))
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load expenses'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [projectId])

  const nameFor = (e: Expense): string | null =>
    e.category_id ? (categoryName.get(e.category_id) ?? null) : null

  // Ordered groups: each category that has unbilled expenses, then uncategorized.
  const groups = useMemo(() => {
    const byCat = new Map<string, Expense[]>()
    const uncategorized: Expense[] = []
    for (const e of expenses) {
      const name = nameFor(e)
      if (name === null) uncategorized.push(e)
      else {
        const arr = byCat.get(name) ?? []
        arr.push(e)
        byCat.set(name, arr)
      }
    }
    const out: { name: string | null; items: Expense[] }[] = []
    for (const [name, items] of byCat) out.push({ name, items })
    out.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    if (uncategorized.length) out.push({ name: null, items: uncategorized })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, categoryName])

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(): void {
    setSelected((prev) =>
      prev.size === expenses.length ? new Set() : new Set(expenses.map((e) => e.id))
    )
  }

  function addSelected(): void {
    const picks: ExpensePick[] = expenses
      .filter((e) => selected.has(e.id))
      .map((e) => ({ expense: e, categoryName: nameFor(e) }))
    if (picks.length === 0) return
    onAdd(picks)
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
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-brand-accent hover:underline"
          >
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
          <div className="max-h-48 space-y-2 overflow-auto">
            {groups.map((g) => (
              <div key={g.name ?? '__uncat__'}>
                <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {g.name ?? 'Uncategorized'}
                </div>
                <ul className="space-y-1">
                  {g.items.map((e) => (
                    <li key={e.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 pl-3 hover:bg-white">
                        <input
                          type="checkbox"
                          checked={selected.has(e.id)}
                          onChange={() => toggle(e.id)}
                          className="h-4 w-4 accent-brand-accent"
                        />
                        <span className="flex-1 text-sm text-slate-700">{e.description ?? '—'}</span>
                        <span className="text-xs text-slate-400">
                          {formatTemplateDate(e.expense_date)}
                        </span>
                        <span className="w-24 text-right text-sm tabular-nums text-slate-700">
                          {formatPeso(Number(e.amount))}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

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
