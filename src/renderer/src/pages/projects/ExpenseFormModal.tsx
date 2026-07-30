import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@renderer/components/Modal'
import { Button, TextField } from '@renderer/components/ui'
import { todayManila, toNumber } from '@renderer/lib/format'
import type { BudgetCategory, Expense, ExpenseInput } from '@renderer/lib/types'

const schema = z.object({
  category_id: z.string(),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, 'Amount must be ≥ 0'),
  expense_date: z.string().min(1, 'Date is required')
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  expense: Expense | null
  categories: BudgetCategory[]
  onClose: () => void
  onSubmit: (input: ExpenseInput) => Promise<void>
}

export function ExpenseFormModal({
  open,
  expense,
  categories,
  onClose,
  onSubmit
}: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      category_id: '',
      description: '',
      amount: 0,
      expense_date: todayManila()
    }
  })

  useEffect(() => {
    if (open) {
      reset({
        category_id: expense?.category_id ?? '',
        description: expense?.description ?? '',
        amount: expense?.amount ?? 0,
        expense_date: expense?.expense_date ?? todayManila()
      })
    }
  }, [open, expense, reset])

  const submit = handleSubmit(async (v) =>
    onSubmit({
      category_id: v.category_id || null,
      description: v.description,
      amount: toNumber(v.amount),
      expense_date: v.expense_date
    })
  )

  return (
    <Modal
      open={open}
      title={expense ? 'Edit expense' : 'Add expense'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={isSubmitting} onClick={() => void submit()}>
            {expense ? 'Save changes' : 'Add expense'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-4"
      >
        <TextField
          label="Description"
          autoFocus
          error={errors.description?.message}
          {...register('description')}
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Budget category <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
            {...register('category_id')}
          >
            <option value="">— Uncategorized —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Cost (₱)"
            type="number"
            step="any"
            min="0"
            error={errors.amount?.message}
            {...register('amount')}
          />
          <TextField
            label="Date"
            type="date"
            error={errors.expense_date?.message}
            {...register('expense_date')}
          />
        </div>

        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
