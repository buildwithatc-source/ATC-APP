import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCachedQuery } from '@renderer/lib/useCachedQuery'
import { useToast } from '@renderer/components/Toast'
import { Button, TextField } from '@renderer/components/ui'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { ConfirmDeleteModal } from '@renderer/components/ConfirmDeleteModal'
import { StatusTabs } from '@renderer/components/StatusTabs'
import { listClients } from '@renderer/lib/db/clients'
import {
  createQuotation,
  deleteQuotation,
  listQuotations,
  setQuotationStatus
} from '@renderer/lib/db/quotations'
import type { QuotationInput, QuotationStatus, QuotationWithClient } from '@renderer/lib/types'
import { QuotationFormModal } from './QuotationFormModal'
import { QuotationStatusSelect } from './QuotationStatusSelect'

const TABS: { value: QuotationStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'complete', label: 'Complete' }
]

export function Quotations(): JSX.Element {
  const navigate = useNavigate()
  const { toast } = useToast()
  const quotationsQ = useCachedQuery('quotations', listQuotations)
  const clientsQ = useCachedQuery('clients', listClients)
  const quotations = quotationsQ.data ?? []
  const clients = clientsQ.data ?? []
  const loading = quotationsQ.loading
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<QuotationStatus>('active')
  const [formOpen, setFormOpen] = useState(false)
  const [statusBusy, setStatusBusy] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<QuotationWithClient | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const error = quotationsQ.error ?? actionError

  const counts = useMemo(() => {
    const c: Record<QuotationStatus, number> = { active: 0, complete: 0, archived: 0 }
    for (const q of quotations) c[q.status]++
    return c
  }, [quotations])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return quotations
      .filter((x) => x.status === tab)
      .filter(
        (x) =>
          !q || `${x.code} ${x.title ?? ''} ${x.clients?.name ?? ''}`.toLowerCase().includes(q)
      )
  }, [quotations, search, tab])

  async function handleCreate(input: QuotationInput): Promise<void> {
    const created = await createQuotation(input)
    setFormOpen(false)
    navigate(`/quotations/${created.id}`)
  }

  async function changeStatus(x: QuotationWithClient, status: QuotationStatus): Promise<void> {
    const prev = x.status
    setStatusBusy(x.id)
    quotationsQ.setData((qs) => (qs ?? []).map((q) => (q.id === x.id ? { ...q, status } : q)))
    try {
      await setQuotationStatus(x.id, status)
    } catch {
      quotationsQ.setData((qs) =>
        (qs ?? []).map((q) => (q.id === x.id ? { ...q, status: prev } : q))
      )
    } finally {
      setStatusBusy(null)
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setActionError(null)
    try {
      await deleteQuotation(deleting.id)
      quotationsQ.setData((qs) => (qs ?? []).filter((x) => x.id !== deleting.id))
      setDeleting(null)
      toast('Quotation deleted')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete quotation')
      toast('Could not delete quotation', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading) return <FullscreenSpinner label="Loading quotations…" />

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotations</h1>
          <p className="text-sm text-slate-500">{quotations.length} total</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>+ New quotation</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <StatusTabs tabs={TABS} value={tab} counts={counts} onChange={setTab} />
        <div className="min-w-[16rem] flex-1">
          <TextField
            label=""
            placeholder="Search by number, title, or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((x) => (
                <tr
                  key={x.id}
                  onClick={() => navigate(`/quotations/${x.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{x.code}</td>
                  <td className="px-4 py-3 text-slate-700">{x.title || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{x.clients?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <QuotationStatusSelect
                      value={x.status}
                      busy={statusBusy === x.id}
                      onChange={(s) => void changeStatus(x, s)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleting(x)
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
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    {search
                      ? 'No quotations match your search.'
                      : `No ${tab} quotations.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <QuotationFormModal
        open={formOpen}
        quotation={null}
        clients={clients}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />

      <ConfirmDeleteModal
        open={deleting !== null}
        title="Delete quotation"
        confirmText={deleting?.code ?? ''}
        busy={deleteBusy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        description={
          <>
            This permanently deletes <span className="font-semibold">{deleting?.code}</span>
            {deleting?.title ? ` (${deleting.title})` : ''} and all its scope items. This can&apos;t
            be undone.
          </>
        }
      />
    </div>
  )
}
