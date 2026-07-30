import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@renderer/components/ui'
import { Modal } from '@renderer/components/Modal'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { formatPeso } from '@renderer/lib/format'
import {
  createQuotationItem,
  deleteQuotationItem,
  getQuotation,
  listQuotationItems,
  pushQuotationToProject,
  updateQuotationItem
} from '@renderer/lib/db/quotations'
import type { ContractItemInput, QuotationItem, QuotationWithClient } from '@renderer/lib/types'
import { ContractItemFormModal } from '@renderer/pages/projects/ContractItemFormModal'

export function QuotationDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quotation, setQuotation] = useState<QuotationWithClient | null>(null)
  const [items, setItems] = useState<QuotationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load quotation')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const totals = useMemo(() => {
    const quoted = items.reduce((s, i) => s + Number(i.quoted_amount), 0)
    const negotiated = items.reduce((s, i) => s + Number(i.negotiated_amount), 0)
    return { quoted, negotiated }
  }, [items])

  async function handleSubmit(input: ContractItemInput): Promise<void> {
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
      const project = await pushQuotationToProject(quotation, items)
      navigate(`/projects/${project.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to push to project')
      setPushing(false)
    }
  }

  if (loading) return <FullscreenSpinner label="Loading quotation…" />
  if (error || !quotation)
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          {error ?? 'Quotation not found'}
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-4xl p-6">
      <button
        onClick={() => navigate('/quotations')}
        className="text-sm text-slate-500 hover:underline"
      >
        ← Quotations
      </button>

      <div className="mt-2 mb-5 flex items-start justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold">{quotation.code}</h1>
          <p className="text-sm text-slate-500">
            {quotation.title || 'Untitled'} · {quotation.clients?.name ?? 'No client'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-400">Total quoted</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {formatPeso(totals.quoted)}
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-400">Contract sum (negotiated)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-emerald-600">
            {formatPeso(totals.negotiated)}
          </div>
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
              <th className="px-4 py-2 text-right font-medium">Quoted</th>
              <th className="px-4 py-2 text-right font-medium">Negotiated</th>
              <th className="w-24 px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">{i.description ?? '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                  {formatPeso(Number(i.quoted_amount))}
                </td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">
                  {formatPeso(Number(i.negotiated_amount))}
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
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No scope items yet. Add the work you&apos;re quoting.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Push to project */}
      <div className="mt-5 flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div>
          <p className="font-medium text-slate-800">Push to project</p>
          <p className="text-xs text-slate-500">
            Creates a project (with an ATC code), sets its contract budget to{' '}
            {formatPeso(totals.negotiated)}, seeds the budget categories, and removes this quotation
            from the list.
          </p>
        </div>
        <Button onClick={() => setPushOpen(true)} disabled={items.length === 0}>
          Push to project →
        </Button>
      </div>

      <ContractItemFormModal
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
          contract budget of <span className="font-semibold">{formatPeso(totals.negotiated)}</span>,
          then takes you to the project. The quotation leaves this list.
        </p>
      </Modal>
    </div>
  )
}
