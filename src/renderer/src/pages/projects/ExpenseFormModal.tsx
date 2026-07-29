import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@renderer/components/Modal'
import { Button, TextField } from '@renderer/components/ui'
import { todayManila, toNumber } from '@renderer/lib/format'
import type { Expense, ExpenseInput } from '@renderer/lib/types'

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, 'Amount must be ≥ 0'),
  expense_date: z.string().min(1, 'Date is required')
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  expense: Expense | null
  onClose: () => void
  onSubmit: (input: ExpenseInput) => Promise<void>
}

export function ExpenseFormModal({ open, expense, onClose, onSubmit }: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { description: '', amount: 0, expense_date: todayManila() }
  })

  useEffect(() => {
    if (open) {
      reset({
        description: expense?.description ?? '',
        amount: expense?.amount ?? 0,
        expense_date: expense?.expense_date ?? todayManila()
      })
    }
  }, [open, expense, reset])

  const submit = handleSubmit(async (v) =>
    onSubmit({
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
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Amount (₱)"
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
