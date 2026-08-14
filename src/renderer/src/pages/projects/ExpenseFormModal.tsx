import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@renderer/components/Modal'
import { Button, TextField } from '@renderer/components/ui'
import { SelectOrAdd, type SelectOption } from '@renderer/components/SelectOrAdd'
import { todayManila, toNumber } from '@renderer/lib/format'
import type { BudgetCategory, Expense, ExpenseInput, Supplier } from '@renderer/lib/types'

const schema = z.object({
  category_id: z.string(),
  supplier_id: z.string(),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, 'Amount must be ≥ 0'),
  expense_date: z.string().min(1, 'Date is required')
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  expense: Expense | null
  categories: BudgetCategory[]
  suppliers: Supplier[]
  onClose: () => void
  onSubmit: (input: ExpenseInput) => Promise<void>
  /** Create a budget category on the fly (also shows in My budget). */
  onCreateCategory: (name: string) => Promise<SelectOption>
  /** Create a supplier on the fly (also shows on the Contacts page). */
  onCreateSupplier: (name: string) => Promise<SelectOption>
}

export function ExpenseFormModal({
  open,
  expense,
  categories,
  suppliers,
  onClose,
  onSubmit,
  onCreateCategory,
  onCreateSupplier
}: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      category_id: '',
      supplier_id: '',
      description: '',
      amount: 0,
      expense_date: todayManila()
    }
  })

  useEffect(() => {
    if (open) {
      reset({
        category_id: expense?.category_id ?? '',
        supplier_id: expense?.supplier_id ?? '',
        description: expense?.description ?? '',
        amount: expense?.amount ?? 0,
        expense_date: expense?.expense_date ?? todayManila()
      })
    }
  }, [open, expense, reset])

  const submit = handleSubmit(async (v) =>
    onSubmit({
      category_id: v.category_id || null,
      supplier_id: v.supplier_id || null,
      description: v.description,
      amount: toNumber(v.amount),
      expense_date: v.expense_date
    })
  )

  const categoryOptions: SelectOption[] = categories.map((c) => ({ id: c.id, name: c.name }))
  const supplierOptions: SelectOption[] = suppliers.map((s) => ({ id: s.id, name: s.name }))

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

        <SelectOrAdd
          label="Supplier"
          value={watch('supplier_id')}
          options={supplierOptions}
          onChange={(id) => setValue('supplier_id', id)}
          onCreate={onCreateSupplier}
          noneLabel="— No supplier —"
          addLabel="+ Add new supplier"
          placeholder="New supplier name…"
        />

        <SelectOrAdd
          label="Category"
          value={watch('category_id')}
          options={categoryOptions}
          onChange={(id) => setValue('category_id', id)}
          onCreate={onCreateCategory}
          noneLabel="— Uncategorized —"
          addLabel="+ Add new category"
          placeholder="New category name…"
        />

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
