import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@renderer/components/Modal'
import { Button, TextField } from '@renderer/components/ui'
import { toNumber } from '@renderer/lib/format'
import type { QuotationItem, QuotationItemInput } from '@renderer/lib/types'

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, 'Amount must be ≥ 0')
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  item: QuotationItem | null
  onClose: () => void
  onSubmit: (input: QuotationItemInput) => Promise<void>
}

export function QuotationItemFormModal({ open, item, onClose, onSubmit }: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { description: '', amount: 0 }
  })

  useEffect(() => {
    if (open) {
      reset({ description: item?.description ?? '', amount: item?.quoted_amount ?? 0 })
    }
  }, [open, item, reset])

  const submit = handleSubmit(async (v) =>
    onSubmit({ description: v.description, amount: toNumber(v.amount) })
  )

  return (
    <Modal
      open={open}
      title={item ? 'Edit scope item' : 'Add scope item'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={isSubmitting} onClick={() => void submit()}>
            {item ? 'Save changes' : 'Add item'}
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
          label="Scope item"
          autoFocus
          placeholder="e.g. Material"
          error={errors.description?.message}
          {...register('description')}
        />
        <TextField
          label="Amount (₱)"
          type="number"
          step="any"
          min="0"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
