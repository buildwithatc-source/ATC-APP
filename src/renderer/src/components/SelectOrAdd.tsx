import { useEffect, useRef, useState } from 'react'

export type SelectOption = { id: string; name: string }

type Props = {
  label: string
  /** Currently selected id, or '' for none. */
  value: string
  options: SelectOption[]
  onChange: (id: string) => void
  /** Create a new option and return it (with its new id). Should throw on failure. */
  onCreate: (name: string) => Promise<SelectOption>
  /** If provided, each option row shows an X to delete it (inline confirm). */
  onDelete?: (id: string) => Promise<void>
  /** Label for the empty/none choice, e.g. '— Uncategorized —'. */
  noneLabel?: string
  /** Label for the add-new entry, e.g. '+ Add new category'. */
  addLabel?: string
  placeholder?: string
}

/**
 * A custom dropdown of existing options plus an inline "add new" entry. When
 * `onDelete` is given, each option row carries an X (with a Yes/No confirm) so
 * an option can be deleted right from the open list. Native <select> can't host
 * per-option buttons, hence the custom popover.
 */
export function SelectOrAdd({
  label,
  value,
  options,
  onChange,
  onCreate,
  onDelete,
  noneLabel = '— None —',
  addLabel = '+ Add new…',
  placeholder = 'New name…'
}: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedName = options.find((o) => o.id === value)?.name ?? ''

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function close(): void {
    setOpen(false)
    setAdding(false)
    setDraft('')
    setError(null)
    setConfirmId(null)
  }

  function pick(id: string): void {
    onChange(id)
    close()
  }

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
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string): Promise<void> {
    if (!onDelete) return
    setBusy(true)
    setError(null)
    try {
      await onDelete(id)
      setConfirmId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>

      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
      >
        <span className={selectedName ? 'text-slate-900' : 'text-slate-400'}>
          {selectedName || noneLabel}
        </span>
        <span className="ml-2 text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <ul className="max-h-60 overflow-auto py-1 text-sm">
            <li>
              <button
                type="button"
                onClick={() => pick('')}
                className="block w-full px-3 py-1.5 text-left text-slate-500 hover:bg-slate-50"
              >
                {noneLabel}
              </button>
            </li>

            {options.map((o) => (
              <li key={o.id} className="flex items-center justify-between hover:bg-slate-50">
                <button
                  type="button"
                  onClick={() => pick(o.id)}
                  className={`block flex-1 truncate px-3 py-1.5 text-left ${
                    o.id === value ? 'font-medium text-brand-accent' : 'text-slate-800'
                  }`}
                >
                  {o.name}
                </button>

                {onDelete &&
                  (confirmId === o.id ? (
                    <span className="flex items-center gap-1 pr-2 text-xs">
                      <span className="text-slate-500">Delete?</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(o.id)}
                        className="rounded px-1.5 py-0.5 font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmId(null)}
                        className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      title={`Delete “${o.name}”`}
                      aria-label={`Delete ${o.name}`}
                      onClick={() => setConfirmId(o.id)}
                      className="mr-1.5 rounded p-1 leading-none text-slate-300 hover:bg-red-50 hover:text-red-600"
                    >
                      ✕
                    </button>
                  ))}
              </li>
            ))}

            <li className="border-t border-slate-100">
              {adding ? (
                <div className="flex gap-2 px-3 py-2">
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save()}
                    className="rounded-lg bg-brand-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {busy ? 'Adding…' : 'Add'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="block w-full px-3 py-1.5 text-left font-medium text-brand-accent hover:bg-slate-50"
                >
                  {addLabel}
                </button>
              )}
            </li>
          </ul>
          {error && <p className="px-3 pb-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
