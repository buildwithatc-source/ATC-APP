import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextField } from '@renderer/components/ui'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { listClients } from '@renderer/lib/db/clients'
import { createQuotation, listOpenQuotations } from '@renderer/lib/db/quotations'
import type { Client, QuotationInput, QuotationWithClient } from '@renderer/lib/types'
import { QuotationFormModal } from './QuotationFormModal'

export function Quotations(): JSX.Element {
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState<QuotationWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [qs, cl] = await Promise.all([listOpenQuotations(), listClients()])
        setQuotations(qs)
        setClients(cl)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load quotations')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return quotations
    return quotations.filter((x) =>
      `${x.code} ${x.title ?? ''} ${x.clients?.name ?? ''}`.toLowerCase().includes(q)
    )
  }, [quotations, search])

  async function handleCreate(input: QuotationInput): Promise<void> {
    const created = await createQuotation(input)
    setFormOpen(false)
    navigate(`/quotations/${created.id}`)
  }

  if (loading) return <FullscreenSpinner label="Loading quotations…" />

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotations</h1>
          <p className="text-sm text-slate-500">{quotations.length} open</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>+ New quotation</Button>
      </div>

      <div className="mb-4">
        <TextField
          label=""
          placeholder="Search by number, title, or client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                    {search ? 'No quotations match your search.' : 'No open quotations.'}
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
    </div>
  )
}
