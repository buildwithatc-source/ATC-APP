import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCachedQuery } from '@renderer/lib/useCachedQuery'
import { useToast } from '@renderer/components/Toast'
import { Button } from '@renderer/components/ui'
import { Modal } from '@renderer/components/Modal'
import { FullscreenSpinner } from '@renderer/components/FullscreenSpinner'
import { getProject } from '@renderer/lib/db/projects'
import {
  createBudgetCategory,
  deleteBudgetCategory,
  listBudgetCategories
} from '@renderer/lib/db/budget'
import { createSupplier, listSuppliers } from '@renderer/lib/db/suppliers'
import { createPaymentMethod, listPaymentMethods } from '@renderer/lib/db/paymentMethods'
import {
  createExpense,
  deleteExpense,
  listExpenses,
  setExpenseImage,
  setExpensesInvoiced,
  updateExpense
} from '@renderer/lib/db/expenses'
import { formatPeso, formatTemplateDate } from '@renderer/lib/format'
import type { Expense, ExpenseInput, ProjectWithClient } from '@renderer/lib/types'
import { ExpenseFormModal } from './ExpenseFormModal'
import { ExpenseImageButton } from './ExpenseImageButton'
import { BudgetTab } from './BudgetTab'
import { ContractBudgetTab } from './ContractBudgetTab'

type Tab = 'expenses' | 'contract' | 'budget'

const TAB_LABELS: Record<Tab, string> = {
  expenses: 'Expenses',
  contract: 'Contract budget',
  budget: 'My budget'
}

export function ProjectDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const pid = id ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const projectQ = useCachedQuery<ProjectWithClient | null>(`project:${pid}`, () => getProject(pid), null)
  const expensesQ = useCachedQuery(`expenses:${pid}`, () => listExpenses(pid), [])
  const categoriesQ = useCachedQuery(`categories:${pid}`, () => listBudgetCategories(pid), [])
  const suppliersQ = useCachedQuery('suppliers', listSuppliers, [])
  const paymentQ = useCachedQuery('paymentMethods', listPaymentMethods, [])

  const project = projectQ.data
  const expenses = expensesQ.data
  const categories = categoriesQ.data
  const suppliers = suppliersQ.data
  const paymentMethods = paymentQ.data.map((m) => m.name)
  const loading = projectQ.loading || expensesQ.loading || categoriesQ.loading
  const error = projectQ.error ?? expensesQ.error ?? categoriesQ.error

  const [tab, setTab] = useState<Tab>('expenses')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)

  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.name]))
    return (cid: string | null): string => (cid ? m.get(cid) ?? '—' : '—')
  }, [categories])

  const supplierName = useMemo(() => {
    const m = new Map(suppliers.map((s) => [s.id, s.name]))
    return (sid: string | null): string => (sid ? m.get(sid) ?? '—' : '—')
  }, [suppliers])

  /** Add a budget category from the expense form (also appears in My budget). */
  async function createCategoryInline(name: string): Promise<{ id: string; name: string }> {
    if (!pid) throw new Error('No project')
    const created = await createBudgetCategory(pid, { name, budget_amount: 0 })
    categoriesQ.setData((prev) => [...prev, created])
    return { id: created.id, name: created.name }
  }

  /** Delete a budget category from the expense form (its expenses go uncategorized). */
  async function deleteCategoryInline(categoryId: string): Promise<void> {
    await deleteBudgetCategory(categoryId)
    categoriesQ.setData((prev) => prev.filter((c) => c.id !== categoryId))
    expensesQ.setData((prev) =>
      prev.map((e) => (e.category_id === categoryId ? { ...e, category_id: null } : e))
    )
  }

  /** Add a supplier from the expense form (also appears on the Contacts page). */
  async function createSupplierInline(name: string): Promise<{ id: string; name: string }> {
    const created = await createSupplier({ name, address: null, contact_number: null })
    suppliersQ.setData((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    return { id: created.id, name: created.name }
  }

  /** Add a payment method from the expense form (persisted for reuse). */
  async function createPaymentMethodInline(name: string): Promise<{ id: string; name: string }> {
    const created = await createPaymentMethod(name)
    paymentQ.setData((prev) =>
      prev.some((m) => m.name.toLowerCase() === created.name.toLowerCase())
        ? prev
        : [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    )
    return { id: created.name, name: created.name }
  }

  const totals = useMemo(() => {
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const billed = expenses.filter((e) => e.invoiced).reduce((s, e) => s + Number(e.amount), 0)
    return { total, billed, unbilled: total - billed }
  }, [expenses])

  async function handleSubmit(input: ExpenseInput): Promise<void> {
    if (!pid) return
    if (editing) {
      const updated = await updateExpense(editing.id, input)
      expensesQ.setData((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    } else {
      const created = await createExpense(pid, input)
      expensesQ.setData((prev) => [created, ...prev])
    }
    setFormOpen(false)
    toast(editing ? 'Expense updated' : 'Expense added')
    setEditing(null)
  }

  async function toggleInvoiced(exp: Expense): Promise<void> {
    const next = !exp.invoiced
    expensesQ.setData((prev) => prev.map((e) => (e.id === exp.id ? { ...e, invoiced: next } : e)))
    try {
      await setExpensesInvoiced([exp.id], next, null)
    } catch {
      expensesQ.setData((prev) =>
        prev.map((e) => (e.id === exp.id ? { ...e, invoiced: exp.invoiced } : e))
      )
    }
  }

  async function changeImage(exp: Expense, imageUrl: string | null): Promise<void> {
    await setExpenseImage(exp.id, imageUrl)
    expensesQ.setData((prev) =>
      prev.map((e) => (e.id === exp.id ? { ...e, image_url: imageUrl } : e))
    )
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return
    try {
      await deleteExpense(deleting.id)
      expensesQ.setData((prev) => prev.filter((e) => e.id !== deleting.id))
      setDeleting(null)
      toast('Expense deleted')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete expense', 'error')
    }
  }

  /** After awarding a quotation: refresh contract budget + seeded categories, jump to My budget. */
  async function reloadAfterAward(): Promise<void> {
    if (!pid) return
    await Promise.all([projectQ.reload(), categoriesQ.reload()])
    setTab('budget')
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
    <div className="mx-auto max-w-6xl p-6">
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
        {(['expenses', 'contract', 'budget'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? 'border-brand-accent text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'contract' ? (
        <ContractBudgetTab
          projectId={project.id}
          awardedAt={project.awarded_at}
          onAwarded={reloadAfterAward}
        />
      ) : tab === 'budget' ? (
        <BudgetTab
          project={project}
          expenses={expenses}
          categories={categories}
          onCategoriesChanged={(cats) => categoriesQ.setData(cats)}
          onContractBudgetChanged={(amount) =>
            projectQ.setData((p) => (p ? { ...p, contract_budget: amount } : p))
          }
        />
      ) : (
        <>
          {/* Totals */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Total cost', value: formatPeso(totals.total) },
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
                  <th className="w-12 px-4 py-3 text-center font-medium">Image</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Mode of payment</th>
                  <th className="px-4 py-3 text-right font-medium">Cost</th>
                  <th className="px-4 py-3 font-medium">Billed</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatTemplateDate(e.expense_date)}</td>
                    <td className="px-4 py-3">{e.description ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <ExpenseImageButton
                        imageUrl={e.image_url}
                        onChange={(url) => changeImage(e, url)}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{catName(e.category_id)}</td>
                    <td className="px-4 py-3 text-slate-500">{supplierName(e.supplier_id)}</td>
                    <td className="px-4 py-3 text-slate-500">{e.paid_via || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPeso(Number(e.amount))}</td>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditing(e)
                            setFormOpen(true)
                          }}
                          aria-label="Edit expense"
                          title="Edit"
                          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-accent"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleting(e)}
                          aria-label="Delete expense"
                          title="Delete"
                          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m1 0v12a1 1 0 01-1 1H8a1 1 0 01-1-1V7" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
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
        suppliers={suppliers}
        onCreateCategory={createCategoryInline}
        onDeleteCategory={deleteCategoryInline}
        onCreateSupplier={createSupplierInline}
        paymentMethods={paymentMethods}
        onCreatePaymentMethod={createPaymentMethodInline}
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
