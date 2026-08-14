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
  expense_date: z.string().min(1, 'Date is required'),
  paid_via: z.string(),
  image_url: z.string()
})
type FormValues = z.infer<typeof schema>

/** Trim, and assume https:// when a link has no scheme. Empty stays empty. */
function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

type Props = {
  open: boolean
  expense: Expense | null
  categories: BudgetCategory[]
  suppliers: Supplier[]
  onClose: () => void
  onSubmit: (input: ExpenseInput) => Promise<void>
  /** Create a budget category on the fly (also shows in My budget). */
  onCreateCategory: (name: string) => Promise<SelectOption>
  /** Delete a budget category (its expenses become uncategorized). */
  onDeleteCategory: (id: string) => Promise<void>
  /** Create a supplier on the fly (also shows on the Contacts page). */
  onCreateSupplier: (name: string) => Promise<SelectOption>
  /** Saved payment-method names (presets + custom) for the Mode of payment list. */
  paymentMethods: string[]
  /** Add a payment method; returns it (id === name). */
  onCreatePaymentMethod: (name: string) => Promise<SelectOption>
}

export function ExpenseFormModal({
  open,
  expense,
  categories,
  suppliers,
  onClose,
  onSubmit,
  onCreateCategory,
  onDeleteCategory,
  onCreateSupplier,
  paymentMethods,
  onCreatePaymentMethod
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
      expense_date: todayManila(),
      paid_via: '',
      image_url: ''
    }
  })

  useEffect(() => {
    if (open) {
      reset({
        category_id: expense?.category_id ?? '',
        supplier_id: expense?.supplier_id ?? '',
        description: expense?.description ?? '',
        amount: expense?.amount ?? 0,
        expense_date: expense?.expense_date ?? todayManila(),
        paid_via: expense?.paid_via ?? '',
        image_url: expense?.image_url ?? ''
      })
    }
  }, [open, expense, reset])

  const submit = handleSubmit(async (v) =>
    onSubmit({
      category_id: v.category_id || null,
      supplier_id: v.supplier_id || null,
      description: v.description,
      amount: toNumber(v.amount),
      expense_date: v.expense_date,
      paid_via: v.paid_via.trim() || null,
      image_url: normalizeUrl(v.image_url) || null
    })
  )

  const categoryOptions: SelectOption[] = categories.map((c) => ({ id: c.id, name: c.name }))
  const supplierOptions: SelectOption[] = suppliers.map((s) => ({ id: s.id, name: s.name }))

  // Payment methods are stored on the expense as text, so id === name here.
  // Include the current value if it isn't in the saved list (e.g. later deleted).
  const paidVia = watch('paid_via')
  const paymentOptions: SelectOption[] = (() => {
    const names = paidVia ? [...paymentMethods, paidVia] : paymentMethods
    const seen = new Set<string>()
    const out: SelectOption[] = []
    for (const n of names) {
      const key = n.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        out.push({ id: n, name: n })
      }
    }
    return out
  })()

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
          onDelete={async (id) => {
            await onDeleteCategory(id)
            if (watch('category_id') === id) setValue('category_id', '')
          }}
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

        <SelectOrAdd
          label="Mode of payment"
          value={watch('paid_via')}
          options={paymentOptions}
          onChange={(id) => setValue('paid_via', id)}
          onCreate={onCreatePaymentMethod}
          noneLabel="— Not set —"
          addLabel="+ Add new method"
          placeholder="New payment method…"
        />

        <TextField
          label="Google Drive link"
          placeholder="Paste the receipt/photo Drive link…"
          {...register('image_url')}
        />

        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
