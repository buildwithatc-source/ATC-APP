import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@renderer/components/ui'
import { Modal } from '@renderer/components/Modal'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { getProject } from '@renderer/lib/db/projects'
import { listBudgetCategories } from '@renderer/lib/db/budget'
import {
  createExpense,
  deleteExpense,
  listExpenses,
  setExpensesInvoiced,
  updateExpense
} from '@renderer/lib/db/expenses'
import { formatPeso, formatTemplateDate, withMarkup } from '@renderer/lib/format'
import type {
  BudgetCategory,
  Expense,
  ExpenseInput,
  ProjectWithClient
} from '@renderer/lib/types'
import { ExpenseFormModal } from './ExpenseFormModal'
import { BudgetTab } from './BudgetTab'

type Tab = 'expenses' | 'budget'

export function ProjectDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectWithClient | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('expenses')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const [pr, ex, cats] = await Promise.all([
          getProject(id),
          listExpenses(id),
          listBudgetCategories(id)
        ])
        setProject(pr)
        setExpenses(ex)
        setCategories(cats)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load project')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.name]))
    return (cid: string | null): string => (cid ? m.get(cid) ?? '—' : '—')
  }, [categories])

  const totals = useMemo(() => {
    const billable = (e: Expense): number => withMarkup(Number(e.amount), Number(e.markup_percent))
    const total = expenses.reduce((s, e) => s + billable(e), 0)
    const billed = expenses.filter((e) => e.invoiced).reduce((s, e) => s + billable(e), 0)
    return { total, billed, unbilled: total - billed }
  }, [expenses])

  async function handleSubmit(input: ExpenseInput): Promise<void> {
    if (!id) return
    if (editing) {
      const updated = await updateExpense(editing.id, input)
      setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    } else {
      const created = await createExpense(id, input)
      setExpenses((prev) => [created, ...prev])
    }
    setFormOpen(false)
    setEditing(null)
  }

  async function toggleInvoiced(exp: Expense): Promise<void> {
    const next = !exp.invoiced
    setExpenses((prev) => prev.map((e) => (e.id === exp.id ? { ...e, invoiced: next } : e)))
    try {
      await setExpensesInvoiced([exp.id], next, null)
    } catch {
      setExpenses((prev) => prev.map((e) => (e.id === exp.id ? { ...e, invoiced: exp.invoiced } : e)))
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return
    await deleteExpense(deleting.id)
    setExpenses((prev) => prev.filter((e) => e.id !== deleting.id))
    setDeleting(null)
  }

  if (loading) return <FullscreenSpinner label="Loading project…" />
  if (error || !project)
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          {error ?? 'Project not found'}
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-4xl p-6">
      <button onClick={() => navigate('/projects')} className="text-sm text-slate-500 hover:underline">
        ← Projects
      </button>

      <div className="mt-2 mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold">{project.code}</h1>
          <p className="text-sm text-slate-500">
            {project.name || 'No description'} · {project.clients?.name ?? 'No client'} ·{' '}
            <span className="capitalize">{project.status}</span>
          </p>
        </div>
        {tab === 'expenses' && (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            + Add expense
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {(['expenses', 'budget'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? 'border-brand-accent text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'budget' ? (
        <BudgetTab
          project={project}
          expenses={expenses}
          categories={categories}
          onCategoriesChanged={setCategories}
          onContractBudgetChanged={(amount) =>
            setProject((p) => (p ? { ...p, contract_budget: amount } : p))
          }
        />
      ) : (
        <>
          {/* Totals */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Total billable', value: formatPeso(totals.total) },
              { label: 'Billed', value: formatPeso(totals.billed), tone: 'text-emerald-600' },
              { label: 'Unbilled', value: formatPeso(totals.unbilled), tone: 'text-blue-600' }
            ].map((t) => (
              <div key={t.label} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t.label}</div>
                <div className={`mt-1 text-lg font-semibold tabular-nums ${t.tone ?? 'text-slate-900'}`}>
                  {t.value}
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Cost</th>
                  <th className="px-4 py-3 text-right font-medium">Markup</th>
                  <th className="px-4 py-3 text-right font-medium">Billable</th>
                  <th className="px-4 py-3 font-medium">Billed</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatTemplateDate(e.expense_date)}</td>
                    <td className="px-4 py-3">{e.description ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{catName(e.category_id)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPeso(Number(e.amount))}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {Number(e.markup_percent) ? `${Number(e.markup_percent)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatPeso(withMarkup(Number(e.amount), Number(e.markup_percent)))}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void toggleInvoiced(e)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          e.invoiced
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                        title="Toggle billed"
                      >
                        {e.invoiced ? 'Billed' : 'Unbilled'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditing(e)
                          setFormOpen(true)
                        }}
                        className="mr-3 text-brand-accent hover:underline"
                      >
                        Edit
                      </button>
                      <button onClick={() => setDeleting(e)} className="text-red-600 hover:underline">
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No expenses yet. Add your first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ExpenseFormModal
        open={formOpen}
        expense={editing}
        categories={categories}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
      />

      <Modal
        open={deleting !== null}
        title="Delete expense"
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
          Delete <span className="font-semibold">{deleting?.description}</span> (
          {formatPeso(Number(deleting?.amount ?? 0))})? This can&apos;t be undone.
        </p>
      </Modal>
    </div>
  )
}
