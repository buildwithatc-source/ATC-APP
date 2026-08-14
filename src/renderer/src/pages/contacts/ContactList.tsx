import { useEffect, useMemo, useState } from 'react'
import { Button, TextField } from '@renderer/components/ui'
import { Modal } from '@renderer/components/Modal'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import type { Contact, ContactInput } from '@renderer/lib/types'
import { ContactFormModal } from './ContactFormModal'

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

type Props = {
  /** Singular noun, e.g. 'client' or 'supplier'. */
  noun: string
  /** Plural noun, e.g. 'clients' or 'suppliers'. */
  nounPlural: string
  list: () => Promise<Contact[]>
  create: (input: ContactInput) => Promise<Contact>
  update: (id: string, input: ContactInput) => Promise<Contact>
  remove: (id: string) => Promise<void>
}

/** Generic contact table (search, add, edit, delete) shared by clients & suppliers. */
export function ContactList({ noun, nounPlural, list, create, update, remove }: Props): JSX.Element {
  const [rows, setRows] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState<Contact | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function refresh(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      setRows(await list())
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to load ${nounPlural}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nounPlural])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((c) =>
      [c.name, c.address, c.contact_number]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    )
  }, [rows, search])

  async function handleSubmit(input: ContactInput): Promise<void> {
    if (editing) {
      const updated = await update(editing.id, input)
      setRows((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } else {
      const created = await create(input)
      setRows((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setFormOpen(false)
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await remove(deleting.id)
      setRows((prev) => prev.filter((c) => c.id !== deleting.id))
      setDeleting(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : `Failed to delete ${noun}`)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {rows.length} {rows.length === 1 ? noun : nounPlural}
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          + Add {noun}
        </Button>
      </div>

      <div className="mb-4">
        <TextField
          label=""
          placeholder="Search by name, address, or contact…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-16">
          <FullscreenSpinner label={`Loading ${nounPlural}…`} />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          {error}
          <button onClick={() => void refresh()} className="ml-2 underline">
            Retry
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Contact number</th>
                <th className="w-28 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.address ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.contact_number ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditing(c)
                        setFormOpen(true)
                      }}
                      className="mr-3 text-brand-accent hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setDeleteError(null)
                        setDeleting(c)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    {search ? `No ${nounPlural} match your search.` : `No ${nounPlural} yet.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ContactFormModal
        open={formOpen}
        noun={noun}
        contact={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <Modal
        open={deleting !== null}
        title={`Delete ${noun}`}
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={deleteBusy}
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void confirmDelete()}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-semibold text-slate-900">{deleting?.name}</span>? This
          can&apos;t be undone. {cap(nounPlural)} used on existing records can&apos;t be deleted.
        </p>
        {deleteError && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {deleteError}
          </div>
        )}
      </Modal>
    </div>
  )
}
