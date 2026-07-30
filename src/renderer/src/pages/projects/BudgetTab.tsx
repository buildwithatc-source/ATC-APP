import { useMemo, useState } from 'react'
import { Button } from '@renderer/components/ui'
import { Modal } from '@renderer/components/Modal'
import { formatPeso, toNumber } from '@renderer/lib/format'
import {
  createBudgetCategory,
  deleteBudgetCategory,
  updateBudgetCategory
} from '@renderer/lib/db/budget'
import { setContractBudget } from '@renderer/lib/db/projects'
import type { BudgetCategory, BudgetCategoryInput, Expense, ProjectWithClient } from '@renderer/lib/types'
import { CategoryFormModal } from './CategoryFormModal'

type Props = {
  project: ProjectWithClient
  expenses: Expense[]
  categories: BudgetCategory[]
  onCategoriesChanged: (next: BudgetCategory[]) => void
  onContractBudgetChanged: (amount: number) => void
}

/** Bar colour by spend ratio: under → green, near → amber, over → red. */
function ratioTone(ratio: number): { bar: string; text: string } {
  if (ratio > 1) return { bar: 'bg-red-500', text: 'text-red-600' }
  if (ratio > 0.85) return { bar: 'bg-amber-500', text: 'text-amber-600' }
  return { bar: 'bg-emerald-500', text: 'text-emerald-600' }
}

function BudgetBar({ spent, budget }: { spent: number; budget: number }): JSX.Element {
  const ratio = budget > 0 ? spent / budget : spent > 0 ? Infinity : 0
  const pct = Math.min(ratio, 1) * 100
  const tone = ratioTone(ratio)
  const remaining = budget - spent
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="tabular-nums text-slate-600">
          {formatPeso(spent)} <span className="text-slate-400">/ {formatPeso(budget)}</span>
        </span>
        <span className={`tabular-nums font-medium ${tone.text}`}>
          {remaining >= 0 ? `${formatPeso(remaining)} left` : `${formatPeso(-remaining)} over`}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function BudgetTab({
  project,
  expenses,
  categories,
  onCategoriesChanged,
  onContractBudgetChanged
}: Props): JSX.Element {
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(project.contract_budget ?? 0))
  const [savingBudget, setSavingBudget] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null)
  const [deletingCat, setDeletingCat] = useState<BudgetCategory | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Spend (cost) per category, plus uncategorized + total.
  const spend = useMemo(() => {
    const byCat = new Map<string, number>()
    let uncategorized = 0
    let total = 0
    for (const e of expenses) {
      const amt = Number(e.amount)
      total += amt
      if (e.category_id) byCat.set(e.category_id, (byCat.get(e.category_id) ?? 0) + amt)
      else uncategorized += amt
    }
    return { byCat, uncategorized, total }
  }, [expenses])

  const allocated = categories.reduce((s, c) => s + Number(c.budget_amount), 0)

  async function saveBudget(): Promise<void> {
    setSavingBudget(true)
    setError(null)
    try {
      const amount = toNumber(budgetInput)
      await setContractBudget(project.id, amount)
      onContractBudgetChanged(amount)
      setEditingBudget(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save budget')
    } finally {
      setSavingBudget(false)
    }
  }

  async function handleCategorySubmit(input: BudgetCategoryInput): Promise<void> {
    if (editingCat) {
      const updated = await updateBudgetCategory(editingCat.id, input)
      onCategoriesChanged(categories.map((c) => (c.id === updated.id ? updated : c)))
    } else {
      const created = await createBudgetCategory(project.id, input)
      onCategoriesChanged([...categories, created])
    }
    setFormOpen(false)
    setEditingCat(null)
  }

  async function confirmDeleteCategory(): Promise<void> {
    if (!deletingCat) return
    await deleteBudgetCategory(deletingCat.id)
    onCategoriesChanged(categories.filter((c) => c.id !== deletingCat.id))
    setDeletingCat(null)
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {/* Contract budget */}
      <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Contract budget</h2>
          {!editingBudget && (
            <button
              onClick={() => {
                setBudgetInput(String(project.contract_budget ?? 0))
                setEditingBudget(true)
              }}
              className="text-sm text-brand-accent hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {editingBudget ? (
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-xs text-slate-500">Contract budget (₱)</span>
              <input
                type="number"
                step="any"
                min="0"
                autoFocus
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
              />
            </label>
            <Button loading={savingBudget} onClick={() => void saveBudget()}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setEditingBudget(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-3 text-2xl font-semibold tabular-nums">
              {formatPeso(Number(project.contract_budget ?? 0))}
            </div>
            <BudgetBar spent={spend.total} budget={Number(project.contract_budget ?? 0)} />
            <p className="mt-2 text-xs text-slate-400">
              Total cost spent across all expenses vs the contract budget.
            </p>
          </>
        )}
      </div>

      {/* Sub-budget categories */}
      <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold">Sub-budgets</h2>
          <Button
            onClick={() => {
              setEditingCat(null)
              setFormOpen(true)
            }}
          >
            + Add category
          </Button>
        </div>
        <p className="mb-4 text-xs text-slate-400">
          Allocated {formatPeso(allocated)}
          {Number(project.contract_budget) > 0 && ` of ${formatPeso(Number(project.contract_budget))}`}
        </p>

        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No sub-budgets yet. Add categories like Labor, Painting, Roofing.
          </p>
        ) : (
          <div className="space-y-4">
            {categories.map((c) => {
              const spent = spend.byCat.get(c.id) ?? 0
              return (
                <div key={c.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <div className="flex gap-3 text-sm">
                      <button
                        onClick={() => {
                          setEditingCat(c)
                          setFormOpen(true)
                        }}
                        className="text-brand-accent hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingCat(c)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <BudgetBar spent={spent} budget={Number(c.budget_amount)} />
                </div>
              )
            })}
          </div>
        )}

        {spend.uncategorized > 0 && (
          <p className="mt-4 text-xs text-slate-400">
            Uncategorized spend: {formatPeso(spend.uncategorized)} (assign a category on the expense
            to track it here).
          </p>
        )}
      </div>

      <CategoryFormModal
        open={formOpen}
        category={editingCat}
        onClose={() => {
          setFormOpen(false)
          setEditingCat(null)
        }}
        onSubmit={handleCategorySubmit}
      />

      <Modal
        open={deletingCat !== null}
        title="Delete category"
        onClose={() => setDeletingCat(null)}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setDeletingCat(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void confirmDeleteCategory()}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-semibold">{deletingCat?.name}</span>? Expenses in it become
          uncategorized (they are not deleted).
        </p>
      </Modal>
    </div>
  )
}
