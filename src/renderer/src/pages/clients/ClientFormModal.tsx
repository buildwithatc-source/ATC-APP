import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@renderer/components/Modal'
import { Button, TextArea, TextField } from '@renderer/components/ui'
import type { Client, ClientInput } from '@renderer/lib/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string(),
  contact_number: z.string()
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  /** Present when editing; absent when creating. */
  client: Client | null
  onClose: () => void
  onSubmit: (input: ClientInput) => Promise<void>
}

export function ClientFormModal({ open, client, onClose, onSubmit }: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', contact_number: '' }
  })

  // Reset fields whenever the modal opens for a different client (or for "new").
  useEffect(() => {
    if (open) {
      reset({
        name: client?.name ?? '',
        address: client?.address ?? '',
        contact_number: client?.contact_number ?? ''
      })
    }
  }, [open, client, reset])

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      address: values.address,
      contact_number: values.contact_number
    })
  })

  return (
    <Modal
      open={open}
      title={client ? 'Edit client' : 'Add client'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={isSubmitting} type="button">
            {client ? 'Save changes' : 'Add client'}
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
        <TextField label="Name" autoFocus error={errors.name?.message} {...register('name')} />
        <TextArea label="Address" rows={2} {...register('address')} />
        <TextField label="Contact number" {...register('contact_number')} />
        {/* Hidden submit lets Enter submit the form. */}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
