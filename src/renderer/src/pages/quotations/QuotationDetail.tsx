import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@renderer/components/ui'
import { Modal } from '@renderer/components/Modal'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { formatPeso, toNumber } from '@renderer/lib/format'
import {
  createQuotationItem,
  deleteQuotationItem,
  getQuotation,
  listQuotationItems,
  pushQuotationToProject,
  quotationTotals,
  updateQuotationFinancials,
  updateQuotationItem
} from '@renderer/lib/db/quotations'
import type { QuotationItem, QuotationItemInput, QuotationWithClient } from '@renderer/lib/types'
import { QuotationItemFormModal } from './QuotationItemFormModal'

/** Common scope items so you don't retype them. */
const SCOPE_TEMPLATES = [
  'Salary',
  'Material',
  'Demolition',
  'Hauling of debris',
  'Painting',
  'Installation work'
]

export function QuotationDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quotation, setQuotation] = useState<QuotationWithClient | null>(null)
  const [items, setItems] = useState<QuotationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [supervision, setSupervision] = useState('0')
  const [contingency, setContingency] = useState('0')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<QuotationItem | null>(null)
  const [deleting, setDeleting] = useState<QuotationItem | null>(null)
  const [pushOpen, setPushOpen] = useState(false)
  const [pushing, setPushing] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const [q, its] = await Promise.all([getQuotation(id), listQuotationItems(id)])
        setQuotation(q)
        setItems(its)
        setSupervision(String(q.supervision_percent ?? 0))
        setContingency(String(q.contingency_percent ?? 0))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load quotation')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const totals = useMemo(
    () => quotationTotals(items, toNumber(supervision), toNumber(contingency)),
    [items, supervision, contingency]
  )

  async function saveFinancials(): Promise<void> {
    if (!id) return
    try {
      await updateQuotationFinancials(id, toNumber(supervision), toNumber(contingency))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  async function handleSubmit(input: QuotationItemInput): Promise<void> {
    if (!id) return
    if (editing) {
      const updated = await updateQuotationItem(editing.id, input)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } else {
      const created = await createQuotationItem(id, input)
      setItems((prev) => [...prev, created])
    }
    setFormOpen(false)
    setEditing(null)
  }

  async function addTemplate(name: string): Promise<void> {
    if (!id) return
    const created = await createQuotationItem(id, { description: name, amount: 0 })
    setItems((prev) => [...prev, created])
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return
    await deleteQuotationItem(deleting.id)
    setItems((prev) => prev.filter((i) => i.id !== deleting.id))
    setDeleting(null)
  }

  async function doPush(): Promise<void> {
    if (!quotation) return
    setPushing(true)
    setError(null)
    try {
      await saveFinancials()
      const project = await pushQuotationToProject(
        { ...quotation, supervision_percent: toNumber(supervision), contingency_percent: toNumber(contingency) },
        items
      )
      navigate(`/projects/${project.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to push to project')
      setPushing(false)
    }
  }

  if (loading) return <FullscreenSpinner label="Loading quotation…" />
  if (error && !quotation)
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      </div>
    )
  if (!quotation) return <div className="p-6">Not found</div>

  const pctInput =
    'w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-right outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30'

  return (
    <div className="mx-auto max-w-3xl p-6">
      <button
        onClick={() => navigate('/quotations')}
        className="text-sm text-slate-500 hover:underline"
      >
        ← Quotations
      </button>

      <div className="mt-2 mb-5">
        <h1 className="font-mono text-2xl font-semibold">{quotation.code}</h1>
        <p className="text-sm text-slate-500">
          {quotation.title || 'Untitled'} · {quotation.clients?.name ?? 'No client'}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Template quick-add */}
      <div className="mb-3">
        <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
          Quick add
        </span>
        <div className="flex flex-wrap gap-2">
          {SCOPE_TEMPLATES.map((name) => (
            <button
              key={name}
              onClick={() => void addTemplate(name)}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:border-brand-accent hover:text-slate-900"
            >
              + {name}
            </button>
          ))}
        </div>
      </div>

      {/* Scope items */}
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <span className="font-semibold">Scope items</span>
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            + Add item
          </Button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="w-24 px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">{i.description ?? '—'}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">
                  {formatPeso(Number(i.quoted_amount))}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => {
                      setEditing(i)
                      setFormOpen(true)
                    }}
                    className="mr-3 text-brand-accent hover:underline"
                  >
                    Edit
                  </button>
                  <button onClick={() => setDeleting(i)} className="text-red-600 hover:underline">
                    Del
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  No scope items yet. Use Quick add or + Add item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add-ons + totals */}
      <div className="mt-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Scope subtotal</span>
            <span className="tabular-nums">{formatPeso(totals.scope)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              Supervision &amp; profit
              <input
                type="number"
                step="any"
                min="0"
                className={pctInput}
                value={supervision}
                onChange={(e) => setSupervision(e.target.value)}
                onBlur={() => void saveFinancials()}
              />
              <span className="text-slate-400">% of scope</span>
            </span>
            <span className="tabular-nums">{formatPeso(totals.supervision)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              Contingencies
              <input
                type="number"
                step="any"
                min="0"
                className={pctInput}
                value={contingency}
                onChange={(e) => setContingency(e.target.value)}
                onBlur={() => void saveFinancials()}
              />
              <span className="text-slate-400">% of supervision</span>
            </span>
            <span className="tabular-nums">{formatPeso(totals.contingency)}</span>
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-lg font-bold">
            <span>Grand total</span>
            <span className="tabular-nums">{formatPeso(totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Push to project */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div>
          <p className="font-medium text-slate-800">Push to project</p>
          <p className="text-xs text-slate-500">
            Creates a project (ATC code) with a contract budget of {formatPeso(totals.grandTotal)},
            seeds the budget categories, and removes this quotation from the list.
          </p>
        </div>
        <Button onClick={() => setPushOpen(true)} disabled={items.length === 0}>
          Push to project →
        </Button>
      </div>

      <QuotationItemFormModal
        open={formOpen}
        item={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
      />

      <Modal
        open={deleting !== null}
        title="Delete scope item"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void confirmDelete()}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-semibold">{deleting?.description}</span>?
        </p>
      </Modal>

      <Modal
        open={pushOpen}
        title="Push to project"
        onClose={() => setPushOpen(false)}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setPushOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={pushing} onClick={() => void doPush()}>
              Push to project
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This creates a new project from <span className="font-mono">{quotation.code}</span> with a
          contract budget of <span className="font-semibold">{formatPeso(totals.grandTotal)}</span>,
          then takes you to the project. The quotation leaves this list.
        </p>
      </Modal>
    </div>
  )
}
