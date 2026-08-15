import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCachedQuery } from '@renderer/lib/useCachedQuery'
import { useToast } from '@renderer/components/Toast'
import { Button } from '@renderer/components/ui'
import { Modal } from '@renderer/components/Modal'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { StatusTabs } from '@renderer/components/StatusTabs'
import { listClients } from '@renderer/lib/db/clients'
import { deleteInvoice, listInvoices, setInvoiceStatus } from '@renderer/lib/db/invoices'
import { formatPeso, formatTemplateDate, todayManila } from '@renderer/lib/format'
import { isOverdue } from '@renderer/lib/invoiceStatus'
import type { InvoiceListRow, InvoiceStatus } from '@renderer/lib/types'
import { StatTiles } from './StatTiles'
import { InvoiceFilters, emptyFilters, type Filters } from './InvoiceFilters'
import { InlineStatusSelect } from './InlineStatusSelect'

type StatusTab = 'all' | InvoiceStatus

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' }
]

export function Dashboard(): JSX.Element {
  const navigate = useNavigate()
  const { toast } = useToast()
  const invoicesQ = useCachedQuery('invoices', listInvoices, [])
  const clientsQ = useCachedQuery('clients', listClients, [])
  const rows = invoicesQ.data
  const clients = clientsQ.data
  const loading = invoicesQ.loading
  const error = invoicesQ.error
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [statusBusy, setStatusBusy] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<InvoiceListRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // Rows matching everything EXCEPT the status tab (so tab counts reflect the
  // other active filters).
  const baseFiltered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return rows.filter((r) => {
      if (filters.clientId && r.client_id !== filters.clientId) return false
      if (filters.from && r.invoice_date < filters.from) return false
      if (filters.to && r.invoice_date > filters.to) return false
      if (q) {
        const hay = `${r.invoice_no} ${r.clients?.name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, filters.search, filters.clientId, filters.from, filters.to])

  const counts = useMemo(() => {
    const c: Record<StatusTab, number> = {
      all: baseFiltered.length,
      draft: 0,
      sent: 0,
      paid: 0,
      void: 0
    }
    for (const r of baseFiltered) c[r.status]++
    return c
  }, [baseFiltered])

  const filtered = useMemo(
    () => (filters.status ? baseFiltered.filter((r) => r.status === filters.status) : baseFiltered),
    [baseFiltered, filters.status]
  )

  const activeTab: StatusTab = filters.status === '' ? 'all' : filters.status
  const today = todayManila()

  async function changeStatus(row: InvoiceListRow, status: InvoiceStatus): Promise<void> {
    const prev = row.status
    setStatusBusy(row.id)
    // Optimistic update.
    invoicesQ.setData((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)))
    try {
      await setInvoiceStatus(row.id, status)
    } catch {
      // Revert on failure.
      invoicesQ.setData((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: prev } : r)))
    } finally {
      setStatusBusy(null)
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteInvoice(deleting.id)
      invoicesQ.setData((rs) => rs.filter((r) => r.id !== deleting.id))
      setDeleting(null)
      toast('Invoice deleted')
    } catch {
      toast('Could not delete invoice', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading) return <FullscreenSpinner label="Loading dashboard…" />

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-slate-500">Recent invoices</p>
        </div>
        <Button onClick={() => navigate('/invoices/new')}>+ New invoice</Button>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : (
        <>
          <StatTiles rows={filtered} />

          <div className="mt-5 mb-3">
            <StatusTabs
              tabs={STATUS_TABS}
              value={activeTab}
              counts={counts}
              onChange={(v) =>
                setFilters((f) => ({ ...f, status: v === 'all' ? '' : (v as InvoiceStatus) }))
              }
            />
          </div>

          <div className="mb-3">
            <InvoiceFilters value={filters} clients={clients} onChange={setFilters} />
          </div>

          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/invoices/${r.id}/edit`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-mono">{r.invoice_no}</td>
                    <td className="px-4 py-3">{r.clients?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatTemplateDate(r.invoice_date)}</td>
                    <td
                      className={`px-4 py-3 ${
                        isOverdue(r, today) ? 'font-medium text-red-600' : 'text-slate-600'
                      }`}
                    >
                      {formatTemplateDate(r.due_date) || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <InlineStatusSelect
                          value={r.status}
                          busy={statusBusy === r.id}
                          onChange={(s) => void changeStatus(r, s)}
                        />
                        {isOverdue(r, today) && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPeso(Number(r.total))}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleting(r)
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
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      {rows.length === 0
                        ? 'No invoices yet. Create your first one.'
                        : 'No invoices match your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={deleting !== null}
        title="Delete invoice"
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
          Delete invoice <span className="font-mono font-semibold text-slate-900">{deleting?.invoice_no}</span>
          {deleting?.clients?.name ? ` for ${deleting.clients.name}` : ''} (
          {formatPeso(Number(deleting?.total ?? 0))})? This can&apos;t be undone. Any expenses it
          billed will be freed for re-invoicing.
        </p>
      </Modal>
    </div>
  )
}
