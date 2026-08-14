import { useState } from 'react'

export type SelectOption = { id: string; name: string }

type Props = {
  label: string
  /** Currently selected id, or '' for none. */
  value: string
  options: SelectOption[]
  onChange: (id: string) => void
  /** Create a new option and return it (with its new id). Should throw on failure. */
  onCreate: (name: string) => Promise<SelectOption>
  /** Label for the empty/none choice, e.g. '— Uncategorized —'. */
  noneLabel?: string
  /** Label for the add-new entry, e.g. '+ Add new category'. */
  addLabel?: string
  placeholder?: string
}

const ADD = '__add__'

/**
 * A native select of existing options plus an inline "add new" flow: choosing
 * the add entry swaps the select for a small text input; on save it creates the
 * option, selects it, and returns to the select. Keeps existing options as the
 * primary path while letting you add one without leaving the form.
 */
export function SelectOrAdd({
  label,
  value,
  options,
  onChange,
  onCreate,
  noneLabel = '— None —',
  addLabel = '+ Add new…',
  placeholder = 'New name…'
}: Props): JSX.Element {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(): Promise<void> {
    const name = draft.trim()
    if (!name) {
      setError('Enter a name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const created = await onCreate(name)
      onChange(created.id)
      setAdding(false)
      setDraft('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>

      {adding ? (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              autoFocus
              value={draft}
              placeholder={placeholder}
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void save()
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-lg bg-brand-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? 'Adding…' : 'Add'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setAdding(false)
                setDraft('')
                setError(null)
              }}
              className="rounded-lg px-2 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === ADD) {
              setError(null)
              setAdding(true)
            } else {
              onChange(e.target.value)
            }
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
        >
          <option value="">{noneLabel}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
          <option value={ADD}>{addLabel}</option>
        </select>
      )}
    </label>
  )
}
