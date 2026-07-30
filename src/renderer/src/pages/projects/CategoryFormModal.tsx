import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@renderer/components/Modal'
import { Button, TextField } from '@renderer/components/ui'
import { toNumber } from '@renderer/lib/format'
import type { BudgetCategory, BudgetCategoryInput } from '@renderer/lib/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  budget_amount: z.coerce.number().min(0, 'Budget must be ≥ 0')
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  category: BudgetCategory | null
  onClose: () => void
  onSubmit: (input: BudgetCategoryInput) => Promise<void>
}

export function CategoryFormModal({ open, category, onClose, onSubmit }: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { name: '', budget_amount: 0 }
  })

  useEffect(() => {
    if (open) {
      reset({ name: category?.name ?? '', budget_amount: category?.budget_amount ?? 0 })
    }
  }, [open, category, reset])

  const submit = handleSubmit(async (v) =>
    onSubmit({ name: v.name, budget_amount: toNumber(v.budget_amount) })
  )

  return (
    <Modal
      open={open}
      title={category ? 'Edit budget category' : 'Add budget category'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={isSubmitting} onClick={() => void submit()}>
            {category ? 'Save changes' : 'Add category'}
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
          label="Category name"
          autoFocus
          placeholder="e.g. Labor, Painting, Roofing"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Budget (₱)"
          type="number"
          step="any"
          min="0"
          error={errors.budget_amount?.message}
          {...register('budget_amount')}
        />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
