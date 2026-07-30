import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@renderer/components/Modal'
import { Button, TextField } from '@renderer/components/ui'
import { toNumber } from '@renderer/lib/format'
import type { ContractItem, ContractItemInput } from '@renderer/lib/types'

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  quoted_amount: z.coerce.number().min(0, 'Must be ≥ 0'),
  negotiated_amount: z.coerce.number().min(0, 'Must be ≥ 0')
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  item: ContractItem | null
  onClose: () => void
  onSubmit: (input: ContractItemInput) => Promise<void>
}

export function ContractItemFormModal({ open, item, onClose, onSubmit }: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { description: '', quoted_amount: 0, negotiated_amount: 0 }
  })

  useEffect(() => {
    if (open) {
      reset({
        description: item?.description ?? '',
        quoted_amount: item?.quoted_amount ?? 0,
        negotiated_amount: item?.negotiated_amount ?? 0
      })
    }
  }, [open, item, reset])

  const submit = handleSubmit(async (v) =>
    onSubmit({
      description: v.description,
      quoted_amount: toNumber(v.quoted_amount),
      negotiated_amount: toNumber(v.negotiated_amount)
    })
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
          placeholder="e.g. Kitchen cabinets"
          error={errors.description?.message}
          {...register('description')}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Quoted price (₱)"
            type="number"
            step="any"
            min="0"
            error={errors.quoted_amount?.message}
            {...register('quoted_amount')}
          />
          <TextField
            label="Negotiated price (₱)"
            type="number"
            step="any"
            min="0"
            error={errors.negotiated_amount?.message}
            {...register('negotiated_amount')}
          />
        </div>
        <p className="text-xs text-slate-400">
          Quoted = your original offer. Negotiated = the final agreed price (the contract sum is the
          total of negotiated prices).
        </p>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
