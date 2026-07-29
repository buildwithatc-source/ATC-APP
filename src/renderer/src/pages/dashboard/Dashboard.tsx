import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { listClients } from '@renderer/lib/db/clients'
import { listInvoices, setInvoiceStatus } from '@renderer/lib/db/invoices'
import { formatPeso, formatTemplateDate } from '@renderer/lib/format'
import type { Client, InvoiceListRow, InvoiceStatus } from '@renderer/lib/types'
import { StatTiles } from './StatTiles'
import { InvoiceFilters, emptyFilters, type Filters } from './InvoiceFilters'
import { InlineStatusSelect } from './InlineStatusSelect'

export function Dashboard(): JSX.Element {
  const navigate = useNavigate()
  const [rows, setRows] = useState<InvoiceListRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [statusBusy, setStatusBusy] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [inv, cl] = await Promise.all([listInvoices(), listClients()])
        setRows(inv)
        setClients(cl)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return rows.filter((r) => {
      if (filters.clientId && r.client_id !== filters.clientId) return false
      if (filters.status && r.status !== filters.status) return false
      if (filters.from && r.invoice_date < filters.from) return false
      if (filters.to && r.invoice_date > filters.to) return false
      if (q) {
        const hay = `${r.invoice_no} ${r.clients?.name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, filters])

  async function changeStatus(row: InvoiceListRow, status: InvoiceStatus): Promise<void> {
    const prev = row.status
    setStatusBusy(row.id)
    // Optimistic update.
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)))
    try {
      await setInvoiceStatus(row.id, status)
    } catch {
      // Revert on failure.
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: prev } : r)))
    } finally {
      setStatusBusy(null)
    }
  }

  if (loading) return <FullscreenSpinner label="Loading dashboard…" />

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
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
                    <td className="px-4 py-3 text-slate-600">
                      {formatTemplateDate(r.due_date) || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <InlineStatusSelect
                        value={r.status}
                        busy={statusBusy === r.id}
                        onChange={(s) => void changeStatus(r, s)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPeso(Number(r.total))}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
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
    </div>
  )
}
