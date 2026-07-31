import { useEffect, useState } from 'react'
import {
  createScopeTemplate,
  deleteScopeTemplate,
  listScopeTemplates
} from '@renderer/lib/db/scopeTemplates'
import type { ScopeTemplate } from '@renderer/lib/types'

type Props = {
  /** Add the chosen template names as scope items. */
  onAddItems: (names: string[]) => Promise<void>
}

/** Dropdown checklist of reusable scope names, with an "add new" option. */
export function QuickAddMenu({ onAddItems }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<ScopeTemplate[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listScopeTemplates()
      .then(setTemplates)
      .finally(() => setLoading(false))
  }, [open])

  function toggle(name: string): void {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  async function addNew(): Promise<void> {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      const t = await createScopeTemplate(name)
      setTemplates((prev) => (prev.some((x) => x.id === t.id) ? prev : [...prev, t]))
      setChecked((prev) => new Set(prev).add(t.name))
      setNewName('')
    } finally {
      setAdding(false)
    }
  }

  async function removeTemplate(t: ScopeTemplate): Promise<void> {
    await deleteScopeTemplate(t.id)
    setTemplates((prev) => prev.filter((x) => x.id !== t.id))
    setChecked((prev) => {
      const next = new Set(prev)
      next.delete(t.name)
      return next
    })
  }

  async function addSelected(): Promise<void> {
    if (checked.size === 0) return
    setBusy(true)
    try {
      await onAddItems([...checked])
      setChecked(new Set())
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        + Quick add ▾
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-72 rounded-xl bg-white p-3 shadow-xl ring-1 ring-slate-200">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Select scope items
            </div>

            {loading ? (
              <p className="py-3 text-center text-sm text-slate-400">Loading…</p>
            ) : (
              <ul className="max-h-56 space-y-0.5 overflow-auto">
                {templates.map((t) => (
                  <li key={t.id} className="group flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
                    <input
                      id={`tpl-${t.id}`}
                      type="checkbox"
                      checked={checked.has(t.name)}
                      onChange={() => toggle(t.name)}
                      className="h-4 w-4 accent-brand-accent"
                    />
                    <label htmlFor={`tpl-${t.id}`} className="flex-1 cursor-pointer text-sm text-slate-700">
                      {t.name}
                    </label>
                    <button
                      type="button"
                      onClick={() => void removeTemplate(t)}
                      title="Remove from list"
                      className="text-slate-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {templates.length === 0 && (
                  <li className="px-2 py-2 text-sm text-slate-400">No templates yet.</li>
                )}
              </ul>
            )}

            {/* Add new category */}
            <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void addNew()
                  }
                }}
                placeholder="Add new category…"
                className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30"
              />
              <button
                type="button"
                onClick={() => void addNew()}
                disabled={adding || !newName.trim()}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Add
              </button>
            </div>

            <button
              type="button"
              onClick={() => void addSelected()}
              disabled={checked.size === 0 || busy}
              className="mt-3 w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              Add {checked.size > 0 ? `${checked.size} ` : ''}item{checked.size === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
