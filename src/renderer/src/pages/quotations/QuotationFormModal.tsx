import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@renderer/components/Modal'
import { Button, TextField } from '@renderer/components/ui'
import type { Client, Quotation, QuotationInput } from '@renderer/lib/types'

const schema = z.object({
  title: z.string(),
  client_id: z.string().min(1, 'Select a client')
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  quotation: Quotation | null
  clients: Client[]
  onClose: () => void
  onSubmit: (input: QuotationInput) => Promise<void>
}

const control =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30'

export function QuotationFormModal({
  open,
  quotation,
  clients,
  onClose,
  onSubmit
}: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', client_id: '' }
  })

  useEffect(() => {
    if (open) {
      reset({ title: quotation?.title ?? '', client_id: quotation?.client_id ?? '' })
    }
  }, [open, quotation, reset])

  const submit = handleSubmit(async (v) => onSubmit({ title: v.title, client_id: v.client_id }))

  return (
    <Modal
      open={open}
      title={quotation ? `Edit ${quotation.code}` : 'New quotation'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={isSubmitting} onClick={() => void submit()}>
            {quotation ? 'Save changes' : 'Create quotation'}
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
        {!quotation && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200">
            A quotation number (e.g. <span className="font-mono">QTN{new Date().getFullYear()}001</span>)
            is assigned automatically.
          </p>
        )}

        <TextField
          label="Title"
          autoFocus
          placeholder="e.g. Kitchen fit-out"
          {...register('title')}
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Client</span>
          <select className={control} {...register('client_id')}>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.client_id && (
            <span className="mt-1 block text-xs text-red-600">{errors.client_id.message}</span>
          )}
        </label>

        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
