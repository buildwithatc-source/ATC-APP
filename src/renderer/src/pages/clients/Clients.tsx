import { useEffect, useMemo, useState } from 'react'
import { Button, TextField } from '@renderer/components/ui'
import { Modal } from '@renderer/components/Modal'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import type { Client, ClientInput } from '@renderer/lib/types'
import {
  createClient,
  deleteClient,
  listClients,
  updateClient
} from '@renderer/lib/db/clients'
import { ClientFormModal } from './ClientFormModal'

export function Clients(): JSX.Element {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function refresh(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      setClients(await listClients())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) =>
      [c.name, c.address, c.contact_number]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    )
  }, [clients, search])

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(client: Client): void {
    setEditing(client)
    setFormOpen(true)
  }

  async function handleSubmit(input: ClientInput): Promise<void> {
    if (editing) {
      const updated = await updateClient(editing.id, input)
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } else {
      const created = await createClient(input)
      setClients((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setFormOpen(false)
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await deleteClient(deleting.id)
      setClients((prev) => prev.filter((c) => c.id !== deleting.id))
      setDeleting(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete client')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-slate-500">{clients.length} total</p>
        </div>
        <Button onClick={openCreate}>+ Add client</Button>
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
          <FullscreenSpinner label="Loading clients…" />
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
                      onClick={() => openEdit(c)}
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
                    {search ? 'No clients match your search.' : 'No clients yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ClientFormModal
        open={formOpen}
        client={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <Modal
        open={deleting !== null}
        title="Delete client"
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
          can&apos;t be undone. Clients used on existing invoices can&apos;t be deleted.
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
