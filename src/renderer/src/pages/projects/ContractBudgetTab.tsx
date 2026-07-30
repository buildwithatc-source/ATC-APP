import { useEffect, useMemo, useState } from 'react'
import { Button } from '@renderer/components/ui'
import { Modal } from '@renderer/components/Modal'
import { formatPeso, formatTemplateDate } from '@renderer/lib/format'
import {
  awardContract,
  createContractItem,
  deleteContractItem,
  listContractItems,
  updateContractItem
} from '@renderer/lib/db/contract'
import type { ContractItem, ContractItemInput } from '@renderer/lib/types'
import { ContractItemFormModal } from './ContractItemFormModal'

type Props = {
  projectId: string
  awardedAt: string | null
  /** Called after awarding so the parent can reload contract budget + categories. */
  onAwarded: () => void
}

export function ContractBudgetTab({ projectId, awardedAt, onAwarded }: Props): JSX.Element {
  const [items, setItems] = useState<ContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ContractItem | null>(null)
  const [deleting, setDeleting] = useState<ContractItem | null>(null)
  const [awardOpen, setAwardOpen] = useState(false)
  const [awarding, setAwarding] = useState(false)

  useEffect(() => {
    let active = true
    listContractItems(projectId)
      .then((rows) => active && setItems(rows))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [projectId])

  const totals = useMemo(() => {
    const quoted = items.reduce((s, i) => s + Number(i.quoted_amount), 0)
    const negotiated = items.reduce((s, i) => s + Number(i.negotiated_amount), 0)
    return { quoted, negotiated }
  }, [items])

  async function handleSubmit(input: ContractItemInput): Promise<void> {
    if (editing) {
      const updated = await updateContractItem(editing.id, input)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } else {
      const created = await createContractItem(projectId, input)
      setItems((prev) => [...prev, created])
    }
    setFormOpen(false)
    setEditing(null)
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return
    await deleteContractItem(deleting.id)
    setItems((prev) => prev.filter((i) => i.id !== deleting.id))
    setDeleting(null)
  }

  async function doAward(): Promise<void> {
    setAwarding(true)
    setError(null)
    try {
      await awardContract(projectId, items)
      setAwardOpen(false)
      onAwarded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to award')
    } finally {
      setAwarding(false)
    }
  }

  if (loading) return <p className="py-8 text-center text-sm text-slate-400">Loading…</p>

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
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
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-xs uppercase tracking-wide text-slate-400">Status</div>
          <div className="mt-1 text-sm font-medium text-slate-700">
            {awardedAt ? `Awarded ${formatTemplateDate(awardedAt)}` : 'Quotation (not awarded)'}
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

      {/* Award */}
      <div className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div>
          <p className="font-medium text-slate-800">
            {awardedAt ? 'Re-award quotation' : 'Award quotation'}
          </p>
          <p className="text-xs text-slate-500">
            Sets the contract budget to {formatPeso(totals.negotiated)} and creates matching
            categories in <span className="font-medium">My budget</span>.
          </p>
        </div>
        <Button onClick={() => setAwardOpen(true)} disabled={items.length === 0}>
          {awardedAt ? 'Re-award' : 'Award → My budget'}
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
        open={awardOpen}
        title="Award quotation"
        onClose={() => setAwardOpen(false)}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setAwardOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={awarding} onClick={() => void doAward()}>
              Award
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This sets the project&apos;s contract budget to{' '}
          <span className="font-semibold">{formatPeso(totals.negotiated)}</span> and creates a
          budget category for each scope item (existing categories are kept). You then set your own
          cost figures in <span className="font-medium">My budget</span>.
        </p>
      </Modal>
    </div>
  )
}
